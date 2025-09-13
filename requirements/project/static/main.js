import {setupGlobalListeners} from "./addlistners.js"
import {loginbuilding} from "./event.js"
import { homeBuild } from "./buildhome.js";
import { registerBuilding } from "./register.js";
import { POST } from "./post.js";
import { loadChatUI } from "./chatui.js";

let currentPage = "login";

export async function showPage(page, user, id, curentPage, targetUser = null) {
  currentPage = page;
  console.log("Showpage id ", id)
  
  if (page === "login") {
    await loginbuilding(user);
  } else if (page === "register") {
    await registerBuilding(user);
  } else if (page === "home") {
    await homeBuild(user);
  } else if (page === "Newpost") {
    NewPost(Object.keys(user.fileds))
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
  } else if (page === "chat") {
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
  const res = await fetch("/api/me");
  const user = await res.json();
  
  // restore from sessionStorage if available
  const savedPage = sessionStorage.getItem("currentPage");
  if (savedPage) currentPage = savedPage;
  
  await showPage(currentPage, user);
  setupGlobalListeners(user);
};