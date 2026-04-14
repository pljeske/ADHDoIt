package handler

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"time"

	"adhdoit/internal/config"
	"adhdoit/internal/db"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

func respondJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func respondError(w http.ResponseWriter, status int, msg, code string) {
	respondJSON(w, status, map[string]string{"error": msg, "code": code})
}

// maxBodyBytes caps request bodies at 1 MiB to prevent memory exhaustion.
const maxBodyBytes = 1 << 20

func decodeJSON(r *http.Request, v any) error {
	return json.NewDecoder(io.LimitReader(r.Body, maxBodyBytes)).Decode(v)
}

// issueTokens mints a signed access JWT and a random refresh token stored in
// the DB.  Shared by both the password-based and OIDC auth handlers.
func issueTokens(r *http.Request, user *db.User, q *db.Queries, cfg *config.Config) (accessToken, refreshTokenRaw string, err error) {
	claims := jwt.MapClaims{
		"user_id": user.ID.String(),
		"email":   user.Email,
		"role":    user.Role,
		"exp":     time.Now().Add(cfg.JWTAccessTTL).Unix(),
		"iat":     time.Now().Unix(),
	}
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	accessToken, err = t.SignedString([]byte(cfg.JWTSecret))
	if err != nil {
		return
	}

	rawBytes := make([]byte, 32)
	if _, err = rand.Read(rawBytes); err != nil {
		return
	}
	refreshTokenRaw = hex.EncodeToString(rawBytes)
	hash := hashToken(refreshTokenRaw)
	expiresAt := time.Now().Add(cfg.JWTRefreshTTL)
	_, err = q.CreateRefreshToken(r.Context(), &db.CreateRefreshTokenParams{
		UserID:    user.ID,
		TokenHash: hash,
		ExpiresAt: pgtype.Timestamptz{Time: expiresAt, Valid: true},
	})
	return
}

// hashToken produces a deterministic SHA-256 hex digest for safe DB lookup.
func hashToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}
