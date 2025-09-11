package auth

import (
	"encoding/json"
)

// Global hub instance - will be set from main or wherever you initialize the hub
var GlobalHub interface {
	BroadcastToAllRooms([]byte)
}

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