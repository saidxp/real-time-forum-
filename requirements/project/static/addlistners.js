import { loginbuilding, Logoutfunc } from "./event.js";
import { registerBuilding } from "./register.js";
import { NewPost } from "./newpost.js"
import {POST} from "./post.js"
import { homeBuild } from "./buildhome.js";
import { fetchPosts } from "./setevrntlisnter.js";
// Set up a single global listener for hero + header links
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
    // stop for not refrech !! <=> 
    //event.preventDefault();

    console.log("======= Test Event of READ MORE")
    console.log(POSTID)
    console.log("===============================")
    // her i will fetch the state of user if he is  Authenicate or NO ...!! 
    // <=====================>
    const res = await fetch("/api/me");
    const user = await res.json();
    // <==================>
    // I Was Using When I Want To Go trought nodes to handle nested element but i get problem ! 
    console.log("<=(state)=====")
    console.log(user)
    console.log("===========")

    console.log("======her about post isolation====")
    if (POSTID) {
      console.log("Yes, clicked readmore!");
      const postId = POSTID.dataset.id; // 
      console.log("Post ID:", postId);
      console.log(typeof(postId))
      // her i will call the post isoaltion 
      POST(postId, user) 
    }
    console.log("=====================")
    //while (target && tmodulearget.tagName !== "A") {
      //target = target.parentElement;
    //}
    // <==========> 
    if (!target) return;
    const id = target.id;
    console.log("the id her", id)
    // SWITCH CASE WILL BE GOOD LATER !
    // --- <Login> ---
    if (id === "Login") {
      loginbuilding(user);
      console.log("Login clicked!");
    }
    // --- <Register> ---
    else if (id === "Register") {
      event.preventDefault();
      registerBuilding();
      console.log("Register clicked!");
    }

    // --- <Logout> ---
    else if (id === "Out") {
      await Logoutfunc();
      console.log("Logout clicked!");
    }

    // --- <Logo> ---
    else if (id === "Logo" || id === "logo") {
      console.log("Logo clicked!");

      // Optional: rebuild home page if needed
      // homeBuild(user);
    }
    // I Will Work With ThiS |<!{.}!> |
    // <--- <Create Post> --->
    else if (id === "Newpost") {
      console.log("Create Post clicked!");
      // call your create post function
      // I Will CHECK If It's Autenticate Or No !!
      // IF TRUE AUT ELSE GO TO LOGIN !!
      if (user.authenticated) {
        NewPost(Object.keys(user.fileds))
      } else {
        // if ther user is not authenticated it's must be login first !
        loginbuilding()
      }
    }
    // --- <Profile> ---
    else if (id === "Profile") {
      console.log("Profile clicked!");
      // call profile page function
    }

  });

}
