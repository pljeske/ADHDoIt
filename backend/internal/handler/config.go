package handler

import (
	"net/http"

	"adhdoit/internal/config"
)

type ConfigHandler struct {
	cfg *config.Config
}

func NewConfigHandler(cfg *config.Config) *ConfigHandler {
	return &ConfigHandler{cfg: cfg}
}

// GetConfig returns runtime feature flags derived from the server configuration.
// This endpoint is public and unauthenticated — it contains no sensitive data.
func (h *ConfigHandler) GetConfig(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, map[string]any{
		"github_auth_enabled": h.cfg.GitHubClientID != "",
	})
}
