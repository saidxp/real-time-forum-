 import {setupGlobalListeners} from "./addlistners.js"
import {loginbuilding} from "./event.js"
import { homeBuild } from "./buildhome.js";
import { registerBuilding } from "./register.js";
import { POST } from "./post.js";
import { NewPost } from "./newpost.js";
//import {loadChatUI}from "./chatui.js"

//loadChatUI()
//let previd = null
let currentPage = "login";

export async function showPage(page, user, id, curentPage) {
  //check every time the state of user to not lose it in refrech !!
  //const R = await fetch("/api/me");
  //const u = await res.json();
  currentPage = page;
  console.log("Showpage id ", id)
  if (page === "login") {
    await loginbuilding(user);
  } else if (page === "register") {
    await registerBuilding(user);
  } else if (page === "home") {
    console.log("howa ola machy hwa howa olahhe tahwa ")
    await homeBuild(user);
  }else if(page  === "Newpost") {
    NewPost(Object.keys(user.fileds))
  }else if (page === "Post") {
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
  }
}

window.onload = async () => {
  //  her i will fetch the state off it !
  const res = await fetch("/api/me");
  const user = await res.json();
  if (!user || !user.authenticated) {
    currentPage = "login";
  } else {
    // Authenticated: either restore saved page or default to home
    const savedPage = sessionStorage.getItem("currentPage");
    currentPage = savedPage || "home";
  }
  // Soo Her I Will Handle When The User It's Autenticated It's Will
  // restore from sessionStorage if available
  const savedPage = sessionStorage.getItem("currentPage");
  if (savedPage) currentPage = savedPage;
  await showPage(currentPage, user);
  setupGlobalListeners(user)
  // If the backend says "not authenticated", force login page.
};
