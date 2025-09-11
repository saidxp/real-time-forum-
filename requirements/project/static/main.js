 import {setupGlobalListeners} from "./addlistners.js"
import {loginbuilding} from "./event.js"
import { homeBuild } from "./buildhome.js";
import { registerBuilding } from "./register.js";
import { POST } from "./post.js";
//import {loadChatUI}from "./chatui.js"

//loadChatUI()
//let previd = null
let currentPage = "login";

export async function showPage(page, user, id, curentPage) {
  // check every time the state of user to not lose it in refrech !!
  //const R = await fetch("/api/me");
  //const u = await res.json();
  currentPage = page;
  console.log("Showpage id ", id)

  if (page === "login") {
    await loginbuilding(user);
  } else if (page === "register") {
    await registerBuilding(user);
  } else if (page === "home") {
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
  const res = await fetch("/api/me");
  const user = await res.json();
  //<====> Her I Will <====> 
  //console.log(user)
  // I WILL HANDLE THE DIRECTION OF THE ROUTE to be every time at the route who i want
  //console.log(user)

  /*if (!user.authenticated) {
    console.log("<== Her User Is Still Not Login ==>")
    // I WILL CALL Login Page !! ==> Her <== !
    loginbuilding(user)
    //setupGlobalListeners(user)
  }else {
  // Her I Build Header >> !-! << 
  await homeBuild(user);
  // her i build hero section !!
  // her i add event-listner and post by click !!
  // Fetch Posts Her In First Load !! 
   // <=====> \\ 
  // than i add event listner her for filters !!
  // and i fetch the post by click of users !!
  // <====> 
   // Todo://all categorie still need fix !!
  // <====>
  // i need to set all event listner on Buthon 
  //setupGlobalListeners(user)
  //addevenlistnertohero
    console.log("Hello")
  }
    */
    // restore from sessionStorage if available
  const savedPage = sessionStorage.getItem("currentPage");
  if (savedPage) currentPage = savedPage;
  await showPage(currentPage, user);
  setupGlobalListeners(user)
};
