package auth

import (
	db "forum/internal/db"
	forumerror "forum/internal/error"
	"net/http"
	"time"
)

func LogoutHandler(w http.ResponseWriter, r *http.Request) {
	// Retrieve the session cookie
	sessionCookie, err := r.Cookie("session_token")
	if err != nil || sessionCookie.Value == "" {
		// No valid session, redirect to homepage
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}

	sessionToken := sessionCookie.Value

	// Invalidate the session on server side
	hasSession, err := db.ResetUserSession(sessionToken)
	if err != nil {
		forumerror.InternalServerError(w, r, err)
		return
	}

	// Clear the session cookie on the client side
	clearCookie := &http.Cookie{
		Name:     "session_token",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
		Expires:  time.Unix(0, 0), // Always in the past
		MaxAge:   -1,
	}
	http.SetCookie(w, clearCookie)

	// Handle invalid sessions
	if !hasSession {
		forumerror.Unauthorized(w, r)
		return
	}

	// Redirect to home page after logout
	http.Redirect(w, r, "/", http.StatusSeeOther)
}
