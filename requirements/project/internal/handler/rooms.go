// rooms.go
package handler

import (
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

type Hub struct {
	rooms map[string]*room
}

func NewHub() *Hub {
	return &Hub{rooms: make(map[string]*room)}
}

func (h *Hub) GetRoom(name string) *room {
	if r, ok := h.rooms[name]; ok {
		return r
	}
	r := NewRoom()
	h.rooms[name] = r
	go r.Run()
	return r
}

type room struct {
	users    map[*user]bool
	join     chan *user
	leave    chan *user
	forward  chan []byte
}

func NewRoom() *room {
	return &room{
		forward: make(chan []byte),
		join:    make(chan *user),
		leave:   make(chan *user),
		users:   make(map[*user]bool),
	}
}

func (r *room) Run() {
	for {
		select {
		case user := <-r.join:
			r.users[user] = true
		case user := <-r.leave:
			delete(r.users, user)
			close(user.recieve)
		case msg := <-r.forward:
			for user := range r.users {
				user.recieve <- msg
			}
		}
	}
}

const (
	socketBuffersize   = 1024
	messageBuffersize  = 256
)

var upgrader = &websocket.Upgrader{
	ReadBufferSize:  socketBuffersize,
	WriteBufferSize: messageBuffersize,
	CheckOrigin:     func(r *http.Request) bool { return true }, 
}

func (h *Hub) ServeWs(w http.ResponseWriter, req *http.Request) {
	roomName := req.URL.Query().Get("room")
	if roomName == "" {
		http.Error(w, "Room not specified", http.StatusBadRequest)
		return
	}

	socket, err := upgrader.Upgrade(w, req, nil)
	if err != nil {
		log.Println("Upgrade error:", err)
		return
	}

	r := h.GetRoom(roomName)
	user := &user{
		socket:  socket,
		recieve: make(chan []byte, messageBuffersize),
		room:    r,
	}
	r.join <- user

	defer func() { r.leave <- user }()

	go user.write()
	user.read()
}
