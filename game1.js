/* ════════════════════════════════════
   RECYCLO — GAME 1 (Separação de Lixo)
   Estrutura limpa + integração futura
═════════════════════════════════════ */

const items = [
  { name: "Garrafa PET", type: "reciclavel" },
  { name: "Papel", type: "reciclavel" },
  { name: "Lata de alumínio", type: "reciclavel" },

  { name: "Casca de banana", type: "organico" },
  { name: "Restos de comida", type: "organico" },

  { name: "Pilha", type: "eletronico" },
  { name: "Bateria", type: "eletronico" }
];

/* ════════════════════════════════════
   STATE
═════════════════════════════════════ */
let currentItem = null;
let score = 0;
let tempo = 30;
let streak = 0;
let gameRunning = false;
let timer = null;

/* ════════════════════════════════════
   DOM
═════════════════════════════════════ */
const scoreEl = document.getElementById("score");
const tempoEl = document.getElementById("tempo");
const streakEl = document.getElementById("streak");
const itemNameEl = document.getElementById("item-name");
const itemBox = document.getElementById("item-box");
const feedbackEl = document.getElementById("feedback");
const gameOverEl = document.getElementById("game-over");
const finalScoreEl = document.getElementById("final-score");

/* ════════════════════════════════════
   GAME START
═════════════════════════════════════ */
function startGame() {
  score = 0;
  tempo = 30;
  streak = 0;
  gameRunning = true;

  scoreEl.textContent = score;
  tempoEl.textContent = tempo;
  streakEl.textContent = streak;

  gameOverEl.classList.add("hidden");

  nextItem();

  clearInterval(timer);

  timer = setInterval(() => {
    tempo--;
    tempoEl.textContent = tempo;

    if (tempo <= 0) {
      endGame();
    }
  }, 1000);
}

/* ════════════════════════════════════
   NEXT ITEM
═════════════════════════════════════ */
function nextItem() {
  currentItem = items[Math.floor(Math.random() * items.length)];
  itemNameEl.textContent = currentItem.name;
}

/* ════════════════════════════════════
   PLAYER ACTION
═════════════════════════════════════ */
function escolher(tipo) {
  if (!gameRunning) return;

  const correct = tipo === currentItem.type;

  if (correct) {
    score += 10;
    streak++;

    feedback("✔ Correto!", "good");

    itemBox.classList.add("correct");

    // Integração com mascote
    if (window.triggerMascotEvent) {
      triggerMascotEvent("decisaoBoa");
    }

  } else {
    score -= 5;
    streak = 0;

    feedback("✖ Errado!", "bad");

    itemBox.classList.add("wrong");

    if (window.triggerMascotEvent) {
      triggerMascotEvent("decisaoRuim");
    }
  }

  updateUI();

  setTimeout(() => {
    itemBox.classList.remove("correct", "wrong");
    nextItem();
  }, 400);
}

/* ════════════════════════════════════
   FEEDBACK VISUAL
═════════════════════════════════════ */
function feedback(text, type) {
  feedbackEl.textContent = text;

  if (type === "good") {
    feedbackEl.style.color = "#00ffae";
  } else {
    feedbackEl.style.color = "#ff4d4d";
  }
}

/* ════════════════════════════════════
   UPDATE UI
═════════════════════════════════════ */
function updateUI() {
  scoreEl.textContent = score;
  streakEl.textContent = streak;
}

/* ════════════════════════════════════
   END GAME
═════════════════════════════════════ */
function endGame() {
  clearInterval(timer);
  gameRunning = false;

  finalScoreEl.textContent = score;
  gameOverEl.classList.remove("hidden");

  itemNameEl.textContent = "Fim de jogo";

  // integração futura com XP real
  if (window.addXP) {
    addXP(Math.max(0, score));
  }
}