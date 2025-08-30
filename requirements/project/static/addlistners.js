// her there is all lisntner on hero header !!!

// See Class to know !! 
export function addevenlistnertohero() {}

    // =======>>> her i listning on the father of all node  so for that if u click in any one of this the action whill happning !!!! <<<<<<<<<
    const hero = document.querySelector(".hero");
    // debug every thing her to see the event 
     hero.addEventListener("click", event => {
    // check if the clicked element is an <a> or inside an <a>
    let target = event.target;
    while (target && target.tagName !== "A") {
      target = target.parentElement;
    }
    // this the function who not let the page to refrech !!
    event.preventDefault(); 
    // her i get Attribute of every target one to see the set what's it's contain and the i will use if state to check  <<< !!
    const href = target.getAttribute("href");
    //console.log("Hero link clicked:", href);
    if (href === "/login") {
        // Zaki This is The Login Page I will Create but separate it From her To let this file just for listners 
      LoginPage(); 
    } else if (href === "/register") {
    // her the register page
      RegisterPage(); 
    } else if (href === "/newPost") {
      renderNewPostPage();
    } else if (href.startsWith("/profile")) {
    // Optional Profile !!
      renderProfilePage();  
    } else {
      // error handling 
    }

});

 
