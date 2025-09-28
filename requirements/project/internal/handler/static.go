package handler

import (
	"net/http"
	"os"
)

func StaticHandler(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet {
        
        http.Redirect(w, r, "/unauthorized", http.StatusSeeOther)
        return
    }
    url := r.URL.Path[1:]
    file, err := os.Stat(url)
    if err != nil {
        
        http.Redirect(w, r, "/unauthorized", http.StatusSeeOther)
        return
    }
	if file.IsDir() {
        
        http.Redirect(w, r, "/unauthorized", http.StatusSeeOther)
        return
    }
    http.ServeFile(w, r, url)
}
