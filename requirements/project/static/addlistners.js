import { loginbuilding, Logoutfunc } from "./event.js";
import { registerBuilding } from "./register.js";
import { NewPost} from "./newpost.js"

// Set up a single global listener for hero + header links
export function setupGlobalListeners(User) {
  document.addEventListener("click", async (event) => {
    let target = event.target;
    console.log("<=(event)======")
    console.log(target)
    console.log("============")

    // her i will fetch the state of user if he is  Authenicate or NO ...!! 
    // <=====================>
    const res = await fetch("/api/me");
    const user = await res.json();
    // <==================>
    // i was using when i want to go trought nodes to handle nested element but i get problem ! 
    console.log("<=(state)=====")
    console.log(user.fileds)
    console.log("===========")

    while (target && target.tagName !== "A") {
      target = target.parentElement;
    }
    // <==========> 
    if (!target) return; 
    event.preventDefault();

    const id = target.id;

    // SWITCH CASE WILL BE GOOD LATER !
    // --- <Login> ---
    if (id === "Login") {
      loginbuilding(user);
      console.log("Login clicked!");
    }
    // --- <Register> ---
    else if (id === "Register") {
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

    // I Will Work With This <!.!>
    // --- <Create Post> ---
    else if (id === "Newpost") {
      console.log("Create Post clicked!");
      // call your create post function
      // I Will CHECK If It's Autenticate Or No !!
      // IF TRUE AUT ELSE GO TO LOGIN !!
      console.log(typeof(user.fileds))
      NewPost(Object.keys(user.fileds))
    }

    // --- <Profile> ---
    else if (id === "Profile") {
      console.log("Profile clicked!");
      // call profile page function
    }

  });

}
