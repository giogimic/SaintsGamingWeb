package auth_test

import (
	"testing"
	"time"

	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/auth"
	"github.com/golang-jwt/jwt/v5"
)

func TestParseJWT(t *testing.T) {
	secret := "test-secret"
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"id":  "user_123",
		"email": "a@b.c",
		"name": "Ada",
		"exp": time.Now().Add(time.Hour).Unix(),
	})
	s, err := tok.SignedString([]byte(secret))
	if err != nil {
		t.Fatal(err)
	}
	sess, err := auth.ParseJWT(s, secret)
	if err != nil {
		t.Fatal(err)
	}
	if sess.UserID != "user_123" {
		t.Fatalf("got %s", sess.UserID)
	}
}

func TestDevBypass(t *testing.T) {
	s := auth.DevBypassToken("dev:acc9")
	if s == nil || s.UserID != "acc9" {
		t.Fatalf("%v", s)
	}
}
