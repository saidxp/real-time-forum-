import { Logoutfunc } from "./event.js";
import { fetchPosts } from "./setevrntlisnter.js";
import { showPage } from "./main.js"


export function setupGlobalListeners(User) {
  document.addEventListener("click", async (event) => {
    let target = event.target;
    
    const filterLink = target.closest("a[data-filter]");
    if (filterLink) {
      event.preventDefault();
      const filter = decodeURIComponent(filterLink.dataset.filter);
      console.log("Filter clicked:", filter);
      const res = await fetch("/api/me");
      const user = await res.json();
      
      await showPage("home", user);     
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
    if (!target) return;
    const id = target.id;
    console.log("the id her", id)
    if (id === "Login") {
      const res = await fetch("/api/me");
      const user = await res.json();
      await showPage("login", user);
      console.log("Login clicked!");
    }
    else if (id === "Register") {
      const res = await fetch("/api/me");
      const user = await res.json();
      event.preventDefault();
      await showPage("register", user);
      console.log("Register clicked!");
    }
    // --- <Logout> ---
    else if (id === "Out") {
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
      await showPage("home", user)
    }
    else if (id === "Newpost") {
      console.log("Create Post clicked!");
      const res = await fetch("/api/me");
      const user = await res.json();
      window.history.replaceState({}, "", "/createpost");
     await showPage("createpost", user);
    }else if (id === "Chat") {
      console.log("Create Post clicked!");
      const res = await fetch("/api/me");
      const user = await res.json();
      window.history.replaceState({}, "", "/chat");
      await showPage("Chat", user)
    }
    const userItem = target.closest('.online-user');
    if (userItem && userItem.dataset.username) {
      event.preventDefault();
      const username = userItem.dataset.username;
      // Import and call setupPrivateChat
      try {
        const { setupPrivateChat } = await import('./chatui.js');
        const { currentSocket, setIntentionalSocketClose, setCurrentSocket } = await import('./chatState.js');
        
        if (currentSocket) {
          setIntentionalSocketClose(true);
          currentSocket.close();
          setCurrentSocket(null);
        }
        await setupPrivateChat(username);
      } catch (err) {
        console.error('Error setting up private chat:', err);
      }
    }
  });
}
