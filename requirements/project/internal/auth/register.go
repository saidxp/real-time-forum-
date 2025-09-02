package auth

import (
	"encoding/json"
	"fmt"
	db "forum/internal/db"
	utils "forum/internal/utils"
	"net/http"
	"strings"
)

func SubmitRegister(w http.ResponseWriter, r *http.Request) {
	// Parse JSON body
	fmt.Println("HHHHHHHHowa")
	var input struct {
		Username        string `json:"username"`
		Email           string `json:"email"`
		Password        string `json:"password"`
		ConfirmPassword string `json:"confirmPassword"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		// fallback: form submission
		input.Username = r.FormValue("username")
		input.Email = r.FormValue("email")
		input.Password = r.FormValue("password")
		input.ConfirmPassword = r.FormValue("confirm_password")
	}

	username := input.Username
	email := input.Email
	password := input.Password
	confirm_password := input.ConfirmPassword

	// === validation ===
	if !utils.ValidUsername(username) {
		http.Error(w, `{"status":"error","message":"Invalid username"}`, http.StatusBadRequest)
		return
	}
	if !utils.ValidEmail(email) {
		http.Error(w, `{"status":"error","message":"Invalid email"}`, http.StatusBadRequest)
		return
	}
	if !utils.ValidPassword(password) {
		http.Error(w, `{"status":"error","message":"Invalid password"}`, http.StatusBadRequest)
		return
	}
	if confirm_password != password {
		http.Error(w, `{"status":"error","message":"Passwords do not match"}`, http.StatusBadRequest)
		return
	}

	hash, err := utils.HashPassword(password)
	if err != nil {
		http.Error(w, `{"status":"error","message":"Server error"}`, http.StatusInternalServerError)
		return
	}

	err = db.AddNewUser(username, email, hash)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE constraint failed") {
			http.Error(w, `{"status":"error","message":"username or email already used"}`, http.StatusConflict)
			return
		}
		http.Error(w, `{"status":"error","message":"Server error"}`, http.StatusInternalServerError)
		return
	}

	//  <=====================>
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]any{
		"status":  "ok",
		"message": "Registration successful! Please login.",
	})
}
