package handler

import (
	"encoding/json"
	"log"
	"net/http"

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

// ServeWs upgrades HTTP requests to WebSocket connections
func (h *Hub) ServeWs(w http.ResponseWriter, req *http.Request) {
	roomName := req.URL.Query().Get("room")
	if roomName == "" {
		http.Error(w, "Room not specified", http.StatusBadRequest)
		return
	}

	username := req.URL.Query().Get("username")
	if username == "" {
		username = "Anonymous"
	}

	socket, err := upgrader.Upgrade(w, req, nil)
	if err != nil {
		log.Println("Upgrade error:", err)
		return
	}

	r := h.GetRoom(roomName)
	user := &user{
		name:    username,
		socket:  socket,
		recieve: make(chan []byte, messageBuffersize),
		room:    r,
	}
	r.join <- user

	defer func() { r.leave <- user }()

	go user.write()
	user.read()
}