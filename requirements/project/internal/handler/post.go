package handler

import (
	"database/sql"
	db "forum/internal/db"
	forumerror "forum/internal/error"
	repo "forum/internal/repository"
	"math"
	"net/http"
	"strconv"
)

func PostHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		forumerror.MethodNotAllowed(w, r)
		return
	}

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
	repo.GLOBAL_TEMPLATE.ExecuteTemplate(w, "post.html", confMap)
}
