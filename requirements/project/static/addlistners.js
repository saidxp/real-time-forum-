import { Logoutfunc } from "./event.js";
import { fetchPosts } from "./setevrntlisnter.js";
import { showPage } from "./main.js"


export function setupGlobalListeners(User) {
  //  HER I WILL ADD CHAT BUTOON !!
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
      // her i will handle the showpage home !!
      // it's must be call 
      //POST(postId, user) 
      await showPage("home", user);
      //sessionStorage.setItem("currentPage", "home");
      //await homeBuild(user);      
      await fetchPosts(filter, 1);
      return;
    }
    const POSTID = event.target.closest("a.readmore");
 
    if (POSTID) {
      console.log("Yes, clicked readmore!");
      const res = await fetch("/api/me");
      const user = await res.json();
      const postId = POSTID.dataset.id; // 
      console.log("Post ID:", postId);
      await showPage("Post", user, postId);
      window.history.replaceState({}, "", "/Post");


      sessionStorage.setItem("currentPage", "Post");
      console.log("Post open clicked!");
    }
    console.log("=====================")
    //while (target && tmodulearget.tagName !== "A") {
    //target = target.parentElement;
    //}
    // <==========>
    if (!target) return;
    const id = target.id;
    console.log("the id her", id)
    // Handle different button clicks
    if (id === "Login") {
      const res = await fetch("/api/me");
      const user = await res.json();
      await showPage("login", user);
      //sessionStorage.setItem("currentPage", "login");
      console.log("Login clicked!");
    }
    else if (id === "Register") {
      const res = await fetch("/api/me");
      const user = await res.json();
      event.preventDefault();
      await showPage("register", user);
      //sessionStorage.setItem("currentPage", "register");
      console.log("Register clicked!");
    }
    // --- <Logout> ---
    else if (id === "Out") {
      // Her I Will Handle The Logout Her !
      await Logoutfunc();
      console.log("Logout clicked!");
    }
    // --- <Logo> ---
    else if (id === "Logo") {
      console.log("Logo clicked!");
      const res = await fetch("/api/me");
      const user = await res.json();
      
      window.history.replaceState({}, "", "/home");
      if (!user.authenticated) {
        showPage("login", user)
        //sessionStorage.setItem("currentPage", "login")
        return
      }
      // I Will Get The Css Of Any Css <!-!>
      const css0 = document.getElementById("cssPOST")
      const css1 = document.getElementById("css")
      if (css1) {
        css1.remove()
      } else if (css0) {
        css0.remove()
      }
      //\\
      //\\
      //  \\
      //    \\ 
      //      \\
      //        \\
      //          \\  
      //real-time(-)\\
      //still not app \\
      //  ============= \\
      // i ...........    \\
      //====================\\
      await showPage("home", user)
      //sessionStorage.setItem("currentPage", "home")
      // <| Her I Will Check This Her If It's Clicked To Refrech All Page With News! |>
    }
    else if (id === "Newpost") {
      console.log("Create Post clicked!");
      const res = await fetch("/api/me");
      const user = await res.json();
      // call your create post function
      // I Will CHECK If It's Autenticate Or No !!
      // IF TRUE AUT ELSE GO TO LOGIN !! 
      // < Show Page Her Of The New Post! >!!
      window.history.replaceState({}, "", "/createpost");
      //sessionStorage.setItem("currentPage", "createpost");
     await showPage("createpost", user);
    
      //NewPost(Object.keys(user.fileds))
    }else if (id === "Chat") {
      console.log("Create Post clicked!");
      const res = await fetch("/api/me");
      const user = await res.json();
      window.history.replaceState({}, "", "/chat");
      await showPage("Chat", user)
      //sessionStorage.setItem("currentPage", "Chat")
    }
  });
}
