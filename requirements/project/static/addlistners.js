// her there is all lisntner on hero header !!!

import {   loginbuilding } from "./event.js";

// See Class to know  about hero indside the forum home !! 
export function addevenlistnertohero() { }

// =======>>> her i listning on the father of all node  so for that if u click in any one of this the action whill happning !!!! <<<<<<<<<
const hero = document.querySelector(".hero");
// debug every thing her to see the event 
hero.addEventListener("click", event => {
  // check if the clicked element is an <a> or inside an <a>
  console.log(event.target.tagName)
  let target = event.target;
  // ==== her i will check if the target it's <a> if it's not iwill go to the father !
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
  }
});

export function addevenlistnertoHeader() {

  const register = document.querySelector('.header__auth-link[href="/register"]');
  const login = document.querySelector('.header__auth-link[href="/login"]');
  const logoLink = document.querySelector(".header__logo-link");
  const stylo = document.querySelector('.Stilo')

  stylo.addEventListener("click", (event) => {
    // her is about creat post 
    // creapostfunction()
  })

  register.addEventListener("click", (e) => {
    e.preventDefault();
    //registerfunction()
    console.log("howa... Register");
  });
  // 
  login.addEventListener("click", (e) => {
    e.preventDefault();
      loginbuilding()
    console.log("howa... clicked!");
  });
  // add listener
  logoLink.addEventListener("click", (e) => {
    e.preventDefault();
    // home page !!!
    // function who return to home page !!
    console.log("Logo clicked!");
  });

} 
