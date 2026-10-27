# Real-Time Forum — Dokumentasi Proyek

Selamat datang! Dokumen ini menjelaskan apa itu proyek, bagaimana strukturnya,
dan bagaimana cara menjalankannya. Isi dokumen ini disusun langsung dari kode
yang ada di repository, tanpa tambahan fitur yang belum diimplementasikan.

---

## 1. Ringkasan

Sebuah **forum diskusi bertema IT** dengan fitur **chat real-time** berbasis
WebSocket. Dibangun dengan **Go (Golang)** standar library `net/http` (tanpa
framework router), menyimpan data di **SQLite**, dan frontend berupa **SPA
JavaScript vanilla** yang disajikan dari folder `static/`.

Fitur utama:

- Registrasi & login pengguna (password di-hash dengan **bcrypt**).
- Sesi berbasis cookie `session_token` (token acak, disimpan di database).
- Membuat, melihat, dan memberi kategori pada **post**.
- **Komentar**, **like / dislike** pada post dan komentar.
- **Filter post** berdasarkan kategori IT.
- **Chat pribadi (1-on-1) real-time** via WebSocket + pesan tersimpan di DB.
- **Notifikasi** pesan masuk via WebSocket terpisah.
- Menampilkan daftar pengguna **online** dan pengguna terbaru.
- **Rate limiting** (token bucket) pada level server.
- Graceful shutdown saat menerima sinyal sistem.

---

## 2. Tech Stack

| Bagian            | Teknologi                                             |
|-------------------|-------------------------------------------------------|
| Bahasa backend    | Go 1.24                                               |
| HTTP server       | `net/http` (stdlib) + `http.ServeMux`                 |
| Database          | SQLite (`github.com/mattn/go-sqlite3`)                |
| WebSocket         | `github.com/gorilla/websocket`                         |
| Password hashing  | `golang.org/x/crypto/bcrypt`                          |
| Frontend          | HTML/CSS/JavaScript vanilla (SPA)                     |
| Containerization  | Docker & Docker Compose                               |

Dependensi didefinisikan di [`go.mod`](requirements/project/go.mod):
`go-sqlite3`, `golang.org/x/crypto`, dan `gorilla/websocket`.

---

## 3. Struktur Direktori

```
real-time-forum-/
├── Makefile                 # Perintah build/run helper
├── docker-compose.yml       # Definisi service "forum"
├── README.md
└── requirements/
    ├── Dockerfile           # Build 2-stage (golang -> debian-slim)
    ├── Main.js
    └── project/
        ├── main.go          # Entry point
        ├── go.mod / go.sum
        ├── database/        # forum.db + schema.sql
        ├── static/          # Frontend (HTML, CSS, JS, SVG)
        └── internal/        # Kode backend
            ├── auth/        # Register, login, logout, sesi, online
            ├── db/          # Akses & query database
            ├── error/       # Definisi error
            ├── handler/     # HTTP handlers + WebSocket Hub/room
            ├── middleware/  # Inject user, auth, rate limiter
            ├── ratelimiter/ # Implementasi token bucket
            ├── repository/  # Konfigurasi, tipe data, query
            ├── service/     # Inisialisasi & start server, sinyal
            └── utils/       # Hashing, validasi regex
```

---

## 4. Cara Menjalankan

### Opsi A — Lokal (Go langsung)

```bash
make local
```

Perintah ini membuat folder `logs/` lalu menjalankan `go run .` dari dalam
`requirements/project`.

### Opsi B — Docker Compose

```bash
make build    # build image
make up       # jalankan container dalam mode daemon
make down     # hentikan
make status   # lihat status + log
make enter    # masuk ke shell container
make clean    # hentikan + bersihkan image/volume/network
make re       # clean lalu up lagi
```

Seluruh target tersedia di [`Makefile`](Makefile).

### Catatan penting soal port

- Server internal listen pada **`:8081`** (lihat konstanta `PORT` di
  [`config.go`](requirements/project/internal/repository/config.go)).
- `docker-compose.yml` memetakan port host **`8080:8080`**, sedangkan
  Dockerfile `EXPOSE 8080`.

> ⚠️ Ada **ketidakcocokan port**: aplikasi mendengarkan di `8081`, tapi compose
> memetakan ke `8080`. Jika menjalankan lewat Docker, sesuaikan mapping
> (`"8081:8081"`) atau ubah konstanta `PORT` agar konsisten.

---

## 5. Endpoint (Rute HTTP & WebSocket)

Semua rute didaftarkan di
[`server.go`](requirements/project/internal/service/server.go) `forumMux()`.

### Auth
| Method | Rute                 | Deskripsi                                    |
|--------|----------------------|----------------------------------------------|
| GET/POST | `/login`           | GET menyajikan SPA, POST memproses login     |
| GET/POST | `/register`        | GET menyajikan SPA, POST memproses registrasi |
| GET      | `/logout`          | Mengakhiri sesi                               |

### Halaman & Post
| Method | Rute         | Deskripsi                                             |
|--------|--------------|-------------------------------------------------------|
| GET    | `/`          | Root / SPA (dengan injeksi user)                      |
| GET    | `/api/me`    | Status sesi saat ini                                  |
| GET    | `/api/posts` | Daftar post / hasil filter kategori                   |
| GET    | `/post`      | Halaman detail satu post                              |
| POST   | `/newPost`   | Membuat post baru (butuh auth)                        |
| POST   | `/like`      | Like post (butuh auth)                                |
| POST   | `/dislike`   | Dislike post (butuh auth)                             |
| POST   | `/comment`   | Menambahkan komentar (butuh auth)                     |

### Chat & Pengguna (API JSON)
| Method | Rute                       | Deskripsi                          |
|--------|----------------------------|------------------------------------|
| GET    | `/api/online-users`        | Daftar pengguna online             |
| GET    | `/api/all-users`           | Daftar semua pengguna              |
| GET    | `/api/chat-messages`       | Riwayat percakapan 1-on-1          |
| GET    | `/api/user-by-username`    | Cari user berdasarkan username     |
| GET    | `/api/recent-chats`        | Percakapan terbaru                 |
| GET    | `/api/unread-count`        | Jumlah pesan belum dibaca          |
| GET    | `/api/last-messages`       | Pesan terakhir per kontak          |

### Static & WebSocket
| Method | Rute             | Deskripsi                                   |
|--------|------------------|---------------------------------------------|
| GET    | `/static/`       | Menyajikan aset frontend                    |
| WS     | `/room`          | WebSocket chat (public room / private chat) |
| WS     | `/notifications` | WebSocket notifikasi pesan masuk            |

---

## 6. Arsitektur Backend

Alur inisialisasi (`main.go` → `service`):

1. `InitDependencies()` membuka koneksi DB dan menginisialisasi regex validasi.
2. `StartServer()` membangun mux, membungkusnya dengan **rate limiter**
   (burst 15, refill 30), lalu menjalankan server.
3. `HandleSignals()` mendengarkan `SIGINT/SIGTERM/SIGQUIT/SIGHUP` untuk
   **graceful shutdown** (timeout 10 detik) dan menutup DB.

### WebSocket — Hub & Room
Didefinisikan di [`rooms.go`](requirements/project/internal/handler/rooms.go):

- `Hub` memegang tiga map: `Rooms`, `globalUsers`, dan `notificationUsers`.
- Setiap `room` punya goroutine `Run()` yang menangani `join`, `leave`, dan
  `forward` pesan lewat channel.
- **Kamar privat** dinamai `private_<user1>_<user2>` (nama diurutkan agar
  deterministik). Hanya kedua pihak yang boleh bergabung.
- Saat pesan `type == "message"`, pesan disimpan ke DB dan timestamp
  `created_at` asli diambil kembali sebelum diteruskan, serta receiver yang
  terhubung mendapat notifikasi.
- `CheckOrigin` saat ini mengembalikan `true` untuk semua origin.

### Middleware
- `Inject` — menyisipkan identitas user dari sesi ke request context.
- `Auth` — menolak request yang belum login.
- `RateLimiter` — token bucket (lihat `internal/ratelimiter`).

---

## 7. Model Data (SQLite)

Skema lengkap di [`schema.sql`](requirements/project/database/schema.sql).
Tabel utama:

| Tabel                     | Fungsi                                       |
|---------------------------|----------------------------------------------|
| `users`                   | Akun (username, email, password_hash, profil)|
| `sessions`                | Token sesi + kedaluwarsa per user            |
| `posts`                   | Isi post + pemilik (FK ke users)             |
| `comments`                | Komentar per post                            |
| `likes_dislikes`          | Like/dislike post (unique per user+post)     |
| `comment_likes_dislikes`  | Like/dislike komentar                        |
| `categories`              | Daftar kategori IT                           |
| `post_categories`         | Relasi many-to-many post ↔ kategori          |
| `post_metadata`           | Penghitung jumlah post                       |
| `categories_count`        | Penghitung post per kategori                 |
| `chat_messages`           | Pesan chat (sender, receiver, is_read)       |
| `user_profiles`           | Data tambahan registrasi (nama, umur, gender)|

Foreign key diaktifkan via `PRAGMA foreign_keys = ON;` dengan `ON DELETE CASCADE`.

### Kategori IT yang didukung
Lihat `IT_MAJOR_FIELDS` di `config.go`: Software Engineering, AI & ML,
Data Science, Cybersecurity, Networking, Cloud Computing, DevOps & SRE,
Database Systems, Systems Programming, Reverse Engineering, Mobile & Embedded,
IoT.

---

## 8. Validasi & Batasan

Didefinisikan di `config.go`:

| Field            | Min | Max   |
|------------------|-----|-------|
| Email            | 6   | 254   |
| Username         | 3   | 32    |
| Password         | 8   | 72    |
| Judul post       | 10  | 70    |
| Isi post         | 1   | 10.000|
| Komentar         | 1   | 1.000 |

Batasi jumlah: `PAGE_POSTS_QUANTITY = 10`, `PAGE_COMMENT_QUANTITY = 10`,
`DAY_POST_LIMIT = 20`, `DAY_COMMENTS_LIMIT = 50`.

---

## 9. Frontend

Berada di `requirements/project/static/`. SPA vanilla JS dengan modul terpisah:

- `index.html` — halaman utama.
- `main.js`, `buildhome.js`, `event.js` — bootstrap & logika halaman.
- `chat-core.js`, `chat-ui.js`, `chat-users.js`, `chat-utils.js`,
  `chat-websocket.js`, `chatisland.js` — fitur chat.
- `post.js`, `newpost.js`, `users.js`, `register.js` — post & registrasi.
- `css/` — styling per halaman; `svg/` — ikon.

---

## 10. Keamanan

- Password di-**hash bcrypt** (`utils/security.go`), tidak pernah disimpan
  dalam bentuk teks asli.
- Token sesi dibuat pakai `crypto/rand` + encoding base64 URL
  (`auth/session.go`).
- Endpoint sensitif dilindungi middleware auth dan injection sesi.
- Rate limiting untuk mencegah penyalahgunaan.

> Hal yang perlu diperhatikan sebelum produksi: `CheckOrigin` yang mengizinkan
> semua origin, dan belum adanya penegakan HTTPS/Cookie `Secure`.

---

## 11. Docker

[`Dockerfile`](requirements/Dockerfile) memakai build 2-stage:
1. `golang:1.24.3` — `go build -o forum main.go`.
2. `debian:stable-slim` — salin binary, `EXPOSE 8080`, `CMD ["./forum"]`.

Volumes pada `docker-compose.yml` mount `database/`, `logs/`, `static/`, dan
`templates/` dari host agar data & aset bisa diubah tanpa rebuild.
