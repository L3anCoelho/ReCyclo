'use strict';

/* ================================================
   ----------- COMEÇO: CONSTANTES & CONFIG ---------
   ================================================ */

const SAVE_KEY     = 'recyclo_v2';
const AUTO_SAVE_MS = 30_000;

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

const MASCOT_SPRITES = {
  animado:    'animado.png',
  boa:        'boadecisao.png',
  confuso:    'confuso.png',
  ruim:       'decisaoruim.png',
  descanso:   'descanso.png',
  feliz:      'feliz.png',
  missao:     'missaocomprida.png',
  levelup:    'nivelup.png',
  preocupado: 'preocupado.png',
  surpreso:   'surpreso.png',
  triste:     'triste.png',
  orgulhoso:  'feliz.png',
  alerta:     'preocupado.png',
  cansado:    'descanso.png',
  neutro:     'animado.png',
};

const MOOD_CONFIG = {
  happy:   { mouth: 'happy',   auraClass: 'mascot-aura--happy',   label: '🌟 Excelente!' },
  neutral: { mouth: 'neutral', auraClass: 'mascot-aura--neutral',  label: '🤖 Observando' },
  sad:     { mouth: 'sad',     auraClass: 'mascot-aura--sad',      label: '⚠️ Atenção' },
};

const MOOD_BUBBLES = {
  happy:   ['Você está no caminho certo! 🌍', 'Impacto positivo detectado!', 'Excelente padrão de decisões! 🔥'],
  neutral: ['Cada escolha conta.', 'Estou calculando seu impacto...', 'Qual será sua próxima decisão?'],
  sad:     ['Você pode melhorar isso.', 'Reveja seus hábitos.', 'O planeta precisa mais de você.'],
};

/* ================================================
   ----------- FIM: CONSTANTES & CONFIG ------------
   ================================================ */




/* ================================================
   ----------- COMEÇO: ESTADO GLOBAL ---------------
   ================================================ */

const DEFAULT_PROFILE = {
  id:          null,
  name:        'Jogador',
  avatar:      '🌱',
  createdAt:   null,
  lastActive:  null,
};

const DEFAULT_STATS = {
  score:             0,
  xp:                0,
  level:             1,
  streak:            0,
  consecutiveBad:    0,
  missionsCompleted: 0,
  goodDecisions:     0,
  badDecisions:      0,
  impactReduced:     0,
  plastic:           0,
  emission:          0,
  waste:             0,
  totalWeight:       0,
};

const mascotState = {
  mood:         'neutro',
  energia:      100,
  confianca:    50,
  streakAtual:  0,
  ultimoEvento: null,
};

const gameState = {
  profile:           { ...DEFAULT_PROFILE },
  stats:             { ...DEFAULT_STATS },
  history:           [],
  missions:          [],
  activeMission:     null,
  achievements:      [],
  diagnosticAnswers: [],
  selectedAvatar:    '🌱',
  initialized:       false,
  _dirty:            false,

  markDirty() { this._dirty = true; },
};

let currentQuestionIndex = 0;
let currentDecisionIndex = 0;

/* ================================================
   ----------- FIM: ESTADO GLOBAL ------------------
   ================================================ */




/* ================================================
   ----------- COMEÇO: PERSISTÊNCIA ----------------
   ================================================ */

function saveGame() {
  const payload = {
    profile:           gameState.profile,
    stats:             gameState.stats,
    history:           gameState.history.slice(-50),
    missions:          gameState.missions,
    activeMission:     gameState.activeMission,
    achievements:      gameState.achievements,
    diagnosticAnswers: gameState.diagnosticAnswers,
    savedAt:           Date.now(),
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('[ReCyclo] Save failed:', err);
  }
  gameState._dirty = false;
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function hasSavedGame() {
  return Boolean(localStorage.getItem(SAVE_KEY));
}

function resetGame() {
  localStorage.removeItem(SAVE_KEY);
  gameState.profile           = { ...DEFAULT_PROFILE };
  gameState.stats             = { ...DEFAULT_STATS };
  gameState.history           = [];
  gameState.missions          = [];
  gameState.activeMission     = null;
  gameState.achievements      = [];
  gameState.diagnosticAnswers = [];
  gameState.initialized       = false;
}

function restoreFromSave(save) {
  Object.assign(gameState.profile, save.profile || {});
  Object.assign(gameState.stats,   save.stats   || {});
  gameState.history           = save.history           || [];
  gameState.missions          = save.missions          || [];
  gameState.activeMission     = save.activeMission     || null;
  gameState.achievements      = save.achievements      || buildAchievements();
  gameState.diagnosticAnswers = save.diagnosticAnswers || [];
  gameState.initialized       = true;

  if (!gameState.missions.length) {
    gameState.missions = generateMissions();
  }
  if (!gameState.activeMission) {
    gameState.activeMission = gameState.missions.find(m => !m.done) || null;
  }
}

/* ================================================
   ----------- FIM: PERSISTÊNCIA -------------------
   ================================================ */




/* ================================================
   ----------- COMEÇO: HELPERS DOM -----------------
   ================================================ */

const getEl = id => document.getElementById(id);

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(screen => {
    screen.style.display = 'none';
    screen.classList.remove('screen--active');
  });
  const target = getEl(screenId);
  if (!target) {
    console.warn('[ReCyclo] showScreen: tela não encontrada →', screenId);
    return;
  }
  target.style.display = 'flex';
  requestAnimationFrame(() => target.classList.add('screen--active'));
}

function animateNumber(el, target, duration = 900) {
  if (!el) return;
  const start = performance.now();
  const from  = parseFloat(el.textContent) || 0;

  const tick = now => {
    const t    = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(from + (target - from) * ease);
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

const randomPick  = arr => arr[Math.floor(Math.random() * arr.length)];
const shuffleArray = arr => arr.slice().sort(() => Math.random() - 0.5);

/* ================================================
   ----------- FIM: HELPERS DOM --------------------
   ================================================ */




/* ================================================
   ----------- COMEÇO: SISTEMA DE TOASTS -----------
   ================================================ */

function showToast(msg, type = 'info', icon = 'ℹ') {
  const container = getEl('toast-container');
  if (!container) return;
  const toast     = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toast-out 0.4s ease forwards';
    setTimeout(() => toast.remove(), 400);
  }, 3200);
}

function showXPPopup(amount) {
  const el = getEl('xp-popup');
  if (!el) return;
  el.textContent = `+${amount} XP!`;
  el.classList.remove('xp-popup--hidden');
  el.style.animation = 'none';
  requestAnimationFrame(() => {
    el.style.animation = 'xp-rise 1.2s cubic-bezier(.4,0,.2,1) both';
  });
  setTimeout(() => el.classList.add('xp-popup--hidden'), 1200);
}

/* ================================================
   ----------- FIM: SISTEMA DE TOASTS --------------
   ================================================ */




/* ================================================
   ----------- COMEÇO: PARTÍCULAS (BACKGROUND) -----
   ================================================ */

function initParticles() {
  const canvas = getEl('particle-bg');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const particles = Array.from({ length: 60 }, () => ({
    x:     Math.random() * window.innerWidth,
    y:     Math.random() * window.innerHeight,
    r:     Math.random() * 1.5 + 0.3,
    vx:    (Math.random() - 0.5) * 0.3,
    vy:    (Math.random() - 0.5) * 0.3,
    alpha: Math.random() * 0.5 + 0.1,
  }));

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,255,136,${p.alpha})`;
      ctx.fill();
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = W;
      if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H;
      if (p.y > H) p.y = 0;
    });
    requestAnimationFrame(draw);
  }
  draw();
}

/* ================================================
   ----------- FIM: PARTÍCULAS (BACKGROUND) --------
   ================================================ */




/* ================================================
   ----------- COMEÇO: SISTEMA DO MASCOTE ----------
   ================================================ */

/* --- Cérebro do mascote --- */

function updateMascotBrain(event) {
  mascotState.ultimoEvento = event;

  const adjustments = {
    decisaoBoa:      { confianca: +6,  energia: +3  },
    decisaoRuim:     { confianca: -8,  energia: -5  },
    missaoCompleta:  { confianca: +10, energia: +6  },
    levelUp:         { confianca: +15, energia: +10 },
    streakAlta:      { confianca: +5,  energia: +5  },
    erroConsecutivo: { confianca: -5,  energia: -3  },
  };

  const delta = adjustments[event];
  if (!delta) return;

  mascotState.confianca = Math.max(0, Math.min(100, mascotState.confianca + (delta.confianca || 0)));
  mascotState.energia   = Math.max(0, Math.min(100, mascotState.energia   + (delta.energia   || 0)));

  if (event === 'decisaoBoa')  mascotState.streakAtual++;
  if (event === 'decisaoRuim') mascotState.streakAtual = 0;

  updateMascotMood();
}

function updateMascotMood() {
  const c = mascotState.confianca;
  mascotState.mood = c > 75 ? 'feliz' : c < 25 ? 'preocupado' : 'neutro';
  renderMascotImage();
}

/* --- Rendering --- */

function renderMascotImage(tempState = null, duration = 2000) {
  const img = getEl('mascot-img');
  if (!img) return;
  const key  = tempState || mascotState.mood;
  const file = MASCOT_SPRITES[key] || MASCOT_SPRITES.animado;
  img.src = `expressoesreciclinho/${file}`;

  if (tempState) {
    clearTimeout(window._mascotTimer);
    window._mascotTimer = setTimeout(() => {
      const moodKey = mascotState.mood || 'neutro';
      img.src = `expressoesreciclinho/${MASCOT_SPRITES[moodKey] || MASCOT_SPRITES.animado}`;
    }, duration);
  }
}

/* --- Renderiza mascote do quiz com sprite real --- */
function renderQuizMascotImage(spriteKey) {
  const img = getEl('mascot-quiz-img');
  if (!img) return;
  const file = MASCOT_SPRITES[spriteKey] || MASCOT_SPRITES.animado;
  img.src = `expressoesreciclinho/${file}`;
}

function animateMascot(type) {
  const mascot = getEl('mascot-main');
  if (!mascot) return;

  const animClass = {
    bounce: 'is-bouncing',
    shake:  'is-shaking',
    glow:   'is-glowing',
    pulse:  'is-pulsing',
    spin:   'is-spinning',
  }[type];

  if (!animClass) return;
  mascot.classList.remove('is-bouncing', 'is-shaking', 'is-glowing', 'is-pulsing', 'is-spinning');
  void mascot.offsetWidth;
  mascot.classList.add(animClass);
  setTimeout(() => mascot.classList.remove(animClass), 1200);
}

/* --- Eventos do mascote --- */

function triggerMascotEvent(event) {
  updateMascotBrain(event);

  const bubble = getEl('main-bubble');
  if (bubble) bubble.textContent = getMascotDialogue();

  const reactions = {
    decisaoBoa:      { sprite: 'boa',       anim: 'bounce' },
    decisaoRuim:     { sprite: 'ruim',      anim: 'shake'  },
    missaoCompleta:  { sprite: 'missao',    anim: 'bounce' },
    levelUp:         { sprite: 'levelup',   anim: 'glow',  duration: 3000 },
    streakAlta:      { sprite: 'orgulhoso', anim: 'pulse', duration: 2500 },
    erroConsecutivo: { sprite: 'alerta',    anim: 'shake', duration: 2500 },
  };

  const reaction = reactions[event];
  if (reaction) {
    renderMascotImage(reaction.sprite, reaction.duration || 2000);
    animateMascot(reaction.anim);
  }
}

/* --- Diálogos --- */

const MASCOT_DIALOGUES = {
  decisaoBoa: [
    '✅ Essa escolha reduziu impacto real.',
    'Decisão inteligente. Continua nesse nível.',
    'Você tá entendendo como isso funciona. 🌱',
    'Ação concreta. Resultado concreto.',
    '🔥 Isso é o que separa quem age de quem só fala.',
    'Cada escolha certa acumula. Você está construindo algo.',
    'Perfeito. Exatamente isso.',
    'Menos resíduo. Menos emissão. Mais futuro.',
    'Sua pegada diminuiu agora. É real.',
    '✅ Decisão calculada. Impacto positivo registrado.',
  ],
  decisaoRuim: [
    '❌ Essa escolha tem custo ambiental.',
    'Não foi a melhor opção. Você sabe disso.',
    'Isso adiciona carga no sistema. Pense na próxima.',
    'O planeta registra cada decisão. Inclusive essa.',
    'Erro detectado. Corrija no próximo ciclo.',
    'Você pode fazer melhor. Esse padrão precisa mudar.',
    '⚠️ Essa opção tem consequências além do que você vê.',
    'Tudo bem errar. Mas reconhecer o erro é o primeiro passo.',
    'Decisão impulsiva. Tente desacelerar.',
    '❌ Impacto negativo registrado. Recupere no próximo.',
  ],
  missaoCompleta: [
    '🎯 Missão concluída. Progresso real.',
    'Você gerou impacto positivo agora. Registrado.',
    'Mais um passo certo no caminho.',
    'Comprometimento detectado. Nível subindo.',
    '✅ Missão cumprida. Próximo objetivo?',
  ],
  levelUp: [
    '🚀 EVOLUÇÃO DETECTADA. Você subiu de nível.',
    'Nível novo. Responsabilidade maior.',
    'Seu impacto aumentou oficialmente.',
    'Agora você está em outro patamar.',
    '🏆 Level up real. Não só no jogo.',
  ],
  neutro: [
    'Qual vai ser sua próxima jogada?',
    'Estou analisando seu comportamento.',
    'Cada escolha importa. Inclusive a próxima.',
    'O sistema está observando seus padrões.',
    'Você tem potencial. Use.',
    'Não é sobre perfeição. É sobre consistência.',
    'O que você faz quando ninguém está olhando?',
    'Pequenas ações. Grande impacto. Continue.',
    'Estou calculando sua trajetória...',
    'Você está construindo um hábito. Qual vai ser?',
  ],
};

const HIGH_PERFORMANCE_LINES = [
  '🔥 Você está dominando as decisões.',
  'Padrão de elite detectado. Continue assim.',
  'Sua consistência é impressionante. Impacto real.',
  'Você já não precisa de mim para isso. Mas sigo observando.',
  'Sequência perfeita. Isso é consciência ambiental de verdade.',
];

const ALERT_LINES = [
  '⚠️ Dois erros seguidos. Precisa reagir agora.',
  'Esse padrão está prejudicando seu score. Foco.',
  'Cada decisão ruim tem custo real. Reveja seu caminho.',
  'O planeta sente cada escolha. Inclusive as ruins.',
  '⚠️ Você pode fazer muito mais do que está fazendo.',
];

function getMascotDialogue() {
  const { ultimoEvento, confianca, streakAtual } = mascotState;
  const { consecutiveBad } = gameState.stats;

  if (streakAtual >= 5)    return randomPick(HIGH_PERFORMANCE_LINES);
  if (consecutiveBad >= 2) return randomPick(ALERT_LINES);
  if (confianca < 25)      return randomPick(ALERT_LINES);
  if (confianca > 85)      return randomPick(HIGH_PERFORMANCE_LINES);

  const pool = MASCOT_DIALOGUES[ultimoEvento] || MASCOT_DIALOGUES.neutro;
  return randomPick(pool);
}

/* --- Reação no quiz --- */

function triggerQuizMascotReaction(type, message) {
  // ── Atualiza balão de fala ──
  const bubble = getEl('quiz-bubble');
  if (bubble && message) {
    bubble.textContent = message;
    bubble.classList.add('quiz-bubble--animate');
    
    setTimeout(() => bubble.classList.remove('quiz-bubble--animate'), 500);
  }

  // ── Mapeia tipo → sprite ──
  const spriteMap = {
    good:    'feliz',       // weight 0
    neutral: 'confuso',    // weight 1
    bad:     'preocupado', // weight 2-3
  };
  const spriteKey = spriteMap[type] || 'animado';

  // ── Atualiza imagem do mascote no quiz ──
  renderQuizMascotImage(spriteKey);

  // ── Volta ao sprite padrão após 1.8s ──
  clearTimeout(window._quizMascotTimer);
  window._quizMascotTimer = setTimeout(() => {
    renderQuizMascotImage('animado');
  }, 3000);
}

/* --- Humor do personagem (score → mood) --- */

function updateCharacterMood(score) {
  const moodKey = score >= 65 ? 'happy' : score >= 40 ? 'neutral' : 'sad';
  const config  = MOOD_CONFIG[moodKey];

  const aura  = getEl('mascot-aura');
  const label = getEl('mood-label');

  if (aura)  { aura.className = 'mascot-aura'; aura.classList.add(config.auraClass); }
  if (label) label.textContent = config.label;

  const bubble = getEl('main-bubble');
  if (bubble) bubble.textContent = randomPick(MOOD_BUBBLES[moodKey]);
}

/* ================================================
   ----------- FIM: SISTEMA DO MASCOTE -------------
   ================================================ */




/* ================================================
   ----------- COMEÇO: MOTOR DE SCORE & NÍVEL ------
   ================================================ */

function computeInitialScore(answers) {
  const totalWeight = answers.reduce((sum, a) => sum + a.weight, 0);
  // 10 perguntas agora, peso máx por pergunta = 3 → máximo = 30
  return Math.max(5, Math.min(100, 100 - Math.round((totalWeight / 30) * 100)));
}

function getScoreClassification(score) {
  if (score >= 75) return { label: 'SUSTENTÁVEL',  color: 'var(--color-neon)' };
  if (score >= 50) return { label: 'CONSCIENTE',   color: 'var(--color-blue)' };
  if (score >= 30) return { label: 'MODERADO',     color: 'var(--color-yellow)' };
  return              { label: 'CRÍTICO',       color: 'var(--color-red)' };
}

function updateScore(newScore, animate = true) {
  gameState.stats.score = Math.max(0, Math.min(100, newScore));
  const cls = getScoreClassification(gameState.stats.score);

  const hudScore = getEl('hud-score');
  if (animate) animateNumber(hudScore, gameState.stats.score);
  else if (hudScore) hudScore.textContent = gameState.stats.score;

  const envNum = getEl('env-score-num');
  if (animate) animateNumber(envNum, gameState.stats.score);
  else if (envNum) envNum.textContent = gameState.stats.score;

  const envClass = getEl('env-class');
  if (envClass) { envClass.textContent = cls.label; envClass.style.color = cls.color; }

  const hexFill = getEl('hex-fill');
  if (hexFill) {
    const opacity = 0.05 + (gameState.stats.score / 100) * 0.3;
    hexFill.style.fill   = `rgba(0,255,136,${opacity})`;
    hexFill.style.stroke = cls.color;
    hexFill.style.filter = `drop-shadow(0 0 ${Math.round(gameState.stats.score / 10)}px ${cls.color})`;
  }

  updateCharacterMood(gameState.stats.score);
  gameState.markDirty();
}

const getLevelData     = level => LEVEL_DATA[Math.min(level - 1, 9)];
const getNextLevelData = level => LEVEL_DATA[Math.min(level,     9)];

function updateLevel() {
  const { xp } = gameState.stats;

  let newLevel = 1;
  for (let i = LEVEL_DATA.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_DATA[i].xpRequired) { newLevel = LEVEL_DATA[i].level; break; }
  }

  const leveledUp = newLevel > gameState.stats.level;
  gameState.stats.level = newLevel;

  const ld        = getLevelData(newLevel);
  const next      = getNextLevelData(newLevel);
  const xpInLevel = xp - ld.xpRequired;
  const xpNeeded  = next.xpRequired - ld.xpRequired;
  const pct       = newLevel >= 10 ? 100 : Math.round((xpInLevel / xpNeeded) * 100);

  const hudLevel = getEl('hud-level'); if (hudLevel) hudLevel.textContent = newLevel;
  const hudXP    = getEl('hud-xp');    if (hudXP)    hudXP.textContent    = xp;

  const barFill  = getEl('xp-global-fill');  if (barFill)  barFill.style.width  = pct + '%';
  const barLabel = getEl('xp-global-label'); if (barLabel) barLabel.textContent = newLevel >= 10
    ? `Level MAX — ${xp} XP`
    : `${xp} / ${next.xpRequired} XP → Level ${newLevel + 1}`;

  const msLevel = getEl('ms-level');         if (msLevel)  msLevel.textContent  = newLevel;
  const msXP    = getEl('ms-xp');            if (msXP)     msXP.textContent     = xp;
  const mTitle  = getEl('menu-player-title');if (mTitle)   mTitle.textContent   = ld.title;

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
  const modal = getEl('modal-levelup');
  if (!modal) return;
  const luLevel  = getEl('lu-level');  if (luLevel)  luLevel.textContent  = level;
  const luTitle  = getEl('lu-title');  if (luTitle)  luTitle.textContent  = ld.title;
  const luUnlock = getEl('lu-unlock'); if (luUnlock) luUnlock.textContent = ld.unlock || '';
  modal.classList.remove('modal--hidden');

  showToast(`LEVEL UP! Você é agora: ${ld.title}!`, 'good', '🏆');
  triggerConfetti();
  triggerMascotEvent('levelUp');
}

/* ================================================
   ----------- FIM: MOTOR DE SCORE & NÍVEL ---------
   ================================================ */




/* ================================================
   ----------- COMEÇO: BANCO DE PERGUNTAS (QUIZ) ---
   ================================================ */

/*
 * ──────────────────────────────────────────────────────────
 * SUBSTITUIÇÃO COMPLETA — 10 novas perguntas de reciclagem
 * Sem campo lore/mascotLines: agora usamos GOOD/NEUTRAL/BAD_LINES
 * ──────────────────────────────────────────────────────────
 */
const QUIZ_QUESTIONS = [
  {
    category: '♻️ RECICLAGEM',
    text: 'Você separa lixo reciclável do orgânico?',
    options: ['Sempre separo corretamente', 'Às vezes separo', 'Raramente separo', 'Nunca separo'],
    weights: [0, 1, 2, 3],
    xpReward: 25,
  },
  {
    category: '🔋 LIXO ELETRÔNICO',
    text: 'O que você faz com pilhas, baterias e eletrônicos?',
    options: ['Levo para pontos de coleta', 'Guardo para descartar depois', 'Jogo no lixo comum', 'Nunca pensei nisso'],
    weights: [0, 1, 3, 3],
    xpReward: 30,
  },
  {
    category: '🛍 CONSUMO',
    text: 'Você usa sacolas reutilizáveis ao fazer compras?',
    options: ['Sempre', 'Frequentemente', 'Às vezes', 'Nunca'],
    weights: [0, 1, 2, 3],
    xpReward: 20,
  },
  {
    category: '🛢 DESCARTE',
    text: 'O que você faz com óleo de cozinha usado?',
    options: ['Levo para reciclagem', 'Armazeno para depois', 'Jogo no lixo', 'Jogo no ralo'],
    weights: [0, 1, 3, 3],
    xpReward: 30,
  },
  {
    category: '🛒 CONSUMO',
    text: 'Antes de comprar algo, você pensa se realmente precisa?',
    options: ['Sempre', 'Frequentemente', 'Às vezes', 'Nunca'],
    weights: [0, 1, 2, 3],
    xpReward: 20,
  },
  {
    category: '📚 CONSCIÊNCIA',
    text: 'Você sabe o que pode ou não ser reciclado?',
    options: ['Sei bem', 'Sei o básico', 'Tenho dúvidas', 'Não sei'],
    weights: [0, 1, 2, 3],
    xpReward: 15,
  },
  {
    category: '🍾 RECICLAGEM',
    text: 'O que você faz com garrafas de vidro?',
    options: ['Levo para reciclagem', 'Reutilizo em casa', 'Jogo no lixo comum', 'Nunca pensei nisso'],
    weights: [0, 1, 2, 3],
    xpReward: 20,
  },
  {
    category: '🌍 CONSCIÊNCIA',
    text: 'Você entende como suas ações afetam o meio ambiente?',
    options: ['Muito bem', 'Bem', 'Pouco', 'Nada'],
    weights: [0, 1, 2, 3],
    xpReward: 15,
  },
  {
    category: '🧴 PLÁSTICO',
    text: 'Você evita produtos com plástico desnecessário?',
    options: ['Sempre', 'Frequentemente', 'Às vezes', 'Nunca'],
    weights: [0, 1, 2, 3],
    xpReward: 25,
  },
  {
    category: '♻️ REUTILIZAÇÃO',
    text: 'Você reaproveita materiais para outros usos?',
    options: ['Sempre', 'Frequentemente', 'Às vezes', 'Nunca'],
    weights: [0, 1, 2, 3],
    xpReward: 20,
  },
];

/*
 * ──────────────────────────────────────────────────────────
 * FALAS DO MASCOTE no quiz — mapeadas por peso da resposta
 *   weight 0        → GOOD_LINES  + sprite feliz/boadecisao
 *   weight 1        → NEUTRAL_LINES + sprite confuso
 *   weight 2 ou 3   → BAD_LINES   + sprite preocupado/triste
 * ──────────────────────────────────────────────────────────
 */
const GOOD_LINES = [
  'Boa escolha! Isso reduz seu impacto ambiental. 🌱',
  'Você está no caminho certo! 🌍',
  'Essa decisão ajuda o planeta diretamente.',
  'Excelente hábito! Continue assim.',
  'O Recyclo aprova! Impacto positivo registrado. ✅',
];

const NEUTRAL_LINES = [
  'Você pode melhorar isso. 🤔',
  'Ainda dá para otimizar essa escolha.',
  'Pense em alternativas mais sustentáveis.',
  'Não está ruim, mas podemos evoluir!',
  'Um passo de cada vez. Continue tentando.',
];

const BAD_LINES = [
  'Essa escolha gera impacto negativo. ⚠️',
  'Você pode melhorar bastante isso!',
  'Isso não é ideal para o meio ambiente.',
  'O planeta sente esse tipo de decisão. 😟',
  'Vamos trabalhar juntos para mudar isso!',
];

/** Retorna a fala e o tipo ('good'|'neutral'|'bad') para um dado peso */
function getQuizReaction(weight) {
  if (weight === 0) return { type: 'good',    line: randomPick(GOOD_LINES) };
  if (weight === 1) return { type: 'neutral', line: randomPick(NEUTRAL_LINES) };
  return                   { type: 'bad',     line: randomPick(BAD_LINES) };
}

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

const SYNC_LABELS = [
  'Analisando hábitos de reciclagem...',
  'Mapeando descarte eletrônico...',
  'Processando padrões de consumo...',
  'Calculando impacto do plástico...',
  'Avaliando consciência ambiental...',
  'Analisando hábitos de descarte...',
  'Verificando reutilização de materiais...',
  'Calculando pegada ambiental...',
  'Processando nível de consciência...',
  'Finalizando diagnóstico...',
];

/* ================================================
   ----------- FIM: BANCO DE PERGUNTAS (QUIZ) ------
   ================================================ */




/* ================================================
   ----------- COMEÇO: FLUXO DO QUIZ ---------------
   ================================================ */

function renderQuestion(index) {
  const q    = QUIZ_QUESTIONS[index];
  const fill = ((index + 1) / QUIZ_QUESTIONS.length) * 100;

  const progressFill = getEl('quiz-progress-fill');
  if (progressFill) progressFill.style.width = fill + '%';

  const qTotal   = getEl('q-total');   if (qTotal)   qTotal.textContent   = QUIZ_QUESTIONS.length;
  const qCurrent = getEl('q-current'); if (qCurrent) qCurrent.textContent = index + 1;
  const qTag     = getEl('q-tag');     if (qTag)     qTag.textContent     = q.category;
  const qXP      = getEl('q-xp');      if (qXP)      qXP.textContent      = `+${q.xpReward} XP`;
  const qText    = getEl('q-text');    if (qText)    qText.textContent    = q.text;
  const syncLbl  = getEl('sync-label');if (syncLbl)  syncLbl.textContent  = SYNC_LABELS[index] || 'Sincronizando...';

  // Reseta mascote do quiz para sprite padrão (animado)
  renderQuizMascotImage('animado');

  // Reseta balão
  const bubble = getEl('quiz-bubble');
  if (bubble) bubble.textContent = 'Pense bem antes de responder! 🤔';

  const card = getEl('question-card');
  if (card) {
    card.style.animation = 'none';
    requestAnimationFrame(() => { card.style.animation = ''; });
  }

  const optsContainer = getEl('q-options');
  if (!optsContainer) return;
  optsContainer.innerHTML = '';

  q.options.forEach((optText, optIndex) => {
    const btn = document.createElement('button');
    btn.className   = 'q-option';
    btn.textContent = optText;
    btn.addEventListener('click', () => handleQuizAnswer(btn, index, optIndex, q));
    optsContainer.appendChild(btn);
  });
}

function handleQuizAnswer(btn, qIndex, optIndex, question) {
  document.querySelectorAll('.q-option').forEach(b => b.classList.remove('q-option--selected'));
  btn.classList.add('q-option--selected');

  const weight = question.weights[optIndex];
  gameState.diagnosticAnswers[qIndex] = {
    weight,
    text:     question.options[optIndex],
    category: question.category,
    index:    optIndex,
  };

  // ── Dispara reação do mascote com sprite + fala ──
  const reaction = getQuizReaction(weight);
  triggerQuizMascotReaction(reaction.type, reaction.line);

  setTimeout(() => {
    if (currentQuestionIndex < QUIZ_QUESTIONS.length - 1) {
      currentQuestionIndex++;
      renderQuestion(currentQuestionIndex);
    } else {
      startAnalysis();
    }
  }, 1500);
}

/* ================================================
   ----------- FIM: FLUXO DO QUIZ ------------------
   ================================================ */




/* ================================================
   ----------- COMEÇO: ANÁLISE / LOADING SCREEN ----
   ================================================ */

async function startAnalysis() {
  showScreen('screen-loading');

  const stepsContainer = getEl('load-steps');
  const barFill        = getEl('load-bar');
  const titleEl        = getEl('load-title');
  const subtitleEl     = getEl('load-sub');

  for (let i = 0; i < ANALYSIS_STEPS.length; i++) {
    const pct = Math.round(((i + 1) / ANALYSIS_STEPS.length) * 100);

    if (titleEl) { titleEl.style.opacity = 0; }
    await sleep(200);
    if (titleEl) { titleEl.textContent = ANALYSIS_STEPS[i]; titleEl.style.opacity = 1; }
    if (barFill) { barFill.style.width = pct + '%'; }

    if (stepsContainer) {
      const stepEl = document.createElement('div');
      stepEl.className = 'loading-step';
      stepEl.innerHTML = `<span class="loading-step__dot"></span>${ANALYSIS_STEPS[i]}`;
      stepsContainer.appendChild(stepEl);
      setTimeout(() => stepEl.classList.add('loading-step--done'), 300);
    }

    await sleep(500);
  }

  if (subtitleEl) subtitleEl.textContent = 'Perfil pronto! Iniciando jogo...';
  await sleep(600);

  buildInitialGameState();
  showScreen('screen-game');
  initGameUI();
}

function buildInitialGameState() {
  const answers = gameState.diagnosticAnswers;
  const score   = computeInitialScore(answers);
  const xpStart = score * 2;

  // Adapta os índices para as 10 novas perguntas
  // [0] reciclagem, [1] eletrônico, [2] sacolas, [3] óleo, [4] consumo consciente
  // [5] conhecimento, [6] vidro, [7] consciência, [8] plástico, [9] reutilização
  const plastic  = (answers[2]?.weight || 0) + (answers[8]?.weight || 0);
  const emission = (answers[1]?.weight || 0) + (answers[3]?.weight || 0);
  const waste    = answers.reduce((sum, a) => sum + (a.weight || 0), 0);

  gameState.stats.score       = score;
  gameState.stats.xp          = xpStart;
  gameState.stats.plastic     = plastic;
  gameState.stats.emission    = emission;
  gameState.stats.waste       = waste;
  gameState.stats.totalWeight = waste;

  gameState.missions      = generateMissions();
  gameState.activeMission = gameState.missions[0] || null;
  gameState.achievements  = buildAchievements();

  gameState.profile.lastActive = Date.now();
  gameState.profile.createdAt  = gameState.profile.createdAt || Date.now();

  updateLevel();
  saveGame();
}

/* ================================================
   ----------- FIM: ANÁLISE / LOADING SCREEN -------
   ================================================ */




/* ================================================
   ----------- COMEÇO: GERADOR DE MISSÕES ----------
   ================================================ */

const MISSION_POOL = {
  plastic: [
    { title: 'Zero Plástico Hoje',   desc: 'Evite qualquer plástico descartável durante o dia.',       xp: 80, scoreBonus: 5, icon: '🧴', category: 'PLÁSTICO' },
    { title: 'Garrafa Reutilizável', desc: 'Use apenas sua garrafa reutilizável o dia todo.',           xp: 60, scoreBonus: 4, icon: '💧', category: 'PLÁSTICO' },
    { title: 'Sacola Ecológica',     desc: 'Use sacola reutilizável em toda compra hoje.',              xp: 50, scoreBonus: 3, icon: '♻️', category: 'PLÁSTICO' },
    { title: 'Reciclar 5 itens',     desc: 'Separe e recicle pelo menos 5 itens recicláveis.',          xp: 70, scoreBonus: 4, icon: '🗑', category: 'PLÁSTICO' },
  ],
  delivery: [
    { title: 'Cozinhar em Casa',     desc: 'Prepare sua própria refeição em vez de pedir delivery.',   xp: 90, scoreBonus: 6, icon: '🍳', category: 'ALIMENTAÇÃO' },
    { title: 'Mercado Local',        desc: 'Compre em um mercado ou feira local hoje.',                 xp: 70, scoreBonus: 5, icon: '🛒', category: 'ALIMENTAÇÃO' },
    { title: 'Refeição Vegetariana', desc: 'Faça uma refeição sem carne hoje.',                        xp: 60, scoreBonus: 4, icon: '🥗', category: 'ALIMENTAÇÃO' },
  ],
  transport: [
    { title: 'Dia sem Carro',    desc: 'Use transporte público, bicicleta ou vá a pé hoje.',           xp: 100, scoreBonus: 7, icon: '🚲', category: 'TRANSPORTE' },
    { title: 'Carona Solidária', desc: 'Compartilhe sua viagem com alguém.',                           xp: 70,  scoreBonus: 5, icon: '🤝', category: 'TRANSPORTE' },
    { title: '10 min a pé',      desc: 'Substitua um trajeto curto de carro por uma caminhada.',       xp: 50,  scoreBonus: 3, icon: '🚶', category: 'TRANSPORTE' },
  ],
  general: [
    { title: 'Pesquisar Alternativas', desc: 'Pesquise uma alternativa sustentável para um hábito seu.', xp: 40, scoreBonus: 2, icon: '🔍', category: 'CONSCIÊNCIA' },
    { title: 'Compartilhar o ReCyclo', desc: 'Convide um amigo a fazer o diagnóstico ambiental.',        xp: 50, scoreBonus: 3, icon: '📲', category: 'COMUNIDADE' },
    { title: 'Economizar Água',        desc: 'Reduza o tempo do banho em 3 minutos hoje.',               xp: 60, scoreBonus: 4, icon: '🚿', category: 'ÁGUA' },
    { title: 'Desligar em standby',    desc: 'Desligue todos os aparelhos que não estão em uso.',        xp: 45, scoreBonus: 3, icon: '⚡', category: 'ENERGIA' },
  ],
};

function generateMissions() {
  const answers = gameState.diagnosticAnswers;
  const pool    = [];

  // Adapta para as 10 novas perguntas
  const plasticWeight   = (answers[2]?.weight || 0) + (answers[8]?.weight || 0);
  const wasteWeight     = (answers[0]?.weight || 0) + (answers[3]?.weight || 0);
  const transportWeight = (answers[4]?.weight || 0);

  pool.push(...MISSION_POOL.plastic.slice(0,   plasticWeight   >= 3 ? 3 : 1));
  pool.push(...MISSION_POOL.delivery.slice(0,  wasteWeight     >= 2 ? 2 : 1));
  pool.push(...MISSION_POOL.transport.slice(0, transportWeight >= 2 ? 2 : 1));
  pool.push(...MISSION_POOL.general);

  return shuffleArray(pool).slice(0, 5).map((mission, i) => ({
    ...mission,
    id:   `mission_${Date.now()}_${i}`,
    done: false,
  }));
}

/* ================================================
   ----------- FIM: GERADOR DE MISSÕES -------------
   ================================================ */




/* ================================================
   ----------- COMEÇO: BANCO DE DECISÕES -----------
   ================================================ */

const DECISIONS = [
  {
    question: 'Você está com fome. Vai pedir delivery agora?',
    context:  'Você tem ingredientes em casa para um prato simples.',
    choices: [
      { text: '🍳 Cozinhar em casa', type: 'good',    xp: 30, score: +3, msg: 'Excelente! Menos embalagens no mundo!' },
      { text: '📱 Pedir delivery',   type: 'bad',     xp: 5,  score: -2, msg: 'Tudo bem! Tente reduzir nas próximas.' },
      { text: '🤔 Decidir depois',   type: 'neutral', xp: 10, score:  0, msg: 'Que tal cozinhar hoje?' },
    ],
  },
  {
    question: 'No mercado, a opção mais barata vem em sacola plástica.',
    context:  'Você tem uma ecobag na mochila.',
    choices: [
      { text: '♻️ Usar minha ecobag',      type: 'good', xp: 25, score: +3, msg: 'Zero plástico! Planeta agradece! 🌍' },
      { text: '🛍 Pegar a sacola plástica', type: 'bad',  xp: 5,  score: -2, msg: 'Lembre da ecobag da próxima vez!' },
    ],
  },
  {
    question: 'Viagem curta: você vai de carro ou a pé?',
    context:  'A distância é de apenas 800 metros.',
    choices: [
      { text: '🚶 Vou a pé!',    type: 'good', xp: 35, score: +4, msg: 'Saúde + zero emissões = perfeito! 💪' },
      { text: '🚗 Vou de carro', type: 'bad',  xp: 5,  score: -2, msg: 'Caminhar salva o planeta e a saúde!' },
      { text: '🚲 Vou de bike',  type: 'good', xp: 40, score: +5, msg: 'Incrível! Bike é o futuro! 🚴‍♀️' },
    ],
  },
  {
    question: 'Sua bebida vem em copo plástico. O que você faz?',
    context:  'Você tem sua garrafa térmica na bolsa.',
    choices: [
      { text: '💧 Uso minha térmica', type: 'good', xp: 30, score: +3, msg: 'Térmica rocks! Menos plástico no mundo! ♻️' },
      { text: '🥤 Aceito o plástico', type: 'bad',  xp: 5,  score: -2, msg: 'Sua térmica agradece amanhã!' },
    ],
  },
  {
    question: 'Black Friday chegou. Como você vai comprar?',
    context:  'Várias lojas oferecem frete grátis para entrega no mesmo dia.',
    choices: [
      { text: '📋 Lista só do necessário', type: 'good',    xp: 40, score: +4, msg: 'Consumo consciente é superpoder! 🦸' },
      { text: '🛒 Comprar muito mesmo',    type: 'bad',     xp: 5,  score: -3, msg: 'Pense na próxima!' },
      { text: '⏸ Esperar e pensar',        type: 'neutral', xp: 20, score: +1, msg: 'Boa reflexão! Mindfulness de consumo! 🧘' },
    ],
  },
  {
    question: 'Fim do dia: você vai ligar o ar condicionado ou abrir a janela?',
    context:  'A temperatura externa está em 24°C.',
    choices: [
      { text: '🪟 Abrir a janela',          type: 'good', xp: 25, score: +2, msg: 'Economia de energia + zero emissões! ✨' },
      { text: '❄️ Ligar o ar condicionado', type: 'bad',  xp: 5,  score: -2, msg: 'Considera o ventilador da próxima vez!' },
    ],
  },
  {
    question: 'Sobrou comida do almoço. O que você faz?',
    context:  'Você tem tempo para guardar ou jogar fora.',
    choices: [
      { text: '🍱 Guardar para amanhã', type: 'good', xp: 30, score: +3, msg: 'Zero desperdício! Ação sustentável! 🌱' },
      { text: '🗑 Jogar fora',           type: 'bad',  xp: 5,  score: -3, msg: 'Desperdício pesa! Guarde da próxima.' },
    ],
  },
  {
    question: 'Você recebeu um produto com excesso de embalagem.',
    context:  'Tem papelão, plástico-bolha e isopor. O que você faz?',
    choices: [
      { text: '♻️ Separar e reciclar tudo', type: 'good',    xp: 35, score: +4, msg: 'Reciclagem correta! Menos lixo no aterro! ♻️' },
      { text: '🗑 Jogar tudo no lixo comum', type: 'bad',     xp: 5,  score: -3, msg: 'Separar resíduos faz enorme diferença.' },
      { text: '📦 Guardar para reutilizar',  type: 'neutral', xp: 20, score: +2, msg: 'Reutilização também é sustentabilidade!' },
    ],
  },
  {
    question: 'Você está no trabalho. Vai imprimir o documento?',
    context:  'O documento tem 8 páginas e só você precisa ler.',
    choices: [
      { text: '📱 Ler no digital',         type: 'good',    xp: 28, score: +3, msg: 'Papel zero! Árvores agradecem 🌳' },
      { text: '🖨 Imprimir dos dois lados', type: 'neutral', xp: 15, score: +1, msg: 'Pelo menos frente e verso! Mas digital é melhor.' },
      { text: '🖨 Imprimir normal',         type: 'bad',     xp: 5,  score: -2, msg: 'Considere o digital na próxima vez.' },
    ],
  },
  {
    question: 'Banho quente no inverno. Quanto tempo você fica?',
    context:  'Um banho de 15min consome 135L de água.',
    choices: [
      { text: '⚡ Máx 5 minutos',      type: 'good',    xp: 40, score: +5, msg: 'Herói da água! 💧 Enorme economia.' },
      { text: '🚿 Uns 8 a 10 minutos', type: 'neutral', xp: 18, score: +1, msg: 'Razoável! Tente reduzir mais 2 minutos.' },
      { text: '😌 Banho longo mesmo',  type: 'bad',     xp: 5,  score: -3, msg: 'Cada minuto a menos = planeta mais saudável.' },
    ],
  },
  {
    question: 'Você viu um produto sem embalagem e com embalagem plástica.',
    context:  'O preço é igual. Qual você escolhe?',
    choices: [
      { text: '🍎 Sem embalagem, claro!',  type: 'good', xp: 30, score: +4, msg: 'Escolha perfeita! Menos resíduo, mesmo produto.' },
      { text: '📦 Com embalagem plástica', type: 'bad',  xp: 5,  score: -2, msg: 'Sem embalagem estava disponível... pense nisso.' },
    ],
  },
  {
    question: 'Seu celular ainda funciona bem. O que você faz?',
    context:  'A marca lançou um modelo novo com poucas melhorias.',
    choices: [
      { text: '✅ Continuo com o atual', type: 'good',    xp: 45, score: +5, msg: 'Consumo consciente! E-waste é problema global.' },
      { text: '🤔 Vou pesquisar mais',   type: 'neutral', xp: 20, score: +2, msg: 'Boa reflexão antes de comprar.' },
      { text: '📱 Trocar pelo novo',     type: 'bad',     xp: 5,  score: -3, msg: 'Lixo eletrônico é um dos mais tóxicos.' },
    ],
  },
  {
    question: 'Luzes acesas em cômodos que você não está usando.',
    context:  'Você foi só tomar água na cozinha e voltou.',
    choices: [
      { text: '💡 Apago tudo ao sair',       type: 'good', xp: 22, score: +2, msg: 'Hábito simples, impacto real na conta e no planeta.' },
      { text: '😴 Deixo aceso, dá preguiça', type: 'bad',  xp: 5,  score: -2, msg: 'Pequenos hábitos = grandes mudanças.' },
    ],
  },
  {
    question: 'Você tem roupas que não usa mais.',
    context:  'Estão em bom estado e ficaram pequenas.',
    choices: [
      { text: '🎁 Doar ou trocar',  type: 'good', xp: 35, score: +4, msg: 'Economia circular em ação! Excelente. 🔄' },
      { text: '🛍 Vender online',    type: 'good', xp: 30, score: +3, msg: 'Revenda sustentável! Menos desperdício têxtil.' },
      { text: '🗑 Jogar fora',       type: 'bad',  xp: 5,  score: -3, msg: 'Indústria têxtil já é a 2ª maior poluidora. Doe!' },
    ],
  },
  {
    question: 'Hora de comprar mantimentos. Como você vai?',
    context:  'O supermercado fica a 1,5km de casa.',
    choices: [
      { text: '🚶 A pé com ecobag',  type: 'good',    xp: 50, score: +6, msg: 'PERFEITO! Zero emissão + zero sacola plástica! 🌟' },
      { text: '🚗 De carro rápido',  type: 'bad',     xp: 5,  score: -2, msg: 'A pé era viável aqui. Tente na próxima.' },
      { text: '🛵 App de entrega',   type: 'neutral', xp: 15, score: -1, msg: 'Agrupa pedidos para reduzir entregas individuais.' },
    ],
  },
];

/* ================================================
   ----------- FIM: BANCO DE DECISÕES --------------
   ================================================ */




/* ================================================
   ----------- COMEÇO: MOTOR DE DECISÕES -----------
   ================================================ */

function renderDecision() {
  const decision = DECISIONS[currentDecisionIndex % DECISIONS.length];
  currentDecisionIndex++;

  const dcQuestion = getEl('dc-question'); if (dcQuestion) dcQuestion.textContent = decision.question;
  const dcContext  = getEl('dc-context');  if (dcContext)  dcContext.textContent  = decision.context;

  const choicesContainer = getEl('dc-choices');
  if (!choicesContainer) return;
  choicesContainer.innerHTML = '';

  decision.choices.forEach(choice => {
    const btn = document.createElement('button');
    btn.className   = `dc-choice dc-choice--${choice.type}`;
    btn.textContent = choice.text;
    btn.addEventListener('click', () => handleDecision(choice));
    choicesContainer.appendChild(btn);
  });
}

function handleDecision(choice) {
  const s = gameState.stats;

  let xpGained = choice.xp;
  if (choice.type === 'good' && s.streak >= 3) {
    xpGained += Math.floor(xpGained * 0.2);
  }

  const scoreDelta = choice.score || 0;

  if (choice.type === 'good') {
    s.goodDecisions++;
    s.streak++;
    s.consecutiveBad = 0;
    s.impactReduced += Math.abs(scoreDelta);
    s.plastic  = Math.max(0, (s.plastic  || 0) - 0.2);
    s.emission = Math.max(0, (s.emission || 0) - 0.2);
    s.waste    = Math.max(0, (s.waste    || 0) - 0.5);
  } else if (choice.type === 'bad') {
    s.badDecisions++;
    s.consecutiveBad++;
    if (s.consecutiveBad >= 2) xpGained = Math.max(2, xpGained - 2);
    if (s.streak > 0) s.streak = 0;
    s.plastic  = Math.min(6,  (s.plastic  || 0) + 0.2);
    s.emission = Math.min(6,  (s.emission || 0) + 0.2);
    s.waste    = Math.min(30, (s.waste    || 0) + 0.5);
  } else {
    s.consecutiveBad = 0;
    s.waste = Math.min(30, (s.waste || 0) + 0.5);
  }

  addXP(xpGained);
  updateScore(Math.max(0, Math.min(100, gameState.stats.score + scoreDelta)));

  if (choice.type === 'good') {
    triggerMascotEvent('decisaoBoa');
    if (s.streak >= 5) setTimeout(() => triggerMascotEvent('streakAlta'), 1500);
  } else if (choice.type === 'bad') {
    triggerMascotEvent('decisaoRuim');
    if (s.consecutiveBad >= 2) setTimeout(() => triggerMascotEvent('erroConsecutivo'), 1500);
  }

  addHistoryEntry({
    icon: choice.type === 'good' ? '⚡' : choice.type === 'bad' ? '❌' : '📌',
    text: choice.text,
    xp:   xpGained,
    type: choice.type,
  });

  showToast(
    choice.msg,
    choice.type === 'good' ? 'good' : choice.type === 'bad' ? 'bad' : 'info',
    choice.type === 'good' ? '🌱' : choice.type === 'bad' ? '⚠️' : '📌'
  );

  updateStatsUI();
  setTimeout(renderDecision, 900);
  checkAchievements();
  saveGame();
}

/* ================================================
   ----------- FIM: MOTOR DE DECISÕES --------------
   ================================================ */




/* ================================================
   ----------- COMEÇO: SISTEMA DE MISSÕES ----------
   ================================================ */

function renderActiveMission() {
  const m = gameState.activeMission;

  const amCategory = getEl('am-category');
  const amTitle    = getEl('am-title');
  const amDesc     = getEl('am-desc');
  const amXP       = getEl('am-xp');
  const amScore    = getEl('am-score');

  if (!m) {
    if (amTitle)    amTitle.textContent    = 'Todas as missões completas! 🎉';
    if (amDesc)     amDesc.textContent     = 'Novas missões amanhã!';
    if (amCategory) amCategory.textContent = 'CONCLUÍDO';
    return;
  }

  if (amCategory) amCategory.textContent = m.category;
  if (amTitle)    amTitle.textContent    = m.title;
  if (amDesc)     amDesc.textContent     = m.desc;
  if (amXP)       amXP.textContent       = m.xp;
  if (amScore)    amScore.textContent    = m.scoreBonus;
}

function renderMissionsList() {
  const listEl = getEl('missions-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  gameState.missions.forEach((mission, index) => {
    const item = document.createElement('div');
    item.className = `mission-item${mission.done ? ' mission-item--done' : ''}`;
    item.style.animationDelay = `${index * 0.05}s`;
    item.innerHTML = `
      <span class="mission-item__icon">${mission.icon}</span>
      <div class="mission-item__info">
        <div class="mission-item__title">${mission.title}</div>
        <div class="mission-item__xp">+${mission.xp} XP · +${mission.scoreBonus} Score</div>
      </div>
      <div class="mission-item__check">${mission.done ? '✓' : ''}</div>
    `;
    if (!mission.done) {
      item.addEventListener('click', () => {
        gameState.activeMission = mission;
        renderActiveMission();
        showToast(`Missão selecionada: ${mission.title}`, 'info', '🎯');
      });
    }
    listEl.appendChild(item);
  });
}

function completeMission(mission) {
  mission.done = true;
  gameState.stats.missionsCompleted++;

  addXP(mission.xp);
  updateScore(Math.min(100, gameState.stats.score + mission.scoreBonus));
  gameState.stats.impactReduced += mission.scoreBonus;

  addHistoryEntry({ icon: '🎯', text: `Missão: ${mission.title}`, xp: mission.xp, type: 'good' });
  showToast(`Missão "${mission.title}" completa! +${mission.xp} XP`, 'good', '🏆');
  triggerMascotEvent('missaoCompleta');

  updateStatsUI();
  renderMissionsList();

  const nextMission = gameState.missions.find(m => !m.done);
  gameState.activeMission = nextMission || null;
  renderActiveMission();

  checkAchievements();
  saveGame();
}

/* ================================================
   ----------- FIM: SISTEMA DE MISSÕES -------------
   ================================================ */




/* ================================================
   ----------- COMEÇO: HISTÓRICO DE AÇÕES ----------
   ================================================ */

function addHistoryEntry({ icon, text, xp, type }) {
  const entry = { icon, text, xp, type, time: Date.now() };
  gameState.history.unshift(entry);
  if (gameState.history.length > 50) gameState.history.pop();
  renderHistoryItem(entry, true);
}

function renderHistoryItem(entry, prepend = false) {
  const histEl = getEl('action-history');
  if (!histEl) return;

  const item = document.createElement('div');
  item.className = `history-item history-item--${entry.type}`;
  item.innerHTML = `
    <span class="history-item__icon">${entry.icon}</span>
    <span class="history-item__text">${entry.text}</span>
    <span class="history-item__xp">+${entry.xp} XP</span>
  `;

  if (prepend) histEl.prepend(item);
  else         histEl.appendChild(item);

  while (histEl.children.length > 15) histEl.removeChild(histEl.lastChild);
}

/* ================================================
   ----------- FIM: HISTÓRICO DE AÇÕES -------------
   ================================================ */




/* ================================================
   ----------- COMEÇO: SISTEMA DE CONQUISTAS -------
   ================================================ */

const ACHIEVEMENT_DEFINITIONS = [
  { id: 'first_decision', name: 'Primeira Decisão',     icon: '⚡', condition: s => s.goodDecisions     >= 1  },
  { id: 'five_decisions',  name: '5 Boas Decisões',     icon: '🌱', condition: s => s.goodDecisions     >= 5  },
  { id: 'ten_decisions',   name: '10 Boas Decisões',    icon: '💚', condition: s => s.goodDecisions     >= 10 },
  { id: 'first_mission',   name: 'Primeira Missão',     icon: '🎯', condition: s => s.missionsCompleted >= 1  },
  { id: 'streak_3',        name: 'Sequência de 3',      icon: '🔥', condition: s => s.streak            >= 3  },
  { id: 'streak_5',        name: 'Sequência de 5',      icon: '🌊', condition: s => s.streak            >= 5  },
  { id: 'score_70',        name: 'Score 70+',           icon: '📈', condition: s => s.score             >= 70 },
  { id: 'score_90',        name: 'Score 90+',           icon: '🌟', condition: s => s.score             >= 90 },
  { id: 'level_3',         name: 'Level 3',             icon: '🏆', condition: s => s.level             >= 3  },
  { id: 'level_5',         name: 'Level 5',             icon: '🌊', condition: s => s.level             >= 5  },
  { id: 'missions_5',      name: '5 Missões Completas', icon: '🌿', condition: s => s.missionsCompleted >= 5  },
];

function buildAchievements() {
  return ACHIEVEMENT_DEFINITIONS.map(def => ({ ...def, unlocked: false }));
}

function checkAchievements() {
  let anyNew = false;
  gameState.achievements.forEach(achievement => {
    if (achievement.unlocked) return;
    const def = ACHIEVEMENT_DEFINITIONS.find(d => d.id === achievement.id);
    if (def && def.condition(gameState.stats)) {
      achievement.unlocked = true;
      anyNew = true;
      showToast(`Conquista desbloqueada: ${achievement.name}!`, 'good', achievement.icon);
    }
  });
  if (anyNew) renderAchievements();
}

function renderAchievements() {
  const listEl = getEl('achievements-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  gameState.achievements.forEach(achievement => {
    const badge = document.createElement('div');
    badge.className = `achievement-badge${achievement.unlocked ? '' : ' achievement-badge--locked'}`;
    badge.innerHTML = `
      <span class="achievement-badge__icon">${achievement.icon}</span>
      <span class="achievement-badge__name">${achievement.name}</span>
    `;
    listEl.appendChild(badge);
  });
}

/* ================================================
   ----------- FIM: SISTEMA DE CONQUISTAS ----------
   ================================================ */




/* ================================================
   ----------- COMEÇO: RECOMENDAÇÕES ---------------
   ================================================ */

function buildRecommendations() {
  const recs    = [];
  const answers = gameState.diagnosticAnswers;

  // Índices novos: [0]=reciclagem, [1]=eletrônico, [2]=sacolas, [3]=óleo,
  //               [4]=consumo consciente, [5]=conhecimento, [6]=vidro,
  //               [7]=consciência, [8]=plástico, [9]=reutilização

  if ((answers[0]?.weight || 0) >= 2)
    recs.push({ icon: '♻️', title: 'Separe o Lixo', text: 'A separação correta de resíduos pode aumentar em até 70% a quantidade de material reciclado.' });

  if ((answers[1]?.weight || 0) >= 2)
    recs.push({ icon: '🔋', title: 'Descarte Eletrônico', text: 'Pilhas e baterias contêm metais pesados. Use os pontos de coleta de supermercados e farmácias.' });

  if ((answers[2]?.weight || 0) + (answers[8]?.weight || 0) >= 3)
    recs.push({ icon: '🧴', title: 'Kit Sustentável', text: 'Invista em sacola ecológica, garrafa térmica e canudo reutilizável. Eliminam ~150 plásticos por mês.' });

  if ((answers[3]?.weight || 0) >= 2)
    recs.push({ icon: '🛢', title: 'Óleo Correto', text: 'Junte o óleo usado em garrafas PET e leve a postos de coleta. Nunca jogue no ralo ou no lixo.' });

  if ((answers[4]?.weight || 0) >= 2)
    recs.push({ icon: '🛒', title: 'Compra Consciente', text: 'Crie uma lista antes de comprar e espere 48h antes de compras por impulso.' });

  recs.push({ icon: '🌱', title: 'Dica Geral', text: 'Pequenas mudanças consistentes têm impacto maior que grandes mudanças esporádicas.' });
  recs.push({ icon: '💡', title: 'Previsão',   text: 'Se você completar 3 missões por semana, seu score pode chegar a Sustentável em 30 dias.' });

  return recs;
}

function renderRecommendations() {
  const content = getEl('recs-content');
  if (!content) return;
  content.innerHTML = '';

  buildRecommendations().forEach(rec => {
    const card = document.createElement('div');
    card.className = 'rec-card';
    card.innerHTML = `
      <span class="rec-card__icon">${rec.icon}</span>
      <div class="rec-card__text"><strong>${rec.title}</strong> — ${rec.text}</div>
    `;
    content.appendChild(card);
  });
}

/* ================================================
   ----------- FIM: RECOMENDAÇÕES ------------------
   ================================================ */




/* ================================================
   ----------- COMEÇO: GRÁFICO DE PREVISÃO ---------
   ================================================ */

function renderPredictionChart() {
  const canvas = getEl('predict-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const current = gameState.stats.score;
  const weeks   = [current];
  let sim       = current;
  for (let i = 1; i <= 7; i++) {
    const improvement = gameState.stats.missionsCompleted > 0 ? 4 : 1;
    sim = Math.min(100, sim + improvement + (Math.random() * 2 - 0.5));
    weeks.push(Math.round(sim));
  }

  const padL = 36, padR = 16, padT = 16, padB = 30;
  const gW = W - padL - padR;
  const gH = H - padT - padB;

  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth   = 1;
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

  const areaGradient = ctx.createLinearGradient(0, padT, 0, padT + gH);
  areaGradient.addColorStop(0, 'rgba(0,255,136,0.15)');
  areaGradient.addColorStop(1, 'rgba(0,255,136,0)');
  ctx.beginPath();
  ctx.moveTo(points[0].x, padT + gH);
  points.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(points[points.length - 1].x, padT + gH);
  ctx.closePath();
  ctx.fillStyle = areaGradient;
  ctx.fill();

  const lineGradient = ctx.createLinearGradient(padL, 0, padL + gW, 0);
  lineGradient.addColorStop(0, '#ff5252');
  lineGradient.addColorStop(0.5, '#ffe600');
  lineGradient.addColorStop(1, '#00ff88');
  ctx.beginPath();
  ctx.strokeStyle = lineGradient;
  ctx.lineWidth   = 2.5;
  ctx.lineJoin    = 'round';
  points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.stroke();

  const xLabels = ['Hoje', 'Sem2', 'Sem3', 'Sem4', 'Sem5', 'Sem6', 'Sem7', 'Sem8'];
  points.forEach((p, i) => {
    ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#050b16'; ctx.fill();
    ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(208,234,255,0.7)';
    ctx.font = '9px Orbitron'; ctx.textAlign = 'center';
    ctx.fillText(xLabels[i] || '', p.x, H - 6);
  });

  const lastScore = weeks[weeks.length - 1];
  const cls       = getScoreClassification(lastScore);
  const predictText = getEl('predict-text');
  if (predictText) {
    predictText.innerHTML = `
      <strong>Análise de Trajetória:</strong><br><br>
      Seu score atual é <strong style="color:var(--color-neon)">${current}/100</strong>.<br>
      Se você completar as missões diárias, em 8 semanas seu score chegará a
      <strong style="color:${cls.color}">${lastScore}/100 — ${cls.label}</strong>.<br><br>
      💡 <em>Completar missões aumenta seu score em +4 a +7 pontos por semana.</em>
    `;
  }
}

/* ================================================
   ----------- FIM: GRÁFICO DE PREVISÃO ------------
   ================================================ */




/* ================================================
   ----------- COMEÇO: ATUALIZAÇÃO DE UI (STATS) ---
   ================================================ */

function updateStatsUI() {
  const s = gameState.stats;

  animateNumber(getEl('stat-missions'),  s.missionsCompleted);
  animateNumber(getEl('stat-decisions'), s.goodDecisions);
  animateNumber(getEl('stat-streak'),    s.streak);
  animateNumber(getEl('stat-impact'),    Math.max(0, s.impactReduced));

  const hudStreak = getEl('hud-streak');
  if (hudStreak) hudStreak.textContent = s.streak;

  const barP = getEl('bar-p'); if (barP) barP.style.width = Math.round((s.plastic  / 6)  * 100) + '%';
  const barE = getEl('bar-e'); if (barE) barE.style.width = Math.round((s.emission / 6)  * 100) + '%';
  const barW = getEl('bar-w'); if (barW) barW.style.width = Math.round((s.waste    / 30) * 100) + '%';

  const msScore    = getEl('ms-score');    if (msScore)    msScore.textContent    = s.score;
  const msMissions = getEl('ms-missions'); if (msMissions) msMissions.textContent = s.missionsCompleted;
}

/* ================================================
   ----------- FIM: ATUALIZAÇÃO DE UI (STATS) ------
   ================================================ */




/* ================================================
   ----------- COMEÇO: INIT GAME UI ----------------
   ================================================ */

function initGameUI() {
  const s = gameState.stats;

  // HUD
  const hudAvatar = getEl('hud-avatar'); if (hudAvatar) hudAvatar.textContent = gameState.profile.avatar;
  const hudName   = getEl('hud-name');   if (hudName)   hudName.textContent   = gameState.profile.name;

  // Score e nível sem animação (primeira carga)
  updateScore(s.score, false);
  updateLevel();
  updateStatsUI();

  // Mascote — inicia com sprite animado
  renderMascotImage('animado');

  // Missões e conquistas
  renderActiveMission();
  renderMissionsList();
  renderAchievements();

  // Primeira decisão
  renderDecision();

  // Histórico salvo
  gameState.history.slice(0, 15).forEach(entry => renderHistoryItem(entry, false));

  // Mascote no estado atual
  updateCharacterMood(s.score);

  gameState.initialized = true;
}

/* ================================================
   ----------- FIM: INIT GAME UI -------------------
   ================================================ */




/* ================================================
   ----------- COMEÇO: CONFETTI --------------------
   ================================================ */

function triggerConfetti() {
  const colors = ['#00ff88', '#00e5ff', '#ffe600', '#ff8c00', '#b44eff'];

  for (let i = 0; i < 40; i++) {
    const particle = document.createElement('div');
    particle.style.cssText = `
      position: fixed;
      top: -10px;
      left: ${Math.random() * 100}vw;
      width: 8px; height: 8px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      z-index: 999;
      pointer-events: none;
      animation: confetti-fall ${1.5 + Math.random()}s ease forwards ${Math.random() * 0.5}s;
    `;
    document.body.appendChild(particle);
    setTimeout(() => particle.remove(), 2500);
  }

  if (!getEl('confetti-style')) {
    const style = document.createElement('style');
    style.id = 'confetti-style';
    style.textContent = `@keyframes confetti-fall {
      to { transform: translateY(100vh) rotate(720deg); opacity: 0; }
    }`;
    document.head.appendChild(style);
  }
}

/* ================================================
   ----------- FIM: CONFETTI -----------------------
   ================================================ */




/* ================================================
   ----------- COMEÇO: INICIALIZAÇÃO DE TELAS ------
   ================================================ */

function initOnboarding() {
  const btnContinue    = getEl('btn-continue');
  const btnContinueSub = getEl('btn-continue-sub');
  const bubble         = getEl('bubble-onboard');

  if (hasSavedGame()) {
    if (btnContinue) {
      btnContinue.disabled = false;
      btnContinue.classList.remove('menu-item--disabled', 'btn--hidden');
    }
    if (btnContinueSub) btnContinueSub.textContent = 'Retomar de onde parou';

    const save = loadGame();
    if (save && save.stats) {
      const lvl     = save.stats.level || 1;
      const lvlData = getLevelData(lvl);
      const badge   = getEl('onboard-level-badge');
      const txt     = getEl('onboard-level-text');
      if (badge) badge.classList.remove('onboard__level-badge--hidden');
      if (txt)   txt.textContent = `Nível ${lvl} — ${lvlData.title}`;
      if (bubble && save.profile && save.profile.name) {
        bubble.textContent = `Olá, ${save.profile.name}! Continue de onde parou ou comece do zero.`;
      }
    }
  } else {
    if (btnContinue) {
      btnContinue.disabled = true;
      btnContinue.classList.add('menu-item--disabled');
    }
    if (bubble) {
      bubble.textContent = 'Bem-vindo ao Recyclo! Melhore seus hábitos e ganhe recompensas.';
    }
  }

  const btnNew = getEl('btn-new-game');
  if (btnNew) {
    btnNew.addEventListener('click', () => {
      resetGame();
      initCharCreation();
    });
  }

  if (btnContinue) {
    btnContinue.addEventListener('click', () => {
      if (!hasSavedGame()) {
        showToast('Nenhum save encontrado. Comece um novo jogo!', 'bad', '⚠️');
        return;
      }
      const save = loadGame();
      if (!save) return;
      restoreFromSave(save);
      showScreen('screen-game');
      initGameUI();
      showToast(`Bem-vindo de volta, ${gameState.profile.name}! 🎮`, 'good', '♻');
    });
  }

  const btnModes = getEl('btn-show-game-modes');
  const step1    = getEl('onboard-step-1');
  const step2    = getEl('onboard-step-2');
  const btnBack  = getEl('btn-back-to-menu');

  if (btnModes && step1 && step2) {
    btnModes.addEventListener('click', () => {
      step1.style.display = 'none';
      step2.style.display = 'flex';
      if (bubble) bubble.textContent = 'Escolha o modo de jogo que preferir!';
    });
  }

  if (btnBack && step1 && step2) {
    btnBack.addEventListener('click', () => {
      step2.style.display = 'none';
      step1.style.display = 'flex';
      if (bubble) bubble.textContent = hasSavedGame()
        ? 'Continue de onde parou ou comece do zero.'
        : 'Bem-vindo ao Recyclo! Melhore seus hábitos e ganhe recompensas.';
    });
  }
}

function initCharCreation() {
  const screen = getEl('screen-char');

  if (!screen) {
    showScreen('screen-quiz');
    currentQuestionIndex = 0;
    renderQuestion(0);
    return;
  }

  showScreen('screen-char');

  const avatarOptions = screen.querySelectorAll('.avatar-opt');
  avatarOptions.forEach(el => {
    el.addEventListener('click', () => {
      avatarOptions.forEach(a => {
        a.classList.remove('avatar-opt--selected');
        a.setAttribute('aria-selected', 'false');
      });
      el.classList.add('avatar-opt--selected');
      el.setAttribute('aria-selected', 'true');
      gameState.selectedAvatar = el.dataset.avatar;
    });
  });

  const defaultAvatar = screen.querySelector('.avatar-opt--selected');
  if (defaultAvatar) gameState.selectedAvatar = defaultAvatar.dataset.avatar || '🌱';

  const btnNext   = getEl('btn-char-next');
  const nameInput = getEl('player-name-input');

  if (nameInput && btnNext) {
    nameInput.addEventListener('input', () => {
      btnNext.disabled = nameInput.value.trim().length === 0;
    });
  }

  if (btnNext) {
    btnNext.addEventListener('click', () => {
      const name = nameInput ? nameInput.value.trim() : '';
      gameState.profile.name   = name || 'Jogador';
      gameState.profile.avatar = gameState.selectedAvatar || '🌱';

      const hudAvatar = getEl('hud-avatar');
      if (hudAvatar) hudAvatar.textContent = gameState.profile.avatar;

      showScreen('screen-quiz');
      currentQuestionIndex = 0;
      renderQuestion(0);
    });
  }
}

/* ================================================
   ----------- FIM: INICIALIZAÇÃO DE TELAS ---------
   ================================================ */




/* ================================================
   ----------- COMEÇO: SISTEMA DE MODAIS -----------
   ================================================ */

function initModalListeners() {

  const btnLuClose = getEl('btn-lu-close');
  if (btnLuClose) {
    btnLuClose.addEventListener('click', () => {
      const modal = getEl('modal-levelup');
      if (modal) modal.classList.add('modal--hidden');
    });
  }

  const btnMenu = getEl('btn-menu');
  if (btnMenu) {
    btnMenu.addEventListener('click', () => {
      const s = gameState.stats;
      const msScore    = getEl('ms-score');    if (msScore)    msScore.textContent    = s.score;
      const msLevel    = getEl('ms-level');    if (msLevel)    msLevel.textContent    = s.level;
      const msXP       = getEl('ms-xp');       if (msXP)       msXP.textContent       = s.xp;
      const msMissions = getEl('ms-missions'); if (msMissions) msMissions.textContent = s.missionsCompleted;

      const menuAvatar = getEl('menu-avatar');        if (menuAvatar) menuAvatar.textContent  = gameState.profile.avatar;
      const menuName   = getEl('menu-player-name');   if (menuName)   menuName.textContent    = gameState.profile.name;
      const menuTitle  = getEl('menu-player-title');  if (menuTitle)  menuTitle.textContent   = getLevelData(s.level).title;

      const modal = getEl('modal-menu');
      if (modal) modal.classList.remove('modal--hidden');
    });
  }

  const btnMenuClose = getEl('btn-menu-close');
  if (btnMenuClose) {
    btnMenuClose.addEventListener('click', () => {
      const modal = getEl('modal-menu');
      if (modal) modal.classList.add('modal--hidden');
    });
  }

  const btnMenuRecs = getEl('btn-menu-recs');
  if (btnMenuRecs) {
    btnMenuRecs.addEventListener('click', () => {
      const menuModal = getEl('modal-menu');  if (menuModal)  menuModal.classList.add('modal--hidden');
      renderRecommendations();
      const recsModal = getEl('modal-recs'); if (recsModal) recsModal.classList.remove('modal--hidden');
    });
  }

  const btnMenuPredict = getEl('btn-menu-predict');
  if (btnMenuPredict) {
    btnMenuPredict.addEventListener('click', () => {
      const menuModal    = getEl('modal-menu');    if (menuModal)    menuModal.classList.add('modal--hidden');
      const predictModal = getEl('modal-predict'); if (predictModal) predictModal.classList.remove('modal--hidden');
      setTimeout(renderPredictionChart, 100);
    });
  }

  const btnMenuReset = getEl('btn-menu-reset');
  if (btnMenuReset) {
    btnMenuReset.addEventListener('click', () => {
      if (confirm('Tem certeza? Todo seu progresso será perdido!')) {
        const menuModal = getEl('modal-menu'); if (menuModal) menuModal.classList.add('modal--hidden');
        resetGame();
        showScreen('screen-onboarding');
        initOnboarding();
      }
    });
  }

  document.querySelectorAll('.modal__close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.modal;
      if (targetId) {
        const target = getEl(targetId);
        if (target) target.classList.add('modal--hidden');
      }
    });
  });

  const btnMissionDone = getEl('btn-mission-done');
  if (btnMissionDone) {
    btnMissionDone.addEventListener('click', () => {
      if (gameState.activeMission && !gameState.activeMission.done) {
        completeMission(gameState.activeMission);
      }
    });
  }

  const btnMissionSkip = getEl('btn-mission-skip');
  if (btnMissionSkip) {
    btnMissionSkip.addEventListener('click', () => {
      const next = gameState.missions.find(m => !m.done && m !== gameState.activeMission);
      if (next) {
        gameState.activeMission = next;
        renderActiveMission();
        showToast('Missão pulada. Você pode voltar depois!', 'info', '⏭');
      } else {
        showToast('Nenhuma outra missão disponível agora!', 'info', '🎯');
      }
    });
  }

  const btnRefresh = getEl('btn-refresh-missions');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      gameState.missions      = generateMissions();
      gameState.activeMission = gameState.missions[0] || null;
      renderMissionsList();
      renderActiveMission();
      showToast('Novas missões geradas! 🧠', 'info', '⚡');
      saveGame();
    });
  }
}

/* ================================================
   ----------- FIM: SISTEMA DE MODAIS --------------
   ================================================ */




/* ================================================
   ----------- COMEÇO: AUTO-SAVE & BOOT ------------
   ================================================ */

setInterval(() => {
  if (gameState.initialized || gameState.stats.score > 0) saveGame();
}, AUTO_SAVE_MS);

(function boot() {
  document.querySelectorAll('.screen').forEach(screen => {
    screen.style.display = 'none';
    screen.classList.remove('screen--active');
  });

  const onboardScreen = getEl('screen-onboarding');
  if (onboardScreen) {
    onboardScreen.style.display = 'flex';
    onboardScreen.classList.add('screen--active');
  }

  initParticles();
  initOnboarding();
  initModalListeners();
})();

/* ================================================
   ----------- FIM: AUTO-SAVE & BOOT ---------------
   ================================================ */