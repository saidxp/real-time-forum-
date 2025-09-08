 
 
import {setupGlobalListeners} from "./addlistners.js"
import {loginbuilding} from "./event.js"
import { homeBuild } from "./buildhome.js";
//import {loadChatUI}from "./chatui.js"

//loadChatUI()
// Main: on page load !!! <'|'>
window.onload = async () => {
  const res = await fetch("/api/me");
  const user = await res.json();
  //<====> Her I Will <====> 
  //console.log(user)
  // I WILL HANDLE THE DIRECTION OF THE ROUTE to be every time at the route who i want
  //console.log(user)

  if (!user.authenticated) {
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
  setupGlobalListeners(user)

};
