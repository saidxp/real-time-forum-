package handler

import (
	//"database/sql"
	"encoding/json"
	"fmt"
	"forum/internal/db"
	forumerror "forum/internal/error"
	"forum/internal/repository"
	"forum/internal/utils"
	"html"
	"net/http"
	"strings"
)


func PostPostHandler(w http.ResponseWriter, r *http.Request) {

	fmt.Println("hhhhhhhhh")
	// get user id from context !!
	userID := r.Context().Value(repository.USER_ID_KEY).(int)

	canPost, err := db.IsUserCanPostToday(userID)
	if err != nil {
		forumerror.InternalServerError(w, r, err)
		return
	}
	if !canPost {
		w.WriteHeader(http.StatusTooManyRequests)
		json.NewEncoder(w).Encode(map[string]string{"error": "You can only post once per day"})
		return
	}

	title := strings.TrimSpace(html.EscapeString(r.FormValue("title")))
	content := strings.TrimSpace(html.EscapeString(r.FormValue("content")))
	if title == "" || content == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Title and content are required"})
		return
	}

	if !utils.ValidPost(content) || !utils.ValidPostTitle(title) {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid title or content"})
		return
	}

	categories := r.Form["Categories"]
	for _, c := range categories {
		if !repository.IT_MAJOR_FIELDS[c] {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Invalid category"})
			return
		}
	}
	// <=================================>
	postID, err := db.AddNewPost(userID, title, content)
	if err != nil {
		forumerror.InternalServerError(w, r, err)
		return
	}

	if err := db.MapPostWithCategories(postID, categories); err != nil {
		forumerror.InternalServerError(w, r, err)
		return
	}

	// return json with post info instead of redirect them !!
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]any{
		"success":    true,
		"postID":     postID,
		"title":      title,
		"content":    content,
		"categories": categories,
	})
}
