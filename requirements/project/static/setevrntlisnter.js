// <-------------------->
// post.js (replace existing fetchPosts with this)
// post.js — updated fetchPosts without like/dislike
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function el(tag, className = "", inner = "") {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (inner) e.innerHTML = inner;
  return e;
}

export async function fetchPosts(filter = "", page=1) {

  try {
    //const res = await fetch(`/api/posts?filter=${encodeURIComponent(filter)}`);
    const res = await fetch(`/api/posts?filter=${encodeURIComponent(filter)}&page=${page}`);
    const data = await res.json();
    console.log("Fetched data:", data);
    // Still Need To Fix It's No posts When I Want Her Just some handlling
    // Normalize posts array from several possible shapes
    const pagination = {
      "CurrentPage" : data.CurrentPage,
      "HasNext" :       data.HasNext,
      "HasPrev" : data.HasPrev,
      "NextPage" : data.CurrentPage + 1,
      "PrevPage" : data.CurrentPage -1 ,
    }

    let postsList = [];

    if (Array.isArray(data.Posts)) postsList = data.Posts;
    else if (data.Posts && Array.isArray(data.Posts.Posts)) postsList = data.Posts.Posts;
    else if (Array.isArray(data.posts)) postsList = data.posts;
    else if (data.Posts && Array.isArray(data.Posts.posts)) postsList = data.Posts.posts;
    else postsList = []; // fallback

    const postsContainer = document.querySelector(".main-content__posts");
    if (!postsContainer) {
      console.warn("No .main-content__posts container found.");
      return;
    }
    postsContainer.innerHTML = "";

    if (!postsList || postsList.length === 0) {
      postsContainer.innerHTML = `
        <div class="container">
          <div style="display:flex;align-items:center;justify-content:center;">
            <p>No posts found.</p>
          </div>
        </div>
      `;
      return;
    }
    postsList.forEach(p => {
      const Id = p.Id ?? p.id ?? "";
      const Initial = escapeHtml(p.Initial ?? p.initial ?? "");
      const Publisher = escapeHtml(p.Publisher ?? p.publisher ?? "");
      const Created_at = escapeHtml(p.Created_at ?? p.created_at ?? "");
      const Title = escapeHtml(p.Title ?? p.title ?? "");
      const Content = p.Content ?? p.content ?? "";
      const Catigories = p.Catigories ?? p.catigories ?? p.categories ?? [];
      const HasCategories = Array.isArray(Catigories) && Catigories.length > 0;
      const CommentsCount = p.CommentsCount ?? p.commentsCount ?? 0;

      const containerDiv = el("div", "container");
      const postDiv = el("div", "post");

      // Top
      const topDiv = el("div", "top");
      const postHeadWrap = el("div", "post_head");
      if (Id) postHeadWrap.id = Id;

      // user_container
      const userContainer = el("div", "user_container");
      const initialDiv = el("div", "initial");
      initialDiv.innerHTML = `<span>${Initial}</span>`;
      userContainer.appendChild(initialDiv);

      const infoDiv = el("div", "info");
      infoDiv.appendChild(el("div", "publisher", `<strong>${Publisher}</strong>`));
      infoDiv.appendChild(el("div", "date", `<span>${Created_at}</span>`));
      userContainer.appendChild(infoDiv);

      postHeadWrap.appendChild(userContainer);
      postHeadWrap.appendChild(el("span", "divider"));
      postHeadWrap.appendChild(el("h2", "", Title));

      const section = el("section");
      const pContent = el("p", "clamp");
      pContent.textContent = Content; // keep as text for safety
      section.appendChild(pContent);

      topDiv.appendChild(postHeadWrap);
      topDiv.appendChild(section);

      // Bottom
      const bottomDiv = el("div", "bottom");

      // categories
      const categoriesDiv = el("div", "categories");
      const catWrap = el("div", "catigories");
      if (HasCategories) {
        Catigories.forEach(cat => {
          catWrap.appendChild(el("span", "category", escapeHtml(cat)));
        });
      } else {
        catWrap.innerHTML = `<span class="category">Uncategorized</span>`;
      }
      
      categoriesDiv.appendChild(catWrap);
      bottomDiv.appendChild(categoriesDiv);
      bottomDiv.appendChild(el("span", "divider"));

      // postbot: only comment count link + ReadMore (no like/dislike)
      const postbot = el("div", "postbot");
      const smallActions = el("div", "likes_dislikes_comment");

      // <==== i will switch this to be not clicked ====> !
      smallActions.innerHTML = `
        <div href="/post?Id=${Id}#comment">
          <img src="/static/svg/comment.svg" alt="comment" /> ${CommentsCount}
        </div>
      `;
      // <===================================> <!-!>
      const readMoreDiv = el("div", "ReadMore");
      //readMoreDiv.innerHTML = `<a href="/post?Id=${Id}" class="readmore" id="btn2">Read More</a>`;
      //readMoreDiv.innerHTML = `<a href="#" class="readmore" id="btn2">Read More</a>`;
      readMoreDiv.innerHTML = `<a href="#" class="readmore" data-id="${Id}">Read More</a>`;

      postbot.appendChild(smallActions);
      postbot.appendChild(readMoreDiv);
      bottomDiv.appendChild(postbot);

      postDiv.appendChild(topDiv);
      postDiv.appendChild(bottomDiv);
      containerDiv.appendChild(postDiv);

      postsContainer.appendChild(containerDiv);
      renderPagination(pagination);
    });
  } catch (err) {
    console.error("Failed to fetch posts:", err);
  }
}
 

function renderPagination(pagination) {

  const container = document.querySelector(".pagination");
  if (!container) return;
  // ==> {{-BUILD THE HTML PAGINATION-}} <===
  container.innerHTML = `
    ${pagination.HasPrev
      ? `<a href="#" class="pagination__link pagination__link--prev" data-page="${pagination.PrevPage}">
           <img src="/static/svg/left.svg" alt="previous page"> Previous
         </a>`
      : `<span class="pagination__link pagination__link--prev" style="opacity:.3;">
           <img src="/static/svg/left.svg" alt="previous page">
         </span>`}
    <span class="pagination__current">Page ${pagination.CurrentPage}</span>
    ${pagination.HasNext
      ? `<a href="#" class="pagination__link pagination__link--next" data-page="${pagination.NextPage}">
           Next <img src="/static/svg/right.svg" alt="next page">
         </a>`
      : `<span class="pagination__link pagination__link--next" style="opacity:.3;">
           <img src="/static/svg/right.svg" alt="next page">
         </span>`}
  `;
  // <<== Attach click events to the active links ==>>
  container.querySelectorAll("a[data-page]").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const page = Number(link.dataset.page);
      fetchPosts("", page); // keep current filter if you have one
    });
  });
}

