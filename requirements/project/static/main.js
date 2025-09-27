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
      <button id ="Logo" class="home-button">Go Home</button>
    </div>
  `;
    if (title.includes("403")) {
    window.history.replaceState({}, "", "/unauthorized");
  } else if (title.includes("404")) {
    window.history.replaceState({}, "", "/404");
  }
  // ================================ \\)
  setupGlobalListeners()
}

export async function showPage(page, user, id, curentPage, targetUser = null) {
  currentPage = page;
  console.log("im at current page")
  console.log("currrent",curentPage)
  console.log(page)
  console.log("<<=======>>")
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
  } else if (page === "newpost") {
    await NewPost(Object.keys(user.fileds), user);
  } else if (page === "Post") {
    if (id !== undefined) {
      sessionStorage.setItem("currentPostId", id);
    } else {
      id = sessionStorage.getItem("currentPostId");
    }
    if (id) {
      
      POST(id, user, curentPage);
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
    "/newpost": "newpost",
    "/Post": "Post",
    "/chat": "Chat",
    "/unauthorized": "unauthorized"  
  };

  console.log("the current path")
  console.log(path)
  console.log("the <==========>")
  currentPage = validPages[path];
  console.log(currentPage)

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
    const authRequiredPages = ["home", "newpost", "Post", "Chat"];
    if (authRequiredPages.includes(currentPage)) {
      currentPage = "login";
      console.log("ana hna")
    }
  }
  if (currentPage !== "unauthorized") {
    sessionStorage.setItem("currentPage", currentPage);
  }
  const LAST = sessionStorage.getItem("currentPage")
  console.log("------")
  console.log(LAST)
  console.log("=============")
  await showPage(currentPage, user);
  setupGlobalListeners(user);

};
