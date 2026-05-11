import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCWCLGhKEvM4Q08kd74_Mq-3khvnv9kYp4",
  authDomain: "recyclo-43c5b.firebaseapp.com",
  projectId: "recyclo-43c5b",
  storageBucket: "recyclo-43c5b.firebasestorage.app",
  messagingSenderId: "605650682988",
  appId: "1:605650682988:web:bcfd37da152ec8c8de4449",
  measurementId: "G-M9SZPSHN9C"
};

const app = initializeApp(firebaseConfig );
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

document.addEventListener("DOMContentLoaded", () => {
  // LÓGICA DE LOGIN
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("login-email").value;
      const pass = document.getElementById("login-pass").value;
      try {
        await signInWithEmailAndPassword(auth, email, pass);
        window.location.href = "telainicial.html";
      } catch (error) {
        alert("Erro no login: " + error.message);
      }
    });
  }

  // LÓGICA DE CADASTRO
  const registerForm = document.getElementById("register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("reg-name").value;
      const email = document.getElementById("reg-email").value;
      const pass = document.getElementById("reg-pass").value;
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        await updateProfile(userCredential.user, { displayName: name });
        alert("Cadastro realizado com sucesso!");
        window.location.href = "telainicial.html";
      } catch (error) {
        alert("Erro no cadastro: " + error.message);
      }
    });
  }
});

// GOOGLE (Função global)
window.loginWithGoogle = async () => {
  try {
    await signInWithPopup(auth, googleProvider);
    window.location.href = "telainicial.html";
  } catch (error) {
    alert("Erro no Google: " + error.message);
  }
};
