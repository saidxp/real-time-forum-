 
import { fetchPosts } from "./setevrntlisnter.js";
 
import {loadChatUI}from "./chatui.js"

// build home it's separate from main !!
export async function homeBuild(user) {

  // check Authenticatec evey time to be sure the user it's authenticated 
  const ii = document.getElementById("Css")
  if (ii) {
    ii.remove()
  }
  //const rm = document.getElementById
  const mobileHeader = document.querySelector('.mobileHeader');
  if (mobileHeader) {
    mobileHeader.innerHTML = "";
    mobileHeader.style.display = "none";
  }
  const mainContent = document.querySelector('.main-content');
  if (mainContent && !mainContent.querySelector('.hero')) {
    mainContent.innerHTML = `
            <section class="hero">
            </section>
            <section class="main-content__posts">
                <p>post will be her </p>
            </section>
            <nav class="pagination" aria-label="Pagination navigation"></nav>
        `;
  }
  // < END OF ADDITION !!!>
  function createEl(tag, className = '', html = '') {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (html) el.innerHTML = html;
    return el;
  }
  // Remove existing header to avoid duplicates
  const existingHeader = document.querySelector('header.header');
  if (existingHeader) existingHeader.remove();
  // Build the header dynamically
  const body = document.body;
  const header = createEl("header", "header");

  // Logo handler !!
  const logoDiv = createEl("div", "header__logo", `
    <a id = "Logo" class="header__logo-link">
      <img id = "Logo" src="/static/svg/logo.svg" alt="Logo" class="header__logo-img">
    </a>
  `);

  header.appendChild(logoDiv);
  // User actions container
  const actionsDiv = createEl("div", "user_actions--header");
  const button = createEl("button","chat",`chat`)
 actionsDiv.appendChild(button)

  // Filter nav
  const nav = createEl("nav", "profile-nav");
  const ul = createEl("ul");
  const liDropdown = createEl("li", "profile-dropdown");
  const filterDiv = createEl("div", "header__filter-label");
  filterDiv.innerHTML = `Filter <img src="/static/svg/filter.svg" alt="Filter by Categories">`;
  liDropdown.appendChild(filterDiv);
actionsDiv.appendChild(button)
button.addEventListener("click",()=>{
loadChatUI()
})
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
    <a href="#" id = "Newpost" aria-label="Crea newpost" >
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
              <a id = "logo" class="header__profile-link">
                <img src="/static/svg/bolt.svg" class="header__profile-icon">Account Settings
              </a>
            </li>
            <li>
              <a href="#" id ="Out" class="header__profile-link">
                <img src="/static/svg/log-out.svg" class="header__profile-icon" data-action="logout"> Logout
              </a>
            </li>
          </ul>
        </li>
      </ul>
    `;
    actionsDiv.appendChild(profileNav);
    // <==========> her i will add event listner about (filter)
    /// her >>>> 
    //  <==================================================>
    //  Addeventlistnerandpost();
  } else {
    // Her There Is The The Logout Out Stat I Need to lisntnign to it !!  
    const authLinks = createEl("div", "header__auth-links", `
      <a href="#" id = "Register" class="header__auth-link">Sign Up</a>
      <a href="#" id = "Login" class="header__auth-link">Login</a>
    `);
    actionsDiv.appendChild(authLinks);
  }
  // |< <==-|-==> >|
  header.appendChild(actionsDiv);
  body.insertBefore(header, body.firstChild);
  // build hero !! 
  // Get <===> Post <==!!==>
  await fetchPosts("")
  // I THIK I DO IT HHHHHHHHH I SOLVE THE PROBLEM !! OF THE ASYNC JS IT'S CRAZY IT'S NOT POINT TO THE PORBBLEM IN THE FIRST !!
  buildHero(user)
  const foot = document.getElementById("333")
  foot.innerHTML = `
    <div class="footer__container">
      <p class="footer__text">&copy; 2025 FORUM — Built with 💙 by the Forum Team</p>
    </div>
  `
}

function buildHero(user) {
  const hero = document.querySelector(".hero");
  hero.innerHTML = `
    <h1 class="hero__title">Welcome to the Forum</h1>
    <div class="hero__cta">
      ${user.authenticated
      ? `<a id ="Newpost"  class="btn-secondary">Create Post</a>`
      : `<a href="#" id = "Login"  class="btn-secondary">Login</a>
           <a href="#" id = "Register"  class="btn-secondary">Sign Up</a>`}
    </div>
  `;
}
