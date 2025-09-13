package auth

import (
	"encoding/json"
)

// Define an interface for broadcasting without importing handler
type Broadcaster interface {
	BroadcastToAllRooms([]byte)
}

// Global hub instance - use interface to avoid import cycle
var GlobalHub Broadcaster

func BroadcastUsers() {
	if GlobalHub == nil {
		return // Hub not initialized yet
	}
	
	users := []string{}
	for _, name := range OnlineUsers {
		users = append(users, name)
	}

	payload, _ := json.Marshal(map[string]interface{}{
		"type": "users",
		"list": users,
	})

	GlobalHub.BroadcastToAllRooms(payload)
}