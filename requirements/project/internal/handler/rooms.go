package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"sort"
	"strings"
	"time"

	// auth "forum/internal/auth"
	db "forum/internal/db"

	"github.com/gorilla/websocket"
)

// Hub manages all rooms
type Hub struct {
	Rooms       map[string]*room
	globalUsers map[string]*user // Make this exported so it can be accessed
}

// Create a new Hub
func NewHub() *Hub {
	h := &Hub{
		Rooms:       make(map[string]*room),
		globalUsers: make(map[string]*user),
	}
	go h.run()
	return h
}

// run handles global user events and broadcasts
func (h *Hub) run() {
	// No longer broadcasting user lists via WebSocket
	// Users stay online based on session, not WebSocket connection
}

// broadcastUsersToAllRooms sends user list to all rooms including private chats
func (h *Hub) broadcastUsersToAllRooms() {
	// No longer broadcasting - users stay online based on session
}

func (h *Hub) broadcastGlobalUsers() {
	// No longer broadcasting - users stay online based on session
}

// BroadcastToAllRooms sends a message to all rooms
func (h *Hub) BroadcastToAllRooms(message []byte) {
	for _, room := range h.Rooms {
		select {
		case room.forward <- message:
		default:
			// Room channel is full, skip
		}
	}
}

// CreatePrivateRoomName creates a consistent room name for two users
func CreatePrivateRoomName(user1, user2 string) string {
	users := []string{user1, user2}
	sort.Strings(users) // Always sort to ensure consistent room names
	return "private_" + strings.Join(users, "_")
}

// GetRoom returns an existing room or creates a new one
func (h *Hub) GetRoom(name string) *room {
	if r, ok := h.Rooms[name]; ok {
		return r
	}
	r := NewRoom(name, h) // Pass room name and hub reference
	h.Rooms[name] = r
	go r.Run()
	return r
}

// Room stores users and channels
type room struct {
	users   map[*user]bool
	join    chan *user
	leave   chan *user
	forward chan []byte
	name    string // Store room name
	hub     *Hub   // Reference to hub for global notifications
}

// Create a new Room with name
func NewRoom(name string, hub *Hub) *room {
	return &room{
		users:   make(map[*user]bool),
		join:    make(chan *user),
		leave:   make(chan *user),
		forward: make(chan []byte),
		name:    name,
		hub:     hub,
	}
}

// ChatMessageData represents the structure of chat messages
type ChatMessageData struct {
	Type      string `json:"type"`
	Name      string `json:"name"`
	Message   string `json:"message"`
	SenderID  int    `json:"sender_id,omitempty"`
	CreatedAt string `json:"created_at,omitempty"`
}

// Run handles all room events
func (r *room) Run() {
	for {
		select {
		case u := <-r.join:
			r.users[u] = true
			log.Printf("User %s joined room %s", u.name, r.name)

		case u := <-r.leave:
			if _, ok := r.users[u]; ok {
				delete(r.users, u)
				close(u.recieve)
				log.Printf("User %s left room %s", u.name, r.name)
			}

		case msg := <-r.forward:
			var chatMsg ChatMessageData
			if err := json.Unmarshal(msg, &chatMsg); err == nil {
				log.Printf("✅ Processing message in room %s: %+v", r.name, chatMsg)

				switch chatMsg.Type {
				case "message":
					if strings.HasPrefix(r.name, "private_") {
						usernames := strings.Split(strings.TrimPrefix(r.name, "private_"), "_")
						if len(usernames) == 2 {
							// Get sender ID - prioritize sender_id from message
							var senderID int
							if chatMsg.SenderID > 0 {
								senderID = chatMsg.SenderID
							} else {
								senderID = r.getUserIDByUsername(chatMsg.Name)
							}

							// Determine receiver
							receiverName := usernames[0]
							if receiverName == chatMsg.Name {
								receiverName = usernames[1]
							}
							receiverID := r.getUserIDByUsername(receiverName)

							log.Printf("💬 Sender: %s (ID: %d), Receiver: %s (ID: %d)",
								chatMsg.Name, senderID, receiverName, receiverID)

							if senderID <= 0 || receiverID <= 0 {
								log.Printf("❌ Invalid user IDs - skipping save")
								// Still forward the message even if save fails
								break
							}

							// Save message to database
							err := db.SaveChatMessage(senderID, receiverID, chatMsg.Message)
							if err != nil {
								log.Printf("❌ Error saving message: %v", err)
							} else {
								log.Printf("✅ Message saved successfully")

								// IMPORTANT: Retrieve the saved message to get the created_at timestamp
								messages, err := db.GetChatMessages(senderID, receiverID, 1, 0)
								if err == nil && len(messages) > 0 {
									// Update the message with the actual created_at from database
									chatMsg.CreatedAt = messages[0].CreatedAt.Format(time.RFC3339)
									// Re-marshal with updated timestamp
									if updatedMsg, err := json.Marshal(chatMsg); err == nil {
										msg = updatedMsg
									}
								}
							}
						}
					}
				case "typing", "stop_typing":
					log.Printf("⌨️ Typing indicator: %s from %s", chatMsg.Type, chatMsg.Name)
				}
			}

			// Forward message to all users in the room
			for usr := range r.users {
				select {
				case usr.recieve <- msg:
					log.Printf("✅ Message forwarded to user %s", usr.name)
				default:
					log.Printf("⚠️ User %s channel full, message dropped", usr.name)
				}
			}
		}
	}
}

// Helper method to get user ID by username from database
func (r *room) getUserIDByUsername(username string) int {
	userID, err := db.GetUserIDByUsername(username)
	if err != nil {
		log.Printf("Error getting user ID for %s: %v", username, err)
		return 0
	}
	return userID
}

// broadcastUsers sends the current online users in the room
func (r *room) broadcastUsers() {
	// No longer broadcasting - users stay online based on session
}

// Constants for WebSocket buffer sizes
const (
	socketBuffersize  = 1024
	messageBuffersize = 256
)

// WebSocket upgrader
var upgrader = &websocket.Upgrader{
	ReadBufferSize:  socketBuffersize,
	WriteBufferSize: messageBuffersize,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

// ServeWs upgrades HTTP requests to WebSocket connections for private chat
func (h *Hub) ServeWs(w http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodGet {
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(http.StatusMethodNotAllowed)
        json.NewEncoder(w).Encode(map[string]any{
            "status":  "error",
            "message": "Method not allowed. Only GET is supported.",
        })
        http.Redirect(w, req, "/unauthorized", http.StatusSeeOther)
        return
    }
	
    accept := req.Header.Get("Accept")
    if containsHTML(accept) {
        // If browser wants HTML, redirect to unauthorized
        http.Redirect(w, req, "/unauthorized", http.StatusSeeOther)
        return
    }
	roomName := req.URL.Query().Get("room")
	user1 := req.URL.Query().Get("user1")
	user2 := req.URL.Query().Get("user2")
	currentUser := req.URL.Query().Get("username")

	if currentUser == "" {
		currentUser = "Anonymous"
	}

	log.Printf("WebSocket connection request - Room: %s, User1: %s, User2: %s, Current: %s",
		roomName, user1, user2, currentUser)

	// Get current user ID for database operations
	var currentUserID int
	if sessionCookie, err := req.Cookie("session_token"); err == nil {
		if userID, hasSession, err := db.SelectUserSession(sessionCookie.Value); err == nil && hasSession {
			currentUserID = userID
			log.Printf("Current user ID from session: %d", currentUserID)
		}
	}

	// Case 1: Public room
	if roomName != "" {
		socket, err := upgrader.Upgrade(w, req, nil)
		if err != nil {
			log.Println("Upgrade error:", err)
			return
		}

		r := h.GetRoom(roomName)
		user := &user{
			name:    currentUser,
			socket:  socket,
			recieve: make(chan []byte, messageBuffersize),
			room:    r,
			userID:  currentUserID,
		}
		r.join <- user

		// Add to global users but don't manage online status via WebSocket
		h.globalUsers[user.name] = user

		defer func() {
			r.leave <- user
			delete(h.globalUsers, user.name)
		}()
		go user.write()
		user.read()
		return
	}

	// Case 2: Private chat
	if user1 == "" || user2 == "" {
		http.Error(w, "Must specify room or both user1/user2", http.StatusBadRequest)
		return
	}

	if currentUser != user1 && currentUser != user2 {
		http.Error(w, "You can only join your own private chats", http.StatusForbidden)
		return
	}

	roomName = CreatePrivateRoomName(user1, user2)
	log.Printf("Creating/joining private room: %s", roomName)

	socket, err := upgrader.Upgrade(w, req, nil)
	if err != nil {
		log.Println("Upgrade error:", err)
		return
	}

	r := h.GetRoom(roomName)
	user := &user{
		name:    currentUser,
		socket:  socket,
		recieve: make(chan []byte, messageBuffersize),
		room:    r,
		userID:  currentUserID,
	}

	r.join <- user

	// Add to global hub but don't manage online status via WebSocket
	h.globalUsers[user.name] = user

	defer func() {
		r.leave <- user
		delete(h.globalUsers, user.name)
	}()

	go user.write()
	user.read()
}
