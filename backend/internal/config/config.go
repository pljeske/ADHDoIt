package config

import (
	"os"
	"strings"
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
	// GitHub OAuth2 (optional — set all three to enable "Sign in with GitHub")
	GitHubClientID     string
	GitHubClientSecret string
	GitHubRedirectURI  string
	// AdminEmails is a list of email addresses that are automatically granted
	// the admin role on registration or first OAuth login.
	// Set via ADMIN_EMAILS as a comma-separated list.
	AdminEmails []string
	// FrontendURL is where the backend redirects after a successful OAuth callback.
	// Use the origin only (e.g. "http://localhost:5173").  Leave empty when the
	// frontend is served by the same origin as the API (production Caddy setup).
	FrontendURL string
}

func Load() *Config {
	return &Config{
		DatabaseURL:        getEnv("DATABASE_URL", "postgres://adhdo:secret@localhost:5432/adhdo?sslmode=disable"),
		JWTSecret:          getEnv("JWT_SECRET", "dev-secret-32-chars-minimum-ok!!"),
		JWTAccessTTL:       parseDuration(getEnv("JWT_ACCESS_TTL", "15m")),
		JWTRefreshTTL:      parseDuration(getEnv("JWT_REFRESH_TTL", "720h")),
		Port:               getEnv("PORT", "8080"),
		Environment:        getEnv("ENVIRONMENT", "development"),
		SMTPHost:           getEnv("SMTP_HOST", ""),
		SMTPPort:           getEnv("SMTP_PORT", "587"),
		SMTPUser:           getEnv("SMTP_USER", ""),
		SMTPPassword:       getEnv("SMTP_PASSWORD", ""),
		SMTPFrom:           getEnv("SMTP_FROM", "ADHDoIt <noreply@example.com>"),
		VAPIDPublicKey:     getEnv("VAPID_PUBLIC_KEY", ""),
		VAPIDPrivateKey:    getEnv("VAPID_PRIVATE_KEY", ""),
		VAPIDSubject:       getEnv("VAPID_SUBJECT", "mailto:admin@example.com"),
		GitHubClientID:     getEnv("GITHUB_CLIENT_ID", ""),
		GitHubClientSecret: getEnv("GITHUB_CLIENT_SECRET", ""),
		GitHubRedirectURI:  getEnv("GITHUB_REDIRECT_URI", ""),
		FrontendURL:        getEnv("FRONTEND_URL", ""),
		AdminEmails:        parseAdminEmails(getEnv("ADMIN_EMAILS", "")),
	}
}

// IsAdminEmail reports whether the given email is in the configured admin list.
// Comparison is case-insensitive.
func (c *Config) IsAdminEmail(email string) bool {
	lower := strings.ToLower(strings.TrimSpace(email))
	for _, e := range c.AdminEmails {
		if e == lower {
			return true
		}
	}
	return false
}

func parseAdminEmails(raw string) []string {
	if raw == "" {
		return nil
	}
	var out []string
	for _, e := range strings.Split(raw, ",") {
		if trimmed := strings.ToLower(strings.TrimSpace(e)); trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
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
