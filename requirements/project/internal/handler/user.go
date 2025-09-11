package handler

import (
	"github.com/gorilla/websocket"
)

type user struct {
    name    string
    socket  *websocket.Conn
    recieve chan []byte
    room    *room
}


func (c *user) read() {
	for {
		_, msg, err := c.socket.ReadMessage()
		if err != nil {
			return
		}
		c.room.forward <- msg
	}
}

func (c *user) write() {
	defer c.socket.Close()
	for msg := range c.recieve {
		err := c.socket.WriteMessage(websocket.TextMessage, msg)
		if err != nil {
			return
		}
	}
}

