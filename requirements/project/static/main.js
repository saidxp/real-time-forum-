import { Addeventlistnerandpost } from "./setevrntlisnter.js";
 
import {addevenlistnertohero} from "./addlistners.js"
import { addevenlistnertoHeader } from "./addlistners.js"
import { homeBuild } from "./buildhome.js";
 
// Main: on page load
window.onload = async () => {
  const res = await fetch("/api/me");
  const user = await res.json();
  //<====> Her I Will <====> 
  //console.log(user)
  console.log(user)
  // her i build header 
  await homeBuild(user);
  // her i build hero section !!

  // her i add event-listner and post by click !!
  // Fetch Posts Her In First Load !! 
   // <=====> \\ 
  // than i add event listner her for filters !!
  // and i fetch the post by click of users !!
  Addeventlistnerandpost();
  // <====> 
   // Todo://all categorie still need fix !!
  // <====>
  // i need to set all event listner on Buthon 
  addevenlistnertohero(user)
  addevenlistnertoHeader(user)
  //addevenlistnertohero
  //
};
