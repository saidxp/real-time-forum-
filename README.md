# Real-Time Forum

An **IT-themed discussion forum** with **real-time chat** over WebSocket.
Built with plain **Go** (`net/http`, no router framework), storing data in
**SQLite**, and serving a **vanilla JavaScript SPA** frontend from `static/`.

---

## Features

- User registration & login (passwords hashed with **bcrypt**).
- Session management via a `session_token` cookie (random token stored in DB).
- Create, view, and categorize **posts**.
- **Comments** and **like / dislike** on posts and comments.
- **Filter posts** by IT category.
- **Real-time 1-on-1 private chat** via WebSocket, messages persisted to DB.
- **Notifications** for incoming messages over a separate WebSocket.
- List of **online** users and recently joined users.
- **Rate limiting** (token bucket) at the server level.
- Graceful shutdown on system signals.

---

## Tech Stack

| Component        | Technology                                   |
|------------------|----------------------------------------------|
| Backend language | Go 1.24                                      |
| HTTP server      | `net/http` (stdlib) + `http.ServeMux`        |
| Database         | SQLite (`github.com/mattn/go-sqlite3`)       |
| WebSocket        | `github.com/gorilla/websocket`               |
| Password hashing | `golang.org/x/crypto/bcrypt`                 |
| Frontend         | HTML/CSS/vanilla JavaScript (SPA)            |
| Containerization | Docker & Docker Compose                      |

Dependencies (see [`go.mod`](requirements/project/go.mod)): `go-sqlite3`,
`golang.org/x/crypto`, and `gorilla/websocket`.

---

## Project Structure

```
real-time-forum-/
├── Makefile                 # Build/run helper commands
├── docker-compose.yml       # "forum" service definition
├── README.md
└── requirements/
    ├── Dockerfile           # 2-stage build (golang -> debian-slim)
    ├── Main.js
    └── project/
        ├── main.go          # Entry point
        ├── go.mod / go.sum
        ├── database/        # forum.db + schema.sql
        ├── static/          # Frontend (HTML, CSS, JS, SVG)
        └── internal/        # Backend code
            ├── auth/        # Register, login, logout, session, online
            ├── db/          # DB access & queries
            ├── error/       # Error definitions
            ├── handler/     # HTTP handlers + WebSocket Hub/room
            ├── middleware/  # Inject user, auth, rate limiter
            ├── ratelimiter/ # Token bucket implementation
            ├── repository/  # Config, data types, queries
            ├── service/     # Server init & start, signals
            └── utils/       # Hashing, regex validation
```

---

## Getting Started

### Option A — Local (Go directly)

```bash
make local
```

Creates the `logs/` directory and runs `go run .` from within
`requirements/project`.

### Option B — Docker Compose

```bash
make build    # build image
make up       # run container in daemon mode
make down     # stop
make status   # show status + logs
make enter    # enter container shell
make clean    # stop + prune images/volumes/networks
make re       # clean then up again
```

All targets are defined in the [`Makefile`](Makefile).

### Port note

- The internal server listens on **`:8081`** (constant `PORT` in
  [`config.go`](requirements/project/internal/repository/config.go)).
- `docker-compose.yml` maps host port **`8080:8080`**, and the Dockerfile
  `EXPOSE`s `8080`.

> ⚠️ There is a **port mismatch**: the app listens on `8081` but compose maps
> to `8080`. When running via Docker, align the mapping (`"8081:8081"`) or
> change the `PORT` constant.

---

## Endpoints (HTTP & WebSocket)

All routes are registered in
[`server.go`](requirements/project/internal/service/server.go) `forumMux()`.

### Auth
| Method     | Route       | Description                                      |
|------------|-------------|--------------------------------------------------|
| GET/POST   | `/login`    | GET serves the SPA, POST processes login         |
| GET/POST   | `/register` | GET serves the SPA, POST processes registration  |
| GET        | `/logout`   | Ends the session                                 |

### Pages & Posts
| Method | Route         | Description                                |
|--------|---------------|--------------------------------------------|
| GET    | `/`           | Root / SPA (with user injection)           |
| GET    | `/api/me`     | Current session status                     |
| GET    | `/api/posts`  | Post list / category filter results        |
| GET    | `/post`       | Single post detail page                    |
| POST   | `/newPost`    | Create a new post (auth required)          |
| POST   | `/like`       | Like a post (auth required)                |
| POST   | `/dislike`    | Dislike a post (auth required)             |
| POST   | `/comment`    | Add a comment (auth required)              |

### Chat & Users (JSON API)
| Method | Route                     | Description                        |
|--------|---------------------------|------------------------------------|
| GET    | `/api/online-users`       | List of online users               |
| GET    | `/api/all-users`          | List of all users                  |
| GET    | `/api/chat-messages`      | 1-on-1 conversation history        |
| GET    | `/api/user-by-username`   | Look up a user by username         |
| GET    | `/api/recent-chats`       | Recent conversations               |
| GET    | `/api/unread-count`       | Unread message count               |
| GET    | `/api/last-messages`      | Last message per contact           |

### Static & WebSocket
| Method | Route            | Description                                  |
|--------|------------------|----------------------------------------------|
| GET    | `/static/`       | Serve frontend assets                        |
| WS     | `/room`          | Chat WebSocket (public room / private chat)  |
| WS     | `/notifications` | WebSocket for incoming-message notifications |

---

## Backend Architecture

Initialization flow (`main.go` → `service`):

1. `InitDependencies()` opens the DB connection and initializes validation regex.
2. `StartServer()` builds the mux, wraps it with the **rate limiter**
   (burst 15, refill 30), then runs the server.
3. `HandleSignals()` listens for `SIGINT/SIGTERM/SIGQUIT/SIGHUP` for
   **graceful shutdown** (10s timeout) and closes the DB.

### WebSocket — Hub & Room
Defined in [`rooms.go`](requirements/project/internal/handler/rooms.go):

- The `Hub` holds three maps: `Rooms`, `globalUsers`, and `notificationUsers`.
- Each `room` runs a `Run()` goroutine handling `join`, `leave`, and message
  `forward` via channels.
- **Private rooms** are named `private_<user1>_<user2>` (names sorted for
  determinism). Only the two parties may join.
- For `type == "message"`, the message is saved to the DB and its real
  `created_at` timestamp is re-fetched before forwarding; connected receivers
  also get a notification.
- `CheckOrigin` currently returns `true` for all origins.

### Middleware
- `Inject` — inserts user identity from the session into the request context.
- `Auth` — rejects requests from users who are not logged in.
- `RateLimiter` — token bucket (see `internal/ratelimiter`).

---

## Data Model (SQLite)

Full schema in [`schema.sql`](requirements/project/database/schema.sql).
Key tables:

| Table                     | Purpose                                       |
|---------------------------|-----------------------------------------------|
| `users`                   | Accounts (username, email, password_hash, profile) |
| `sessions`                | Session token + expiry per user               |
| `posts`                   | Post content + owner (FK to users)            |
| `comments`                | Comments per post                             |
| `likes_dislikes`          | Post like/dislike (unique per user+post)      |
| `comment_likes_dislikes`  | Comment like/dislike                          |
| `categories`              | List of IT categories                         |
| `post_categories`         | Many-to-many post ↔ category relation         |
| `post_metadata`           | Post count tracker                            |
| `categories_count`        | Post count per category                       |
| `chat_messages`           | Chat messages (sender, receiver, is_read)     |
| `user_profiles`           | Extra registration data (name, age, gender)   |

Foreign keys are enabled via `PRAGMA foreign_keys = ON;` with
`ON DELETE CASCADE`.

### Supported IT Categories
See `IT_MAJOR_FIELDS` in `config.go`: Software Engineering, AI & ML,
Data Science, Cybersecurity, Networking, Cloud Computing, DevOps & SRE,
Database Systems, Systems Programming, Reverse Engineering, Mobile & Embedded,
IoT.

---

## Validation & Limits

Defined in `config.go`:

| Field          | Min | Max    |
|----------------|-----|--------|
| Email          | 6   | 254    |
| Username       | 3   | 32     |
| Password       | 8   | 72     |
| Post title     | 10  | 70     |
| Post content   | 1   | 10,000 |
| Comment        | 1   | 1,000  |

Pagination/rate limits: `PAGE_POSTS_QUANTITY = 10`,
`PAGE_COMMENT_QUANTITY = 10`, `DAY_POST_LIMIT = 20`, `DAY_COMMENTS_LIMIT = 50`.

---

## Frontend

Located in `requirements/project/static/`. A vanilla JS SPA with separate modules:

- `index.html` — main page.
- `main.js`, `buildhome.js`, `event.js` — bootstrap & page logic.
- `chat-core.js`, `chat-ui.js`, `chat-users.js`, `chat-utils.js`,
  `chat-websocket.js`, `chatisland.js` — chat features.
- `post.js`, `newpost.js`, `users.js`, `register.js` — posts & registration.
- `css/` — per-page styling; `svg/` — icons.

---

## Security

- Passwords are **bcrypt-hashed** (`utils/security.go`), never stored as plaintext.
- Session tokens are generated with `crypto/rand` + URL-safe base64
  (`auth/session.go`).
- Sensitive endpoints are protected by auth and session-injection middleware.
- Rate limiting helps prevent abuse.

> To address before production: the permissive `CheckOrigin` (allows all
> origins) and the lack of enforced HTTPS / `Secure` cookies.

---

## Docker

[`Dockerfile`](requirements/Dockerfile) uses a 2-stage build:
1. `golang:1.24.3` — `go build -o forum main.go`.
2. `debian:stable-slim` — copies the binary, `EXPOSE 8080`, `CMD ["./forum"]`.

Volumes in `docker-compose.yml` mount `database/`, `logs/`, `static/`, and
`templates/` from the host so data and assets can change without a rebuild.

---

A more detailed version of this documentation is also available in
[`PROJECT_DOC.md`](PROJECT_DOC.md).
