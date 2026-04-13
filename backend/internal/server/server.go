package server

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"adhdoit/internal/config"
	"adhdoit/internal/db"
	"adhdoit/internal/handler"
	mw "adhdoit/internal/middleware"
	"adhdoit/internal/worker"

	"golang.org/x/time/rate"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/riverqueue/river"
	"github.com/riverqueue/river/riverdriver/riverpgxv5"
)

func New(cfg *config.Config, pool *pgxpool.Pool, queries *db.Queries, riverClient *river.Client[pgx.Tx]) *http.Server {
	r := chi.NewRouter()

	r.Use(middleware.RealIP)
	r.Use(middleware.RequestID)
	r.Use(mw.SlogMiddleware)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{
			"http://localhost:5173", // Vite dev server
			"http://localhost:3000",
			"https://localhost", // Caddy with self-signed cert (local Docker)
			"http://localhost",
		},
		AllowedMethods:   []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	}))
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(30_000_000_000)) // 30s

	authHandler := handler.NewAuthHandler(queries, cfg)
	categoryHandler := handler.NewCategoryHandler(queries)
	todoHandler := handler.NewTodoHandler(queries, pool, riverClient, cfg)
	pushHandler := handler.NewPushHandler(queries)
	adminHandler := handler.NewAdminHandler(queries)

	// Kubernetes probe endpoints — no rate limiting so kubelet is never blocked.
	r.Get("/healthz/live", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})
	r.Get("/healthz/ready", func(w http.ResponseWriter, r *http.Request) {
		if err := pool.Ping(r.Context()); err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusServiceUnavailable)
			_, _ = w.Write([]byte(`{"status":"unavailable","checks":{"database":"error"}}`))
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok","checks":{"database":"ok"}}`))
	})

	r.Route("/api/v1", func(r chi.Router) {
		// Global rate limiter: 60 req/min per IP, burst 20.
		// Applied inside /api/v1 so probe endpoints are exempt.
		globalLimiter := mw.NewRateLimiter(rate.Every(time.Second), 20)
		r.Use(globalLimiter.Middleware)
		// Public auth routes — each has its own tight rate limit in addition to
		// the global limiter already applied above.
		//
		// register: 3 attempts/hour per IP (burst 3) — bot/spam signup guard
		// login:    10 attempts/5 min per IP (burst 10) — brute-force guard
		// refresh:  30 attempts/5 min per IP (burst 15) — token-rotation guard
		registerLimiter := mw.NewRateLimiter(rate.Every(20*time.Minute), 3)
		loginLimiter := mw.NewRateLimiter(rate.Every(30*time.Second), 10)
		refreshLimiter := mw.NewRateLimiter(rate.Every(10*time.Second), 15)

		r.With(registerLimiter.Middleware).Post("/auth/register", authHandler.Register)
		r.With(loginLimiter.Middleware).Post("/auth/login", authHandler.Login)
		r.With(refreshLimiter.Middleware).Post("/auth/refresh", authHandler.Refresh)

		// Authenticated routes
		r.Group(func(r chi.Router) {
			r.Use(mw.Auth(cfg.JWTSecret))

			r.Delete("/auth/logout", authHandler.Logout)

			r.Get("/todos", todoHandler.List)
			r.Post("/todos", todoHandler.Create)
			r.Get("/todos/{id}", todoHandler.Get)
			r.Patch("/todos/{id}", todoHandler.Update)
			r.Delete("/todos/{id}", todoHandler.Delete)
			r.Post("/todos/{id}/snooze", todoHandler.Snooze)
			r.Post("/todos/{id}/done", todoHandler.Done)
			r.Post("/todos/{id}/reopen", todoHandler.Reopen)

			r.Get("/categories", categoryHandler.List)
			r.Post("/categories", categoryHandler.Create)
			r.Patch("/categories/{id}", categoryHandler.Update)
			r.Delete("/categories/{id}", categoryHandler.Delete)

			r.Post("/push/subscribe", pushHandler.Subscribe)
			r.Delete("/push/subscribe", pushHandler.Unsubscribe)

			// Admin-only routes
			r.Group(func(r chi.Router) {
				r.Use(mw.AdminOnly)
				r.Get("/admin/users", adminHandler.ListUsers)
				r.Patch("/admin/users/{id}/role", adminHandler.UpdateUserRole)
				r.Delete("/admin/users/{id}", adminHandler.DeleteUser)
				r.Get("/admin/settings", adminHandler.GetSettings)
				r.Patch("/admin/settings", adminHandler.UpdateSettings)
			})
		})
	})

	addr := fmt.Sprintf(":%s", cfg.Port)
	slog.Info("starting server", "addr", addr)

	return &http.Server{
		Addr:    addr,
		Handler: r,
	}
}

func SetupRiver(ctx context.Context, pool *pgxpool.Pool, queries *db.Queries, cfg *config.Config) (*river.Client[pgx.Tx], error) {
	workers := river.NewWorkers()
	river.AddWorker(workers, worker.NewReminderWorker(queries, cfg))

	riverClient, err := river.NewClient(riverpgxv5.New(pool), &river.Config{
		Queues: map[string]river.QueueConfig{
			river.QueueDefault: {MaxWorkers: 10},
		},
		Workers: workers,
	})
	if err != nil {
		return nil, err
	}
	return riverClient, nil
}
