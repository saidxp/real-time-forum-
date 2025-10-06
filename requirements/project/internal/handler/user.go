package handler

import (
	"encoding/json"
	db "forum/internal/db"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

type user struct {
	name    string
	socket  *websocket.Conn
	recieve chan []byte
	room    *room
	userID  int
}

func (c *user) read() {
	defer func() {
		if c.room != nil {
			c.room.leave <- c
		}
		if c.socket != nil {
			c.socket.Close()
		}
	}()

	for {
		_, msg, err := c.socket.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error for user %s: %v", c.name, err)
			} else {
				log.Printf("User %s disconnected normally", c.name)
			}
			return
		}

		log.Printf("✅ Received message from %s: %s", c.name, string(msg))

		if c.room != nil {
			// Add sender ID to message before forwarding
			var msgData map[string]interface{}
			if err := json.Unmarshal(msg, &msgData); err == nil {
				msgData["sender_id"] = c.userID
				msgData["created_at"] = "" // Will be set by database
				if modifiedMsg, err := json.Marshal(msgData); err == nil {
					select {
					case c.room.forward <- modifiedMsg:
						log.Printf("✅ Message forwarded to room with sender_id %d", c.userID)
					default:
						log.Printf("⚠️ Room channel full, message dropped")
					}
				} else {
					log.Printf("❌ Error marshaling modified message: %v", err)
				}
			} else {
				// Fallback: forward original message
				select {
				case c.room.forward <- msg:
					log.Printf("✅ Message forwarded to room (fallback)")
				default:
					log.Printf("⚠️ Room channel full, message dropped")
				}
			}
		}
	}
}

func (c *user) write() {
	defer func() {
		if c.socket != nil {
			c.socket.Close()
		}
	}()

	for msg := range c.recieve {
		if c.socket == nil {
			log.Printf("Socket is nil for user %s", c.name)
			return
		}

		err := c.socket.WriteMessage(websocket.TextMessage, msg)
		if err != nil {
			log.Printf("Write error for user %s: %v", c.name, err)
			return
		}

		log.Printf("Message sent to %s: %s", c.name, string(msg))
	}
}

func GetLastMessagesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get current user from session (NOT from context)
	sessionCookie, err := r.Cookie("session_token")
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	currentUserID, hasSession, err := db.SelectUserSession(sessionCookie.Value)
	if err != nil || !hasSession {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Get last messages for sorting
	lastMessages, err := db.GetLastMessagesForUser(currentUserID)
	if err != nil {
		log.Printf("Error getting last messages: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"last_messages": lastMessages,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
