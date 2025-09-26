import {setupGlobalListeners} from "./addlistners.js"
import {loginbuilding} from "./event.js"
import { homeBuild } from "./buildhome.js";
import { registerBuilding } from "./register.js";
import { POST } from "./post.js";
import { loadChatUI } from "./chatui.js";
import { NewPost } from "./newpost.js";

let currentPage = "login";

// Her I Will Need To Handle The Message Error !! 
// <=====>
export function showErrorPage({ 
  title = "Page not found", 
  message = "", 
  statusCode = "", 
  statusText = "" 
} = {}) {
  const main = document.querySelector(".main-content");
  if (!main) return;
  main.innerHTML = ""
  main.innerHTML = `
    <div class="error-container">
      <h1 class="error-title">${title}</h1>
      <p class="error-message">${message}</p>
      <div class="error-details">
        ${statusCode ? `<p>${statusCode}</p>` : ""}
        ${statusText ? `<p>${statusText}</p>` : ""}
      </div>
      <a id ="Logo" class="home-button">Go Home</a>
    </div>
  `;
}

export async function showPage(page, user, id, curentPage, targetUser = null) {
  currentPage = page;
  console.log("Showpage id ", id)
  if (page === "unauthorized") {
    showErrorPage({
      title: "403 - Not Authorized",
      message: "This endpoint is only accessible from inside the app."
    });
    return;
  }
  if (page === "login") {
    await loginbuilding(user);
  } else if (page === "register") {
    await registerBuilding(user);
  } else if (page === "home") {
    const res = await fetch("/api/me");
    const user = await res.json();
    console.log("howa ola machy hwa howa olahhe tahwa ")
    await homeBuild(user);
  } else if (page === "Newpost") {
    await NewPost(Object.keys(user.fileds));
  } else if (page === "Post") {
    if (id !== undefined) {
      sessionStorage.setItem("currentPostId", id);
    } else {
      id = sessionStorage.getItem("currentPostId");
    }
    if (id) {
      const re = await fetch("/api/me");
      const us = await re.json();
      POST(id, us, curentPage);
    } else {
      console.error("No post ID available");
      await showPage("home", user);
    }
  } else if (page === "Chat") {
    // Load private chat UI with target user
    // If no targetUser is provided, loadChatUI will show user selection
    await loadChatUI(targetUser);
  }
}

// Function to start a private chat with a specific user
export async function startPrivateChat(targetUsername) {
  const res = await fetch("/api/me");
  const user = await res.json();
  if (!user.authenticated) {
    alert("You must be logged in to chat");
    return;
  }
  await showPage("chat", user, null, null, targetUsername);
  sessionStorage.setItem("currentPage", "chat");
}

window.onload = async () => {
  let user = { authenticated: false };
  try {
    const res = await fetch("/api/me");  
    if (res.ok) user = await res.json();
  } catch (err) {
    console.error("Error fetching user:", err);
  }
  const path = window.location.pathname;
  const validPages = {
    "/": "home",
    "/home": "home",
    "/login": "login",
    "/register": "register",
    "/newPost": "Newpost",
    "/post": "Post",
    "/chat": "Chat",
    "/unauthorized": "unauthorized"  
  };

  let currentPage = validPages[path] || null;

  if (!currentPage) {
    showErrorPage({
      title: "404 - Page not found",
      message: "This page does not exist."
    });
    return;
  }
  if (user.authenticated) {
    if (currentPage === "login" || currentPage === "register") {
      currentPage = "home";
    }
    
  } else {
    const authRequiredPages = ["home", "Newpost", "Post", "Chat"];
    if (authRequiredPages.includes(currentPage)) {
      currentPage = "login";
    }
  }

  const savedPage = sessionStorage.getItem("currentPage");
  if (savedPage) currentPage = savedPage;
  await showPage(currentPage, user);
  setupGlobalListeners(user);

};
