// ============================================================
//  RECYCLO CRUSH — Game Engine
//  Estilo Candy Crush com tema ambiental/reciclagem
// ============================================================

// ===== CONSTANTES =====
const BOARD_SIZE = 8;
const TILE_TYPES = [
  { id: 'plastic',    emoji: '🧴', label: 'Plástico',    color: '#3498db' },
  { id: 'paper',      emoji: '📦', label: 'Papel',       color: '#f39c12' },
  { id: 'glass',      emoji: '🍶', label: 'Vidro',       color: '#1abc9c' },
  { id: 'metal',      emoji: '🥫', label: 'Metal',       color: '#95a5a6' },
  { id: 'organic',    emoji: '🍃', label: 'Orgânico',    color: '#2ecc71' },
  { id: 'electronic', emoji: '📱', label: 'Eletrônico',  color: '#9b59b6' },
  { id: 'wood',       emoji: '🪵', label: 'Madeira',     color: '#a0522d' },
];

const LEVELS = [
  { id:1,  target:500,   moves:25, typesCount:4, special:false, stars:[150,300,500],    objective:{plastic:8} },
  { id:2,  target:800,   moves:25, typesCount:4, special:false, stars:[300,550,800],    objective:{paper:10}  },
  { id:3,  target:1200,  moves:30, typesCount:5, special:true,  stars:[500,900,1200],   objective:{glass:8, plastic:6} },
  { id:4,  target:1600,  moves:28, typesCount:5, special:true,  stars:[700,1200,1600],  objective:{metal:10}  },
  { id:5,  target:2200,  moves:30, typesCount:5, special:true,  stars:[1000,1700,2200], objective:{organic:12,paper:8} },
  { id:6,  target:3000,  moves:32, typesCount:6, special:true,  stars:[1500,2200,3000], objective:{electronic:10} },
  { id:7,  target:4000,  moves:30, typesCount:6, special:true,  stars:[2000,3000,4000], objective:{wood:10,glass:8} },
  { id:8,  target:5500,  moves:35, typesCount:6, special:true,  stars:[3000,4500,5500], objective:{plastic:15,metal:10} },
  { id:9,  target:7000,  moves:35, typesCount:7, special:true,  stars:[4000,5500,7000], objective:{organic:15,electronic:8} },
  { id:10, target:10000, moves:40, typesCount:7, special:true,  stars:[6000,8000,10000],  objective:{wood:12,paper:15,glass:10} },
  { id:11, target:13000, moves:38, typesCount:7, special:true,  stars:[8000,11000,13000], objective:{metal:20} },
  { id:12, target:16000, moves:40, typesCount:7, special:true,  stars:[10000,13000,16000],objective:{plastic:20,electronic:12} },
  { id:13, target:20000, moves:42, typesCount:7, special:true,  stars:[12000,16000,20000],objective:{organic:20,wood:15} },
  { id:14, target:25000, moves:45, typesCount:7, special:true,  stars:[15000,20000,25000],objective:{glass:20,paper:18} },
  { id:15, target:30000, moves:50, typesCount:7, special:true,  stars:[18000,24000,30000],objective:{metal:25,electronic:15,plastic:20} },
];

const THEMES = {
  forest: { bg: '🌲', particle: '🍃', boardBg: 'linear-gradient(135deg,#0d2b1a,#1a4d2e)' },
  ocean:  { bg: '🌊', particle: '💧', boardBg: 'linear-gradient(135deg,#001a2e,#003d5c)' },
  desert: { bg: '☀️', particle: '✨', boardBg: 'linear-gradient(135deg,#2c1a00,#5c3200)' },
  arctic: { bg: '❄️', particle: '❄',  boardBg: 'linear-gradient(135deg,#0d1b2a,#1a3a5c)' },
  city:   { bg: '🏙️', particle: '⚡', boardBg: 'linear-gradient(135deg,#0a0f1e,#1a1f3c)' },
  cosmos: { bg: '⭐', particle: '🌟', boardBg: 'linear-gradient(135deg,#080010,#1a0030)' },
};

// ===== ESTADO DO JOGO =====
let state = {
  board: [],
  score: 0,
  moves: 0,
  lives: 4,
  combo: 0,
  xp: 0,
  level: 1,
  currentLevel: null,
  selectedTile: null,
  isAnimating: false,
  isPaused: false,
  activeBooster: null,
  objectives: {},
  theme: 'forest',
  playerName: '',
  completedLevels: {},
  lifeRefillTime: null,
};

// ===== AUDIO ENGINE (Web Audio API) =====
let audioCtx = null;

function initAudio() {
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch(e) { console.warn('Audio não disponível'); }
}

function playSound(type) {
  if (!audioCtx) return;
  const masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  masterGain.connect(audioCtx.destination);

  switch(type) {
    case 'select':   playTone(masterGain, [440, 550], [0, 0.08], 0.15, 'sine'); break;
    case 'swap':     playTone(masterGain, [330, 440], [0, 0.05], 0.2, 'sine'); break;
    case 'match3':   playRecycleCan(masterGain); break;
    case 'match4':   playBottle(masterGain); break;
    case 'match5':   playGlass(masterGain); break;
    case 'combo':    playCombo(masterGain); break;
    case 'special':  playSpecial(masterGain); break;
    case 'win':      playWin(masterGain); break;
    case 'lose':     playLose(masterGain); break;
    case 'noMatch':  playNoMatch(masterGain); break;
    case 'bomb':     playBomb(masterGain); break;
    case 'rainbow':  playRainbow(masterGain); break;
    case 'lifelose': playLifeLose(masterGain); break;
  }
}

function playTone(dest, freqs, times, dur, type) {
  type = type || 'sine';
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.connect(gain); gain.connect(dest);
  osc.frequency.setValueAtTime(freqs[0], audioCtx.currentTime + times[0]);
  if (freqs[1]) osc.frequency.linearRampToValueAtTime(freqs[1], audioCtx.currentTime + times[1]);
  gain.gain.setValueAtTime(0.8, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + dur);
}

// Som de lata sendo amassada/reciclada
function playRecycleCan(dest) {
  const t = audioCtx.currentTime;
  const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.3, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for(let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
  const noise = audioCtx.createBufferSource();
  noise.buffer = buf;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass'; filter.frequency.setValueAtTime(2000, t); filter.Q.value = 10;
  const gainN = audioCtx.createGain();
  gainN.gain.setValueAtTime(0.6, t);
  gainN.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  noise.connect(filter); filter.connect(gainN); gainN.connect(dest);
  noise.start(t); noise.stop(t + 0.3);

  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = 'sawtooth'; osc.frequency.setValueAtTime(800, t);
  osc.frequency.exponentialRampToValueAtTime(200, t + 0.15);
  g.gain.setValueAtTime(0.4, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  osc.connect(g); g.connect(dest);
  osc.start(t); osc.stop(t + 0.2);
}

// Som de garrafa PET sendo jogada
function playBottle(dest) {
  const t = audioCtx.currentTime;
  [0, 0.08, 0.16].forEach(function(delay, i) {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600 + i*200, t + delay);
    osc.frequency.exponentialRampToValueAtTime(400 + i*100, t + delay + 0.1);
    g.gain.setValueAtTime(0.5, t + delay);
    g.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.15);
    osc.connect(g); g.connect(dest);
    osc.start(t + delay); osc.stop(t + delay + 0.2);
  });
}

// Som de vidro tilintando
function playGlass(dest) {
  const t = audioCtx.currentTime;
  [880, 1320, 1760].forEach(function(freq, i) {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(freq, t + i * 0.05);
    g.gain.setValueAtTime(0.6, t + i*0.05);
    g.gain.exponentialRampToValueAtTime(0.001, t + i*0.05 + 0.5);
    osc.connect(g); g.connect(dest);
    osc.start(t + i*0.05); osc.stop(t + i*0.05 + 0.6);
  });
}

function playCombo(dest) {
  const t = audioCtx.currentTime;
  [261, 329, 392, 523].forEach(function(freq, i) {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'square'; osc.frequency.value = freq;
    g.gain.setValueAtTime(0.3, t + i*0.1);
    g.gain.exponentialRampToValueAtTime(0.001, t + i*0.1 + 0.2);
    osc.connect(g); g.connect(dest);
    osc.start(t + i*0.1); osc.stop(t + i*0.1 + 0.25);
  });
}

function playSpecial(dest) {
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, t);
  osc.frequency.linearRampToValueAtTime(1200, t + 0.4);
  g.gain.setValueAtTime(0.6, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  osc.connect(g); g.connect(dest);
  osc.start(t); osc.stop(t + 0.5);
}

function playWin(dest) {
  const t = audioCtx.currentTime;
  [523, 659, 784, 1047].forEach(function(freq, i) {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'sine'; osc.frequency.value = freq;
    g.gain.setValueAtTime(0.5, t + i*0.12);
    g.gain.exponentialRampToValueAtTime(0.001, t + i*0.12 + 0.4);
    osc.connect(g); g.connect(dest);
    osc.start(t + i*0.12); osc.stop(t + i*0.12 + 0.4);
  });
}

function playLose(dest) {
  const t = audioCtx.currentTime;
  [523, 415, 330].forEach(function(freq, i) {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'sawtooth'; osc.frequency.value = freq;
    g.gain.setValueAtTime(0.4, t + i*0.15);
    g.gain.exponentialRampToValueAtTime(0.001, t + i*0.15 + 0.3);
    osc.connect(g); g.connect(dest);
    osc.start(t + i*0.15); osc.stop(t + i*0.15 + 0.35);
  });
}

function playNoMatch(dest) {
  playTone(dest, [200, 150], [0, 0.1], 0.2, 'sawtooth');
}

function playBomb(dest) {
  const t = audioCtx.currentTime;
  const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.5, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for(let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / 5000);
  const source = audioCtx.createBufferSource();
  source.buffer = buf;
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(0.8, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  source.connect(g); g.connect(dest);
  source.start(t); source.stop(t + 0.5);
}

function playRainbow(dest) {
  const t = audioCtx.currentTime;
  for(let i = 0; i < 6; i++) {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300 + i*150, t + i*0.06);
    g.gain.setValueAtTime(0.4, t + i*0.06);
    g.gain.exponentialRampToValueAtTime(0.001, t + i*0.06 + 0.3);
    osc.connect(g); g.connect(dest);
    osc.start(t + i*0.06); osc.stop(t + i*0.06 + 0.35);
  }
}

function playLifeLose(dest) {
  playTone(dest, [300, 150], [0, 0.2], 0.4, 'triangle');
}

// ===== PARTICLE SYSTEM =====
let particles = [];
let particleCanvas, particleCtx;
let animFrameId;

function initParticleCanvas() {
  particleCanvas = document.getElementById('particleCanvas');
  if (!particleCanvas) return;
  const board = document.getElementById('gameBoard');
  const w = board.offsetWidth + 20;
  const h = board.offsetHeight + 20;
  particleCanvas.width = w;
  particleCanvas.height = h;
  particleCtx = particleCanvas.getContext('2d');
  runParticleLoop();
}

function runParticleLoop() {
  if (!particleCtx) return;
  particleCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
  particles = particles.filter(function(p) { return p.life > 0; });
  particles.forEach(function(p) {
    p.x += p.vx; p.y += p.vy;
    p.vy += 0.15; p.life -= p.decay;
    p.vx *= 0.98;
    particleCtx.globalAlpha = Math.max(0, p.life);
    // FIX #1: corrected template string
    particleCtx.font = `${p.size}px serif`;
    particleCtx.fillText(p.emoji, p.x, p.y);
  });
  particleCtx.globalAlpha = 1;
  animFrameId = requestAnimationFrame(runParticleLoop);
}

function spawnParticles(col, row, emoji, count) {
  count = count || 8;
  const tileSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--tile-size')) || 62;
  const boardPad = 10;
  const gapSize = 3;
  const cx = boardPad + col * (tileSize + gapSize) + tileSize/2;
  const cy = boardPad + row * (tileSize + gapSize) + tileSize/2;
  for(let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i / count) + Math.random() * 0.5;
    const speed = 2 + Math.random() * 4;
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      emoji: emoji, size: 14 + Math.random() * 10,
      life: 1, decay: 0.04 + Math.random() * 0.03,
    });
  }
}

// ===== FLOATING SCORE =====
function showFloatingScore(text, x, y, type) {
  type = type || 'normal';
  const el = document.createElement('div');
  // FIX #2: corrected template string for className
  el.className = `floating-score ${type}`;
  el.textContent = text;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  document.getElementById('floatingScores').appendChild(el);
  setTimeout(function() { el.remove(); }, 1300);
}

// ===== SPARKLE EFFECT =====
function launchSparkles(count) {
  count = count || 30;
  const container = document.getElementById('sparkleContainer');
  const emojis = ['♻', '🌿', '⭐', '✨', '🌱', '💚', '🍃'];
  for(let i = 0; i < count; i++) {
    setTimeout(function() {
      const el = document.createElement('div');
      el.className = 'sparkle';
      el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      el.style.fontSize = (16 + Math.random() * 20) + 'px';
      el.style.left = (10 + Math.random() * 80) + '%';
      el.style.top = (10 + Math.random() * 80) + '%';
      const dx = (Math.random() - 0.5) * 300;
      const dy = (Math.random() - 0.5) * 300;
      el.style.setProperty('--dx', dx + 'px');
      el.style.setProperty('--dy', dy + 'px');
      container.appendChild(el);
      setTimeout(function() { el.remove(); }, 1600);
    }, i * 50);
  }
}

// ===== SCREEN MANAGEMENT =====
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(function(s) {
    s.classList.remove('active');
    s.style.display = 'none';
  });
  const target = document.getElementById(id);
  if (target) {
    target.style.display = 'flex';
    target.classList.add('active');
  }
  if (id === 'screenLevelSelect') buildLevelSelect();
  if (id === 'screenRanking') loadRanking('global');
  if (id === 'screenGame' && !state.isAnimating) renderBoard();
}

// ===== THEME =====
function selectTheme(themeName, cardEl) {
  state.theme = themeName;
  document.body.setAttribute('data-theme', themeName);
  document.querySelectorAll('.theme-card').forEach(function(c) {
    c.classList.remove('active');
    const badge = c.querySelector('.theme-badge');
    if (badge) badge.remove();
  });
  cardEl.classList.add('active');
  const badge = document.createElement('div');
  badge.className = 'theme-badge'; badge.textContent = '✓ Ativo';
  cardEl.appendChild(badge);
  localStorage.setItem('recyclo_theme', themeName);
}

function cycleTheme() {
  const themes = Object.keys(THEMES);
  const idx = themes.indexOf(state.theme);
  const next = themes[(idx + 1) % themes.length];
  document.body.setAttribute('data-theme', next);
  state.theme = next;
  document.getElementById('themeToggle').textContent = THEMES[next].bg + ' Tema';
}

// ===== LIVES =====
function renderLives() {
  const container = document.getElementById('livesDisplay');
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < 4; i++) {
    const icon = document.createElement('span');
    // FIX #3: corrected className with conditional
    icon.className = 'life-icon' + (i >= state.lives ? ' lost' : '');
    icon.textContent = '♻';
    container.appendChild(icon);
  }
}

function loseLife() {
  if (state.lives > 0) {
    state.lives--;
    renderLives();
    playSound('lifelose');
    const icons = document.querySelectorAll('.life-icon');
    if (icons[state.lives]) {
      icons[state.lives].style.animation = 'matchPop 0.4s ease forwards';
    }
  }
  if (state.lives <= 0) {
    setTimeout(function() {
      closeModals();
      document.getElementById('modalNoLives').classList.remove('hidden');
      startLifeTimer();
    }, 500);
    return false;
  }
  return true;
}

function refillLives() {
  state.lives = 4;
  renderLives();
  closeModals();
}

let lifeTimerInterval = null;
function startLifeTimer() {
  let secs = 30;
  clearInterval(lifeTimerInterval);
  lifeTimerInterval = setInterval(function() {
    secs--;
    const el = document.getElementById('lifeTimer');
    // FIX #4: corrected template string with emoji
    if (el) el.textContent = `⏰ Próxima vida em: 00:${String(secs).padStart(2,'0')}`;
    if (secs <= 0) {
      clearInterval(lifeTimerInterval);
      if (state.lives < 4) {
        state.lives++;
        renderLives();
      }
    }
  }, 1000);
}

// ===== LEVEL SELECT =====
function buildLevelSelect() {
  const grid = document.getElementById('levelGrid');
  if (!grid) return;
  grid.innerHTML = '';
  const saved = getSavedProgress();

  LEVELS.forEach(function(lvl, idx) {
    const btn = document.createElement('div');
    const isCompleted = saved.completed && saved.completed[lvl.id];
    const isCurrent = !isCompleted && (idx === 0 || (saved.completed && saved.completed[LEVELS[idx-1].id]));
    const isLocked = !isCompleted && !isCurrent;

    btn.className = 'level-btn' +
      (isCompleted ? ' completed' : '') +
      (isCurrent   ? ' current'   : '') +
      (isLocked    ? ' locked'    : '');

    let stars = '';
    if (isCompleted) {
      const starsEarned = saved.stars && saved.stars[lvl.id] ? saved.stars[lvl.id] : 1;
      stars = '⭐'.repeat(starsEarned);
    }

    // FIX #5: corrected innerHTML with template string
    btn.innerHTML = `
      <span class="level-num">${isLocked ? '🔒' : lvl.id}</span>
      <span class="level-stars">${stars}</span>
    `;

    if (!isLocked) {
      btn.onclick = function() { startLevel(lvl.id); };
    }
    grid.appendChild(btn);
  });
}

// ===== GAME START =====
function startLevel(levelId) {
  if (!audioCtx) initAudio();

  const lvlData = LEVELS.find(function(l) { return l.id === levelId; });
  if (!lvlData) return;

  state.currentLevel = lvlData;
  state.score = 0;
  state.moves = lvlData.moves;
  state.combo = 0;
  state.selectedTile = null;
  state.isAnimating = false;
  state.isPaused = false;
  state.activeBooster = null;
  state.objectives = Object.assign({}, lvlData.objective);
  state.level = levelId;

  document.querySelectorAll('.booster-btn').forEach(function(b) { b.classList.remove('active'); });

  generateBoard(lvlData.typesCount, lvlData.special);
  showScreen('screenGame');
  renderBoard();
  updateUI();
  renderLives();
  renderObjectives();
  initParticleCanvas();
}

// ===== BOARD GENERATION =====
function generateBoard(typesCount, hasSpecial) {
  const types = TILE_TYPES.slice(0, typesCount).map(function(t) { return t.id; });
  let board;
  do {
    board = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      board[r] = [];
      for (let c = 0; c < BOARD_SIZE; c++) {
        board[r][c] = createTile(types, r, c, board);
      }
    }
  } while (!hasValidMoves(board));
  state.board = board;
}

function createTile(types, row, col, board) {
  let t;
  do {
    t = types[Math.floor(Math.random() * types.length)];
  } while (
    (col >= 2 && board[row][col-1] && board[row][col-1].type === t && board[row][col-2] && board[row][col-2].type === t) ||
    (row >= 2 && board[row-1] && board[row-1][col] && board[row-1][col].type === t && board[row-2] && board[row-2][col] && board[row-2][col].type === t)
  );
  return { type: t, special: null, id: Math.random().toString(36).substr(2,9) };
}

function hasValidMoves(board) {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (c < BOARD_SIZE-1) {
        swapTiles(board, r, c, r, c+1);
        if (findMatches(board).length > 0) { swapTiles(board, r, c, r, c+1); return true; }
        swapTiles(board, r, c, r, c+1);
      }
      if (r < BOARD_SIZE-1) {
        swapTiles(board, r, c, r+1, c);
        if (findMatches(board).length > 0) { swapTiles(board, r, c, r+1, c); return true; }
        swapTiles(board, r, c, r+1, c);
      }
    }
  }
  return false;
}

function swapTiles(board, r1, c1, r2, c2) {
  const tmp = board[r1][c1];
  board[r1][c1] = board[r2][c2];
  board[r2][c2] = tmp;
}

// ===== RENDER BOARD =====
function renderBoard() {
  const boardEl = document.getElementById('gameBoard');
  if (!boardEl) return;
  boardEl.innerHTML = '';

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const tile = state.board[r] && state.board[r][c];
      if (!tile) continue;
      const el = createTileElement(tile, r, c);
      boardEl.appendChild(el);
    }
  }
}

function createTileElement(tile, row, col) {
  const el = document.createElement('div');
  el.className = 'tile';
  el.setAttribute('data-type', tile.type);
  el.setAttribute('data-row', row);
  el.setAttribute('data-col', col);
  if (tile.special) el.classList.add(`special-${tile.special}`);

  const typeData = TILE_TYPES.find(function(t) { return t.id === tile.type; });
  el.textContent = typeData ? typeData.emoji : '♻';

  el.addEventListener('click', function() { handleTileClick(row, col); });
  el.addEventListener('touchstart', function(e) { e.preventDefault(); handleTileClick(row, col); }, { passive: false });
  el.addEventListener('mousedown', function(e) { startDrag(e, row, col); });

  return el;
}

function getTileElement(row, col) {
  // FIX #6: corrected querySelector with proper template string
  return document.querySelector(`.tile[data-row="${row}"][data-col="${col}"]`);
}

// ===== DRAG SUPPORT =====
let dragStart = null;

function startDrag(e, row, col) {
  dragStart = { row: row, col: col, x: e.clientX, y: e.clientY };
  const onUp = function(ev) {
    if (!dragStart) return;
    const dx = ev.clientX - dragStart.x;
    const dy = ev.clientY - dragStart.y;
    const threshold = 20;
    if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
      let tr = dragStart.row, tc = dragStart.col;
      if (Math.abs(dx) > Math.abs(dy)) {
        tc += dx > 0 ? 1 : -1;
      } else {
        tr += dy > 0 ? 1 : -1;
      }
      if (tr >= 0 && tr < BOARD_SIZE && tc >= 0 && tc < BOARD_SIZE) {
        attemptSwap(dragStart.row, dragStart.col, tr, tc);
      }
    }
    dragStart = null;
    document.removeEventListener('mouseup', onUp);
  };
  document.addEventListener('mouseup', onUp);
}

// ===== TILE CLICK =====
function handleTileClick(row, col) {
  if (state.isAnimating || state.isPaused) return;
  if (state.lives <= 0) { document.getElementById('modalNoLives').classList.remove('hidden'); return; }
  if (!audioCtx) initAudio();

  if (state.activeBooster === 'bomb') {
    activateBombAt(row, col);
    state.activeBooster = null;
    document.querySelectorAll('.booster-btn').forEach(function(b) { b.classList.remove('active'); });
    return;
  }
  if (state.activeBooster === 'rainbow') {
    activateRainbowAt(row, col);
    state.activeBooster = null;
    document.querySelectorAll('.booster-btn').forEach(function(b) { b.classList.remove('active'); });
    return;
  }

  if (!state.selectedTile) {
    state.selectedTile = { row: row, col: col };
    const el = getTileElement(row, col);
    if (el) el.classList.add('selected');
    playSound('select');
  } else {
    const prev = state.selectedTile;
    state.selectedTile = null;
    const prevEl = getTileElement(prev.row, prev.col);
    if (prevEl) prevEl.classList.remove('selected');

    const dr = Math.abs(row - prev.row);
    const dc = Math.abs(col - prev.col);

    if (dr + dc === 1) {
      attemptSwap(prev.row, prev.col, row, col);
    } else if (row === prev.row && col === prev.col) {
      // Deselect — do nothing
    } else {
      state.selectedTile = { row: row, col: col };
      const el = getTileElement(row, col);
      if (el) el.classList.add('selected');
      playSound('select');
    }
  }
}

// ===== SWAP =====
async function attemptSwap(r1, c1, r2, c2) {
  if (state.isAnimating) return;
  state.isAnimating = true;
  playSound('swap');

  animateSwap(r1, c1, r2, c2);
  await delay(270);

  swapTiles(state.board, r1, c1, r2, c2);
  const matches = findMatches(state.board);

  if (matches.length === 0) {
    swapTiles(state.board, r1, c1, r2, c2);
    animateInvalidSwap(r1, c1, r2, c2);
    playSound('noMatch');
    await delay(300);
    state.isAnimating = false;
    renderBoard();
    return;
  }

  state.moves--;
  state.combo = 0;
  updateUI();
  renderBoard();

  await processMatches(matches);
  state.isAnimating = false;
  checkEndConditions();
}

function animateSwap(r1, c1, r2, c2) {
  const e1 = getTileElement(r1, c1);
  const e2 = getTileElement(r2, c2);
  if (!e1 || !e2) return;

  if (c2 > c1)      { e1.classList.add('swap-right'); e2.classList.add('swap-left');  }
  else if (c2 < c1) { e1.classList.add('swap-left');  e2.classList.add('swap-right'); }
  else if (r2 > r1) { e1.classList.add('swap-down');  e2.classList.add('swap-up');    }
  else              { e1.classList.add('swap-up');     e2.classList.add('swap-down');  }
}

function animateInvalidSwap(r1, c1, r2, c2) {
  const e1 = getTileElement(r1, c1);
  const e2 = getTileElement(r2, c2);
  if (e1) { e1.style.animation = 'none'; e1.offsetHeight; e1.style.animation = ''; e1.classList.add('hint'); setTimeout(function() { e1.classList.remove('hint'); }, 600); }
  if (e2) { e2.style.animation = 'none'; e2.offsetHeight; e2.style.animation = ''; e2.classList.add('hint'); setTimeout(function() { e2.classList.remove('hint'); }, 600); }
}

// ===== MATCH DETECTION =====
function findMatches(board) {
  const matched = new Set();

  // Horizontal
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE - 2; c++) {
      const t = board[r][c] && board[r][c].type;
      if (!t) continue;
      let len = 1;
      while (c + len < BOARD_SIZE && board[r][c+len] && board[r][c+len].type === t) len++;
      if (len >= 3) {
        for (let i = 0; i < len; i++) matched.add(`${r},${c+i}`);
      }
    }
  }

  // Vertical
  for (let c = 0; c < BOARD_SIZE; c++) {
    for (let r = 0; r < BOARD_SIZE - 2; r++) {
      const t = board[r][c] && board[r][c].type;
      if (!t) continue;
      let len = 1;
      while (r + len < BOARD_SIZE && board[r+len][c] && board[r+len][c].type === t) len++;
      if (len >= 3) {
        for (let i = 0; i < len; i++) matched.add(`${r+i},${c}`);
      }
    }
  }

  return [...matched].map(function(key) {
    const parts = key.split(',');
    return { r: Number(parts[0]), c: Number(parts[1]) };
  });
}

// ===== PROCESS MATCHES =====
async function processMatches(matches) {
  if (matches.length === 0) return;

  state.combo++;
  const comboBonus = Math.min(state.combo, 8);

  const specialMatches = matches.filter(function(m) {
    return state.board[m.r] && state.board[m.r][m.c] && state.board[m.r][m.c].special;
  });

  const baseScore = matches.length * 50;
  const comboScore = baseScore * comboBonus;
  const totalScore = comboScore + (matches.length >= 5 ? 500 : matches.length >= 4 ? 200 : 0);

  addScore(totalScore);

  matches.forEach(function(m) {
    const tile = state.board[m.r] && state.board[m.r][m.c];
    if (tile && state.objectives[tile.type] !== undefined) {
      state.objectives[tile.type] = Math.max(0, state.objectives[tile.type] - 1);
    }
  });

  if (matches.length >= 5)      playSound('match5');
  else if (matches.length >= 4) playSound('match4');
  else                          playSound('match3');

  if (state.combo >= 3) {
    playSound('combo');
    showComboExplosion(state.combo);
  }

  const potentialSpecials = [];
  if (matches.length >= 5) {
    potentialSpecials.push({ type: 'rainbow', pos: matches[2] });
  } else if (matches.length === 4) {
    const isHoriz = matches[0].r === matches[1].r;
    potentialSpecials.push({ type: isHoriz ? 'line-h' : 'line-v', pos: matches[1] });
  } else if (matches.length >= 6 && state.currentLevel && state.currentLevel.special) {
    potentialSpecials.push({ type: 'bomb', pos: matches[0] });
  }

  matches.forEach(function(m) {
    const el = getTileElement(m.r, m.c);
    if (el) {
      el.classList.add('matched');
      const tileData = state.board[m.r] && state.board[m.r][m.c];
      const typeData = tileData ? TILE_TYPES.find(function(t) { return t.id === tileData.type; }) : null;
      const themeData = THEMES[state.theme] || THEMES.forest;
      spawnParticles(m.c, m.r, typeData ? typeData.emoji : themeData.particle, 6);
      const rect = el.getBoundingClientRect();
      showFloatingScore(
        `+${Math.floor(50 * comboBonus)}`,
        rect.left + rect.width/2,
        rect.top,
        state.combo >= 3 ? 'combo' : 'normal'
      );
    }
  });

  for (let i = 0; i < specialMatches.length; i++) {
    await triggerSpecialTile(specialMatches[i].r, specialMatches[i].c);
  }

  await delay(380);

  matches.forEach(function(m) {
    state.board[m.r][m.c] = null;
  });

  const types = TILE_TYPES.slice(0, state.currentLevel ? state.currentLevel.typesCount : 5).map(function(t) { return t.id; });
  for (let i = 0; i < potentialSpecials.length; i++) {
    const ps = potentialSpecials[i];
    if (state.board[ps.pos.r][ps.pos.c] === null) {
      state.board[ps.pos.r][ps.pos.c] = {
        type: types[Math.floor(Math.random() * types.length)],
        special: ps.type,
        id: Math.random().toString(36).substr(2,9),
      };
      playSound('special');
    }
  }

  renderBoard();
  await delay(50);

  await applyGravity();
  await delay(200);

  renderBoard();
  await delay(100);

  const newMatches = findMatches(state.board);
  if (newMatches.length > 0) {
    await processMatches(newMatches);
  } else {
    state.combo = 0;
    updateCombo();
    if (!hasValidMoves(state.board)) {
      shuffleBoard();
    }
  }

  renderObjectives();
  updateUI();
}

async function triggerSpecialTile(r, c) {
  const tile = state.board[r] && state.board[r][c];
  if (!tile || !tile.special) return;

  if (tile.special === 'bomb') {
    playSound('bomb');
    const toRemove = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r+dr, nc = c+dc;
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
          toRemove.push({ r: nr, c: nc });
        }
      }
    }
    toRemove.forEach(function(pos) {
      spawnParticles(pos.c, pos.r, '💥', 5);
      if (state.board[pos.r][pos.c]) state.board[pos.r][pos.c] = null;
    });
    addScore(toRemove.length * 30);
  }
  else if (tile.special === 'rainbow') {
    playSound('rainbow');
    const types = TILE_TYPES.slice(0, state.currentLevel ? state.currentLevel.typesCount : 5).map(function(t) { return t.id; });
    const targetType = types[Math.floor(Math.random() * types.length)];
    let count = 0;
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (state.board[row][col] && state.board[row][col].type === targetType) {
          const td = TILE_TYPES.find(function(t) { return t.id === targetType; });
          spawnParticles(col, row, td ? td.emoji : '♻', 3);
          state.board[row][col] = null;
          count++;
        }
      }
    }
    addScore(count * 80);
  }
  else if (tile.special === 'line-h') {
    playSound('special');
    for (let cc = 0; cc < BOARD_SIZE; cc++) {
      spawnParticles(cc, r, '✨', 3);
      state.board[r][cc] = null;
    }
    addScore(BOARD_SIZE * 40);
  }
  else if (tile.special === 'line-v') {
    playSound('special');
    for (let rr = 0; rr < BOARD_SIZE; rr++) {
      spawnParticles(c, rr, '✨', 3);
      state.board[rr][c] = null;
    }
    addScore(BOARD_SIZE * 40);
  }
}

// ===== GRAVITY =====
async function applyGravity() {
  const types = TILE_TYPES.slice(0, state.currentLevel ? state.currentLevel.typesCount : 5).map(function(t) { return t.id; });

  for (let c = 0; c < BOARD_SIZE; c++) {
    let emptyRow = BOARD_SIZE - 1;
    for (let r = BOARD_SIZE - 1; r >= 0; r--) {
      if (state.board[r][c] !== null) {
        if (r !== emptyRow) {
          state.board[emptyRow][c] = state.board[r][c];
          state.board[r][c] = null;
        }
        emptyRow--;
      }
    }
    for (let r = emptyRow; r >= 0; r--) {
      state.board[r][c] = {
        type: types[Math.floor(Math.random() * types.length)],
        special: null,
        id: Math.random().toString(36).substr(2,9),
      };
    }
  }

  await delay(50);
  renderBoard();
  document.querySelectorAll('.tile').forEach(function(el, idx) {
    el.classList.add('falling');
    el.style.animationDelay = (idx * 0.01) + 's';
  });
  await delay(400);
  document.querySelectorAll('.tile').forEach(function(el) {
    el.classList.remove('falling');
    el.style.animationDelay = '';
  });
}

// ===== BOOSTERS =====
function activateBooster(type) {
  if (!audioCtx) initAudio();
  if (state.activeBooster === type) {
    state.activeBooster = null;
    document.querySelectorAll('.booster-btn').forEach(function(b) { b.classList.remove('active'); });
    return;
  }
  state.activeBooster = type;
  document.querySelectorAll('.booster-btn').forEach(function(b) { b.classList.remove('active'); });

  if (type === 'time') {
    state.moves += 5;
    updateUI();
    playSound('special');
    showFloatingScore('+5 Movimentos', window.innerWidth/2, window.innerHeight/2, 'special');
    state.activeBooster = null;
    return;
  }

  const btnIds = { bomb: 'boosterBomb', rainbow: 'boosterRainbow' };
  const btnId = btnIds[type];
  if (btnId) {
    const btn = document.getElementById(btnId);
    if (btn) btn.classList.add('active');
  }
}

function activateBombAt(r, c) {
  if (state.isAnimating) return;
  state.isAnimating = true;
  playSound('bomb');

  const toRemove = [];
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      const nr = r+dr, nc = c+dc;
      if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
        toRemove.push({ r: nr, c: nc });
      }
    }
  }
  toRemove.forEach(function(pos) {
    spawnParticles(pos.c, pos.r, '💥', 4);
    state.board[pos.r][pos.c] = null;
  });
  addScore(toRemove.length * 60);

  state.moves--;
  updateUI();
  renderBoard();

  setTimeout(async function() {
    await applyGravity();
    renderBoard();
    const newMatches = findMatches(state.board);
    if (newMatches.length > 0) await processMatches(newMatches);
    state.isAnimating = false;
    checkEndConditions();
  }, 400);
}

function activateRainbowAt(r, c) {
  const tile = state.board[r] && state.board[r][c];
  if (!tile) return;
  state.isAnimating = true;
  playSound('rainbow');

  const targetType = tile.type;
  let count = 0;
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (state.board[row][col] && state.board[row][col].type === targetType) {
        const td = TILE_TYPES.find(function(t) { return t.id === targetType; });
        spawnParticles(col, row, td ? td.emoji : '♻', 4);
        state.board[row][col] = null;
        count++;
      }
    }
  }
  addScore(count * 100);
  state.moves--;
  updateUI();
  renderBoard();

  setTimeout(async function() {
    await applyGravity();
    renderBoard();
    const newMatches = findMatches(state.board);
    if (newMatches.length > 0) await processMatches(newMatches);
    state.isAnimating = false;
    checkEndConditions();
  }, 400);
}

function shuffleBoard() {
  if (state.isAnimating) return;
  playSound('special');
  showFloatingScore('🔀 Embaralhando!', window.innerWidth/2, window.innerHeight/2, 'special');

  const types = TILE_TYPES.slice(0, state.currentLevel ? state.currentLevel.typesCount : 5).map(function(t) { return t.id; });
  let attempts = 0;
  do {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const tile = state.board[r][c];
        if (tile) tile.type = types[Math.floor(Math.random() * types.length)];
      }
    }
    attempts++;
  } while (!hasValidMoves(state.board) && attempts < 50);

  renderBoard();
  document.querySelectorAll('.tile').forEach(function(el, i) {
    el.classList.add('spawning');
    el.style.animationDelay = (i * 0.01) + 's';
    setTimeout(function() { el.classList.remove('spawning'); el.style.animationDelay = ''; }, 500);
  });
}

// ===== SCORE =====
function addScore(points) {
  state.score += points;
  state.xp += Math.floor(points / 10);
  updateUI();
}

// ===== COMBO =====
function updateCombo() {
  const el = document.getElementById('comboDisplay');
  const meter = document.getElementById('comboMeter');
  // FIX #7: corrected template string
  if (el) el.textContent = `×${Math.max(1, state.combo)}`;
  if (meter) meter.style.width = Math.min(100, state.combo * 15) + '%';
}

function showComboExplosion(n) {
  const el = document.createElement('div');
  el.className = 'combo-explosion';
  // FIX #8: corrected template string with emoji and dynamic value
  el.textContent = `×${n} COMBO!`;
  document.body.appendChild(el);
  setTimeout(function() { el.remove(); }, 1100);
}

// ===== OBJECTIVES =====
function renderObjectives() {
  const el = document.getElementById('objectivesDisplay');
  if (!el) return;
  el.innerHTML = '';
  if (!state.objectives) return;
  Object.entries(state.objectives).forEach(function(entry) {
    const type = entry[0];
    const count = entry[1];
    const typeData = TILE_TYPES.find(function(t) { return t.id === type; });
    const item = document.createElement('div');
    // FIX #9: corrected className with conditional
    item.className = 'obj-item' + (count <= 0 ? ' done' : '');
    item.innerHTML = `<span>${typeData ? typeData.emoji : '♻'}</span> <span>${typeData ? typeData.label : type}</span> <span class="obj-count">${Math.max(0, count)}</span>`;
    el.appendChild(item);
  });
}

// ===== UI UPDATE =====
function updateUI() {
  const lvl = state.currentLevel;
  if (!lvl) return;

  const scoreEl = document.getElementById('scoreDisplay');
  if (scoreEl) {
    scoreEl.textContent = state.score.toLocaleString();
    scoreEl.style.animation = 'none';
    scoreEl.offsetHeight; // reflow
    scoreEl.style.animation = '';
  }

  const movesEl = document.getElementById('movesDisplay');
  if (movesEl) movesEl.textContent = state.moves;

  const levelEl = document.getElementById('levelDisplay');
  if (levelEl) levelEl.textContent = state.level;

  const target = lvl.target;
  const pct = Math.min(100, (state.score / target) * 100);
  const bar = document.getElementById('scoreBar');
  if (bar) bar.style.width = pct + '%';

  const targetEl = document.getElementById('scoreTarget');
  if (targetEl) targetEl.textContent = `Meta: ${target.toLocaleString()}`;

  const xpEl = document.getElementById('xpDisplay');
  if (xpEl) xpEl.textContent = `${state.xp} XP`;
  const xpBar = document.getElementById('xpBar');
  if (xpBar) xpBar.style.width = Math.min(100, (state.xp % 1000) / 10) + '%';

  updateCombo();
}

// ===== PAUSE =====
function pauseGame() {
  state.isPaused = true;
  document.getElementById('modalPause').classList.remove('hidden');
}

function resumeGame() {
  state.isPaused = false;
  closeModals();
}

function closeModals() {
  document.querySelectorAll('.modal-overlay').forEach(function(m) { m.classList.add('hidden'); });
}

function restartLevel() {
  closeModals();
  startLevel(state.level);
}

function nextLevel() {
  closeModals();
  const nextId = state.level + 1;
  if (nextId <= LEVELS.length) startLevel(nextId);
  else showScreen('screenLevelSelect');
}

// ===== END CONDITIONS =====
function checkEndConditions() {
  if (state.isAnimating) return;

  const lvl = state.currentLevel;
  if (!lvl) return;

  const objsDone = Object.values(state.objectives).every(function(v) { return v <= 0; });
  const scoreReached = state.score >= lvl.target;

  if (objsDone && scoreReached) {
    setTimeout(function() { showWin(); }, 300);
    return;
  }

  if (state.moves <= 0) {
    if (objsDone && state.score >= lvl.target * 0.5) {
      showWin();
    } else {
      showLose();
    }
  }
}

function showWin() {
  playSound('win');
  launchSparkles(50);

  const lvl = state.currentLevel;
  const starsEl = document.getElementById('winStars');
  const stars = lvl.stars.filter(function(s) { return state.score >= s; }).length || 1;

  if (starsEl) starsEl.textContent = '⭐'.repeat(stars);

  const msgEl = document.getElementById('winMessage');
  const msgs = ['Você salvou o planeta! 🌍', 'Incrível reciclador! ♻', 'O planeta agradece! 🌿'];
  if (msgEl) msgEl.textContent = msgs[stars - 1] || msgs[0];

  const scoreEl = document.getElementById('winScore');
  if (scoreEl) scoreEl.textContent = state.score.toLocaleString() + ' pts';

  saveProgress(state.level, stars, state.score);
  document.getElementById('modalWin').classList.remove('hidden');
}

function showLose() {
  playSound('lose');
  loseLife();

  const scoreEl = document.getElementById('loseScore');
  if (scoreEl) scoreEl.textContent = state.score.toLocaleString() + ' pts';

  const msgEl = document.getElementById('loseMessage');
  const msgs = [
    'Continue tentando, o planeta conta com você!',
    'Sem desistir! A reciclagem precisa de você!',
    'Mais uma tentativa!'
  ];
  if (msgEl) msgEl.textContent = msgs[Math.floor(Math.random() * msgs.length)];

  if (state.lives > 0) {
    document.getElementById('modalLose').classList.remove('hidden');
  }
}

// ===== SAVE/LOAD =====
function getSavedProgress() {
  try {
    return JSON.parse(localStorage.getItem('recyclo_progress') || '{}');
  } catch(e) { return {}; }
}

function saveProgress(levelId, stars, score) {
  const data = getSavedProgress();
  if (!data.completed) data.completed = {};
  if (!data.stars) data.stars = {};
  if (!data.scores) data.scores = {};
  data.completed[levelId] = true;
  data.stars[levelId] = Math.max(data.stars[levelId] || 0, stars);
  data.scores[levelId] = Math.max(data.scores[levelId] || 0, score);
  localStorage.setItem('recyclo_progress', JSON.stringify(data));
}

// ===== RANKING =====
const RANKING_KEY = 'recyclo_ranking_v2';

function getLocalRanking(tab) {
  tab = tab || 'global';
  try {
    const all = JSON.parse(localStorage.getItem(RANKING_KEY) || '[]');
    const now = Date.now();
    if (tab === 'weekly') return all.filter(function(e) { return now - e.ts < 7*24*3600*1000; });
    if (tab === 'daily')  return all.filter(function(e) { return now - e.ts < 24*3600*1000; });
    return all;
  } catch(e) { return []; }
}

function addToRanking(name, score, level) {
  try {
    const all = JSON.parse(localStorage.getItem(RANKING_KEY) || '[]');
    all.push({ name: name, score: score, level: level, ts: Date.now() });
    all.sort(function(a, b) { return b.score - a.score; });
    localStorage.setItem(RANKING_KEY, JSON.stringify(all.slice(0, 100)));
  } catch(e) {}
}

function loadRanking(tab) {
  tab = tab || 'global';
  const list = document.getElementById('rankingList');
  if (!list) return;

  let entries = getLocalRanking(tab);

  if (entries.length < 5) {
    const seeds = [
      { name: '🌿 EcoWarrior',   score: 28500, level: 12, ts: Date.now() - 3600000 },
      { name: '♻ RecycloMaster', score: 24200, level: 10, ts: Date.now() - 7200000 },
      { name: '🌱 GreenStar',    score: 19800, level: 9,  ts: Date.now() - 10800000 },
      { name: '🌊 OceanHero',    score: 15600, level: 8,  ts: Date.now() - 14400000 },
      { name: '🌍 EarthGuard',   score: 12300, level: 7,  ts: Date.now() - 18000000 },
      { name: '🍃 LeafChamp',    score: 9800,  level: 6,  ts: Date.now() - 86400000 },
      { name: '☀️ SolarKing',    score: 7500,  level: 5,  ts: Date.now() - 90000000 },
      { name: '🔋 EnergyAce',    score: 5200,  level: 4,  ts: Date.now() - 172800000 },
    ];
    seeds.forEach(function(s) {
      if (!entries.find(function(e) { return e.name === s.name; })) {
        addToRanking(s.name, s.score, s.level);
      }
    });
    entries = getLocalRanking(tab);
  }

  entries.sort(function(a, b) { return b.score - a.score; });
  const medals = ['🥇', '🥈', '🥉'];
  list.innerHTML = '';

  if (entries.length === 0) {
    list.innerHTML = '<div class="rank-loading">Nenhuma pontuação ainda. Seja o primeiro!</div>';
    return;
  }

  entries.slice(0, 20).forEach(function(entry, idx) {
    const item = document.createElement('div');
    item.className = 'rank-item' +
      (idx === 0 ? ' top1' : idx === 1 ? ' top2' : idx === 2 ? ' top3' : '');
    item.innerHTML = `
      <span class="rank-pos">${medals[idx] || '#' + (idx+1)}</span>
      <div>
        <div class="rank-name">${entry.name}</div>
        <div class="rank-level">Nível ${entry.level || 1}</div>
      </div>
      <span class="rank-score">${entry.score.toLocaleString()}</span>
    `;
    list.appendChild(item);
  });
}

function switchRankTab(tab, el) {
  document.querySelectorAll('.rank-tab').forEach(function(t) { t.classList.remove('active'); });
  el.classList.add('active');
  loadRanking(tab);
}

function submitScore() {
  const nameEl = document.getElementById('rankName');
  const name = nameEl ? nameEl.value.trim() : '';
  if (!name) { alert('Por favor, insira seu nome!'); return; }
  if (state.score === 0) { alert('Jogue primeiro para ter uma pontuação!'); return; }

  addToRanking(name, state.score, state.level);
  state.playerName = name;
  loadRanking('global');

  const btn = document.querySelector('.ranking-form button');
  if (btn) {
    btn.textContent = '✓ Enviado!';
    setTimeout(function() { btn.textContent = '📤 Enviar Minha Pontuação'; }, 2000);
  }
}

// ===== UTILS =====
function delay(ms) {
  return new Promise(function(res) { setTimeout(res, ms); });
}

// ===== INIT =====
function init() {
  const savedTheme = localStorage.getItem('recyclo_theme') || 'forest';
  state.theme = savedTheme;
  document.body.setAttribute('data-theme', savedTheme);

  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', cycleTheme);
    themeToggle.textContent = (THEMES[savedTheme] ? THEMES[savedTheme].bg : '🌿') + ' Tema';
  }

  let touchStartPos = null;
  const gameBoard = document.getElementById('gameBoard');
  if (gameBoard) {
    gameBoard.addEventListener('touchstart', function(e) {
      const t = e.touches[0];
      touchStartPos = { x: t.clientX, y: t.clientY };
    }, { passive: true });

    gameBoard.addEventListener('touchend', function(e) {
      if (!touchStartPos) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartPos.x;
      const dy = t.clientY - touchStartPos.y;
      const threshold = 25;

      if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

      if (state.selectedTile) {
        const row = state.selectedTile.row;
        const col = state.selectedTile.col;
        let tr = row, tc = col;
        if (Math.abs(dx) > Math.abs(dy)) tc += dx > 0 ? 1 : -1;
        else tr += dy > 0 ? 1 : -1;

        if (tr >= 0 && tr < BOARD_SIZE && tc >= 0 && tc < BOARD_SIZE) {
          const prevEl = getTileElement(row, col);
          if (prevEl) prevEl.classList.remove('selected');
          state.selectedTile = null;
          attemptSwap(row, col, tr, tc);
        }
      }
      touchStartPos = null;
    }, { passive: true });
  }

  showScreen('screenMenu');

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeModals();
      const screenGame = document.getElementById('screenGame');
      if (screenGame && screenGame.classList.contains('active') && !state.isPaused) {
        pauseGame();
      }
    }
    if (e.key === 'p' || e.key === 'P') {
      const screenGame = document.getElementById('screenGame');
      if (screenGame && screenGame.classList.contains('active')) {
        state.isPaused ? resumeGame() : pauseGame();
      }
    }
  });

  console.log('♻ ReCyclo Crush iniciado! Salve o planeta! 🌍');
}

// Start!
document.addEventListener('DOMContentLoaded', init);