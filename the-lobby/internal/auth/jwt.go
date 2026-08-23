package auth

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

// Session holds authenticated account identity from Auth.js JWT.
type Session struct {
	UserID string
	Email  string
	Name   string
	Role   string
}

// CookieNames tried in order (dev then prod Auth.js).
var CookieNames = []string{
	"authjs.session-token",
	"__Secure-authjs.session-token",
	"next-auth.session-token",
	"__Secure-next-auth.session-token",
}

// ParseJWT validates an Auth.js / NextAuth JWT with the shared secret.
func ParseJWT(tokenStr, secret string) (*Session, error) {
	if tokenStr == "" {
		return nil, fmt.Errorf("empty token")
	}
	tok, err := jwt.Parse(tokenStr, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := tok.Claims.(jwt.MapClaims)
	if !ok || !tok.Valid {
		return nil, fmt.Errorf("invalid claims")
	}
	id := claimString(claims, "id")
	if id == "" {
		id = claimString(claims, "sub")
	}
	if id == "" {
		return nil, fmt.Errorf("missing user id in token")
	}
	return &Session{
		UserID: id,
		Email:  claimString(claims, "email"),
		Name:   claimString(claims, "name"),
		Role:   claimString(claims, "role"),
	}, nil
}

func claimString(c jwt.MapClaims, key string) string {
	v, ok := c[key]
	if !ok || v == nil {
		return ""
	}
	switch t := v.(type) {
	case string:
		return t
	default:
		return fmt.Sprint(t)
	}
}

// SessionFromRequest reads Auth.js cookie (or Authorization Bearer).
func SessionFromRequest(r *http.Request, secret string) (*Session, error) {
	if auth := r.Header.Get("Authorization"); strings.HasPrefix(strings.ToLower(auth), "bearer ") {
		return ParseJWT(strings.TrimSpace(auth[7:]), secret)
	}
	for _, name := range CookieNames {
		if c, err := r.Cookie(name); err == nil && c.Value != "" {
			if s, err := ParseJWT(c.Value, secret); err == nil {
				return s, nil
			}
		}
	}
	return nil, fmt.Errorf("no session")
}

// DevBypassToken accepts handshake.auth.token in development.
func DevBypassToken(token string) *Session {
	if token == "" {
		return nil
	}
	// Plain account id or "dev:<id>"
	id := strings.TrimPrefix(token, "dev:")
	if id == "" {
		return nil
	}
	return &Session{UserID: id, Name: "Dev " + id, Role: "ADMIN"}
}
