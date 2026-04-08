package config

import (
	"os"
	"time"
)

type Config struct {
	DatabaseURL     string
	JWTSecret       string
	JWTAccessTTL    time.Duration
	JWTRefreshTTL   time.Duration
	Port            string
	Environment     string
	SMTPHost        string
	SMTPPort        string
	SMTPUser        string
	SMTPPassword    string
	SMTPFrom        string
	VAPIDPublicKey  string
	VAPIDPrivateKey string
	VAPIDSubject    string
}

func Load() *Config {
	return &Config{
		DatabaseURL:     getEnv("DATABASE_URL", "postgres://adhdo:secret@localhost:5432/adhdo?sslmode=disable"),
		JWTSecret:       getEnv("JWT_SECRET", "dev-secret-32-chars-minimum-ok!!"),
		JWTAccessTTL:    parseDuration(getEnv("JWT_ACCESS_TTL", "15m")),
		JWTRefreshTTL:   parseDuration(getEnv("JWT_REFRESH_TTL", "720h")),
		Port:            getEnv("PORT", "8080"),
		Environment:     getEnv("ENVIRONMENT", "development"),
		SMTPHost:        getEnv("SMTP_HOST", ""),
		SMTPPort:        getEnv("SMTP_PORT", "587"),
		SMTPUser:        getEnv("SMTP_USER", ""),
		SMTPPassword:    getEnv("SMTP_PASSWORD", ""),
		SMTPFrom:        getEnv("SMTP_FROM", "ADHDoIt <noreply@example.com>"),
		VAPIDPublicKey:  getEnv("VAPID_PUBLIC_KEY", ""),
		VAPIDPrivateKey: getEnv("VAPID_PRIVATE_KEY", ""),
		VAPIDSubject:    getEnv("VAPID_SUBJECT", "mailto:admin@example.com"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func parseDuration(s string) time.Duration {
	d, err := time.ParseDuration(s)
	if err != nil {
		return 15 * time.Minute
	}
	return d
}
