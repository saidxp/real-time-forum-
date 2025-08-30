package handler

import (
	db "forum/internal/db"
	forumerror "forum/internal/error"
	repo "forum/internal/repository"
	"forum/internal/utils"
	"html"
	"net/http"
	"strings"
)

func NewPostHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		GetPostHandler(w, r)
	} else if r.Method == http.MethodPost {
		PostPostHandler(w, r)
	} else {
		forumerror.MethodNotAllowed(w, r)
		return
	}
}

func GetPostHandler(w http.ResponseWriter, r *http.Request) {
	var confMap = make(map[string]any)
	if r.Context().Value(repo.ERROR_CASE) != nil {
		confMap = r.Context().Value(repo.ERROR_CASE).(map[string]any)
	}

	var tmp = make(map[string]any)
	for k, v := range repo.IT_MAJOR_FIELDS {
		if k != "All categories" {
			tmp[k] = v
		}
	}
	confMap["Fields"] = tmp
	userId := r.Context().Value(repo.USER_ID_KEY).(int)
	user, err := db.GetUserInfo(userId)
	if err != nil {
		forumerror.InternalServerError(w, r, err)
		return
	}
	confMap["Username"] = user.Username
	repo.GLOBAL_TEMPLATE.ExecuteTemplate(w, "new_post.html", confMap)
}

func PostPostHandler(w http.ResponseWriter, r *http.Request) {
	userId := r.Context().Value(repo.USER_ID_KEY).(int)

	IsUserCanPostToday, err := db.IsUserCanPostToday(userId)
	if !IsUserCanPostToday {
		forumerror.TooManyRequests(w, r, "posts")
		return
	}
	if err != nil {
		forumerror.InternalServerError(w, r, err)
		return
	}

	escapedTitle := html.EscapeString(r.FormValue("title"))
	escapedContent := html.EscapeString(r.FormValue("content"))

	trimedTitle := strings.TrimSpace(escapedTitle)
	trimedContent := strings.TrimSpace(escapedContent)
	if trimedTitle == "" || trimedContent == "" {
		http.Redirect(w, r, "/newPost", http.StatusSeeOther)
		return
	}

	if !utils.ValidPost(escapedContent) || !utils.ValidPostTitle(escapedTitle) {
		forumerror.BadRequest(w, r)
		return
	}
	categories := r.Form["Categories"]
	for _, c := range categories {
		if !repo.IT_MAJOR_FIELDS[c] {
			forumerror.BadRequest(w, r)
			return
		}
	}
	postId, err := db.AddNewPost(userId, escapedTitle, escapedContent)
	if err != nil {
		forumerror.InternalServerError(w, r, err)
		return
	}

	err = r.ParseForm()
	if err != nil {
		forumerror.InternalServerError(w, r, err)
		return
	}

	err = db.MapPostWithCategories(postId, categories)
	if err != nil {
		forumerror.InternalServerError(w, r, err)
		return
	}

	http.Redirect(w, r, "/", http.StatusSeeOther)
}
