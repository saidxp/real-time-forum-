package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"sort"
	"strings"
	"time"

	auth "forum/internal/auth"
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
	for {
		// Broadcast user list every 2 seconds for real-time updates
		time.Sleep(2 * time.Second)
		h.broadcastGlobalUsers()
	}
}

func (h *Hub) broadcastGlobalUsers() {
	var names []string
	for name := range h.globalUsers {
		names = append(names, name)
	}

	payload, _ := json.Marshal(map[string]interface{}{
		"type": "users",
		"list": names,
	})

	// Send to every connected user
	for _, u := range h.globalUsers {
		select {
		case u.recieve <- payload:
		default:
			// user channel full, skip
		}
	}
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
	r := NewRoom(name) // Pass room name to constructor
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
}

// Create a new Room with name
func NewRoom(name string) *room {
	return &room{
		users:   make(map[*user]bool),
		join:    make(chan *user),
		leave:   make(chan *user),
		forward: make(chan []byte),
		name:    name,
	}
}

// ChatMessageData represents the structure of chat messages
type ChatMessageData struct {
	Type     string `json:"type"`
	Name     string `json:"name"`
	Message  string `json:"message"`
	SenderID int    `json:"sender_id,omitempty"`
}

// Run handles all room events
func (r *room) Run() {
	for {
		select {
		case u := <-r.join:
			r.users[u] = true
			log.Printf("User %s joined room %s", u.name, r.name)
			r.broadcastUsers()

		case u := <-r.leave:
			if _, ok := r.users[u]; ok {
				delete(r.users, u)
				close(u.recieve)
				log.Printf("User %s left room %s", u.name, r.name)
				r.broadcastUsers()
			}

		case msg := <-r.forward:
			// Parse the message to save to database if it's a private chat
			var chatMsg ChatMessageData
			if err := json.Unmarshal(msg, &chatMsg); err == nil {
				log.Printf("Processing message in room %s: %+v", r.name, chatMsg)

				if chatMsg.Type == "message" && strings.HasPrefix(r.name, "private_") {
					// Extract usernames from room name
					usernames := strings.Split(strings.TrimPrefix(r.name, "private_"), "_")
					if len(usernames) == 2 {
						log.Printf("Private chat between %s and %s", usernames[0], usernames[1])

						// Get sender and receiver IDs
						senderID := r.getUserIDByUsername(chatMsg.Name)
						receiverName := usernames[0]
						if receiverName == chatMsg.Name {
							receiverName = usernames[1]
						}
						receiverID := r.getUserIDByUsername(receiverName)

						log.Printf("Sender: %s (ID: %d), Receiver: %s (ID: %d)",
							chatMsg.Name, senderID, receiverName, receiverID)

						if senderID > 0 && receiverID > 0 {
							// Save message to database using db package function
							err := db.SaveChatMessage(senderID, receiverID, chatMsg.Message)
							if err != nil {
								log.Printf("Error saving chat message: %v", err)
							} else {
								log.Printf("Message saved successfully")
							}
						} else {
							log.Printf("Invalid user IDs - cannot save message")
						}
					} else {
						log.Printf("Invalid room name format: %s", r.name)
					}
				} else {
					log.Printf("Not a private message or wrong format")
				}
			} else {
				log.Printf("Error parsing message JSON: %v", err)
			}

			// Forward message to all users in the room
			for usr := range r.users {
				select {
				case usr.recieve <- msg:
				default:
					// User channel is full, skip
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
	var names []string
	for u := range r.users {
		names = append(names, u.name)
	}

	payload, _ := json.Marshal(map[string]interface{}{
		"type": "users",
		"list": names,
	})

	for u := range r.users {
		select {
		case u.recieve <- payload:
		default:
			// User channel is full, skip
		}
	}
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
		defer func() { r.leave <- user }()
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

	// Add to global hub and online users
	h.globalUsers[user.name] = user
	h.broadcastGlobalUsers()
	
	// Import auth to add to online users
	auth.AddOnlineUser(currentUser)

	defer func() {
		r.leave <- user
		delete(h.globalUsers, user.name)
		auth.RemoveOnlineUser(currentUser)
		h.broadcastGlobalUsers()
	}()

	go user.write()
	user.read()
}
