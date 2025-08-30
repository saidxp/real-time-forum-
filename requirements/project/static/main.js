import { Addeventlistnerandpost } from "./setevrntlisnter.js";
import { fetchPosts } from "./setevrntlisnter.js";
import {addevenlistnertohero} from "./addlistners"
// Helper: create element with class and innerHTML
function createEl(tag, className = '', html = '') {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (html) el.innerHTML = html;
  return el;
}

// Build the header dynamically
async function buildHeader(user) {
  const body = document.body;
  const header = createEl("header", "header");

  // Logo
  const logoDiv = createEl("div", "header__logo", `
    <a href="/" class="header__logo-link">
      <img src="/static/svg/logo.svg" alt="Logo" class="header__logo-img">
    </a>
  `);
  header.appendChild(logoDiv);

  // User actions container
  const actionsDiv = createEl("div", "user_actions--header");

  // Filter nav
  const nav = createEl("nav", "profile-nav");
  const ul = createEl("ul");
  const liDropdown = createEl("li", "profile-dropdown");
  const filterDiv = createEl("div", "header__filter-label");
  filterDiv.innerHTML = `Filter <img src="/static/svg/filter.svg" alt="Filter by Categories">`;
  liDropdown.appendChild(filterDiv);

  const filterUl = createEl("ul");
  if (user.fileds) {
    Object.keys(user.fileds).forEach(key => {
      const li = createEl("li");
      li.innerHTML = `<a href="#" data-filter="${encodeURIComponent(key)}">${key}</a>`; 
      filterUl.appendChild(li);
    });
  }

  if (user.authenticated) {
    filterUl.innerHTML += `<li><a href="#" data-filter="Owned">Owned</a></li>`;
    filterUl.innerHTML += `<li><a href="#" data-filter="Likes">Liked</a></li>`;
  }

  // <===================||====================>
  liDropdown.appendChild(filterUl);
  ul.appendChild(liDropdown);
  nav.appendChild(ul);
  actionsDiv.appendChild(nav);

  // Create Post Button !!
  const postDiv = createEl("div", "nes_post--header", `
    <a href="/newPost" aria-label="Create new post" class="readmore">
      <img src="/static/svg/pencil-line.svg" alt="New post icon">
      Create Post
    </a>
  `);
  actionsDiv.appendChild(postDiv);

  // Auth/Profile section
  if (user.authenticated) {
    const profileNav = createEl("nav", "profile-nav");
    profileNav.innerHTML = `
      <ul>
        <li class="profile-dropdown">
          <div class="header__profile">
            <div class="initial">${user.Initial}</div>
            <div class="username">${user.Username}</div>
          </div>
          <ul>
            <li>
              <a href="/profile" class="header__profile-link">
                <img src="/static/svg/bolt.svg" class="header__profile-icon">Account Settings
              </a>
            </li>
            <li>
              <a href="/logout" class="header__profile-link">
                <img src="/static/svg/log-out.svg" class="header__profile-icon">Logout
              </a>
            </li>
          </ul>
        </li>
      </ul>
    `;
    actionsDiv.appendChild(profileNav);
  } else {
    const authLinks = createEl("div", "header__auth-links", `
      <a href="/register" class="header__auth-link">Sign Up</a>
      <a href="/login" class="header__auth-link">Login</a>
    `);
    actionsDiv.appendChild(authLinks);
  }
  // 
  header.appendChild(actionsDiv);
  body.insertBefore(header, body.firstChild);
}

// ===========================================> 
// Build hero section dynamically
function buildHero(user) {
  const hero = document.querySelector(".hero");
  hero.innerHTML = `
    <h1 class="hero__title">Welcome to the Forum</h1>
    <div class="hero__cta">
      ${user.authenticated
      ? `<a href="/newPost" class="btn-secondary">Create Post</a>
           <a href="/profile" class="btn-secondary">Profile</a>`
      : `<a href="/login" class="btn-secondary">Login</a>
           <a href="/register" class="btn-secondary">Sign Up</a>`}
    </div>
  `;
}

// Main: on page load
window.onload = async () => {
  const res = await fetch("/api/me");
  const user = await res.json();
  //<====> Her I Will <====> 
  //console.log(user)
  console.log(user)
  // her i build header 
  await buildHeader(user);
  // her i build hero section !!
  buildHero(user);
  // her i add event-listner and post by click !!
  // Fetch Posts Her In First Load !! 
  fetchPosts("")
  // <=====> \\ 
  // than i add event listner her for filters !!
  // and i fetch the post by click of users !!
  Addeventlistnerandpost();
  // <====> 
   // Todo://all categorie still need fix !!
  // <====>
  // i need to set all event listner on Buthon 
  addevenlistnertohero()
  //
};
