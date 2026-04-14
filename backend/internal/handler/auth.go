package handler

import (
	"errors"
	"net/http"

	"adhdoit/internal/config"
	"adhdoit/internal/db"
	mw "adhdoit/internal/middleware"

	"github.com/go-playground/validator/v10"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	q   *db.Queries
	cfg *config.Config
	v   *validator.Validate
}

func NewAuthHandler(q *db.Queries, cfg *config.Config) *AuthHandler {
	return &AuthHandler{q: q, cfg: cfg, v: validator.New()}
}

type registerRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Name     string `json:"name" validate:"required,min=1"`
	Password string `json:"password" validate:"required,min=8"`
	Timezone string `json:"timezone" validate:"required"`
}

type loginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type authResponse struct {
	User         *db.User `json:"user"`
	AccessToken  string   `json:"access_token"`
	RefreshToken string   `json:"refresh_token"`
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	// Check if registration is disabled
	if val, err := h.q.GetAppSetting(r.Context(), "registration_disabled"); err == nil && val == "true" {
		respondError(w, http.StatusForbidden, "registration is disabled", "REGISTRATION_DISABLED")
		return
	}

	var req registerRequest
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json", "BAD_REQUEST")
		return
	}
	if err := h.v.Struct(req); err != nil {
		respondError(w, http.StatusUnprocessableEntity, err.Error(), "VALIDATION_ERROR")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "internal error", "INTERNAL")
		return
	}

	isFirst := false
	if count, err := h.q.CountUsers(r.Context()); err == nil && count == 0 {
		isFirst = true
	}

	user, err := h.q.CreateUser(r.Context(), &db.CreateUserParams{
		Email:        req.Email,
		PasswordHash: string(hash),
		Name:         req.Name,
		Timezone:     req.Timezone,
	})
	if err != nil {
		respondError(w, http.StatusConflict, "email already in use", "CONFLICT")
		return
	}

	if isFirst || h.cfg.IsAdminEmail(req.Email) {
		if promoted, err := h.q.SetUserRole(r.Context(), &db.SetUserRoleParams{ID: user.ID, Role: "admin"}); err == nil {
			user = promoted
		}
	}

	accessToken, refreshTokenRaw, err := h.issueTokens(r, user)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "internal error", "INTERNAL")
		return
	}

	respondJSON(w, http.StatusCreated, authResponse{User: user, AccessToken: accessToken, RefreshToken: refreshTokenRaw})
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json", "BAD_REQUEST")
		return
	}
	if err := h.v.Struct(req); err != nil {
		respondError(w, http.StatusUnprocessableEntity, err.Error(), "VALIDATION_ERROR")
		return
	}

	user, err := h.q.GetUserByEmail(r.Context(), req.Email)
	if err != nil {
		respondError(w, http.StatusUnauthorized, "invalid credentials", "UNAUTHORIZED")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		respondError(w, http.StatusUnauthorized, "invalid credentials", "UNAUTHORIZED")
		return
	}

	accessToken, refreshTokenRaw, err := h.issueTokens(r, user)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "internal error", "INTERNAL")
		return
	}

	respondJSON(w, http.StatusOK, authResponse{User: user, AccessToken: accessToken, RefreshToken: refreshTokenRaw})
}

type refreshRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req refreshRequest
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json", "BAD_REQUEST")
		return
	}
	if err := h.v.Struct(req); err != nil {
		respondError(w, http.StatusUnprocessableEntity, err.Error(), "VALIDATION_ERROR")
		return
	}

	hash := hashToken(req.RefreshToken)
	rt, err := h.q.GetRefreshToken(r.Context(), hash)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			respondError(w, http.StatusUnauthorized, "invalid or expired refresh token", "UNAUTHORIZED")
			return
		}
		respondError(w, http.StatusInternalServerError, "internal error", "INTERNAL")
		return
	}

	// Delete old token (rotation)
	_ = h.q.DeleteRefreshToken(r.Context(), hash)

	user, err := h.q.GetUserByID(r.Context(), rt.UserID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "internal error", "INTERNAL")
		return
	}

	accessToken, refreshTokenRaw, err := h.issueTokens(r, user)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "internal error", "INTERNAL")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{
		"access_token":  accessToken,
		"refresh_token": refreshTokenRaw,
	})
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	userID, ok := mw.UserIDFromContext(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "unauthorized", "UNAUTHORIZED")
		return
	}
	_ = userID

	var req refreshRequest
	if err := decodeJSON(r, &req); err == nil && req.RefreshToken != "" {
		_ = h.q.DeleteRefreshToken(r.Context(), hashToken(req.RefreshToken))
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *AuthHandler) issueTokens(r *http.Request, user *db.User) (string, string, error) {
	return issueTokens(r, user, h.q, h.cfg)
}
