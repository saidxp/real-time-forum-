package handler

import (
	"database/sql"
	"fmt"
	db "forum/internal/db"
	forumerror "forum/internal/error"
	repo "forum/internal/repository"
	"math"
	"net/http"
	"strconv"
	"encoding/json"
)

func PostHandler(w http.ResponseWriter, r *http.Request) {
	
	// Only allow GET requests
	if r.Method != http.MethodGet {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]any{
			"status":  "error",
			"message": "Method not allowed. This endpoint only supports GET requests.",
		})
		return
	}
	if r.Header.Get("Accept") == "text/html" {
    // User typed in the URL or clicked a link
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusForbidden)
    json.NewEncoder(w).Encode(map[string]any{
        "status":  "error",
        "message": "This endpoint is only accessible via SPA (JavaScript fetch).",
    })
    return
	}
	var resp repo.PostResponse

	// ====== Authentication state ======
	userID := r.Context().Value(repo.USER_ID_KEY).(int)
	if userID == -1 {
		resp.Authenticated = false
	} else {
		resp.Authenticated = true
		resp.Username = r.Context().Value(repo.USER_NAME).(string)
		if resp.Username != "" {
			resp.Initial = resp.Username[:1]
		}
	}

	// ====== Post ID ======
	Idpost := r.URL.Query().Get("Id")
	Id, err := strconv.Atoi(Idpost)
	if err != nil {
		forumerror.BadRequest(w, r)
		return
	}

	// ====== Fetch post ======
	post, err := db.GetPostByID(Id, userID)
	if err == sql.ErrNoRows {
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}
	if err != nil {
		forumerror.InternalServerError(w, r, err)
		return
	}
	resp.Post = post

	// ====== Pagination ======
	page := 1
	if pageStr := r.URL.Query().Get("page"); pageStr != "" {
		p, err := strconv.Atoi(pageStr)
		if err != nil || p < 1 {
			forumerror.BadRequest(w, r)
			return
		}
		page = p
	}
	resp.CurrentPage = page
	resp.HasPrev = page > 1
	if resp.HasPrev {
		prevQuery := r.URL.Query()
		prevQuery.Set("page", strconv.Itoa(page-1))
		resp.PrevPage = r.URL.Path + "?" + prevQuery.Encode()
	}

	// ====== < Comments >======
	comments, totalComments, err := db.GetCommentsByPostPaginated(Id, page, userID)
	if err != nil {
		forumerror.InternalServerError(w, r, err)
		return
	}
	if float64(page) > math.Ceil(float64(totalComments)/10) && totalComments > 0 {
		forumerror.BadRequest(w, r)
		return
	}
	if totalComments == 0 && page != 1 {
		forumerror.BadRequest(w, r)
		return
	}
	resp.Comments = comments
	resp.HasNext = totalComments > page*10
	if resp.HasNext {
		nextQuery := r.URL.Query()
		nextQuery.Set("page", strconv.Itoa(page+1))
		resp.NextPage = r.URL.Path + "?" + nextQuery.Encode()
	}
	// ====== Mark as success ======
	resp.Success = true	
	fmt.Println(resp.Comments)
	// ====== Send JSON ======
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		forumerror.InternalServerError(w, r, err)
	}
}


/*
func PostHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Howa Hada")
	if r.Method != http.MethodGet {
		forumerror.MethodNotAllowed(w, r)
		return
	}

	fmt.Println("Howa Hada")

	var confMap = make(map[string]any)
	userID := r.Context().Value(repo.USER_ID_KEY).(int)
	if r.Context().Value(repo.USER_ID_KEY).(int) == -1 {
		confMap["Authenticated"] = false
	} else {
		confMap["Authenticated"] = true
		confMap["Username"] = r.Context().Value(repo.USER_NAME).(string)
		if confMap["Username"] != "" {
			confMap["Initial"] = confMap["Username"].(string)[:1]
		}
	}
	Idpost := r.URL.Query().Get("Id")
	Id, err := strconv.Atoi(Idpost)
	if err != nil {
		forumerror.BadRequest(w, r)
		return
	}
	post, err := db.GetPostByID(Id, userID)
	if err == sql.ErrNoRows {
		http.Redirect(w, r, "/", http.StatusSeeOther)
	}
	if err != nil {
		forumerror.InternalServerError(w, r, err)
		return
	}
	confMap["Post"] = post

	page := 1
	if pageStr := r.URL.Query().Get("page"); pageStr != "" {
		p, err := strconv.Atoi(pageStr)
		if err != nil || p < 1 {
			forumerror.BadRequest(w, r)
			return
		}
		page = p
	}
	confMap["CurrentPage"] = page
	confMap["PrintCurrentPage"] = page != 1
	confMap["HasPrev"] = page > 1

	if page > 1 {
		prevQuery := r.URL.Query()
		prevQuery.Set("page", strconv.Itoa(page-1))
		confMap["PrevPage"] = r.URL.Path + "?" + prevQuery.Encode()
	}

	comments, totalComments, err := db.GetCommentsByPostPaginated(Id, page, userID)

	if float64(page) > math.Ceil(float64(totalComments)/10) && totalComments > 0 {
		forumerror.BadRequest(w, r)
		return
	}
	if totalComments == 0 && page != 1 {
		forumerror.BadRequest(w, r)
		return
	}

	if err != nil {
		forumerror.InternalServerError(w, r, err)
		return
	}
	confMap["Comments"] = comments

	hasNext := totalComments > page*10
	confMap["HasNext"] = hasNext

	if hasNext {
		nextQuery := r.URL.Query()
		nextQuery.Set("page", strconv.Itoa(page+1))
		confMap["NextPage"] = r.URL.Path + "?" + nextQuery.Encode()
	}
	//repo.GLOBAL_TEMPLATE.ExecuteTemplate(w, "post.html", confMap)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"success":    true,
		"data" : confMap,
	}) 
}
*/