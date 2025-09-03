// Fetch a single post and its comments
export async function POST(id) {
  try {
    const res = await fetch(`/post?Id=${id}`);
    if (!res.ok) throw new Error("Failed to fetch post");

    const data = await res.json();
    console.log("=====================");
    console.log("Fetched single:", data);
    console.log("=========================");

    // Pass Structured Data To Create
    Create({
      post: data.post,
      comments: data.comments || [],
      auth: data.user || {}
    });
  } catch (err) {
    console.error("Error fetching single post:", err);
  }
}

 export function Create({ post, comments = [], auth = {} }) {
  const main = document.querySelector('.main-content');
  const mobileHeader = document.querySelector('.mobileHeader');
  const footerEl = document.querySelector('.footer');

   if (main) main.innerHTML = '';
  if (mobileHeader) mobileHeader.innerHTML = '';
  if (footerEl) footerEl.innerHTML = '';

  // ===== Header =====
  const headerHTML = `
    <div class="header__logo">
      <a href="/" class="header__logo-link">
        <img src="/static/svg/logo.svg" alt="Logo" class="header__logo-img" />
      </a>
    </div>
    <div class="user_actions--header">
      ${auth.authenticated ? `
        <div class="profile_section--header"></div>
        <div class="nes_post--header">
          <a href="/newPost" class="readmore" id="btn2">
            <img src="/static/svg/pencil-line.svg" alt="New post icon" />
            Create Post
          </a>
        </div>
        <nav class="profile-nav">
          <ul>
            <li class="profile-dropdown">
              <div class="header__profile">
                <div class="initial">${auth.initial}</div>
                <div class="username">${auth.username}</div>
              </div>
              <ul>
                <li><a href="/profile"><img src="/static/svg/bolt.svg" /> Account Settings</a></li>
                <li><a href="/logout"><img src="/static/svg/log-out.svg" /> Logout</a></li>
              </ul>
            </li>
          </ul>
        </nav>
      ` : `
        <div class="header__auth-links">
          <a href="/register" class="header__auth-link">Sign Up</a>
          <a href="/login" class="header__auth-link">Login</a>
        </div>`}
    </div>
  `;
  if (mobileHeader) {
    mobileHeader.innerHTML = `
      <div class="logo"><img src="/static/svg/logo.svg" alt="Logo"></div>
      <div class="mobileHeader_profile">
        ${auth.authenticated ? `
          <nav class="profile-nav">
            <ul>
              <li class="profile-dropdown">
                <div class="header__profile">
                  <div class="initial">${auth.initial}</div>
                  <div class="username">${auth.username}</div>
                </div>
                <ul>
                  <li><a href="/profile"><img src="/static/svg/bolt.svg" /> Account Settings</a></li>
                  <li><a href="/logout"><img src="/static/svg/log-out.svg" /> Logout</a></li>
                </ul>
              </li>
            </ul>
          </nav>
        ` : `
          <a href="/login" class="mobileHeader__auth-link">Login</a>
          <a href="/register" class="mobileHeader__auth-link">Sign Up</a>`}
      </div>`;
  }

  // ===== Post =====
  const postHTML = `
    <div class="container">
      <div class="post">
        <div class="top">
          <div class="post_head">
            <div class="user_container">
              <div class="initial"><span>${post.Initial}</span></div>
              <div class="info">
                <div class="publisher"><strong>${post.Publisher}</strong></div>
                <div class="date"><span>${post.Created_at}</span></div>
              </div>
            </div>
            <span class="divider"></span>
            <h2>${post.Title}</h2>
          </div>
        </div>
        <section><p>${post.Content}</p></section>
        <span class="divider"></span>
        <footer>
          <section id="likes_dislikes">
            <form action="/like" method="POST">
              <input type="hidden" name="post_id" value="${post.Id}">
              <button type="submit" class="likebtn">
                <img src="/static/svg/${post.IsLikedByUser ? 'green_like' : 'like'}.svg" alt="like">
                ${post.Likes}
              </button>
            </form>
            <form action="/dislike" method="POST">
              <input type="hidden" name="post_id" value="${post.Id}">
              <button type="submit" class="dislikebtn">
                <img src="/static/svg/${post.IsDislikedByUser ? 'red_dislike' : 'dislike'}.svg" alt="dislike">
                ${post.Dislikes}
              </button>
            </form>
          </section>
        </footer>
      </div>
    </div>
  `;

  // ===== <= ( Comment Form ) =>=====
  const commentFormHTML = `
    <div class="containercomment">
      <form id="form_comment" action="/comment" method="POST">
        <input type="hidden" name="post_id" value="${post.Id}">
        <textarea id="comment" name="comment" placeholder="comment..." minlength="1" maxlength="1000" required></textarea>
        <button type="submit"><img src="/static/svg/send.svg" alt="comment"></button>
      </form>
    </div>
  `;

  // =====<= ( Comments ) =>=====
  const commentsHTML = comments.length
    ? comments.map(c => `
        <div class="container">
          <div class="commentcontainer" id="${c.CommentId}">
            <div class="commentTop">
              <div class="initial">${c.Initial}</div>
              <div class="info">
                <div class="publisher"><strong>${c.Username}</strong></div>
                <div class="content"><span>${c.Content}</span></div>
              </div>
            </div>
            <span class="divider"></span>
            <div class="commentBottom">
              <div class="comment_likes_dislikes">
                <form action="/commentLike" method="POST">
                  <input type="hidden" name="post_id" value="${c.PostId}" />
                  <input type="hidden" name="comment_id" value="${c.CommentId}" />
                  <button type="submit" class="likebtn">
                    <img src="/static/svg/${c.IsCommentLikedByUser ? 'green_like' : 'like'}.svg" alt="like"> ${c.CommentLikes}
                  </button>
                </form>
                <form action="/commentDislike" method="POST">
                  <input type="hidden" name="post_id" value="${c.PostId}" />
                  <input type="hidden" name="comment_id" value="${c.CommentId}" />
                  <button type="submit" class="dislikebtn">
                    <img src="/static/svg/${c.IsCommentDislikedByUser ? 'red_dislike' : 'dislike'}.svg" alt="dislike"> ${c.CommentDislikes}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      `).join('')
    : `<div class="container"><div style="display:flex;align-items:center;justify-content:center;"><p>No comments yet.</p></div></div>`;

  // Add Them To Main CONTAINER !-!  
  if (main) main.innerHTML = postHTML + commentFormHTML + commentsHTML;

  // ===== Footer =====
  if (footerEl) {
    footerEl.innerHTML = `<div class="footer-container">
      <p>&copy; 2025 FORUM — Built with 💙 by the Forum Team</p>
    </div>`;
  }
}
