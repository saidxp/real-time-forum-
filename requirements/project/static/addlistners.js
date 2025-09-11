import { loginbuilding, Logoutfunc } from "./event.js";
import { registerBuilding } from "./register.js";
import { NewPost } from "./newpost.js"
import {POST} from "./post.js"
import { homeBuild } from "./buildhome.js";
import { fetchPosts } from "./setevrntlisnter.js";
import{showPage} from "./main.js"

export function setupGlobalListeners(User) {
  document.addEventListener("click", async (event) => {
    let target = event.target;
    console.log("<=(event)======")
    console.log(target)
    console.log("============")
    
    const filterLink = target.closest("a[data-filter]");
    if (filterLink) {
      event.preventDefault();
      const filter = decodeURIComponent(filterLink.dataset.filter);
      console.log("Filter clicked:", filter);

      const res = await fetch("/api/me");
      const user = await res.json();
      await homeBuild(user);      
      fetchPosts(filter);          
      return;                       
    }

    const POSTID = event.target.closest("a.readmore");
    const res = await fetch("/api/me");
    const user = await res.json();
    
    if (POSTID) {
      console.log("Yes, clicked readmore!");
      const postId = POSTID.dataset.id;
      console.log("Post ID:", postId);
      await showPage("Post", user, postId);
      sessionStorage.setItem("currentPage", "Post");
      console.log("Login clicked!");
    }
    
    if (!target) return;
    const id = target.id;
    console.log("the id her", id)
    
    // Handle different button clicks
    if (id === "Login") {
      await showPage("login", user);
      sessionStorage.setItem("currentPage", "login");
      console.log("Login clicked!");
    }
    else if (id === "Register") {
      event.preventDefault();
      await showPage("register", user);
      sessionStorage.setItem("currentPage", "register");
      console.log("Register clicked!");
    }
    else if (id === "Out") {
      await Logoutfunc();
      console.log("Logout clicked!");
    }
    else if (id === "Logo" || id === "logo") {
      // Go back to home
      await showPage("home", user);
      sessionStorage.setItem("currentPage", "home");
      console.log("Logo clicked!");
    }
    else if (id === "Newpost") {
      console.log("Create Post clicked!");
      if (user.authenticated) {
        await showPage("Newpost", user);
        sessionStorage.setItem("currentPage", "Newpost");
      } else {
        loginbuilding()
      }
    }
    else if (id === "Profile") {
      console.log("Profile clicked!");
    }
    else if (id === "ChatBtn" || id === "chat-btn") {
      console.log("Chat clicked!");
      if (user.authenticated) {
        await showPage("chat", user);
        sessionStorage.setItem("currentPage", "chat");
      } else {
        await showPage("login", user);
        sessionStorage.setItem("currentPage", "login");
      }
    }
  });
}