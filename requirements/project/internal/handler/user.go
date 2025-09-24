package handler

import (
	"log"

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
