import { showPage } from "./main.js";
// import { destroyFloatingChatIsland } from "./ChatIsland.js";
export async function registerBuilding(user) {
  // destroyFloatingChatIsland();
  if (!document.querySelector('link[href*="forms.css"]')) {
    const formsCSS = document.createElement('link');
    formsCSS.id = "cssl9dim";
    formsCSS.rel = 'stylesheet';
    formsCSS.href = '/static/css/forms.css';
    document.head.appendChild(formsCSS);
  }
  const mainContent = document.querySelector('.main-content');
  const mobileHeader = document.querySelector('.mobileHeader');
  const pagination = document.querySelector('.pagination');
  const footerContainer = document.querySelector('.footer');
  if (mainContent) mainContent.innerHTML = "";
  if (mobileHeader) mobileHeader.innerHTML = "";
  if (pagination) pagination.remove();
  if (footerContainer) footerContainer.innerHTML = "";
  function createEl(tag, className = "", html = "") {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (html) el.innerHTML = html;
    return el;
  }
  if (mobileHeader) {
    mobileHeader.innerHTML = `
      <div class="header__logo">
        <div class="header__logo-link">
          <img src="/static/svg/logo.svg" alt="Logo" class="header__logo-img" />
        </div>
      </div>
      <div class="header__filter">
        <h2>Create a new account</h2>
      </div>
      <div class="user_actions--header">
        <div class="header__auth-links">
          <a href="#" id="Login" class="header__auth-link">Login</a>
        </div>
      </div>
    `;
  }
  const container = createEl("div", "container");
  const form = createEl("form");
  form.action = "/register";
  form.method = "POST";

  form.innerHTML = `
    <img src="/static/svg/registerleft.svg" alt="Register Image" />
    <h2>Please enter your details</h2>
    <h1>Join the community!</h1>

    <div class="formfield">
      <label for="nickname">Nickname</label>
      <input type="text" name="username" id="username" minlength="3" maxlength="32" placeholder="Your nickname" required />
    </div>

    <div class="formfield">
      <label for="age">Age</label>
      <input type="number" name="age" id="age" min="13" max="120" placeholder="Your age" required />
    </div>

    <div class="formfield">
      <label for="gender">Gender</label>
      <select name="gender" id="gender" required>
        <option value="">Select gender</option>
        <option value="male">Male</option>
        <option value="female">Female</option>
        <option value="other">Other</option>
      </select>
    </div>

    <div class="formfield">
      <label for="first_name">First Name</label>
      <input type="text" name="first_name" id="first_name" minlength="2" maxlength="32" placeholder="First name" required />
    </div>

    <div class="formfield">
      <label for="last_name">Last Name</label>
      <input type="text" name="last_name" id="last_name" minlength="2" maxlength="32" placeholder="Last name" required />
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

    <input type="submit" value="Register" />
    <p>Already have an account? <a href="#" id="Login"> Login here</a></p>
  `;
  
  container.appendChild(form);

  const footer = createEl("footer", "footer");
  footer.innerHTML = `
    <div class="footer__container">
      <p class="footer__text">&copy; 2025 FORUM — Built with 💙 by the Forum Team</p>
    </div>
  `;

  if (mainContent) mainContent.appendChild(container);
  if (footerContainer) footerContainer.appendChild(footer);

  //form.appendChild(errorMessage)
  // form submit handler
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorMessage = document.getElementById("errorMessage");
    errorMessage.style.display = "none";
    errorMessage.textContent = "";
    const username = document.getElementById("username").value;
    const age = document.getElementById("age").value;
    const gender = document.getElementById("gender").value;
    const firstName = document.getElementById("first_name").value;
    const lastName = document.getElementById("last_name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirmpassword = document.getElementById("confirm_password").value;
    if (password !== confirmpassword) {
      errorMessage.style.display = "block";
      errorMessage.textContent = "Passwords do not match.";
      return;
    }
    try {
      const res = await fetch("/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          age : Number(age),
          gender,
          first_name: firstName,
          last_name: lastName,
          email,
          password,
          confirmpassword
        })

      });
      const result = await res.json();
      if (res.ok && result.status === "ok") {
        errorMessage.style.display = "none";
        const userRes = await fetch("/api/me");
        const user = await userRes.json();
        await showPage("login", user);
        sessionStorage.setItem("currentPage", "login");
      } else {
        errorMessage.style.display = "block";
        errorMessage.textContent = result.message || "Registration failed";
      }
    } catch (err) {
      errorMessage.style.display = "block";
      errorMessage.textContent = "Server error. Try again later.";
    }
  });
}
