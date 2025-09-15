package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
 	"forum/internal/db"
	forumerror "forum/internal/error"
	repo "forum/internal/repository"
	"forum/internal/utils"
)

func CommentHandler(w http.ResponseWriter, r *http.Request) {

	if r.Method != http.MethodPost {
		forumerror.MethodNotAllowed(w, r)
		return
	}

	// I Will Check The Parse Value Of Pagination Her To Now Where I Will get the
	Current , _ := strconv.Atoi(r.FormValue("currentPage"))
	fmt.Println("current page")
	fmt.Println((Current))
	fmt.Println("=================")
	userId := r.Context().Value(repo.USER_ID_KEY).(int)
	fmt.Println("===== id user")
	fmt.Println(userId)
	fmt.Println("===========")
	IsUserCanCommenttToday, err := db.IsUserCanCommentToday(userId)
	/// her when the user it's comment alot i send to them To Stop
	// i will need to show them exact error !!

	if !IsUserCanCommenttToday {
		forumerror.TooManyRequests(w, r, "comments")
		fmt.Println("hhhhh it's make me crazy !!")
		return
	}

	if err != nil {
		forumerror.InternalServerError(w, r, err)
		return
	}
	if !utils.ValidComment(r.FormValue("comment")) {
		forumerror.BadRequest(w, r)
		return
	}

	postId, err := strconv.ParseInt(r.FormValue("post_id"), 10, 0)
	IsPostExist, err2 := db.IsPostExist(int(postId))
	fmt.Println("the id post")
	fmt.Println(postId)
	fmt.Println("=================")
	if err != nil || !IsPostExist {

		forumerror.BadRequest(w, r)
		return
	}
	if err2 != nil {
		forumerror.InternalServerError(w, r, err)
		return
	}
	comment := strings.TrimSpace(r.FormValue("comment"))
	if comment == "" {
		link := fmt.Sprintf("%s#comment", r.Header.Get("Referer"))
		http.Redirect(w, r, link, http.StatusSeeOther)
		return
	}
	fmt.Println("------ at comment")
	fmt.Println(r.FormValue("comment"))
	err = db.AddNewComment(r.Context().Value(repo.USER_ID_KEY).(int), int(postId), r.FormValue("comment"))
	if err != nil {
		forumerror.InternalServerError(w, r, err)
		return
	}
	SENDCOMMENT, _, err := db.GetCommentsByPostPaginated(int(postId), Current, userId)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	var response interface{}
	if Current == 1 {
		 
		response = SENDCOMMENT[0]
	} else {
 		response = map[string]interface{}{
			"no": true,
		}
	}
	// Send JSON ==================> TO FRONT JS 
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}