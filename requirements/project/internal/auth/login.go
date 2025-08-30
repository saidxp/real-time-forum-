package auth

import (
	"context"
	db "forum/internal/db"
	forumerror "forum/internal/error"
	repo "forum/internal/repository"
	utils "forum/internal/utils"
	"net/http"
	"time"
)

func SwitchLogin(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		if r.URL.RawQuery != "" {
			http.Redirect(w, r, "/login", http.StatusSeeOther)
			return
		}
		ServLogin(w, r)
	case http.MethodPost:
		SubmitLogin(w, r)
	default:
		forumerror.MethodNotAllowed(w, r)
	}
}

func ServLogin(w http.ResponseWriter, r *http.Request) {
	var errMap map[string]any
	if r.Context().Value(repo.USER_ID_KEY) != nil && r.Context().Value(repo.USER_ID_KEY).(int) != -1 {
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}

	// usrName, err := db.GetUserNameById(userId)

	if r.Context().Value(repo.ERROR_CASE) != nil {
		errMap = r.Context().Value(repo.ERROR_CASE).(map[string]any)
	}
	repo.GLOBAL_TEMPLATE.ExecuteTemplate(w, "login.html", errMap)
}

func SubmitLogin(w http.ResponseWriter, r *http.Request) {

	username := r.FormValue("username")
	password := r.FormValue("password")

	exist, err := db.AlreadyExists(username, username)

	if err != nil {
		forumerror.InternalServerError(w, r, err)
		return
	}

	if (!utils.ValidUsername(username) && !utils.ValidEmail(username)) || !utils.ValidPassword(password) || !exist {
		ctx := context.WithValue(r.Context(), repo.ERROR_CASE, map[string]any{"Error": true, "Message": "invalid credentials try again"})
		ServLogin(w, r.WithContext(ctx))
		return
	}

	userId, hash, err := db.GetUserHashByUsername(username)

	if err != nil {
		forumerror.InternalServerError(w, r, err)
		return
	}

	if !utils.CheckPassword(password, hash) {
		ctx := context.WithValue(r.Context(), repo.ERROR_CASE, map[string]any{"Error": true, "Message": "Wrong password try again"})
		ServLogin(w, r.WithContext(ctx))
		return
	}

	session := GenerateToken(32)
	
	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    session,
		Expires:  time.Now().Add(time.Hour * 1),
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
	})

	err = db.UpdateUserSession(userId, session)

	if err != nil {
		forumerror.InternalServerError(w, r, err)
		return
	}

	http.Redirect(w, r, "/", http.StatusSeeOther)
}
