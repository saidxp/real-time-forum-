package auth

import (
	"encoding/json"
	"net/http"
	"sync"
)

var (
	onlineUsers   = make(map[string]bool) // username -> true
	onlineUsersMu sync.Mutex
)

// ---------------------------
// Add / Remove Users
// ---------------------------
func AddOnlineUser(username string) {
	onlineUsersMu.Lock()
	defer onlineUsersMu.Unlock()
	onlineUsers[username] = true
	// Broadcast user joined event
	if GlobalHub != nil {
		message := map[string]interface{}{
			"type":     "user_joined",
			"username": username,
		}
		if msgBytes, err := json.Marshal(message); err == nil {
			GlobalHub.BroadcastToAllRooms(msgBytes)
		}
	}
}

func RemoveOnlineUser(username string) {
	onlineUsersMu.Lock()
	defer onlineUsersMu.Unlock()
	delete(onlineUsers, username)
	// Broadcast user left event
	if GlobalHub != nil {
		message := map[string]interface{}{
			"type":     "user_left",
			"username": username,
		}
		if msgBytes, err := json.Marshal(message); err == nil {
			GlobalHub.BroadcastToAllRooms(msgBytes)
		}
	}
}

// ---------------------------
// Helper to get online usernames as slice
// ---------------------------
func getOnlineUsersList() []string {
	onlineUsersMu.Lock()
	defer onlineUsersMu.Unlock()
	users := make([]string, 0, len(onlineUsers))
	for u := range onlineUsers {
		users = append(users, u)
	}
	return users
}

// ---------------------------
// HTTP Handler to return online users as JSON
// ---------------------------
func GetOnlineUsersHandler(w http.ResponseWriter, r *http.Request) {
	users := getOnlineUsersList()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}
