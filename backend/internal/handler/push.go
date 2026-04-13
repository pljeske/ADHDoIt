package handler

import (
	"net/http"

	"adhdoit/internal/db"
	mw "adhdoit/internal/middleware"

	"github.com/go-playground/validator/v10"
)

type PushHandler struct {
	q *db.Queries
	v *validator.Validate
}

func NewPushHandler(q *db.Queries) *PushHandler {
	return &PushHandler{q: q, v: validator.New()}
}

type subscribeRequest struct {
	Endpoint string `json:"endpoint" validate:"required"`
	Keys     struct {
		P256dh string `json:"p256dh" validate:"required"`
		Auth   string `json:"auth" validate:"required"`
	} `json:"keys" validate:"required"`
}

func (h *PushHandler) Subscribe(w http.ResponseWriter, r *http.Request) {
	userID, _ := mw.UserIDFromContext(r.Context())
	var req subscribeRequest
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json", "BAD_REQUEST")
		return
	}
	if err := h.v.Struct(req); err != nil {
		respondError(w, http.StatusUnprocessableEntity, err.Error(), "VALIDATION_ERROR")
		return
	}

	sub, err := h.q.UpsertPushSubscription(r.Context(), &db.UpsertPushSubscriptionParams{
		UserID:   toPgtypeUUID(userID),
		Endpoint: req.Endpoint,
		P256dh:   req.Keys.P256dh,
		Auth:     req.Keys.Auth,
	})
	if err != nil {
		respondError(w, http.StatusInternalServerError, "internal error", "INTERNAL")
		return
	}
	respondJSON(w, http.StatusOK, sub)
}

func (h *PushHandler) Unsubscribe(w http.ResponseWriter, r *http.Request) {
	userID, _ := mw.UserIDFromContext(r.Context())
	var req struct {
		Endpoint string `json:"endpoint" validate:"required"`
	}
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json", "BAD_REQUEST")
		return
	}

	if err := h.q.DeletePushSubscription(r.Context(), &db.DeletePushSubscriptionParams{
		Endpoint: req.Endpoint,
		UserID:   toPgtypeUUID(userID),
	}); err != nil {
		respondError(w, http.StatusInternalServerError, "internal error", "INTERNAL")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
