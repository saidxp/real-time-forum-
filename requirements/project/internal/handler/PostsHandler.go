package handler

import (
     "encoding/json"
	"net/http"
 
	repo "forum/internal/repository"

	_ "github.com/mattn/go-sqlite3"
)

func PostsHandlerApi(w http.ResponseWriter, r *http.Request) {
    confMap := make(map[string]any)

    // Determine if user is authenticated
    userId := r.Context().Value(repo.USER_ID_KEY).(int)
    authenticated := userId != -1
    confMap["Authenticated"] = authenticated

    // handle pagination
    page, err := Pagination(w, r, confMap)
    if err != nil {
        return
    }

    // fetch posts
    if err := GetPostsByFilter(w, r, confMap, page); err != nil {
        return
    }

    // respond with JSON
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(confMap)
}

