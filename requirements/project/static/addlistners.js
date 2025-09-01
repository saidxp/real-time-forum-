import { loginbuilding, Logoutfunc } from "./event.js";
import { registerBuilding } from "./register.js";

// Set up a single global listener for hero + header links
export function setupGlobalListeners(user) {
  document.addEventListener("click", async (event) => {
    let target = event.target;
    console.log(target)
    // Traverse up until we find a relevant <a> or <button>
    while (target && target.tagName !== "A") {
      target = target.parentElement;
    }
    if (!target) return; 
    event.preventDefault();

    const id = target.id;

    // --- Login ---
    if (id === "Login") {
      loginbuilding(user);
      console.log("Login clicked!");
    }
    // --- Register ---
    else if (id === "Register") {
      registerBuilding();
      console.log("Register clicked!");
    }
    // --- Logout ---
    else if (id === "Out") {
      await Logoutfunc();
      console.log("Logout clicked!");
    }
    // --- Logo ---
    else if (id === "Logo" || id === "logo") {
      console.log("Logo clicked!");
      // Optional: rebuild home page if needed
      // homeBuild(user);
    }
    // --- Create Post ---
    else if (id === "Newpost") {
      console.log("Create Post clicked!");
      // call your create post function
    }
    // --- Profile ---
    else if (id === "Profile") {
      console.log("Profile clicked!");
      // call profile page function
    }
  });
}
