package handler

import (
	"fmt"
	"forum/internal/db"
	forumerror "forum/internal/error"
	repo "forum/internal/repository"
	"net/http"
	"strconv"
	"encoding/json"
)

func DislikeHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		if r.Method == http.MethodGet {
		 
			http.Redirect(w, r, "/unauthorized", http.StatusSeeOther)
			return
		}
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{
			"error": "Method not allowed. Use POST",
		})
		return
	}
	postId, err := strconv.ParseInt(r.FormValue("post_id"), 10, 0)
	IsPostExist, err2 := db.IsPostExist(int(postId))
	if err != nil || !IsPostExist {
		forumerror.BadRequest(w, r)
		return
	}
	if err2 != nil {
		forumerror.InternalServerError(w, r, err)
		return
	}
	err = db.AddRemovePostDeslike(r.Context().Value(repo.USER_ID_KEY).(int), int(postId))
	if err != nil {
		forumerror.InternalServerError(w, r, err)
		return
	}
	post, err := db.GetPostByID(int(postId),r.Context().Value(repo.USER_ID_KEY).(int))
	fmt.Println(post)
	response := map[string]interface{}{
			"success": true,
			"message": "Like updated successfully",
			"postId":  int(postId),
			"data" : post,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)

}

func CommentDislikeHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		if r.Method == http.MethodGet {
			http.Redirect(w, r, "/unauthorized", http.StatusSeeOther)
			return
		}
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{
			"error": "Method not allowed. Use POST",
		})
		return
	}
	
	if r.Header.Get("X-Requested-With") != "fetch" {
		writeJSON(w, http.StatusForbidden, map[string]string{
			"error": "This endpoint is only accessible via the SPA",
		})
		return
	}


	postId, err := strconv.ParseInt(r.FormValue("post_id"), 10, 0)
	IsPostExist, err2 := db.IsPostExist(int(postId))
	if err != nil || !IsPostExist {
		forumerror.BadRequest(w, r)
		return
	}

	if err2 != nil {
		forumerror.InternalServerError(w, r, err)
		return
	}

	commentId, err := strconv.ParseInt(r.FormValue("comment_id"), 10, 0)
	IsCommentExist, err2 := db.IsCommentExist(int(postId), int(commentId))
	if err != nil || !IsCommentExist {
		forumerror.BadRequest(w, r)
		return
	}

	if err2 != nil {
		forumerror.InternalServerError(w, r, err)
		return
	}

	err = db.AddRemoveCommentDislike(r.Context().Value(repo.USER_ID_KEY).(int), int(commentId))
	if err != nil {
		forumerror.InternalServerError(w, r, err)
	}
	
	link := fmt.Sprintf("%s#%d", r.Header.Get("Referer"), commentId)
	http.Redirect(w, r, link, http.StatusSeeOther)
}
