import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// 🔧 configuração do Firebase (Substitua com suas credenciais reais)
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_ID",
  appId: "SEU_APP_ID"
};

// 🔥 inicializa Firebase e Auth
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// 🎯 pega elementos do HTML
const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("login-email"); // ID do input de email no formulário de login
const passwordInput = document.getElementById("login-pass"); // ID do input de senha no formulário de login
const googleLoginBtn = document.querySelector(".btn-google"); // Seletor para o botão de login do Google

// Funções de UI para feedback ao usuário (assumindo que já existem no index.html)
function setBubble(msg) {
  const b = document.getElementById('bubble');
  if (b) {
    b.innerHTML = msg;
    b.style.transform = 'scale(1.05)';
    setTimeout(() => b.style.transform = '', 200);
  }
}

function restoreBubble() {
  const defaultMsg = '👋 Olá! Sou o <strong>Recyclinho</strong>!<br>Vamos salvar o planeta juntos? 🌍';
  const b = document.getElementById('bubble');
  if (b) {
    setTimeout(() => {
      b.innerHTML = defaultMsg;
    }, 2000);
  }
}

function showFlashMessage(message, type = 'error') {
  const flashMessagesDiv = document.getElementById('flash-messages');
  if (flashMessagesDiv) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `flash-msg flash-${type}`;
    msgDiv.innerHTML = message;
    flashMessagesDiv.innerHTML = ''; // Limpa mensagens anteriores
    flashMessagesDiv.appendChild(msgDiv);
    setTimeout(() => {
      msgDiv.remove();
    }, 5000); // Remove a mensagem após 5 segundos
  }
}

function setLoadingState(btnId, isLoading) {
  const btn = document.getElementById(btnId);
  if (btn) {
    if (isLoading) {
      btn.classList.add('loading');
      btn.disabled = true;
    } else {
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  }
}

// 🚀 Evento de login com E-mail e Senha
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    setLoadingState('login-btn', true);
    setBubble('⏳ Verificando suas credenciais...');

    const email = emailInput.value;
    const password = passwordInput.value;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Logado com E-mail/Senha:", userCredential.user);
      setBubble('✅ Login com E-mail/Senha realizado com sucesso! 🚀');
      showFlashMessage('Login realizado com sucesso!', 'success');
      window.location.href = "dashboard.html"; // Redireciona para a dashboard
    } catch (error) {
      console.error("Erro no login com E-mail/Senha:", error.message);
      let errorMessage = "Erro desconhecido. Tente novamente.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = "E-mail ou senha inválidos.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Formato de e-mail inválido.";
      }
      setBubble(`❌ ${errorMessage}`);
      showFlashMessage(errorMessage, 'error');
    } finally {
      setLoadingState('login-btn', false);
      restoreBubble();
    }
  });
}

// 🌐 Evento de login com Google
if (googleLoginBtn) {
  googleLoginBtn.addEventListener("click", async () => {
    setLoadingState(googleLoginBtn.id, true); // Assumindo que o botão do Google tem um ID para o loading
    setBubble('🌐 Conectando com o Google...');

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      console.log("Logado com Google:", user);
      setBubble('✅ Login com Google realizado com sucesso! 🚀');
      showFlashMessage('Login com Google realizado com sucesso!', 'success');
      window.location.href = "dashboard.html"; // Redireciona para a dashboard
    } catch (error) {
      console.error("Erro no login com Google:", error.message);
      let errorMessage = "Erro ao fazer login com Google. Tente novamente.";
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = "Login com Google cancelado.";
      } else if (error.code === 'auth/cancelled-popup-request') {
        errorMessage = "Requisição de popup do Google já em andamento.";
      }
      setBubble(`❌ ${errorMessage}`);
      showFlashMessage(errorMessage, 'error');
    } finally {
      setLoadingState(googleLoginBtn.id, false);
      restoreBubble();
    }
  });
}

// Exemplo de como usar o setLoadingState para o botão do Google se ele tiver um ID
// No seu HTML, adicione um ID ao botão do Google, por exemplo: id="google-login-btn"
// E no JS, use: const googleLoginBtn = document.getElementById("google-login-btn");
// Atualmente, estou usando o seletor de classe ".btn-google" para o evento de click.
// Se você quiser o efeito de loading, precisará adicionar um ID ao botão do Google no HTML. 
// seu index.html, por exemplo: <button class="btn-google" id="google-login-btn">...</button>
