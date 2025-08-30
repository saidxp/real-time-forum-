package middleware

import (
	"context"
	auth "forum/internal/auth"
	db "forum/internal/db"
	forumerror "forum/internal/error"
	repo "forum/internal/repository"
	"net/http"
)

func AuthMidleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		sessionCookie, err := r.Cookie("session_token")

		// At mdileware i will check if he is login
		if err != nil || sessionCookie.Value == "" {
			auth.ServLogin(w, r)
			return
		}

		userId, exist, err := db.SelectUserSession(sessionCookie.Value)

		if err != nil {
			forumerror.InternalServerError(w, r, err)
			return
		}

		if !exist {
			auth.ServLogin(w, r)
			return
		}

		ctx := context.WithValue(r.Context(), repo.USER_ID_KEY, userId)
		next(w, r.WithContext(ctx))
	}
}
