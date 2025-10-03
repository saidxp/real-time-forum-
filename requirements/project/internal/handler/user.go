package handler

import (
	"encoding/json"
	"fmt"
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
	// struct of message and type
	 
	for {
		_, msg, err := c.socket.ReadMessage()
		// her i will add check for message !! \\
		fmt.Println(string(msg))
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error for user %s: %v", c.name, err)
			} else {
				log.Printf("User %s disconnected normally", c.name)
			}
			return
		}

		log.Printf("Received message from %s: %s", c.name, string(msg))

		if c.room != nil {
			select {
			case c.room.forward <- msg:
				log.Printf("Message forwarded to room")
			default:
				log.Printf("Room channel full, message dropped")
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
		fmt.Printf("Im At Write Case ")
		fmt.Println(string(msg))
		fmt.Println("====im at user=====")
		fmt.Println(c.name)
		fmt.Println("==================")
		if c.socket == nil {
			log.Printf("Socket is nil for user %s", c.name)
			return
		}

		var chatMsg ChatMessageData
		if err := json.Unmarshal(msg, &chatMsg); err != nil {
			log.Printf("Failed to parse message JSON: %v", err)
			continue
		}

		var outgoing []byte
		var err error

		switch chatMsg.Type {
		case "message":
			 
			outgoing, err = json.Marshal(chatMsg)
			if err != nil {
				log.Printf("Failed to marshal message: %v", err)
				continue
			}

		case "typing":
	 
			if c.name != chatMsg.Name {
				outgoing, err = json.Marshal(chatMsg)
				if err != nil {
					log.Printf("Failed to marshal typing message: %v", err)
					continue
				}
			} else {
		 
				continue
			}

		default:
			// unknown type, skip
			continue
		}
		fmt.Println("The Name Who Is come from the front ")
		fmt.Println(chatMsg.To)
		fmt.Println("<====================================>")

		// finally, write to the websocket
		if (c.name == chatMsg.To) {
		// fmt.Println(outgoing.Name)
			fmt.Println("===========")
		if err := c.socket.WriteMessage(websocket.TextMessage, outgoing); err != nil {
			log.Printf("Write error for user %s: %v", c.name, err)
			return
		}
		}
		if (chatMsg.Type == "message") {
			if err := c.socket.WriteMessage(websocket.TextMessage, outgoing); err != nil {
				log.Printf("Write error for user %s: %v", c.name, err)
				return
		}
		}

		log.Printf("Message sent to %s: %s", c.name, string(outgoing))
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
	if err != nil || !hasSession {				log.Printf("Room channel full, message dropped")

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
