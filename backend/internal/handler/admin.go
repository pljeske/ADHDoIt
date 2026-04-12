package handler

import (
	"errors"
	"net/http"

	"adhdoit/internal/db"
	mw "adhdoit/internal/middleware"

	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type AdminHandler struct {
	q *db.Queries
	v *validator.Validate
}

func NewAdminHandler(q *db.Queries) *AdminHandler {
	return &AdminHandler{q: q, v: validator.New()}
}

// GET /admin/users
func (h *AdminHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	users, err := h.q.ListUsers(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "internal error", "INTERNAL")
		return
	}
	respondJSON(w, http.StatusOK, users)
}

type updateRoleRequest struct {
	Role string `json:"role" validate:"required,oneof=user admin"`
}

// PATCH /admin/users/{id}/role
func (h *AdminHandler) UpdateUserRole(w http.ResponseWriter, r *http.Request) {
	callerID, ok := mw.UserIDFromContext(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "unauthorized", "UNAUTHORIZED")
		return
	}

	idStr := chi.URLParam(r, "id")
	targetID, err := uuid.Parse(idStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid user id", "BAD_REQUEST")
		return
	}

	// Prevent admin from demoting themselves
	if targetID == callerID {
		respondError(w, http.StatusBadRequest, "cannot change your own role", "BAD_REQUEST")
		return
	}

	var req updateRoleRequest
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json", "BAD_REQUEST")
		return
	}
	if err := h.v.Struct(req); err != nil {
		respondError(w, http.StatusUnprocessableEntity, err.Error(), "VALIDATION_ERROR")
		return
	}

	user, err := h.q.UpdateUserRole(r.Context(), targetID, req.Role)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			respondError(w, http.StatusNotFound, "user not found", "NOT_FOUND")
			return
		}
		respondError(w, http.StatusInternalServerError, "internal error", "INTERNAL")
		return
	}
	respondJSON(w, http.StatusOK, user)
}

// DELETE /admin/users/{id}
func (h *AdminHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	callerID, ok := mw.UserIDFromContext(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "unauthorized", "UNAUTHORIZED")
		return
	}

	idStr := chi.URLParam(r, "id")
	targetID, err := uuid.Parse(idStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid user id", "BAD_REQUEST")
		return
	}

	if targetID == callerID {
		respondError(w, http.StatusBadRequest, "cannot delete your own account", "BAD_REQUEST")
		return
	}

	if err := h.q.DeleteUser(r.Context(), targetID); err != nil {
		respondError(w, http.StatusInternalServerError, "internal error", "INTERNAL")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// GET /admin/settings
func (h *AdminHandler) GetSettings(w http.ResponseWriter, r *http.Request) {
	val, err := h.q.GetAppSetting(r.Context(), "registration_disabled")
	if err != nil {
		respondError(w, http.StatusInternalServerError, "internal error", "INTERNAL")
		return
	}
	respondJSON(w, http.StatusOK, db.AppSettings{RegistrationDisabled: val == "true"})
}

type updateSettingsRequest struct {
	RegistrationDisabled bool `json:"registration_disabled"`
}

// PATCH /admin/settings
func (h *AdminHandler) UpdateSettings(w http.ResponseWriter, r *http.Request) {
	var req updateSettingsRequest
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json", "BAD_REQUEST")
		return
	}

	val := "false"
	if req.RegistrationDisabled {
		val = "true"
	}
	if err := h.q.SetAppSetting(r.Context(), "registration_disabled", val); err != nil {
		respondError(w, http.StatusInternalServerError, "internal error", "INTERNAL")
		return
	}
	respondJSON(w, http.StatusOK, db.AppSettings{RegistrationDisabled: req.RegistrationDisabled})
}
