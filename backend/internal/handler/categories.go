package handler

import (
	"errors"
	"net/http"

	"adhdo-it/internal/db"
	mw "adhdo-it/internal/middleware"

	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type CategoryHandler struct {
	q *db.Queries
	v *validator.Validate
}

func NewCategoryHandler(q *db.Queries) *CategoryHandler {
	return &CategoryHandler{q: q, v: validator.New()}
}

type categoryRequest struct {
	Name  string `json:"name" validate:"required,min=1"`
	Color string `json:"color" validate:"required"`
}

func (h *CategoryHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, _ := mw.UserIDFromContext(r.Context())
	cats, err := h.q.ListCategories(r.Context(), userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "internal error", "INTERNAL")
		return
	}
	if cats == nil {
		cats = []*db.Category{}
	}
	respondJSON(w, http.StatusOK, cats)
}

func (h *CategoryHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, _ := mw.UserIDFromContext(r.Context())
	var req categoryRequest
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json", "BAD_REQUEST")
		return
	}
	if err := h.v.Struct(req); err != nil {
		respondError(w, http.StatusUnprocessableEntity, err.Error(), "VALIDATION_ERROR")
		return
	}

	cat, err := h.q.CreateCategory(r.Context(), userID, req.Name, req.Color)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "internal error", "INTERNAL")
		return
	}
	respondJSON(w, http.StatusCreated, cat)
}

func (h *CategoryHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID, _ := mw.UserIDFromContext(r.Context())
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid id", "BAD_REQUEST")
		return
	}

	var req categoryRequest
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json", "BAD_REQUEST")
		return
	}
	if err := h.v.Struct(req); err != nil {
		respondError(w, http.StatusUnprocessableEntity, err.Error(), "VALIDATION_ERROR")
		return
	}

	cat, err := h.q.UpdateCategory(r.Context(), id, userID, req.Name, req.Color)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			respondError(w, http.StatusNotFound, "category not found", "NOT_FOUND")
			return
		}
		respondError(w, http.StatusInternalServerError, "internal error", "INTERNAL")
		return
	}
	respondJSON(w, http.StatusOK, cat)
}

func (h *CategoryHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, _ := mw.UserIDFromContext(r.Context())
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid id", "BAD_REQUEST")
		return
	}

	if err := h.q.DeleteCategory(r.Context(), id, userID); err != nil {
		respondError(w, http.StatusInternalServerError, "internal error", "INTERNAL")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
