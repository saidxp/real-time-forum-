import { loginbuilding } from "./event.js";
import { Addeventlistnerandpost} from "./setevrntlisnter.js"

export async function registerBuilding(user) {

  if (!document.querySelector('link[href*="forms.css"]')) {
    const formsCSS = document.createElement('link');
    formsCSS.rel = 'stylesheet';
    formsCSS.href = '/static/css/forms.css';
    document.head.appendChild(formsCSS);
  }

  // === Clear existing content ===
  const mainContent = document.querySelector('.main-content');
  const mobileHeader = document.querySelector('.mobileHeader');
  const pagination = document.querySelector('.pagination');
  const footerContainer = document.querySelector('.footer');

  if (mainContent) mainContent.innerHTML = "";
  if (mobileHeader) mobileHeader.innerHTML = "";
  if (pagination) pagination.innerHTML = "";
  if (footerContainer) footerContainer.innerHTML = "";

  // === Helper to create elements ===
  function createEl(tag, className = "", html = "") {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (html) el.innerHTML = html;
    return el;
  }

  // === Header ===
  const header = createEl("header", "header");
  header.innerHTML = `
    <div class="header__logo">
      <a href="/" class="header__logo-link">
        <img src="/static/svg/logo.svg" alt="Logo" class="header__logo-img" />
      </a>
    </div>

    <div class="header__filter">
      <h2>Create a new account</h2>
    </div>

    <div class="user_actions--header">
      <div class="header__auth-links">
        <a href='#" id = "Login" class="header__auth-link">Login</a>
      </div>
    </div>
  `;

  // === Container & Form ===
  const container = createEl("div", "container");
  const form = createEl("form");
  form.action = "/register";
  form.method = "POST";

  form.innerHTML = `
    <img src="/static/svg/registerleft.svg" alt="Register Image" />
    <h2>Please enter your details</h2>
    <h1>Join the community!</h1>

    <div class="formfield">
      <label for="username">User Name</label>
      <input type="text" name="username" id="username" minlength="3" maxlength="32" placeholder="Your username" required />
    </div>

    <div class="formfield">
      <label for="email">Email</label>
      <input type="email" name="email" id="email" minlength="6" maxlength="254" placeholder="Your email" required />
    </div>

    <div class="formfield">
      <label for="password">Password</label>
      <input type="password" name="password" id="password" minlength="8" maxlength="72" placeholder="Create a password" required />
    </div>

    <div class="formfield">
      <label for="confirm_password">Confirm Password</label>
      <input type="password" name="confirm_password" id="confirm_password" minlength="8" maxlength="72" placeholder="Confirm your password" required />
    </div>

    <div id="errorMessage" class="error-container" style="display:none; color: rgb(255, 35, 35);"></div>
    <input type="submit" value="#" />
    <p>Already have an account? <a href=""#" id = "Login">Login here</a></p>
  `;

  container.appendChild(form);
  // Add Event Listner To Tthe Filter !!
  Addeventlistnerandpost()
  // <========||=========>
  // === Footer ===
  const footer = createEl("footer", "footer");
  footer.innerHTML = `
    <div class="footer__container">
      <p class="footer__text">&copy; 2025 FORUM — Built with 💙 by the Forum Team</p>
    </div>
  `;

  // === Append to DOM ===
  if (mobileHeader) mobileHeader.appendChild(header);
  if (mainContent) mainContent.appendChild(container);
  if (footerContainer) footerContainer.appendChild(footer);

  // === Handle form submission ===
  const errorMessage = document.getElementById("errorMessage");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirm_password").value;

    if (password !== confirmPassword) {
      errorMessage.style.display = "block";
      errorMessage.textContent = "Passwords do not match.";
      return;
    }

    try {
      const res = await fetch("/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, confirmPassword}),
      });

      const result = await res.json();

      if (res.ok && result.status === "ok") {
        errorMessage.style.display = "none";
        // Optionally log the user in automatically or redirect
        //localStorage.setItem("authToken", result.token);
        //localStorage.setItem("username", result.username);
        const userRes = await fetch("/api/me");
        const user = await userRes.json();
        await loginbuilding(user)
        //await (user); // Build home dynamically without refresh
      } else {
        errorMessage.style.display = "block";
        errorMessage.textContent = result.message || "Registration failed";
      }
    } catch (err) {
      errorMessage.style.display = "block";
      errorMessage.textContent = "Server error. Try again later.";
      console.error(err);
    }
  });
}
