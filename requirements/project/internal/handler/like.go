package handler

import (
	"fmt"
	"forum/internal/db"
	forumerror "forum/internal/error"
	repo "forum/internal/repository"
	"net/http"
	"strconv"
)

func LikeHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		forumerror.MethodNotAllowed(w, r)
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
	err = db.AddRemovePostLike(r.Context().Value(repo.USER_ID_KEY).(int), int(postId))
	if err != nil {
		forumerror.InternalServerError(w, r, err)
	}
	link := fmt.Sprintf("%s#%d", r.Header.Get("Referer"), postId)
	http.Redirect(w, r, link, http.StatusSeeOther)
}

func CommentLikeHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		forumerror.MethodNotAllowed(w, r)
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
	err = db.AddRemoveCommentLike(r.Context().Value(repo.USER_ID_KEY).(int), int(commentId))
	if err != nil {
		forumerror.InternalServerError(w, r, err)
	}
	link := fmt.Sprintf("%s#%d", r.Header.Get("Referer"), commentId)
	http.Redirect(w, r, link, http.StatusSeeOther)
}
