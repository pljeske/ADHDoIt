package handler

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"

	"adhdoit/internal/config"
	"adhdoit/internal/db"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/github"
)

// GitHubHandler implements GitHub OAuth2 Authorization Code Flow.
// It is nil when GitHub OAuth is not configured — callers must check before use.
type GitHubHandler struct {
	q      *db.Queries
	cfg    *config.Config
	oauth2 oauth2.Config
}

// NewGitHubHandler returns nil (no error) when the required env vars are absent,
// so the server starts normally without GitHub auth configured.
func NewGitHubHandler(q *db.Queries, cfg *config.Config) *GitHubHandler {
	if cfg.GitHubClientID == "" {
		return nil
	}
	return &GitHubHandler{
		q:   q,
		cfg: cfg,
		oauth2: oauth2.Config{
			ClientID:     cfg.GitHubClientID,
			ClientSecret: cfg.GitHubClientSecret,
			RedirectURL:  cfg.GitHubRedirectURI,
			Endpoint:     github.Endpoint,
			Scopes:       []string{"user:email"},
		},
	}
}

// Login redirects the browser to GitHub's authorization endpoint.
// A random state value is stored in a short-lived httpOnly cookie to prevent CSRF.
func (h *GitHubHandler) Login(w http.ResponseWriter, r *http.Request) {
	state, err := randomHex(16)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "internal error", "INTERNAL")
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "oauth_state",
		Value:    state,
		MaxAge:   300,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Path:     "/",
		Secure:   r.TLS != nil,
	})

	http.Redirect(w, r, h.oauth2.AuthCodeURL(state), http.StatusTemporaryRedirect)
}

// Callback handles the redirect from GitHub after the user authorizes the app.
// It validates the state cookie, exchanges the code for a GitHub access token,
// fetches the user's profile and email, then finds or creates the local user
// and issues our own JWT pair. On success it redirects to the frontend with
// tokens in the URL fragment (never sent to any server).
func (h *GitHubHandler) Callback(w http.ResponseWriter, r *http.Request) {
	// --- state validation ---
	stateCookie, err := r.Cookie("oauth_state")
	if err != nil || stateCookie.Value != r.URL.Query().Get("state") {
		respondError(w, http.StatusBadRequest, "invalid state", "BAD_REQUEST")
		return
	}
	http.SetCookie(w, &http.Cookie{Name: "oauth_state", MaxAge: -1, Path: "/"})

	code := r.URL.Query().Get("code")
	if code == "" {
		respondError(w, http.StatusBadRequest, "missing code", "BAD_REQUEST")
		return
	}

	// --- code exchange ---
	token, err := h.oauth2.Exchange(r.Context(), code)
	if err != nil {
		slog.Error("github: token exchange failed", "err", err)
		respondError(w, http.StatusInternalServerError, "token exchange failed", "INTERNAL")
		return
	}

	// --- fetch GitHub user profile ---
	ghUser, err := fetchGitHubUser(r.Context(), h.oauth2.Client(r.Context(), token))
	if err != nil {
		slog.Error("github: failed to fetch user", "err", err)
		respondError(w, http.StatusInternalServerError, "failed to fetch github user", "INTERNAL")
		return
	}

	// GitHub may hide the email in /user if the user has it set to private.
	// Fall back to /user/emails to find the verified primary address.
	if ghUser.Email == "" {
		if email, fetchErr := fetchPrimaryEmail(r.Context(), h.oauth2.Client(r.Context(), token)); fetchErr == nil {
			ghUser.Email = email
		}
	}

	if ghUser.Email == "" {
		respondError(w, http.StatusUnprocessableEntity, "no verified email on GitHub account", "NO_EMAIL")
		return
	}

	subject := fmt.Sprintf("github:%d", ghUser.ID)

	user, err := h.findOrCreateUser(r.Context(), subject, ghUser.Email, ghUser.Name)
	if err != nil {
		slog.Error("github: user upsert failed", "err", err)
		respondError(w, http.StatusInternalServerError, "internal error", "INTERNAL")
		return
	}

	// --- issue our own JWT + refresh token ---
	accessToken, refreshToken, err := issueTokens(r, user, h.q, h.cfg)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "internal error", "INTERNAL")
		return
	}

	// --- redirect frontend with tokens in the hash fragment ---
	target := h.cfg.FrontendURL + "/auth/callback#access_token=" + accessToken + "&refresh_token=" + refreshToken
	http.Redirect(w, r, target, http.StatusTemporaryRedirect)
}

// findOrCreateUser looks up by OAuth subject, then tries email linking, then creates.
// On account creation or linking it applies admin promotion rules:
// first user ever, or email in ADMIN_EMAILS → role = "admin".
func (h *GitHubHandler) findOrCreateUser(ctx context.Context, subject, email, name string) (*db.User, error) {
	subjectText := pgtype.Text{String: subject, Valid: true}

	// Already linked — return as-is, role was set at creation time.
	user, err := h.q.GetUserByOIDCSubject(ctx, subjectText)
	if err == nil {
		return user, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}

	// Try linking to an existing email/password account.
	existing, err := h.q.GetUserByEmail(ctx, email)
	if err == nil {
		user, err = h.q.LinkOIDCSubject(ctx, &db.LinkOIDCSubjectParams{
			ID:          existing.ID,
			OidcSubject: subjectText,
		})
		if err != nil {
			return nil, err
		}
		// Promote if email is in the admin list and not already admin.
		if h.cfg.IsAdminEmail(email) && user.Role != "admin" {
			if promoted, err := h.q.SetUserRole(ctx, &db.SetUserRoleParams{ID: user.ID, Role: "admin"}); err == nil {
				user = promoted
			}
		}
		return user, nil
	}

	// Check first-user status before creating (CountUsers after would return ≥ 1).
	isFirst := false
	if count, err := h.q.CountUsers(ctx); err == nil && count == 0 {
		isFirst = true
	}

	// Create a brand-new user.
	displayName := name
	if displayName == "" {
		displayName = email
	}
	user, err = h.q.CreateOIDCUser(ctx, &db.CreateOIDCUserParams{
		Email:       email,
		Name:        displayName,
		Timezone:    "UTC",
		OidcSubject: subjectText,
	})
	if err != nil {
		return nil, err
	}

	if isFirst || h.cfg.IsAdminEmail(email) {
		if promoted, err := h.q.SetUserRole(ctx, &db.SetUserRoleParams{ID: user.ID, Role: "admin"}); err == nil {
			user = promoted
		}
	}
	return user, nil
}

// githubUser holds the fields we need from GET https://api.github.com/user.
type githubUser struct {
	ID    int64  `json:"id"`
	Login string `json:"login"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

func fetchGitHubUser(ctx context.Context, client *http.Client) (*githubUser, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.github.com/user", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/vnd.github+json")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("github /user returned %d", resp.StatusCode)
	}

	var u githubUser
	return &u, json.NewDecoder(resp.Body).Decode(&u)
}

// githubEmail is one entry from GET https://api.github.com/user/emails.
type githubEmail struct {
	Email    string `json:"email"`
	Primary  bool   `json:"primary"`
	Verified bool   `json:"verified"`
}

func randomHex(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// fetchPrimaryEmail returns the verified primary email from /user/emails.
func fetchPrimaryEmail(ctx context.Context, client *http.Client) (string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.github.com/user/emails", nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Accept", "application/vnd.github+json")

	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var emails []githubEmail
	if err := json.NewDecoder(resp.Body).Decode(&emails); err != nil {
		return "", err
	}

	for _, e := range emails {
		if e.Primary && e.Verified {
			return e.Email, nil
		}
	}
	return "", fmt.Errorf("no verified primary email found")
}
