//import { homeBuild } from "./buildhome.js";
//import { Addeventlistnerandpost } from "./setevrntlisnter.js";
import { showPage } from "./main.js";
import{creatchatisland} from "./chatisland.js"
// import { destroyFloatingChatIsland } from "./ChatIsland.js";

export async function loginbuilding(user) {
  // Destroy chat island when entering login page
  creatchatisland()
  // <=( Navigation Clear It Applicate Vanila Is Hill )=> 
  // HOW OLWHHTR TAHWA HHH
  const HOWA = document.getElementById('chat-container')
  if (HOWA) {
    HOWA.remove()
  }
  const existingHomeHeader = document.querySelector('header.header');
  if (existingHomeHeader) existingHomeHeader.remove();
  const m = document.querySelector(".mobileHeader");
  if (m) {
    m.style.display = "";  
    m.innerHTML = ""; 
  }
  /// <=====>
  const p = document.querySelector(".pagination");
  if (p) {
  p.style.display = "none"
  }
  // <=====>
  if (!document.querySelector('link[href*="forms.css"]')) {
    const formsCSS = document.createElement('link');
    formsCSS.id = "Csslogin"
    formsCSS.rel = 'stylesheet';
    formsCSS.href = '/static/css/forms.css';
    document.head.appendChild(formsCSS);
  }

  const mainContent = document.querySelector('.main-content');
  const mobileHeader = document.querySelector('.mobileHeader');
  const pagination = document.querySelector('.pagination');
  const footerContainer = document.querySelector('.footer');

  // Clear The Containers
  if (mainContent) mainContent.innerHTML = "" , mainContent.style.display = "";
  if (mobileHeader) mobileHeader.innerHTML = "";
  if (pagination) pagination.innerHTML = "" 
  if (footerContainer) footerContainer.innerHTML = "", footerContainer.style.display = "";

  // Helper To Create Elements
  function createEl(tag, className = "", html = "") {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (html) el.innerHTML = html;
    return el;
  }

  //TODO: I WILL ADD THE ID OF REGISETR TO THIS <A> TO REDIRECT ME TO SOME PLACE WHER 
  // === Header ===
  const headerContent = `
    <div class="header__logo">
      <div  class="header__logo-link">
        <img src="/static/svg/logo.svg" alt="Logo" class="header__logo-img" />
      </div>
    </div>
    <div class="header__filter">
      <h2>Login to your account</h2>
    </div>
    <div class="user_actions--header">
      <div class="header__auth-links">
        <a href="#" id="Register" class="header__auth-link">Sign Up</a>
      </div>
    </div>
  `;

  // Append header content directly to mobileHeader (no nested <header>)
  if (mobileHeader) mobileHeader.innerHTML = headerContent;

  // === Form ===
  const container = createEl("div", "container");
  const form = createEl("form");
  form.innerHTML = `
    <img src="/static/svg/loginleft.svg" alt="" />
    <h2>Please enter your details</h2>
    <h1>Welcome back!</h1>

    <div class="formfield">
      <label for="username">Username</label>
      <input type="text" name="username" id="username" minlength="3" maxlength="32" placeholder="Username or Email" required />
    </div>

    <div class="formfield">
      <label for="password">Password</label>
      <input type="password" name="password" id="password" minlength="8" maxlength="72" placeholder="Password" required />
    </div>

    <div id="errorMessage" class="error-container" style="display:none;"></div>
    <input type="submit" value="Login" />
    <p>Don't have an account? <a href="#" id = "Register" >Register here</a></p>
  `;
  container.appendChild(form);
  //Addeventlistnerandpost();

  // === Footer ===
  const footer = createEl("footer");
  footer.innerHTML = `
    <div class="footer-container">
      <p>&copy; 2025 FORUM — Built with 💙 by the Forum Team</p>
    </div>
  `;

  if (mainContent) mainContent.appendChild(container);
  if (footerContainer) footerContainer.appendChild(footer);

  // === Handle form submit ===
  //const errorMessage = document.getElementById("errorMessage");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorMessage = e.target.querySelector("#errorMessage");
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    errorMessage.style.display = "none";
    errorMessage.textContent = "";

    try {
      const res = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "same-origin",
      });

      const result = await res.json();
      console.log(result)
      if (res.ok && result.status === "ok") {
        errorMessage.style.display = "none";
        if (mobileHeader) {
          mobileHeader.innerHTML = "";
          mobileHeader.style.display = "none";
        }
        const css = document.getElementById('Csslogin')
        const css1 = document.getElementById('"css"')
        if (css) {
        css.remove()
        }
        if (css1) {
          css1.remove()
        }
        // <=======================> 
        await showPage("home");
        sessionStorage.setItem("currentPage", "home");
        //await homeBuild(user)
      } else {
        errorMessage.style.display = "block";
        errorMessage.textContent = result.message || "Login failed";
      }
    } catch (err) {
      errorMessage.style.display = "block";
      errorMessage.textContent = "Server error. Try again later.";
      console.error(err);
    }
  });
}

export async function Logoutfunc() {
  // ! <===|===> ! \\ 
  try {
    const response = await fetch("/logout", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
           "X-Requested-With": "fetch" 
      },
    });
    const data = await response.json();
    if (response.ok) {
      console.log(data.message);
      const res = await fetch("/api/me");
      const user = await res.json();
      await showPage("login", user)
      sessionStorage.setItem("currentPage", "login")
      
      //await loginbuilding()
    } else {
      console.error("Logout error:", data.error);
      alert("Logout failed: " + data.error);
    }
  } catch (err) {
    console.error("Logout failed:", err);
    alert("Something went wrong while logging out ..........");
  }
}