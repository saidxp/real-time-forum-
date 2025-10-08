package service

import (
	"fmt"
	"log"
	"net/http"

	auth "forum/internal/auth"
	db "forum/internal/db"
	handler "forum/internal/handler"
	middleware "forum/internal/middleware"
	repo "forum/internal/repository"
	utils "forum/internal/utils"

	_ "github.com/mattn/go-sqlite3"
)

func InitDependencies() {
	db.InitDB(repo.DATABASE_LOCATION)
	utils.InitRegex()
}

func forumMux() *http.ServeMux {
	forumux := http.NewServeMux()
	// Create hub first
	hub := handler.NewHub()
	// Set the global hub in auth package to avoid import cycle
	// Cast to the interface type
	auth.GlobalHub = hub
	// root mux ====> i will check it roooooooooooot !!! >>

	forumux.HandleFunc("/api/me", middleware.InjectUser(handler.FirststateHandler))
	// <=========================|-|=============================>
	// Her i will get filter post or post !!
	forumux.HandleFunc("/api/posts", middleware.InjectUser(handler.PostsHandlerApi))
	// API endpoint for getting online users for chat
	forumux.HandleFunc("/api/online-users", middleware.InjectUser(handler.OnlineUsersHandler))
	forumux.HandleFunc("/api/all-users", middleware.InjectUser(handler.AllUsersHandler))
	forumux.HandleFunc("/api/chat-messages", handler.GetChatMessagesHandler)
	forumux.HandleFunc("/api/user-by-username", handler.GetUserByUsernameHandler)
	forumux.HandleFunc("/api/recent-chats", handler.GetRecentChatsHandler)
	forumux.HandleFunc("/api/unread-count", handler.GetUnreadCountHandler)

	forumux.HandleFunc("/api/last-messages", middleware.InjectUser(handler.GetLastMessagesHandler))

	// <=========================|-|=============================>

	// authontication mux
	forumux.HandleFunc("/login", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			auth.SubmitLogin(w, r)
		} else {
			// <====> her i will send spa !!
			handler.RootHandler(w, r)
		}
	})
	// ===== log out function !!
	forumux.HandleFunc("/logout", auth.LogoutHandler)
	// <=====================>
	// her i will check login ||||| ///
	forumux.HandleFunc("/register", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			auth.SubmitRegister(w, r)
		} else {
			handler.RootHandler(w, r)
		}
	})
	forumux.HandleFunc("/post", middleware.InjectUser(handler.PostHandler))
	forumux.HandleFunc("/newPost", middleware.AuthMidleware(handler.PostPostHandler))
	// like dislike
	forumux.HandleFunc("/like", middleware.AuthMidleware(handler.LikeHandler))
	forumux.HandleFunc("/dislike", middleware.AuthMidleware(handler.DislikeHandler))
	// comment mux
	forumux.HandleFunc("/comment", middleware.AuthMidleware(handler.CommentHandler))

	forumux.HandleFunc("/static/", handler.StaticHandler)
	// WebSocket endpoint for private chat (protected)
	forumux.HandleFunc("/room", hub.ServeWs)
	// WebSocket endpoint for global notifications
	forumux.HandleFunc("/notifications", hub.ServeNotifications)
	forumux.HandleFunc("/", middleware.InjectUser(handler.RootHandler))
	return forumux
}

func StartServer() {
	server := &http.Server{
		Addr:    repo.PORT,
		Handler: middleware.RateLimiterMiddleware(forumMux(), 15, 30),
	}
	fmt.Println(repo.SERVER_RUN_MESSAGE)
	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			db.CloseDB()
			log.Fatalf("server error: %v", err)
		}
	}()
	HandleSignals(server)
}
