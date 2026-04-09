package main

import (
	"context"
	"errors"
	"io/fs"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"adhdoit/internal/config"
	"adhdoit/internal/db"
	"adhdoit/internal/server"

	"github.com/golang-migrate/migrate/v4"
	migratepg "github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/joho/godotenv"
	"github.com/riverqueue/river/riverdriver/riverpgxv5"
	rivermigrate "github.com/riverqueue/river/rivermigrate"
)

func main() {
	cfg := config.Load()
	if cfg.Environment != "production" {
		_ = godotenv.Load()
		cfg = config.Load()
	}

	setupLogger(cfg.Environment)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("failed to create db pool", "err", err)
		os.Exit(1)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		slog.Error("failed to connect to db", "err", err)
		os.Exit(1)
	}
	slog.Info("connected to database")

	if err := runMigrations(cfg.DatabaseURL); err != nil {
		slog.Error("migration failed", "err", err)
		os.Exit(1)
	}

	riverMigrator, err := rivermigrate.New(riverpgxv5.New(pool), nil)
	if err != nil {
		slog.Error("failed to create river migrator", "err", err)
		os.Exit(1)
	}
	if _, err := riverMigrator.Migrate(ctx, rivermigrate.DirectionUp, nil); err != nil {
		slog.Error("river migration failed", "err", err)
		os.Exit(1)
	}
	slog.Info("migrations complete")

	queries := db.NewWithPool(pool)

	riverClient, err := server.SetupRiver(ctx, pool, queries, cfg)
	if err != nil {
		slog.Error("failed to setup river", "err", err)
		os.Exit(1)
	}
	if err := riverClient.Start(ctx); err != nil {
		slog.Error("failed to start river", "err", err)
		os.Exit(1)
	}

	httpServer := server.New(cfg, pool, queries, riverClient)

	go func() {
		slog.Info("server listening", "addr", httpServer.Addr)
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("server error", "err", err)
		}
	}()

	<-ctx.Done()
	slog.Info("shutting down")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 30_000_000_000)
	defer cancel()

	_ = httpServer.Shutdown(shutdownCtx)
	_ = riverClient.Stop(shutdownCtx)
}

func runMigrations(databaseURL string) error {
	migFS, err := fs.Sub(db.MigrationsFS, "migrations")
	if err != nil {
		return err
	}
	src, err := iofs.New(migFS, ".")
	if err != nil {
		return err
	}

	connCfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return err
	}
	sqlDB := stdlib.OpenDB(*connCfg.ConnConfig)
	defer sqlDB.Close()

	driver, err := migratepg.WithInstance(sqlDB, &migratepg.Config{})
	if err != nil {
		return err
	}

	m, err := migrate.NewWithInstance("iofs", src, "postgres", driver)
	if err != nil {
		return err
	}

	if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return err
	}
	return nil
}

func setupLogger(env string) {
	opts := &slog.HandlerOptions{}
	if env == "production" {
		slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, opts)))
	} else {
		slog.SetDefault(slog.New(slog.NewTextHandler(os.Stdout, opts)))
	}
}
