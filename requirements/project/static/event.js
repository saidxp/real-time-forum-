import { homeBuild } from "./buildhome.js";
import { Addeventlistnerandpost } from "./setevrntlisnter.js";

export async function loginbuilding() {


  // navigation clear it applicate vanila is hill 
  const existingHomeHeader = document.querySelector('header.header');
  if (existingHomeHeader) existingHomeHeader.remove();
  const m = document.querySelector(".mobileHeader");
  if (m) {
    m.style.display = "";  
    m.innerHTML = ""; 
  }
  if (!document.querySelector('link[href*="forms.css"]')) {
    const formsCSS = document.createElement('link');
    formsCSS.rel = 'stylesheet';
    formsCSS.href = '/static/css/forms.css';
    document.head.appendChild(formsCSS);
  }
  
  const mainContent = document.querySelector('.main-content');
  const mobileHeader = document.querySelector('.mobileHeader');
  const pagination = document.querySelector('.pagination');
  const footerContainer = document.querySelector('.footer');

  // Clear The Containers
  if (mainContent) mainContent.innerHTML = "";
  if (mobileHeader) mobileHeader.innerHTML = "";
  if (pagination) pagination.innerHTML = "";
  if (footerContainer) footerContainer.innerHTML = "";

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
      <a href="/" class="header__logo-link">
        <img src="/static/svg/logo.svg" alt="Logo" class="header__logo-img" />
      </a>
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
  Addeventlistnerandpost();

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
        //localStorage.setItem("authToken", result.token);
        //localStorage.setItem("username", result.username);
        console.log(result.token)
        console.log("hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh")
        errorMessage.style.display = "none";
        // her i will build home page again with result !!
        // IMPORTANT: Clean up login header before building home
        //if (mobileHeader) {
        //mobileHeader.innerHTML = "";
        //mobileHeader.style.display = "none"; // Hide it for home page
        //}
        if (mobileHeader) {
          mobileHeader.innerHTML = "";
          mobileHeader.style.display = "none";
        }

        const res = await fetch("/api/me");
        const user = await res.json();
        await homeBuild(user)
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
      },
    });
    const data = await response.json();
    if (response.ok) {
      console.log(data.message);
      const res = await fetch("/api/me");
      const user = await res.json();
      await loginbuilding()
    } else {
      console.error("Logout error:", data.error);
      alert("Logout failed: " + data.error);
    }
  } catch (err) {
    console.error("Logout failed:", err);
    alert("Something went wrong while logging out ..........");
  }
}