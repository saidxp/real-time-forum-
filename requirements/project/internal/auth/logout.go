package auth

import (
	db "forum/internal/db"
	forumerror "forum/internal/error"
	"net/http"
	"time"
	"encoding/json"
)

func LogoutHandler(w http.ResponseWriter, r *http.Request) {
	// the cookies check 
	sessionCookie, err := r.Cookie("session_token")
	if err != nil || sessionCookie.Value == "" {
		// No valid session, just return JSON
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "No active session",
		})
		return
	}
	
	sessionToken := sessionCookie.Value

	userId, hasSession, err := db.SelectUserSession(sessionToken)
	if err != nil {
		forumerror.InternalServerError(w, r, err)
		return
	}

	ok, err := db.ResetUserSession(sessionToken)
	if err != nil {
		forumerror.InternalServerError(w, r, err)
		return
	}
	if !ok {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Invalid session",
		})
		return
	}

	delete(OnlineUsers, userId)
	BroadcastUsers() // This now works without import cycle

	// Clear the session cookie on the client side Front !!!
	clearCookie := &http.Cookie{
		Name:     "session_token",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
		Expires:  time.Unix(0, 0),  
		MaxAge:   -1,
	}
	http.SetCookie(w, clearCookie)

	// Handle invalid sessions
	if !hasSession {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Invalid session",
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message":  "Logged out successfully",
		"redirect": "/",
	})
}