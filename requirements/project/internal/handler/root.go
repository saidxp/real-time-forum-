package handler

import (

	 
 
	forumerror "forum/internal/error"
	 
	"net/http"
 
)

func RootHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		forumerror.NotFoundError(w, r)
		// forumerror.InternalServerError(w, r, errors.New("test for runing in container"))
		return
	}
	if r.Method != http.MethodGet {
		//forumerror.MethodNotAllowed(w, r)
		return
	}
    http.ServeFile(w, r, "./static/index.html")
}