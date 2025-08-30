package auth

import (
	"context"
	db "forum/internal/db"
	forumerror "forum/internal/error"
	repo "forum/internal/repository"
	utils "forum/internal/utils"
	"net/http"
)

func SwitchRegister(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		if r.URL.RawQuery != ""{
			http.Redirect(w,r,"/register",http.StatusSeeOther)
			return
		} 
		ServRegister(w, r)
	case http.MethodPost:
		SubmitRegister(w, r)
	default:
		forumerror.MethodNotAllowed(w, r)
	}
}

func ServRegister(w http.ResponseWriter, r *http.Request) {
	var errMap map[string]any
	if r.Context().Value(repo.USER_ID_KEY) != nil && r.Context().Value(repo.USER_ID_KEY).(int) != -1 {
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}
	if r.Context().Value(repo.ERROR_CASE) != nil {
		errMap = r.Context().Value(repo.ERROR_CASE).(map[string]any)
	}
	repo.GLOBAL_TEMPLATE.ExecuteTemplate(w, "register.html", errMap)
}

func SubmitRegister(w http.ResponseWriter, r *http.Request) {
	username := r.FormValue("username")
	email := r.FormValue("email")
	password := r.FormValue("password")
	confirm_password := r.FormValue("confirm_password")

	if !utils.ValidUsername(username) {
		ctx := context.WithValue(r.Context(), repo.ERROR_CASE, map[string]any{"Error": true, "Message": "Invalid username"})
		ServRegister(w, r.WithContext(ctx))
		return
	}

	if !utils.ValidEmail(email) {
		ctx := context.WithValue(r.Context(), repo.ERROR_CASE, map[string]any{"Error": true, "Message": "Invalid email"})
		ServRegister(w, r.WithContext(ctx))
		return
	}

	if !utils.ValidPassword(password) {
		ctx := context.WithValue(r.Context(), repo.ERROR_CASE, map[string]any{"Error": true, "Message": "Invalid password"})
		ServRegister(w, r.WithContext(ctx))
		return
	}

	if confirm_password != password {
		ctx := context.WithValue(r.Context(), repo.ERROR_CASE, map[string]any{"Error": true, "Message": "You failed to confirm your password"})
		ServRegister(w, r.WithContext(ctx))
		return
	}

	hash, err := utils.HashPassword(password)
	if err != nil {
		forumerror.InternalServerError(w, r, err)
		return
	}

	err = db.AddNewUser(username, email, hash)
	if err != nil {
		if err.Error() == "UNIQUE constraint failed: users.username" || err.Error() == "UNIQUE constraint failed: users.email" {
			ctx := context.WithValue(r.Context(), repo.ERROR_CASE, map[string]any{"Error": true, "Message": "username or email alredy used"})
			ServRegister(w, r.WithContext(ctx))
			return
		} else {
			forumerror.InternalServerError(w, r, err)
		}
		return
	}

	// sign in from registration
	SubmitLogin(w, r)
}
