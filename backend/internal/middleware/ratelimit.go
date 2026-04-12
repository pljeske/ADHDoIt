package middleware

import (
	"encoding/json"
	"net"
	"net/http"
	"strconv"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

// ipEntry holds a rate limiter and the last time it was accessed.
type ipEntry struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// RateLimiter enforces a per-IP token-bucket rate limit.
// Stale entries are purged every cleanupInterval to bound memory use.
type RateLimiter struct {
	mu              sync.Mutex
	clients         map[string]*ipEntry
	r               rate.Limit
	b               int
	cleanupInterval time.Duration
	ttl             time.Duration
}

// NewRateLimiter creates a RateLimiter with the given token-bucket parameters.
//
//	r  – sustained request rate (events per second); use rate.Every(d) for convenience
//	b  – burst size (max tokens available at once)
func NewRateLimiter(r rate.Limit, b int) *RateLimiter {
	rl := &RateLimiter{
		clients:         make(map[string]*ipEntry),
		r:               r,
		b:               b,
		cleanupInterval: 5 * time.Minute,
		ttl:             10 * time.Minute,
	}
	go rl.cleanup()
	return rl
}

// Middleware returns an http.Handler that enforces the rate limit per remote IP.
// When the limit is exceeded it responds with 429 Too Many Requests.
func (rl *RateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := realIP(r)
		if !rl.allow(ip) {
			w.Header().Set("Content-Type", "application/json")
			// Retry-After: conservative estimate based on burst refill time
			retryAfter := int(float64(rl.b) / float64(rl.r))
			if retryAfter < 1 {
				retryAfter = 1
			}
			w.Header().Set("Retry-After", strconv.Itoa(retryAfter))
			w.WriteHeader(http.StatusTooManyRequests)
			_ = json.NewEncoder(w).Encode(map[string]string{
				"error": "too many requests",
				"code":  "RATE_LIMITED",
			})
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (rl *RateLimiter) allow(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	e, ok := rl.clients[ip]
	if !ok {
		e = &ipEntry{limiter: rate.NewLimiter(rl.r, rl.b)}
		rl.clients[ip] = e
	}
	e.lastSeen = time.Now()
	return e.limiter.Allow()
}

// cleanup removes entries that haven't been seen within ttl. Runs forever in
// the background; the small goroutine is acceptable for a long-running server.
func (rl *RateLimiter) cleanup() {
	for {
		time.Sleep(rl.cleanupInterval)
		rl.mu.Lock()
		for ip, e := range rl.clients {
			if time.Since(e.lastSeen) > rl.ttl {
				delete(rl.clients, ip)
			}
		}
		rl.mu.Unlock()
	}
}

// realIP extracts the host part from r.RemoteAddr. chi's middleware.RealIP
// has already rewritten RemoteAddr to the client IP (X-Forwarded-For /
// X-Real-IP), so we only need to strip the port.
func realIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
