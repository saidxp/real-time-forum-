// <=============== POST ===================>
import { showPage } from "./main.js";

export async function POST(id, user, page=1) {

  // <link rel="stylesheet" href="/static/css/post.css"> </link>
  if (!document.querySelector('link[href*="post.css"]')) {
    const link = document.createElement('link');
    link.id = "cssPOST"
    link.rel = 'stylesheet';
    link.href = '/static/css/post.css';
    document.head.appendChild(link);
  }

  const main = document.querySelector('.main-content');
  const mobileHeader = document.querySelector('.mobileHeader');
  const footerEl = document.querySelector('.footer');
  const container = document.querySelector(".pagination");
  container.style.display = "none"

  console.log("Im At Post And I will See It Howa", user.comments)

  const existingHeader = document.querySelector('header.header');
  if (existingHeader) existingHeader.remove();
  if (mobileHeader) {
    mobileHeader.innerHTML = "";
    mobileHeader.style.display = "";
  }
  if (mobileHeader) {
    mobileHeader.innerHTML = `
      <div class="logo"><img id="Logo" src="/static/svg/logo.svg" alt="Logo"></div>
      <div class="mobileHeader_profile">
        <nav class="profile-nav">
          <ul>
            <li class="profile-dropdown">
              <div class="header__profile">
                <div class="initial">${user.Initial || ''}</div>
                <div class="username">${user.Username || ''}</div>
              </div>
              <ul>
                <li><a href="/profile"><img src="/static/svg/bolt.svg" /> Account Settings</a></li>
                <li><a id ="Out"> <img src="/static/svg/log-out.svg" /> Logout</a></li>
              </ul>
            </li>
          </ul>
        </nav>
      </div>`;
  }

  // === < Show Loading In Main Content > ===
  if (main) main.innerHTML = `<p style="text-align:center; margin:2rem;">Loading post...</p>`;

  try {
    const res = await fetch(`/post?Id=${id}&page=${page}`);
    if (!res.ok) throw new Error("Failed to fetch post");
    const data = await res.json();

    const Pagination = {
    "curent" : data.currentPage ,
    "hasNext" : data.hasNext,
    "hasprev" : data.hasPrev,
    "hasnext" : data.nextPage
    }

    Create({
      post: data.post,
      comments: data.comments || [],
      user,
      auth: data.user || {},
      footerEl, Pagination
    });
  } catch (err) {
    console.error("Error fetching single post:", err);
    if (main) main.innerHTML = `<p style="text-align:center; color:red;">Failed to load post.</p>`;
  }
}

// ==================={{ Create Post <!> }}===================
export function Create({ post, comments = [],user, footerEl, Pagination=null}) {

  const main = document.querySelector('.main-content');
  const mobileHeader = document.querySelector('.mobileHeader');

  if (main) main.innerHTML = '';

  // <===> Post HTML <===> !!!
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
        <div class="post" id="post-${post.Id}">
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
          </div>
        </footer>
      </div>
    </div>
  `;

const commentFormHTML = `
    <div class="containercomment">
      <form id="form_comment" action="#" method="POST">
        <input type="hidden" name="post_id" value="${post.Id}">
        <textarea id="comment" name="comment" placeholder="comment..." minlength="1" maxlength="1000" required></textarea>
        <button type="submit"><img src="/static/svg/send.svg" alt="comment"></button>
      </form>
    </div>
  `;

  const commentsHTML = comments.length
    ? comments.map(c => `
        <div class="container">
          <div class="commentcontainer" id="${c.CommentId}">
            <div class="commentTop">
              <div class="initial">${c.initial}</div>
              <div class="info">
                <div class="publisher"><strong>${c.username}</strong></div>
                <div class="content"><span>${c.content}</span></div>
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
    : `<div id="Com" class="container"><p style="text-align:center;">No comments yet.</p></div>`;
  let paginationHTML = '';
  if (Pagination) {
    paginationHTML = `
      <div class="container">
        <nav class="pagination" aria-label="Pagination navigation">
          ${Pagination.hasprev ? 
            `<button class="pagination__link pagination__link--prev pagination-btn" 
                     data-page="${Pagination.curent - 1}" 
                     data-post-id="${post.Id}" 
                     aria-label="Previous page">
               <img src="/static/svg/left.svg" alt="previous page"> Previous Page
             </button>` : 
            `<span class="pagination__link pagination__link--prev" aria-label="Previous page" style="opacity: .3;">
               <img src="/static/svg/left.svg" alt="previous page">
             </span>`
          }
          <span class="pagination__current" aria-current="page">Page ${Pagination.curent}</span>
          ${Pagination.hasNext ? 
            `<button class="pagination__link pagination__link--next pagination-btn" 
                     data-page="${Pagination.curent + 1}" 
                     data-post-id="${post.Id}" 
                     aria-label="Next page">
               Next Page <img src="/static/svg/right.svg" alt="next page">
             </button>` : 
            `<span class="pagination__link pagination__link--next" aria-label="Next page" style="opacity: .3;">
               <img src="/static/svg/right.svg" alt="next page">
             </span>`
          }
        </nav>
      </div>
    `;
  }
  
  if (main) main.innerHTML = postHTML + commentFormHTML + `<div class="comments-list">${commentsHTML}</div>` + paginationHTML;

  const likeForm = document.querySelector('#likes_dislikes form[action="/like"]');
  const dislikeForm = document.querySelector('#likes_dislikes form[action="/dislike"]');

  if (likeForm) {
    likeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(likeForm);
      try {
        const res = await fetch('/like', {
          method: 'POST',
          body: formData
        });
        if (!res.ok) throw new Error('Failed to submit like');
        const result = await res.json();
        console.log('Like response:', result.data);
        updateLikeDislikeUI(result.data);
        
      } catch (err) {
        console.error('Error submitting like:', err);
        alert('Failed to like post. Please try again.');
      }
    });
  }

  if (dislikeForm) {
    dislikeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(dislikeForm);
      try {
        const res = await fetch('/dislike', {
          method: 'POST',
          body: formData
        });
        if (!res.ok) throw new Error('Failed to submit dislike');
        const result = await res.json();
        console.log("howa")
        console.log('Dislike response:', result.data);
        // Update the UI with new like/dislike counts
        updateLikeDislikeUI(result.data);
        
      } catch (err) {
        console.error('Error submitting dislike:', err);
        alert('Failed to dislike post. Please try again.');
      }
    });
}

  // <===>
  function updateLikeDislikeUI(result) {
    const container = document.querySelector(`#post-${result.Id}`);
    if (!container) return;
    const likeBtn = container.querySelector('.likebtn');
    const dislikeBtn = container.querySelector('.dislikebtn');
    if (likeBtn && result.Likes !== undefined) {
      likeBtn.innerHTML = `
        <img src="/static/svg/${result.IsLikedByUser ? 'green_like' : 'like'}.svg" alt="like">
        ${result.Likes}
      `;
    }
    if (dislikeBtn && result.Dislikes !== undefined) {
      dislikeBtn.innerHTML = `
        <img src="/static/svg/${result.IsDislikedByUser ? 'red_dislike' : 'dislike'}.svg" alt="dislike">
        ${result.Dislikes}
      `;
    }
  }

  //if (main) main.innerHTML = postHTML + commentFormHTML + commentsHTML + paginationHTML;
  // === Footer ===
  if (footerEl) {
    footerEl.innerHTML = `<div class="footer-container">
      <p>&copy; 2025 FORUM — Built with 💙 by the Forum Team</p>
    </div>`;
  }
    // <=====> Add event listeners for pagination buttons <=====>
    const paginationBtns = document.querySelectorAll('.pagination-btn');
    paginationBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const page = parseInt(btn.dataset.page);
        const postId = btn.dataset.postId;
        
        console.log(`🔄 Pagination clicked!`);
        console.log(`📄 Loading page: ${page}`);
        console.log(`🎯 For post ID: ${postId}`);
        console.log(`🌐 Will send request to: /post?Id=${postId}&page=${page}`);
        
        // Show loading state while fetching .....
        if (main) {
          // styling loading 
          main.innerHTML = `<p style="text-align:center; margin:2rem;">Loading page ${page}...</p>`;
        }
        
        // Call POST function with new page
        /// HER I WILL USE SHOW PAGE FOR REFRECH HANDLING !!
        await POST(postId, user, page);
      });
  });
  // === <===> FORM SUBMIT TO DB <==> ===
  const formComment = document.querySelector("#form_comment");

  if (formComment) {
    formComment.addEventListener("submit", async (e) => {
      e.preventDefault();
      console.log("howa hada libghina hna o daba ")
      console.log(Pagination.curent)
      let curent = Pagination.curent
      let post_id = post.Id
      console.log("how hada li bghina o mkhlina li hnina omandiro so9 rosnna waaayaayii ")
      const formData = new FormData(formComment);
      /// I Add To Object The Current Page !
      formData.append("currentPage" ,curent)
      //formData.append("Post_id", idPost)
      // <==|<--|-->|==> 
      console.log(formData)
      try {
        const res = await fetch("/comment", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Failed to submit comment");
        const newComment = await res.json();

        // I Will Try Her When The User Is At Another
        if (newComment.no){
          await showPage("Post", user, idPost, 1);
          sessionStorage.setItem("currentPage", "Post");
          return
        }

        console.log(newComment)
        const commentsList = document.querySelector(".comments-list");
        if (commentsList && newComment) {
          const node = createCommentNode(newComment);
          commentsList.prepend(node);
        }
        const maxOnPage = 10;  // <<========>> \\Com
        const visible = commentsList.querySelectorAll(".commentcontainer");
        if (visible.length > maxOnPage) {
          const last = visible[visible.length - 1];
          last.closest(".container")?.remove();
        }
        const NOcoment = document.getElementById('Com')
        if (NOcoment) {
          NOcoment.remove()
        }
        //addCommentToPage(newComment);
        console.log("===== Her the response from the server ")
        console.log(newComment)
        console.log("====================")
        formComment.reset();
      } catch (err) {
        console.error("Error submitting comment:", err);
      }
    });
  }
}

function escapeHtml(s) {
  if (!s) return "";
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function createCommentNode(c) {

  const id = c.comment_id ?? c.CommentId ?? c.commentId ?? "";
  const initial = c.initial ?? c.Initial ?? "";
  const username = c.username ?? c.Username ?? "";
  const content = c.content ?? c.Content ?? "";

  const wrapper = document.createElement("div");
  wrapper.className = "container";
  wrapper.innerHTML = `
    <div class="commentcontainer" data-comment-id="${escapeHtml(id)}">
      <div class="commentTop">
        <div class="initial">${escapeHtml(initial)}</div>
        <div class="info">
          <div class="publisher"><strong>${escapeHtml(username)}</strong></div>
          <div class="content"><span>${escapeHtml(content)}</span></div>
        </div>
      </div>
      <span class="divider"></span>
      <div class="commentBottom"></div>
    </div>
  `;
  return wrapper;
}
