import { homeBuild } from "./buildhome.js";
import { showPage } from "./main.js";

export async function NewPost(categories = []) {
  // Load CSS
  if (!document.querySelector('link[href*="forms.css"]')) {
    const link = document.createElement('link');
    link.id = "Css"
    link.rel = 'stylesheet';
    link.href = '/static/css/forms.css';
    document.head.appendChild(link);
  }
  
  const mainContent = document.querySelector('.main-content');
  const mobileHeader = document.querySelector('.mobileHeader');
  const pagination = document.querySelector('.pagination');
  const footerContainer = document.querySelector('.footer');

  if (mainContent) mainContent.innerHTML = "";
  if (pagination) pagination.remove()
  if (footerContainer) footerContainer.innerHTML = "";

  function createEl(tag, className = "", html = "") {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (html) el.innerHTML = html;
    return el;
  }
 

  // Error container
  const errorMessage = createEl("div", "error-container");
  errorMessage.style.display = "none";

  // Form
  const container = createEl("div", "container");
  const form = createEl("form", "postForm");
  form.setAttribute("method", "POST");
  form.setAttribute("action", "/newPost");

  form.innerHTML = `
      <img src="/static/svg/writer.svg" alt="Create post" />
      <h2>Create a Post</h2>
      <h1>New Forum Post</h1>
  
      <div class="formfield">
        <label for="title">Post Title</label>
        <input type="text" id="title" name="title" placeholder="Title..." minlength="10" maxlength="70" required />
      </div>
  
      <div class="formfield">
        <label for="content">Content</label>
        <textarea id="content" name="content" placeholder="Insert content here..." minlength="1" maxlength="10000" required></textarea>
      </div>
  
      <div class="formfield">
        <label>Select Categories</label>
        <div class="box-group"></div>
      </div>
  
      <input type="submit" value="Post" />
    `;

  // Categories
  const boxGroup = form.querySelector(".box-group");
  categories.forEach(cat => {
    const div = createEl("div");
    const input = createEl("input");
    input.type = "checkbox";
    input.name = "Categories";
    input.id = cat;
    input.value = cat;

    const label = createEl("label", "", cat);
    label.setAttribute("for", cat);

    div.append(input, label);
    boxGroup.appendChild(div);
  });

  container.appendChild(form);
  container.appendChild(errorMessage);

  // Footer
  const footer = createEl("footer");
  footer.innerHTML = `
      <div class="footer-container">
        <p>&copy; 2025 FORUM — Built with 💙 by the Forum Team</p>
      </div>
    `;
  if (footerContainer) footerContainer.appendChild(footer);
  if (mainContent) mainContent.appendChild(container);

  // Handle form submit with fetch
  form.addEventListener("submit", async e => {
    e.preventDefault();

    const title = form.querySelector("#title").value.trim();
    const content = form.querySelector("#content").value.trim();
    const selectedCategories = Array.from(
      form.querySelectorAll('input[name="Categories"]:checked')
    ).map(c => c.value);

    if (!title || !content) {
      errorMessage.innerText = "Title and content cannot be empty.";
      errorMessage.style.display = "block";
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("content", content);
      selectedCategories.forEach(c => formData.append("Categories", c));

      const res = await fetch("/newPost", { method: "POST", body: formData ,  headers: {
    "X-Requested-With": "fetch" } });
      const data = await res.json();
      if (!res.ok) {
        errorMessage.innerText = data.error || "Error submitting post";
        errorMessage.style.display = "block";
        return;
      }
      // Redirect To Home When The User Created The Post !!
      console.log("Post created:", data);
      errorMessage.style.display = "none";
      const Stat = await fetch("/api/me");
      const user = await Stat.json();
      // <===========>
      // Load and remove CSS
      const css = document.getElementById('css')
      if (css) css.remove()

      // Her I Will Handle It By !!!
      await showPage("home", user);
      sessionStorage.setItem("currentPage", "home");
      // LocalStorage.setItem("")
      // HomeBuild(user)
      form.reset()
    } catch (err) {
      errorMessage.innerText = "Network error: " + err.message;
      errorMessage.style.display = "block";
    }

  });
}
