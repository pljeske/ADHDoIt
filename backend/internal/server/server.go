package server

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"

	"adhdo-it/internal/config"
	"adhdo-it/internal/db"
	"adhdo-it/internal/handler"
	mw "adhdo-it/internal/middleware"
	"adhdo-it/internal/worker"

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

	r.Route("/api/v1", func(r chi.Router) {
		// Public auth routes
		r.Post("/auth/register", authHandler.Register)
		r.Post("/auth/login", authHandler.Login)
		r.Post("/auth/refresh", authHandler.Refresh)

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
		})
	})

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		if err := pool.Ping(r.Context()); err != nil {
			http.Error(w, "db unavailable", http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
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
