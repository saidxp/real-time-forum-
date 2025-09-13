package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"sort"
	"strings"

	"github.com/gorilla/websocket"
)

// Hub manages all rooms
type Hub struct {
	Rooms map[string]*room // Make this exported so it can be accessed
}

// Create a new Hub
func NewHub() *Hub {
	return &Hub{Rooms: make(map[string]*room)}
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
	r := NewRoom()
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
}

// Create a new Room
func NewRoom() *room {
	return &room{
		users:   make(map[*user]bool),
		join:    make(chan *user),
		leave:   make(chan *user),
		forward: make(chan []byte),
	}
}

// Run handles all room events
func (r *room) Run() {
	for {
		select {
		case u := <-r.join:
			r.users[u] = true
			r.broadcastUsers()

		case u := <-r.leave:
			if _, ok := r.users[u]; ok {
				delete(r.users, u)
				close(u.recieve)
				r.broadcastUsers()
			}

		case msg := <-r.forward:
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
    }
    r.join <- user
    defer func() { r.leave <- user }()
    go user.write()
    user.read()
}
