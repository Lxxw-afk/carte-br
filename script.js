/* ===================== */
/* 🔐 SYSTÈME CONNEXION */
/* ===================== */
const ACCESS_CODE = "BRIGADE2026"; // change-le quand tu veux

const loginScreen = document.getElementById("login-screen");
const app = document.getElementById("app");
const loginBtn = document.getElementById("login-btn");
const loginError = document.getElementById("login-error");

loginBtn.addEventListener("click", () => {
  const value = document.getElementById("access-code").value;

  if (value === ACCESS_CODE) {
    loginScreen.style.display = "none";
    app.classList.remove("hidden");
  } else {
    loginError.textContent = "Code d'accès incorrect";
  }
});











