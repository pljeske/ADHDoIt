package middleware

import (
	"encoding/json"
	"net/http"

	"adhdoit/internal/model"
)

func AdminOnly(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		role, _ := r.Context().Value(model.ContextKeyUserRole).(string)
		if role != "admin" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "forbidden", "code": "FORBIDDEN"})
			return
		}
		next.ServeHTTP(w, r)
	})
}
