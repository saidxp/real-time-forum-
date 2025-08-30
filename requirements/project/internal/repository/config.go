package repository

import (
	"database/sql"
	"html/template"
	"regexp"
)

var (
	EmailExp        *regexp.Regexp
	UsernameExp     *regexp.Regexp
	GLOBAL_TEMPLATE *template.Template
	DB              *sql.DB
)

type User struct {
	Id            int
	Username      string
	Email         string
	Password_hash string
	Created_at    string
	Updated_at    string
}

type Post struct {
	Id               int
	PublisherId      int
	Title            string
	Content          string
	Publisher        string
	Initial          string
	Catigories       []string
	Likes            int
	Dislikes         int
	CommentsCount    int
	Created_at       string
	Updated_at       string
	IsEdited         bool
	IsLikedByUser    bool
	IsDislikedByUser bool
	HasCategories    bool
	Owned            bool
}

type PageData struct {
	Posts []Post
}

type Comment struct {
	Username string
	Initial  string
	Content     template.HTML
	
	//TODO; ADD TIME OF CREATION
	DateCreated string // Placeholder, should be set to actual creation date
	PostId                      int
	CommentId                   int
	IsCommentLikedByUser        bool
	IsCommentDislikedByUser     bool
	CommentLikes                int
	CommentDislikes int
}

type contextKey string

const (
	INTERNAL_SERVER_ERROR_LOG_PATH = "./logs/internal_errors.log"

	DATABASE_NAME = "sqlite3"

	// database paths
	DATABASE_LOCATION        = "./database/forum.db"
	DATABASE_SCHEMA_LOCATION = "./database/schema.sql"

	// error messages
	FAILED_OPEN_DATABES     = "failed to open the database: %v"
	FAILED_CREAT_TABELS     = "failed to create tables: %v"
	FAILED_CLOSING_DATABASE = "closing database: %v"

	// templates paths
	TEMPLATE_PATHS = "./templates/*.html"

	// server helpers
	PORT               = ":8080"
	SERVER_RUN_MESSAGE = "\033[2mServer running on http://localhost:8080\033[0m"

	// context keys
	USER_ID_KEY contextKey = "userId"
	ERROR_CASE  contextKey = "error_case"
	USER_NAME   contextKey = "userName"

	PAGE_POSTS_QUANTITY = 10
	PAGE_COMMENT_QUANTITY = 10
	DAY_POST_LIMIT      = 20
	DAY_COMMENTS_LIMIT  = 50
)

// IT major fields
var IT_MAJOR_FIELDS = map[string]bool{
	"All categories":                               true,
	"Software Engineering":                         true,
	"Artificial Intelligence and Machine Learning": true,
	"Data Science and Big Data":                    true,
	"Cybersecurity":                                true,
	"Networking and Telecommunications":            true,
	"Cloud Computing and Virtualization":           true,
	"DevOps and SRE":                               true,
	"Database Systems":                             true,
	"Systems Programming":                          true,
	"Reverse Engineering":                          true,
	"Mobile and Embedded Development":              true,
	"IoT (Internet of Things)":                     true,
}

// users limitations
const (
	// Email limitations
	EMAIL_MIN_LEN = 6   // a@b.co is a valid short email
	EMAIL_MAX_LEN = 254 // RFC 5321 max length of an email address

	// Username limitations
	USERNAME_MIN_LEN = 3
	USERNAME_MAX_LEN = 32 // Long enough, yet avoids abuse or awkward UI

	// Password limitations
	PASSWORD_MIN_LEN = 8  // Minimum for secure password
	PASSWORD_MAX_LEN = 72 // Bcrypt max input length

	// Post Title limitations
	TITLE_MIN_LEN = 10
	TITLE_MAX_LEN = 70 // Enough for concise titles; avoids clutter

	// Post Content limitations
	POST_MIN_LEN = 1
	POST_MAX_LEN = 10_000 // Long enough for article-style posts

	// Comment limitations
	COMMENT_MIN_LEN = 1
	COMMENT_MAX_LEN = 1_000 // Reasonable upper bound for a comment
)
