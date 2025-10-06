package auth

import (
	"fmt"
	db "forum/internal/db"
	forumerror "forum/internal/error"

	"encoding/json"
	utils "forum/internal/utils"

	"net/http"
	"time"
)

var OnlineUsers = make(map[int]string) 

func SubmitLogin(w http.ResponseWriter, r *http.Request) {

	var payload struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	err := json.NewDecoder(r.Body).Decode(&payload)
	if err != nil {
		 
		return
	}
	username := payload.Username
	password := payload.Password
	exist, err := db.AlreadyExists(username, username)
	if err != nil {
		forumerror.InternalServerError(w, r, err)
		return
	}
	if (!utils.ValidUsername(username) && !utils.ValidEmail(username)) || !utils.ValidPassword(password) || !exist {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]any{
			"status":  "error",
			"message": "invalid credentials, try again",
		})
		return
	}
	userId, hash, err := db.GetUserHashByUsername(username)
	if err != nil {
		forumerror.InternalServerError(w, r, err)
		return
	}
	if !utils.CheckPassword(password, hash) {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]any{
			"status":  "error",
			"message": "wrong password, try again",
		})
		return
	}

	fmt.Println("im at before token")
	session := GenerateToken(32)
	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    session,
		Expires:  time.Now().Add(time.Hour),
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
	fmt.Println("im her after i update session")
	err = db.UpdateUserSession(userId, session)
	if err != nil {
		forumerror.InternalServerError(w, r, err)
		return
	}
    fmt.Println(username)
    // 
	OnlineUsers[userId] = username
	BroadcastUserJoined(username) // Broadcast specific user joined event
	BroadcastUsers() // Also broadcast full user list

	json.NewEncoder(w).Encode(map[string]any{
		"status":   "ok",
		"username": username,
		"userId":   userId,
		"token":    session,
	})
}