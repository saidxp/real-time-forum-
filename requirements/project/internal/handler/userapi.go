package handler

import (
	"encoding/json"
	"net/http"
	auth "forum/internal/auth"
	db "forum/internal/db"
)

// OnlineUsersHandler returns list of online users for chat selection
func OnlineUsersHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	// Get current user from session to exclude them from the list
	var currentUsername string
	if sessionCookie, err := r.Cookie("session_token"); err == nil {
		if userId, hasSession, err := db.SelectUserSession(sessionCookie.Value); err == nil && hasSession {
			if username, exists := auth.OnlineUsers[userId]; exists {
				currentUsername = username
			}
		}
	}

	// Build list of online users (excluding current user)
	var onlineUsers []string
	for _, username := range auth.OnlineUsers {
		if username != currentUsername {
			onlineUsers = append(onlineUsers, username)
		}
	}

	response := map[string]interface{}{
		"users": onlineUsers,
	}

	json.NewEncoder(w).Encode(response)
}