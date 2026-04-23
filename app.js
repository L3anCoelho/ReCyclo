/* ══════════════════════════════════════
   RECYCLO 2.0 — script.js
   Full game engine — modular, scalable
   Prepared for future backend integration
══════════════════════════════════════ */

'use strict';

/* ════════════════════════════════════
   DATABASE SCHEMA (localStorage-ready)
   Future: replace storage calls with API
═════════════════════════════════════ */
const DB_KEY = 'recyclo_v2';

const DEFAULT_USER_PROFILE = {
  id: null,          // future: UUID from backend
  name: 'Jogador',
  avatar: '🌱',
  createdAt: null,
  lastActive: null,
};

const DEFAULT_USER_STATS = {
  score: 0,
  xp: 0,
  level: 1,
  streak: 0,
  missionsCompleted: 0,
  goodDecisions: 0,
  impactReduced: 0,
  plastic: 0,      // raw diagnostic weight 0-9
  emission: 0,     // raw diagnostic weight 0-6
  waste: 0,        // raw weight 0-15
  totalWeight: 0,
};

const DEFAULT_USER_HISTORY = []; // array of action objects

/* ════════════════════════════════════
   GAME STATE (in-memory, synced to localStorage)
═════════════════════════════════════ */
const gameState = {
  profile: { ...DEFAULT_USER_PROFILE },
  stats: { ...DEFAULT_USER_STATS },
  history: [],
  missions: [],       // active daily missions
  activeMission: null,
  achievements: [],
  diagnosticAnswers: [],
  selectedAvatar: '🌱',
  initialized: false,

  /* future backend hook */
  _dirty: false,
  markDirty() { this._dirty = true; },
};

/* ════════════════════════════════════
   SAVE / LOAD  (localStorage → future API)
═════════════════════════════════════ */
function saveGame() {
  const payload = {
    profile: gameState.profile,
    stats: gameState.stats,
    history: gameState.history.slice(-50), // keep last 50
    missions: gameState.missions,
    activeMission: gameState.activeMission,
    achievements: gameState.achievements,
    diagnosticAnswers: gameState.diagnosticAnswers,
    savedAt: Date.now(),
  };
  try { localStorage.setItem(DB_KEY, JSON.stringify(payload)); }
  catch(e) { console.warn('Save failed:', e); }
  gameState._dirty = false;
}

function loadGame() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch(e) { return null; }
}

function hasSave() { return !!localStorage.getItem(DB_KEY); }

function resetGame() {
  localStorage.removeItem(DB_KEY);
  gameState.profile = { ...DEFAULT_USER_PROFILE };
  gameState.stats = { ...DEFAULT_USER_STATS };
  gameState.history = [];
  gameState.missions = [];
  gameState.activeMission = null;
  gameState.achievements = [];
  gameState.diagnosticAnswers = [];
  gameState.initialized = false;
}

/* ════════════════════════════════════
   DOM HELPERS
═════════════════════════════════════ */
const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => {
    s.style.display = 'none';
    s.classList.remove('active');
  });
  const el = $(id);
  el.style.display = 'flex';
  requestAnimationFrame(() => el.classList.add('active'));
}

function animNum(el, target, dur = 900) {
  if (!el) return;
  const start = performance.now();
  const from = parseFloat(el.textContent) || 0;
  const tick = now => {
    const t = Math.min((now - start) / dur, 1);
    const e = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(from + (target - from) * e);
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ════════════════════════════════════
   TOAST SYSTEM
═════════════════════════════════════ */
function showToast(msg, type = 'info', icon = 'ℹ') {
  const c = $('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => {
    t.style.animation = 'toast-out 0.4s ease forwards';
    setTimeout(() => t.remove(), 400);
  }, 3200);
}

function showXPPopup(xp) {
  const el = $('xp-popup');
  el.textContent = `+${xp} XP!`;
  el.classList.remove('hidden');
  el.style.animation = 'none';
  requestAnimationFrame(() => {
    el.style.animation = 'xp-rise 1.2s cubic-bezier(.4,0,.2,1) both';
  });
  setTimeout(() => el.classList.add('hidden'), 1200);
}

/* ════════════════════════════════════
   PARTICLE BACKGROUND
═════════════════════════════════════ */
function initParticles() {
  const canvas = $('particle-bg');
  const ctx = canvas.getContext('2d');
  let W, H, particles;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  particles = Array.from({ length: 60 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 1.5 + 0.3,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
    alpha: Math.random() * 0.5 + 0.1,
  }));

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,255,136,${p.alpha})`;
      ctx.fill();
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
    });
    requestAnimationFrame(draw);
  }
  draw();
}

/* ════════════════════════════════════
   MASCOT SYSTEM
═════════════════════════════════════ */
const MOODS = {
  happy:   { mouth: 'happy',   aura: 'aura-happy',   label: '😊 Animado',     arms: ['🌿','🌿'],    bubble: null },
  neutral: { mouth: 'neutral', aura: 'aura-neutral',  label: '😐 Observando',  arms: ['👀','💭'],    bubble: null },
  sad:     { mouth: 'sad',     aura: 'aura-sad',      label: '😟 Preocupado',  arms: ['😔','🌍'],    bubble: null },
};

const MOOD_BUBBLES = {
  happy:   ['Continue assim! O planeta agradece! 🌱','Incrível! Você é uma inspiração! ⚡','Woohoo! Missão cumprida! 🎉'],
  neutral: ['Hmm... Posso te ajudar a melhorar! 🤔','Cada passo conta, vamos em frente! 👣','Você tem potencial! Confio em você! 💫'],
  sad:     ['Ei, juntos podemos melhorar isso! 💪','Não desanime! O planeta precisa de você! 🌍','Pequenas mudanças fazem grande diferença! 🌿'],
};

/* ── MASCOT SPRITE SYSTEM ── */
const mascotMap = {
  animado:    "animado.png",
  boa:        "boadecisão.png",
  confuso:    "confuso.png",
  ruim:       "decisaoruim.png",
  descanso:   "descanso.png",
  feliz:      "feliz.png",
  missao:     "missaocomprida.png",
  levelup:    "nivelup.png",
  preocupado: "preocupado.png",
  surpreso:   "surpreso.png",
  triste:     "triste.png",
};

function setMascotState(state, duration = 2000) {
  const mascot = document.getElementById("mascot-main");
  if (!mascot) return;

  const file = mascotMap[state] || mascotMap.animado;

  mascot.src = `expressoesreciclinho/${file}`;

  clearTimeout(window.mascotTimer);

  window.mascotTimer = setTimeout(() => {
    mascot.src = `expressoesreciclinho/animado.png`;
  }, duration);
}

function triggerMascotEvent(event) {
  if (event === "decisaoBoa")      setMascotState("boa");
  if (event === "decisaoRuim")     setMascotState("ruim");
  if (event === "missaoCompleta")  setMascotState("missao");
  if (event === "levelUp")         setMascotState("levelup", 2500);
}

/* ── END MASCOT SPRITE SYSTEM ── */

function updateCharacterMood(score) {
  const mood = score >= 65 ? 'happy' : score >= 40 ? 'neutral' : 'sad';
  const m = MOODS[mood];

  const mouth = $('main-mouth');
  const aura = $('mascot-aura');
  const label = $('mood-label');
  const armL = $('main-arm-l');
  const armR = $('main-arm-r');

  if (mouth) { mouth.className = `mascot-mouth ${m.mouth}`; }
  if (aura)  { aura.className = `mascot-aura ${m.aura}`; }
  if (label) { label.textContent = m.label; }
  if (armL)  { armL.textContent = m.arms[0]; }
  if (armR)  { armR.textContent = m.arms[1]; }

  const bubbles = MOOD_BUBBLES[mood];
  const bubble = $('main-bubble');
  if (bubble) {
    bubble.textContent = bubbles[Math.floor(Math.random() * bubbles.length)];
  }
}

function triggerMascotReaction(type, bubble) {
  const quizMouth = $('quiz-mouth');
  const quizBubble = $('quiz-bubble');
  if (quizMouth && type === 'good') {
    quizMouth.className = 'mascot-mouth happy';
    if (quizBubble) quizBubble.textContent = bubble || '🌟 Ótima escolha!';
  } else if (quizMouth && type === 'bad') {
    quizMouth.className = 'mascot-mouth sad';
    if (quizBubble) quizBubble.textContent = bubble || '😟 Podemos melhorar isso...';
  }
}

/* ════════════════════════════════════
   SCORE ENGINE
═════════════════════════════════════ */
function computeScore(answers) {
  const tw = answers.reduce((s, a) => s + a.weight, 0);
  return Math.max(5, Math.min(100, 100 - Math.round((tw / 15) * 100)));
}

function getClassification(score) {
  if (score >= 75) return { label: 'SUSTENTÁVEL',  color: 'var(--neon)' };
  if (score >= 50) return { label: 'CONSCIENTE',   color: 'var(--blue)' };
  if (score >= 30) return { label: 'MODERADO',     color: 'var(--yellow)' };
  return              { label: 'CRÍTICO',       color: 'var(--red)' };
}

function updateScore(newScore, animate = true) {
  gameState.stats.score = Math.max(0, Math.min(100, newScore));
  const cls = getClassification(gameState.stats.score);

  // HUD
  const hudScore = $('hud-score');
  if (animate) animNum(hudScore, gameState.stats.score);
  else if (hudScore) hudScore.textContent = gameState.stats.score;

  // Env card
  const envNum = $('env-score-num');
  if (animate) animNum(envNum, gameState.stats.score);
  else if (envNum) envNum.textContent = gameState.stats.score;

  const envClass = $('env-class');
  if (envClass) { envClass.textContent = cls.label; envClass.style.color = cls.color; }

  // Hex fill intensity
  const hexFill = $('hex-fill');
  if (hexFill) {
    const op = 0.05 + (gameState.stats.score / 100) * 0.3;
    hexFill.style.fill = `rgba(0,255,136,${op})`;
    hexFill.style.stroke = cls.color;
    hexFill.style.filter = `drop-shadow(0 0 ${Math.round(gameState.stats.score / 10)}px ${cls.color})`;
  }

  updateCharacterMood(gameState.stats.score);
  gameState.markDirty();
}

/* ════════════════════════════════════
   XP & LEVEL SYSTEM
═════════════════════════════════════ */
const LEVEL_DATA = [
  { level: 1,  title: 'Iniciante',         xpRequired: 0,    unlock: null },
  { level: 2,  title: 'Explorador Verde',  xpRequired: 200,  unlock: '🌱 Título: Explorador Verde' },
  { level: 3,  title: 'Guardião',          xpRequired: 500,  unlock: '🛡 Título: Guardião da Natureza' },
  { level: 4,  title: 'Eco Guerreiro',     xpRequired: 900,  unlock: '⚔ Título: Eco Guerreiro' },
  { level: 5,  title: 'Protetor',          xpRequired: 1400, unlock: '🌊 Título: Protetor dos Oceanos' },
  { level: 6,  title: 'Agente da Mudança', xpRequired: 2000, unlock: '⚡ Título: Agente da Mudança' },
  { level: 7,  title: 'Herói Ambiental',   xpRequired: 2700, unlock: '🦸 Título: Herói Ambiental' },
  { level: 8,  title: 'Visionário',        xpRequired: 3500, unlock: '🔭 Título: Visionário Sustentável' },
  { level: 9,  title: 'Lenda Verde',       xpRequired: 4400, unlock: '🏆 Título: Lenda Verde' },
  { level: 10, title: 'Campeão Supremo',   xpRequired: 5400, unlock: '👑 TÍTULO MÁXIMO: Campeão Supremo' },
];

function getLevelData(level) { return LEVEL_DATA[Math.min(level - 1, 9)]; }
function getNextLevelData(level) { return LEVEL_DATA[Math.min(level, 9)]; }

function updateLevel() {
  const { xp, level } = gameState.stats;

  // Find correct level
  let newLevel = 1;
  for (let i = LEVEL_DATA.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_DATA[i].xpRequired) { newLevel = LEVEL_DATA[i].level; break; }
  }

  const leveledUp = newLevel > gameState.stats.level;
  gameState.stats.level = newLevel;

  const ld = getLevelData(newLevel);
  const next = getNextLevelData(newLevel);
  const xpInLevel = xp - ld.xpRequired;
  const xpNeeded = next.xpRequired - ld.xpRequired;
  const pct = newLevel >= 10 ? 100 : Math.round((xpInLevel / xpNeeded) * 100);

  // HUD
  const hudLevel = $('hud-level');
  if (hudLevel) hudLevel.textContent = newLevel;
  const hudXP = $('hud-xp');
  if (hudXP) hudXP.textContent = xp;

  // Global XP bar
  const gf = $('xp-global-fill');
  const gl = $('xp-global-label');
  if (gf) gf.style.width = pct + '%';
  if (gl) gl.textContent = newLevel >= 10
    ? `Level MAX — ${xp} XP`
    : `${xp} / ${next.xpRequired} XP → Level ${newLevel + 1}`;

  // Menu modal stats
  const ms = $('ms-level');
  if (ms) ms.textContent = newLevel;
  const msxp = $('ms-xp');
  if (msxp) msxp.textContent = xp;
  const mpt = $('menu-player-title');
  if (mpt) mpt.textContent = ld.title;
  const lbadge = $('hud-level');
  if (lbadge) lbadge.textContent = newLevel;

  if (leveledUp) triggerLevelUp(newLevel, ld);
  gameState.markDirty();
}

function addXP(amount) {
  gameState.stats.xp += amount;
  showXPPopup(amount);
  updateLevel();
  saveGame();
}

function triggerLevelUp(level, ld) {
  const modal = $('modal-levelup');
  $('lu-level').textContent = level;
  $('lu-title').textContent = ld.title;
  $('lu-unlock').textContent = ld.unlock || '';
  modal.classList.remove('hidden');

  showToast(`LEVEL UP! Você é agora: ${ld.title}!`, 'good', '🏆');

  // Confetti burst
  triggerConfetti();

  // Mascot sprite reaction
  triggerMascotEvent("levelUp");
}

/* ════════════════════════════════════
   DIAGNOSTIC QUESTIONS
═════════════════════════════════════ */
const QUESTIONS = [
  {
    category: '🍔 DELIVERY & ALIMENTAÇÃO',
    text: 'Quantas vezes você pediu delivery essa semana?',
    options: ['Nenhuma vez', '1 a 2 vezes', '3 a 4 vezes', '5 vezes ou mais'],
    weights: [0, 1, 2, 3],
    xpReward: 20,
    lore: 'Delivery gera até 3× mais embalagens plásticas que cozinhar em casa.',
    mascot: ['Ótimo! Cozinhar em casa salva o planeta! 🍳', 'Moderado! Talvez reduzir um pedido? 🤔', 'Hm, vários pedidos... podemos melhorar isso! 📦', 'Uau, muita embalagem! Vamos trabalhar nisso! 😟'],
  },
  {
    category: '🧴 PLÁSTICO DESCARTÁVEL',
    text: 'Com que frequência você usa plásticos descartáveis?',
    options: ['Raramente / nunca', 'Às vezes', 'Frequentemente', 'Todos os dias'],
    weights: [0, 1, 2, 3],
    xpReward: 20,
    lore: 'Um plástico descartável leva até 400 anos para se decompor.',
    mascot: ['Incrível! Você é um exemplo! ♻️', 'Bom caminho! Continue reduzindo! 🌿', 'Isso pesa no planeta... Vamos juntos! 💪', 'Ops! Muito plástico! Posso te ajudar! 😟'],
  },
  {
    category: '🛍 HÁBITOS DE COMPRA',
    text: 'Quantas compras você realizou no último mês?',
    options: ['1 a 2 compras', '3 a 5 compras', '6 a 10 compras', 'Mais de 10 compras'],
    weights: [0, 1, 2, 3],
    xpReward: 20,
    lore: 'Cada compra online gera em média 4× mais CO₂ que compras locais.',
    mascot: ['Consumo consciente! Parabéns! 🏆', 'Moderado! Qualidade > quantidade! 💎', 'Bastante consumo... Vamos refletir? 🤔', 'Consumo alto! Vamos desacelerar juntos! 😟'],
  },
  {
    category: '🚗 TRANSPORTE',
    text: 'Qual é o seu principal meio de transporte?',
    options: ['Bicicleta / a pé', 'Transporte público', 'Carona / carpool', 'Carro individual'],
    weights: [0, 1, 2, 3],
    xpReward: 20,
    lore: 'Um carro individual emite até 12× mais CO₂ que o transporte público.',
    mascot: ['Zero emissão! Você é incrível! 🚲', 'Coletivo é inteligente! Bom trabalho! 🚌', 'Compartilhar já ajuda! Continue! 🤝', 'Carro solo pesa bastante... Vamos pensar? 😟'],
  },
  {
    category: '🥤 BEBIDAS & EMBALAGENS',
    text: 'Com que frequência você usa embalagens descartáveis para bebidas?',
    options: ['Garrafa reutilizável sempre', 'Raramente descartável', 'Às vezes descartável', 'Sempre descartável'],
    weights: [0, 1, 2, 3],
    xpReward: 20,
    lore: 'Uma garrafa reutilizável elimina até 156 plásticos por ano.',
    mascot: ['Perfeito! Sua garrafa é sua aliada! 💧', 'Bom! Minimize ainda mais! 👍', 'Podemos reduzir esse plástico! 🌊', 'Muito descartável! Vamos mudar isso! 😟'],
  },
];

/* ════════════════════════════════════
   QUIZ FLOW
═════════════════════════════════════ */
let currentQ = 0;

function renderQuestion(index) {
  const q = QUESTIONS[index];
  const fill = ((index + 1) / QUESTIONS.length * 100);

  $('quiz-progress-fill').style.width = fill + '%';
  $('q-current').textContent = index + 1;
  $('q-tag').textContent = q.category;
  $('q-xp').textContent = `+${q.xpReward} XP`;
  $('q-text').textContent = q.text;
  $('lore-text').textContent = q.lore;

  const card = $('question-card');
  card.style.animation = 'none';
  requestAnimationFrame(() => { card.style.animation = ''; });

  const opts = $('q-options');
  opts.innerHTML = '';
  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'q-option';
    btn.textContent = opt;
    btn.addEventListener('click', () => pickAnswer(btn, index, i, q));
    opts.appendChild(btn);
  });

  // Sync label
  const syncLabels = [
    'Analisando hábitos alimentares...',
    'Mapeando uso de plástico...',
    'Processando padrões de consumo...',
    'Calculando pegada de carbono...',
    'Finalizando diagnóstico...',
  ];
  $('sync-label').textContent = syncLabels[index] || 'Sincronizando...';
}

function pickAnswer(btn, qIndex, optIndex, q) {
  document.querySelectorAll('.q-option').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');

  const weight = q.weights[optIndex];
  gameState.diagnosticAnswers[qIndex] = {
    weight,
    text: q.options[optIndex],
    category: q.category,
    index: optIndex,
  };

  // Mascot sprite reaction based on answer weight
  if (weight === 0) setMascotState("feliz");
  else if (weight >= 2) setMascotState("triste");

  // Mascot reaction (existing system — preserved)
  const moodType = weight === 0 ? 'good' : weight <= 1 ? 'neutral' : 'bad';
  triggerMascotReaction(moodType, q.mascot[optIndex]);

  setTimeout(() => {
    if (currentQ < QUESTIONS.length - 1) {
      currentQ++;
      renderQuestion(currentQ);
    } else {
      startAnalysis();
    }
  }, 420);
}

/* ════════════════════════════════════
   ANALYSIS LOADING
═════════════════════════════════════ */
const ANALYSIS_STEPS = [
  'Mapeando pegada de carbono...',
  'Calculando índice de plástico...',
  'Analisando padrões comportamentais...',
  'Detectando pontos críticos...',
  'Identificando oportunidades...',
  'Gerando missões personalizadas...',
  'Construindo perfil ambiental...',
  'Finalizando análise IA...',
];

async function startAnalysis() {
  showScreen('screen-loading');
  const stepsEl = $('load-steps');
  const bar = $('load-bar');
  const title = $('load-title');
  const sub = $('load-sub');

  for (let i = 0; i < ANALYSIS_STEPS.length; i++) {
    const pct = Math.round(((i + 1) / ANALYSIS_STEPS.length) * 100);

    title.style.opacity = 0;
    await sleep(200);
    title.textContent = ANALYSIS_STEPS[i];
    title.style.opacity = 1;
    bar.style.width = pct + '%';

    const step = document.createElement('div');
    step.className = 'load-step';
    step.innerHTML = `<span class="load-step-dot"></span>${ANALYSIS_STEPS[i]}`;
    stepsEl.appendChild(step);
    setTimeout(() => step.classList.add('done'), 300);

    await sleep(500);
  }

  sub.textContent = 'Perfil pronto! Iniciando jogo...';
  await sleep(600);

  buildGameState();
  showScreen('screen-game');
  initGameUI();
}

/* ════════════════════════════════════
   BUILD GAME STATE FROM DIAGNOSTIC
═════════════════════════════════════ */
function buildGameState() {
  const ans = gameState.diagnosticAnswers;
  const score = computeScore(ans);
  const xpStart = score * 2; // starting XP from diagnostic

  // Indicators
  const plastic  = ans[0].weight + ans[1].weight + ans[4].weight;
  const emission = ans[2].weight + ans[3].weight;
  const waste    = ans.reduce((s, a) => s + a.weight, 0);

  gameState.stats.score = score;
  gameState.stats.xp = xpStart;
  gameState.stats.plastic  = plastic;
  gameState.stats.emission = emission;
  gameState.stats.waste    = waste;
  gameState.stats.totalWeight = waste;

  // Generate initial missions based on patterns
  gameState.missions = generateMissions();
  gameState.activeMission = gameState.missions[0];
  gameState.achievements = buildAchievements();

  gameState.profile.lastActive = Date.now();
  gameState.profile.createdAt = gameState.profile.createdAt || Date.now();

  updateLevel();
  saveGame();
}

/* ════════════════════════════════════
   MISSION GENERATOR (AI-simulated)
═════════════════════════════════════ */
const MISSION_POOL = {
  plastic: [
    { title: 'Zero Plástico Hoje',      desc: 'Evite qualquer plástico descartável durante o dia.',         xp: 80,  scoreBonus: 5, icon: '🧴', category: 'PLÁSTICO' },
    { title: 'Garrafa Reutilizável',    desc: 'Use apenas sua garrafa reutilizável o dia todo.',             xp: 60,  scoreBonus: 4, icon: '💧', category: 'PLÁSTICO' },
    { title: 'Sacola Ecológica',        desc: 'Use sacola reutilizável em toda compra hoje.',                xp: 50,  scoreBonus: 3, icon: '♻️', category: 'PLÁSTICO' },
    { title: 'Reciclar 5 itens',        desc: 'Separe e recicle pelo menos 5 itens recicláveis.',            xp: 70,  scoreBonus: 4, icon: '🗑', category: 'PLÁSTICO' },
  ],
  delivery: [
    { title: 'Cozinhar em Casa',        desc: 'Prepare sua própria refeição em vez de pedir delivery.',     xp: 90,  scoreBonus: 6, icon: '🍳', category: 'ALIMENTAÇÃO' },
    { title: 'Mercado Local',           desc: 'Compre em um mercado ou feira local hoje.',                   xp: 70,  scoreBonus: 5, icon: '🛒', category: 'ALIMENTAÇÃO' },
    { title: 'Refeição Vegetariana',    desc: 'Faça uma refeição sem carne hoje.',                          xp: 60,  scoreBonus: 4, icon: '🥗', category: 'ALIMENTAÇÃO' },
  ],
  transport: [
    { title: 'Dia sem Carro',           desc: 'Use transporte público, bicicleta ou vá a pé hoje.',         xp: 100, scoreBonus: 7, icon: '🚲', category: 'TRANSPORTE' },
    { title: 'Carona Solidária',        desc: 'Compartilhe sua viagem com alguém.',                         xp: 70,  scoreBonus: 5, icon: '🤝', category: 'TRANSPORTE' },
    { title: '10 min a pé',             desc: 'Substitua um trajeto curto de carro por uma caminhada.',     xp: 50,  scoreBonus: 3, icon: '🚶', category: 'TRANSPORTE' },
  ],
  general: [
    { title: 'Pesquisar Alternativas',  desc: 'Pesquise uma alternativa sustentável para um hábito seu.',   xp: 40,  scoreBonus: 2, icon: '🔍', category: 'CONSCIÊNCIA' },
    { title: 'Compartilhar o ReCyclo',  desc: 'Convide um amigo a fazer o diagnóstico ambiental.',          xp: 50,  scoreBonus: 3, icon: '📲', category: 'COMUNIDADE' },
    { title: 'Economizar Água',         desc: 'Reduza o tempo do banho em 3 minutos hoje.',                 xp: 60,  scoreBonus: 4, icon: '🚿', category: 'ÁGUA' },
    { title: 'Desligar em standby',     desc: 'Desligue todos os aparelhos que não estão em uso.',          xp: 45,  scoreBonus: 3, icon: '⚡', category: 'ENERGIA' },
  ],
};

function generateMissions() {
  const ans = gameState.diagnosticAnswers;
  const pool = [];

  // IA-simulated personalization: weight heavy-use categories
  const plasticWeight  = (ans[1]?.weight || 0) + (ans[4]?.weight || 0);
  const deliveryWeight = ans[0]?.weight || 0;
  const transportWeight = ans[3]?.weight || 0;

  if (plasticWeight >= 3)   pool.push(...MISSION_POOL.plastic.slice(0, 3));
  else                       pool.push(...MISSION_POOL.plastic.slice(0, 1));

  if (deliveryWeight >= 2)  pool.push(...MISSION_POOL.delivery.slice(0, 2));
  else                       pool.push(...MISSION_POOL.delivery.slice(0, 1));

  if (transportWeight >= 2) pool.push(...MISSION_POOL.transport.slice(0, 2));
  else                       pool.push(...MISSION_POOL.transport.slice(0, 1));

  pool.push(...MISSION_POOL.general);

  // Shuffle and pick 5
  return shuffleArray(pool).slice(0, 5).map((m, i) => ({
    ...m,
    id: `mission_${Date.now()}_${i}`,
    done: false,
  }));
}

function shuffleArray(arr) {
  return arr.slice().sort(() => Math.random() - 0.5);
}

/* ════════════════════════════════════
   QUICK DECISIONS (micro-interactions)
═════════════════════════════════════ */
const DECISIONS = [
  {
    question: 'Você está com fome. Vai pedir delivery agora?',
    context: 'Você tem ingredientes em casa para um prato simples.',
    choices: [
      { text: '🍳 Cozinhar em casa', type: 'good',    xp: 30, score: +3, msg: 'Excelente! Menos embalagens no mundo!' },
      { text: '📱 Pedir delivery',   type: 'bad',     xp: 5,  score: -2, msg: 'Tudo bem! Tente reduzir nas próximas.' },
      { text: '🤔 Decidir depois',   type: 'neutral', xp: 10, score:  0, msg: 'Tudo bem! Que tal cozinhar hoje?' },
    ],
  },
  {
    question: 'No mercado, a opção mais barata vem em sacola plástica.',
    context: 'Você tem uma ecobag na mochila.',
    choices: [
      { text: '♻️ Usar minha ecobag',    type: 'good', xp: 25, score: +3, msg: 'Zero plástico! Planeta agradece! 🌍' },
      { text: '🛍 Pegar a sacola plástica', type: 'bad', xp: 5, score: -2, msg: 'Tente lembrar da ecobag da próxima vez!' },
    ],
  },
  {
    question: 'Viagem curta: você vai de carro ou a pé?',
    context: 'A distância é de apenas 800 metros.',
    choices: [
      { text: '🚶 Vou a pé!',      type: 'good', xp: 35, score: +4, msg: 'Saúde + zero emissões = perfeito! 💪' },
      { text: '🚗 Vou de carro',   type: 'bad',  xp: 5,  score: -2, msg: 'Caminhar salva o planeta e a saúde!' },
      { text: '🚲 Vou de bike',    type: 'good', xp: 40, score: +5, msg: 'Incrível! Bike é o futuro! 🚴‍♀️' },
    ],
  },
  {
    question: 'Sua bebida vem em copo plástico. O que você faz?',
    context: 'Você tem sua garrafa térmica na bolsa.',
    choices: [
      { text: '💧 Uso minha térmica',   type: 'good', xp: 30, score: +3, msg: 'Térmica rocks! Menos plástico no mundo! ♻️' },
      { text: '🥤 Aceito o plástico',   type: 'bad',  xp: 5,  score: -2, msg: 'Tudo bem! Sua térmica agradece amanhã!' },
    ],
  },
  {
    question: 'Black Friday chegou. Como você vai comprar?',
    context: 'Várias lojas oferecem frete grátis para entrega no mesmo dia.',
    choices: [
      { text: '📋 Lista só do necessário', type: 'good',    xp: 40, score: +4, msg: 'Consumo consciente é superpoder! 🦸' },
      { text: '🛒 Comprar muito mesmo',    type: 'bad',     xp: 5,  score: -3, msg: 'Tudo bem! Pense na próxima!' },
      { text: '⏸ Esperar e pensar',        type: 'neutral', xp: 20, score: +1, msg: 'Boa reflexão! Mindfulness de consumo! 🧘' },
    ],
  },
  {
    question: 'Fim do dia: você vai ligar o ar condicionado ou abrir a janela?',
    context: 'A temperatura externa está em 24°C.',
    choices: [
      { text: '🪟 Abrir a janela',       type: 'good', xp: 25, score: +2, msg: 'Economia de energia + zero emissões! ✨' },
      { text: '❄️ Ligar o ar condicionado', type: 'bad', xp: 5, score: -2, msg: 'Considera o ventilador da próxima vez!' },
    ],
  },
  {
    question: 'Sobrou comida do almoço. O que você faz?',
    context: 'Você tem tempo para guardar ou jogar fora.',
    choices: [
      { text: '🍱 Guardar para amanhã',   type: 'good', xp: 30, score: +3, msg: 'Zero desperdício! Ação sustentável! 🌱' },
      { text: '🗑 Jogar fora',             type: 'bad',  xp: 5,  score: -3, msg: 'Desperdício de alimento pesa! Guarde da próxima.' },
    ],
  },
];

let currentDecision = 0;

function generateDecision() {
  const d = DECISIONS[currentDecision % DECISIONS.length];
  currentDecision++;

  $('dc-question').textContent = d.question;
  $('dc-context').textContent = d.context;

  const choicesEl = $('dc-choices');
  choicesEl.innerHTML = '';
  d.choices.forEach(c => {
    const btn = document.createElement('button');
    btn.className = `dc-choice ${c.type}`;
    btn.textContent = c.text;
    btn.addEventListener('click', () => handleDecision(c));
    choicesEl.appendChild(btn);
  });
}

function handleDecision(choice) {
  // Update state
  if (choice.type === 'good') {
    gameState.stats.goodDecisions++;
    gameState.stats.streak++;
    gameState.stats.impactReduced += choice.score;
  } else {
    gameState.stats.streak = 0;
  }

  // Mascot sprite reaction
  if (choice.type === 'good') {
    triggerMascotEvent("decisaoBoa");
  } else if (choice.type === 'bad') {
    triggerMascotEvent("decisaoRuim");
  }

  addXP(choice.xp);
  const newScore = Math.max(5, Math.min(100, gameState.stats.score + choice.score));
  updateScore(newScore);

  // Add to history
  addHistoryEntry({
    icon: choice.type === 'good' ? '⚡' : '📌',
    text: choice.text,
    xp: choice.xp,
    type: choice.type,
  });

  // Toast
  const toastType = choice.type === 'good' ? 'good' : choice.type === 'bad' ? 'bad' : 'info';
  showToast(choice.msg, toastType, choice.type === 'good' ? '🌱' : '📌');

  // Update all stats
  updateStatsUI();

  // Next decision after delay
  setTimeout(generateDecision, 800);

  // Check achievements
  checkAchievements();

  saveGame();
}

/* ════════════════════════════════════
   MISSION SYSTEM
═════════════════════════════════════ */
function renderActiveMission() {
  const m = gameState.activeMission;
  if (!m) {
    $('am-title').textContent = 'Todas as missões completas! 🎉';
    $('am-desc').textContent = 'Novas missões amanhã!';
    $('am-category').textContent = 'CONCLUÍDO';
    return;
  }
  $('am-category').textContent = m.category;
  $('am-title').textContent = m.title;
  $('am-desc').textContent = m.desc;
  $('am-xp').textContent = m.xp;
  $('am-score').textContent = m.scoreBonus;
}

function renderMissionsList() {
  const list = $('missions-list');
  list.innerHTML = '';
  gameState.missions.forEach((m, i) => {
    const item = document.createElement('div');
    item.className = `mission-item${m.done ? ' done' : ''}`;
    item.style.animationDelay = (i * 0.05) + 's';
    item.innerHTML = `
      <span class="mi-icon">${m.icon}</span>
      <div class="mi-info">
        <div class="mi-title">${m.title}</div>
        <div class="mi-xp">+${m.xp} XP · +${m.scoreBonus} Score</div>
      </div>
      <div class="mi-check">${m.done ? '✓' : ''}</div>
    `;
    item.addEventListener('click', () => {
      if (!m.done) {
        gameState.activeMission = m;
        renderActiveMission();
        showToast(`Missão selecionada: ${m.title}`, 'info', '🎯');
      }
    });
    list.appendChild(item);
  });
}

function completeMission(mission) {
  mission.done = true;
  gameState.stats.missionsCompleted++;

  addXP(mission.xp);
  updateScore(Math.min(100, gameState.stats.score + mission.scoreBonus));
  gameState.stats.impactReduced += mission.scoreBonus;

  addHistoryEntry({
    icon: '🎯',
    text: `Missão: ${mission.title}`,
    xp: mission.xp,
    type: 'good',
  });

  showToast(`Missão "${mission.title}" completa! +${mission.xp} XP`, 'good', '🏆');

  // Mascot sprite reaction
  triggerMascotEvent("missaoCompleta");

  updateStatsUI();
  renderMissionsList();

  // Set next active mission
  const next = gameState.missions.find(m => !m.done);
  gameState.activeMission = next || null;
  renderActiveMission();

  checkAchievements();
  saveGame();
}

/* ════════════════════════════════════
   HISTORY LOG
═════════════════════════════════════ */
function addHistoryEntry({ icon, text, xp, type }) {
  const entry = { icon, text, xp, type, time: Date.now() };
  gameState.history.unshift(entry);
  if (gameState.history.length > 50) gameState.history.pop();

  renderHistoryItem(entry, true);
}

function renderHistoryItem(entry, prepend = false) {
  const hist = $('action-history');
  if (!hist) return;
  const item = document.createElement('div');
  item.className = `history-item ${entry.type}`;
  item.innerHTML = `
    <span class="hi-icon">${entry.icon}</span>
    <span class="hi-text">${entry.text}</span>
    <span class="hi-xp">+${entry.xp} XP</span>
  `;
  if (prepend) hist.prepend(item);
  else hist.appendChild(item);

  // Keep max 15 items visible
  while (hist.children.length > 15) hist.removeChild(hist.lastChild);
}

/* ════════════════════════════════════
   ACHIEVEMENTS
═════════════════════════════════════ */
const ACHIEVEMENT_DEFS = [
  { id: 'first_decision',  name: 'Primeira Decisão',    icon: '⚡', condition: s => s.goodDecisions >= 1 },
  { id: 'five_decisions',  name: '5 Boas Decisões',     icon: '🌱', condition: s => s.goodDecisions >= 5 },
  { id: 'first_mission',   name: 'Primeira Missão',     icon: '🎯', condition: s => s.missionsCompleted >= 1 },
  { id: 'streak_3',        name: 'Sequência de 3',      icon: '🔥', condition: s => s.streak >= 3 },
  { id: 'score_70',        name: 'Score 70+',           icon: '📈', condition: s => s.score >= 70 },
  { id: 'level_3',         name: 'Level 3',             icon: '🏆', condition: s => s.level >= 3 },
  { id: 'level_5',         name: 'Level 5',             icon: '🌊', condition: s => s.level >= 5 },
  { id: 'missions_5',      name: '5 Missões Completas', icon: '🌿', condition: s => s.missionsCompleted >= 5 },
];

function buildAchievements() {
  return ACHIEVEMENT_DEFS.map(def => ({ ...def, unlocked: false }));
}

function checkAchievements() {
  let anyNew = false;
  gameState.achievements.forEach(achv => {
    if (!achv.unlocked) {
      const def = ACHIEVEMENT_DEFS.find(d => d.id === achv.id);
      if (def && def.condition(gameState.stats)) {
        achv.unlocked = true;
        anyNew = true;
        showToast(`Conquista desbloqueada: ${achv.name}!`, 'good', achv.icon);
      }
    }
  });
  if (anyNew) renderAchievements();
}

function renderAchievements() {
  const list = $('achievements-list');
  if (!list) return;
  list.innerHTML = '';
  gameState.achievements.forEach(a => {
    const badge = document.createElement('div');
    badge.className = `achv-badge${a.unlocked ? '' : ' locked'}`;
    badge.innerHTML = `<span class="achv-icon">${a.icon}</span><span class="achv-name">${a.name}</span>`;
    list.appendChild(badge);
  });
}

/* ════════════════════════════════════
   RECOMMENDATIONS (AI-simulated)
═════════════════════════════════════ */
function buildRecommendations() {
  const recs = [];
  const ans = gameState.diagnosticAnswers;

  if ((ans[0]?.weight || 0) >= 2)
    recs.push({ icon: '🍳', title: 'Reduza Delivery', text: 'Cozinhar em casa 3× por semana pode reduzir suas embalagens plásticas em até 60%.' });

  if ((ans[1]?.weight || 0) + (ans[4]?.weight || 0) >= 3)
    recs.push({ icon: '♻️', title: 'Kit Sustentável', text: 'Invista em canudo reutilizável, garrafa térmica e ecobag. Eliminam ~150 plásticos por mês.' });

  if ((ans[3]?.weight || 0) >= 2)
    recs.push({ icon: '🚌', title: 'Transporte Verde', text: 'Substitua 2 dias de carro por mês pelo transporte público. Reduz sua emissão em até 25%.' });

  if ((ans[2]?.weight || 0) >= 2)
    recs.push({ icon: '🛒', title: 'Compra Consciente', text: 'Crie uma lista antes de comprar e espere 48h antes de compras por impulso.' });

  recs.push({ icon: '🌱', title: 'Dica Geral', text: 'Pequenas mudanças consistentes têm impacto maior que grandes mudanças esporádicas.' });
  recs.push({ icon: '💡', title: 'Previsão', text: 'Se você completar 3 missões por semana, seu score pode chegar a Sustentável em 30 dias.' });

  return recs;
}

function renderRecommendations() {
  const recs = buildRecommendations();
  const content = $('recs-content');
  content.innerHTML = '';
  recs.forEach(r => {
    const card = document.createElement('div');
    card.className = 'rec-card';
    card.innerHTML = `
      <span class="rc-icon">${r.icon}</span>
      <div class="rc-text"><strong>${r.title}</strong>${r.text}</div>
    `;
    content.appendChild(card);
  });
}

/* ════════════════════════════════════
   PREDICTION CHART
═════════════════════════════════════ */
function renderPredictionChart() {
  const canvas = $('predict-chart');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const current = gameState.stats.score;
  const weeks = [current];

  // Simulate future based on missions done
  let sim = current;
  for (let i = 1; i <= 7; i++) {
    const improvement = gameState.stats.missionsCompleted > 0 ? 4 : 1;
    sim = Math.min(100, sim + improvement + (Math.random() * 2 - 0.5));
    weeks.push(Math.round(sim));
  }

  const padL = 36, padR = 16, padT = 16, padB = 30;
  const gW = W - padL - padR;
  const gH = H - padT - padB;

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  [0, 25, 50, 75, 100].forEach(v => {
    const y = padT + gH - (v / 100) * gH;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + gW, y); ctx.stroke();
    ctx.fillStyle = 'rgba(74,106,138,0.8)';
    ctx.font = '9px Exo 2'; ctx.textAlign = 'right';
    ctx.fillText(v, padL - 4, y + 3);
  });

  const points = weeks.map((v, i) => ({
    x: padL + (i / (weeks.length - 1)) * gW,
    y: padT + gH - (v / 100) * gH,
  }));

  // Area
  const aGrad = ctx.createLinearGradient(0, padT, 0, padT + gH);
  aGrad.addColorStop(0, 'rgba(0,255,136,0.15)');
  aGrad.addColorStop(1, 'rgba(0,255,136,0)');
  ctx.beginPath();
  ctx.moveTo(points[0].x, padT + gH);
  points.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(points[points.length-1].x, padT + gH);
  ctx.closePath();
  ctx.fillStyle = aGrad; ctx.fill();

  // Line
  const lineGrad = ctx.createLinearGradient(padL, 0, padL + gW, 0);
  lineGrad.addColorStop(0, '#ff5252');
  lineGrad.addColorStop(0.5, '#ffe600');
  lineGrad.addColorStop(1, '#00ff88');
  ctx.beginPath();
  ctx.strokeStyle = lineGrad; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
  points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.stroke();

  // Points + labels
  const labels = ['Hoje', 'Sem2', 'Sem3', 'Sem4', 'Sem5', 'Sem6', 'Sem7', 'Sem8'];
  points.forEach((p, i) => {
    ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#050b16'; ctx.fill();
    ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(208,234,255,0.7)';
    ctx.font = '9px Orbitron'; ctx.textAlign = 'center';
    ctx.fillText(labels[i] || '', p.x, H - 6);
  });

  // Prediction text
  const lastScore = weeks[weeks.length - 1];
  const cls = getClassification(lastScore);
  $('predict-text').innerHTML = `
    <strong>Análise de Trajetória:</strong><br><br>
    Seu score atual é <strong style="color:var(--neon)">${current}/100</strong>.<br>
    Se você completar as missões diárias, em 8 semanas seu score chegará a 
    <strong style="color:${cls.color}">${lastScore}/100 — ${cls.label}</strong>.<br><br>
    💡 <em>Completar missões aumenta seu score em +4 a +7 pontos por semana.</em>
  `;
}

/* ════════════════════════════════════
   STATS UI UPDATE
═════════════════════════════════════ */
function updateStatsUI() {
  const s = gameState.stats;

  // Stat cards
  animNum($('stat-missions'), s.missionsCompleted);
  animNum($('stat-decisions'), s.goodDecisions);
  animNum($('stat-streak'), s.streak);
  animNum($('stat-impact'), Math.max(0, s.impactReduced));

  // HUD streak
  const hudStreak = $('hud-streak');
  if (hudStreak) hudStreak.textContent = s.streak;

  // Env indicators
  const pPct = Math.round((s.plastic / 9) * 100);
  const ePct = Math.round((s.emission / 6) * 100);
  const wPct = Math.round((s.waste / 15) * 100);
  $('bar-p').style.width = pPct + '%';
  $('bar-e').style.width = ePct + '%';
  $('bar-w').style.width = wPct + '%';

  // Menu modal
  const ms = $('ms-score');
  if (ms) ms.textContent = s.score;
  const mm = $('ms-missions');
  if (mm) mm.textContent = s.missionsCompleted;
}

/* ════════════════════════════════════
   CONFETTI
═════════════════════════════════════ */
function triggerConfetti() {
  const colors = ['#00ff88', '#00e5ff', '#ffe600', '#ff8c00', '#b44eff'];
  for (let i = 0; i < 40; i++) {
    const div = document.createElement('div');
    div.style.cssText = `
      position:fixed; top:-10px; left:${Math.random()*100}vw;
      width:8px; height:8px; border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
      background:${colors[Math.floor(Math.random()*colors.length)]};
      z-index:999; pointer-events:none;
      animation: confetti-fall ${1.5 + Math.random()}s ease forwards ${Math.random()*0.5}s;
    `;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 2500);
  }

  // Add confetti keyframe once
  if (!document.getElementById('confetti-style')) {
    const style = document.createElement('style');
    style.id = 'confetti-style';
    style.textContent = `@keyframes confetti-fall {
      to { transform: translateY(100vh) rotate(${Math.random()*360}deg); opacity:0; }
    }`;
    document.head.appendChild(style);
  }
}

/* ════════════════════════════════════
   INIT GAME UI (after loading)
═════════════════════════════════════ */
function initGameUI() {
  const p = gameState.profile;
  const s = gameState.stats;

  // HUD
  $('hud-name').textContent = p.name;
  $('hud-avatar').textContent = p.avatar;
  $('menu-avatar').textContent = p.avatar;
  $('menu-player-name').textContent = p.name;

  updateScore(s.score, true);
  updateLevel();
  updateStatsUI();

  renderMissionsList();
  renderActiveMission();
  renderAchievements();

  generateDecision();

  // Animate history from saved
  if (gameState.history.length > 0) {
    const hist = $('action-history');
    hist.innerHTML = '';
    gameState.history.slice(0, 10).forEach(e => renderHistoryItem(e));
  }

  // XP global bar
  updateLevel();
}

/* ════════════════════════════════════
   SCREEN 1 — ONBOARDING
═════════════════════════════════════ */
function initOnboarding() {
  const hasSaved = hasSave();
  const continueBtn = $('btn-continue');
  if (hasSaved) continueBtn.classList.remove('hidden');

  $('btn-new-game').addEventListener('click', () => {
    resetGame();
    showScreen('screen-char');
    initCharScreen();
  });

  $('btn-continue').addEventListener('click', () => {
    const save = loadGame();
    if (save) {
      Object.assign(gameState.profile, save.profile || {});
      Object.assign(gameState.stats, save.stats || {});
      gameState.history = save.history || [];
      gameState.missions = save.missions || [];
      gameState.activeMission = save.activeMission || null;
      gameState.achievements = save.achievements || buildAchievements();
      gameState.diagnosticAnswers = save.diagnosticAnswers || [];
      gameState.initialized = true;

      if (!gameState.missions.length) gameState.missions = generateMissions();
      if (!gameState.activeMission) gameState.activeMission = gameState.missions.find(m => !m.done) || null;

      showScreen('screen-game');
      initGameUI();
      showToast(`Bem-vindo de volta, ${gameState.profile.name}! 🎮`, 'good', '♻');
    }
  });
}

/* ════════════════════════════════════
   SCREEN 2 — CHARACTER CREATION
═════════════════════════════════════ */
function initCharScreen() {
  const nameInput = $('player-name-input');
  const nextBtn = $('btn-char-next');

  nameInput.addEventListener('input', () => {
    nextBtn.disabled = nameInput.value.trim().length < 2;
  });

  document.querySelectorAll('.avatar-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.avatar-opt').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      gameState.selectedAvatar = btn.dataset.avatar;
    });
  });

  nextBtn.addEventListener('click', () => {
    gameState.profile.name = nameInput.value.trim() || 'Jogador';
    gameState.profile.avatar = gameState.selectedAvatar;
    gameState.profile.id = `user_${Date.now()}`;
    gameState.profile.createdAt = Date.now();

    currentQ = 0;
    showScreen('screen-quiz');
    renderQuestion(0);
  });
}

/* ════════════════════════════════════
   MODAL SYSTEM
═════════════════════════════════════ */
$('btn-lu-close').addEventListener('click', () => {
  $('modal-levelup').classList.add('hidden');
});

$('btn-menu').addEventListener('click', () => {
  const s = gameState.stats;
  $('ms-score').textContent    = s.score;
  $('ms-level').textContent    = s.level;
  $('ms-xp').textContent       = s.xp;
  $('ms-missions').textContent = s.missionsCompleted;
  $('menu-avatar').textContent = gameState.profile.avatar;
  $('menu-player-name').textContent = gameState.profile.name;
  $('menu-player-title').textContent = getLevelData(s.level).title;
  $('modal-menu').classList.remove('hidden');
});

$('btn-menu-close').addEventListener('click', () => {
  $('modal-menu').classList.add('hidden');
});

$('btn-menu-recs').addEventListener('click', () => {
  $('modal-menu').classList.add('hidden');
  renderRecommendations();
  $('modal-recs').classList.remove('hidden');
});

$('btn-menu-predict').addEventListener('click', () => {
  $('modal-menu').classList.add('hidden');
  $('modal-predict').classList.remove('hidden');
  setTimeout(renderPredictionChart, 100);
});

$('btn-menu-reset').addEventListener('click', () => {
  if (confirm('Tem certeza? Todo seu progresso será perdido!')) {
    $('modal-menu').classList.add('hidden');
    resetGame();
    showScreen('screen-onboarding');
    initOnboarding();
  }
});

document.querySelectorAll('.modal-close').forEach(btn => {
  btn.addEventListener('click', () => {
    const id = btn.dataset.modal;
    if (id) $(id).classList.add('hidden');
  });
});

$('btn-mission-done').addEventListener('click', () => {
  if (gameState.activeMission && !gameState.activeMission.done) {
    completeMission(gameState.activeMission);
  }
});

$('btn-mission-skip').addEventListener('click', () => {
  const next = gameState.missions.find(m => !m.done && m !== gameState.activeMission);
  if (next) {
    gameState.activeMission = next;
    renderActiveMission();
    showToast('Missão pulada. Você pode voltar depois!', 'info', '⏭');
  } else {
    showToast('Nenhuma outra missão disponível agora!', 'info', '🎯');
  }
});

$('btn-refresh-missions').addEventListener('click', () => {
  gameState.missions = generateMissions();
  gameState.activeMission = gameState.missions[0];
  renderMissionsList();
  renderActiveMission();
  showToast('Novas missões geradas pela IA! 🧠', 'info', '⚡');
  saveGame();
});

/* ════════════════════════════════════
   AUTO-SAVE every 30 seconds
═════════════════════════════════════ */
setInterval(() => {
  if (gameState.initialized || gameState.stats.score > 0) saveGame();
}, 30000);

/* ════════════════════════════════════
   BOOT
═════════════════════════════════════ */
(function boot() {
  // Initialize screens
  document.querySelectorAll('.screen').forEach(s => {
    s.style.display = 'none';
    s.classList.remove('active');
  });
  const onboard = $('screen-onboarding');
  onboard.style.display = 'flex';
  onboard.classList.add('active');

  initParticles();
  initOnboarding();
})();