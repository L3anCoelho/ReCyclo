/* ============================================================
   RECATCH – game1.js  (REFATORADO – Sistema de Sprites PNG)
   ============================================================ */

'use strict';

// ── BASE PATH ─────────────────────────────────────────────
const BASE_PATH = 'recyclo sprites/';

// ── CANVAS & CONTEXT ──────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
let W = 0, H = 0;

function resize() {
  W = canvas.width  = canvas.offsetWidth  || window.innerWidth;
  H = canvas.height = canvas.offsetHeight || window.innerHeight;
  if (gameRunning) drawBg();
}
window.addEventListener('resize', resize);

// ── DATA ──────────────────────────────────────────────────
const TYPES = {
  1: { name:'Papel',    color:'#4aaeff', darkBg:'#0a2040', key:'1', colorKey:'azul',     label:'PAPEL'    },
  2: { name:'Plástico', color:'#ff5544', darkBg:'#3a0a0a', key:'2', colorKey:'vermelho', label:'PLÁSTICO' },
  3: { name:'Vidro',    color:'#44dd88', darkBg:'#0a2a18', key:'3', colorKey:'verde',    label:'VIDRO'    },
  4: { name:'Metal',    color:'#ffcc44', darkBg:'#2a1a00', key:'4', colorKey:'amarelo',  label:'METAL'    },
};

// Mapeamento hazards → sprite filename
const HAZARD_DEFS = [
  { file:'agulha',   label:'Lixo Hospitalar',  tip:'Lixo hospitalar requer descarte seguro específico!'              },
  { file:'bateria',  label:'Bateria',           tip:'Baterias de lítio são lixo eletrônico especial!'               },
  { file:'casca',    label:'Orgânico',          tip:'Cascas de frutas são lixo orgânico, não reciclável!'           },
  { file:'celular',  label:'Eletrônico',        tip:'Eletrônicos têm pontos de coleta específicos (e-waste)!'       },
  { file:'coxa',     label:'Resto de Comida',   tip:'Restos de comida vão para o lixo orgânico!'                   },
  { file:'lampada',  label:'Lâmpada',           tip:'Lâmpadas têm descarte especial – não vão no lixo comum!'      },
  { file:'maça',     label:'Orgânico',          tip:'Lixo orgânico vai para o lixo comum ou compostagem!'          },
  { file:'pilha',    label:'Pilha/Bateria',     tip:'Pilhas e baterias têm pontos de descarte especial!'           },
  { file:'pizza',    label:'Comida',            tip:'Alimentos contaminam a reciclagem – descarte no lixo comum!'  },
  { file:'remedio',  label:'Medicamentos',      tip:'Medicamentos vencidos têm postos de coleta nas farmácias!'    },
  { file:'tv',       label:'Eletrônico',        tip:'Monitores e notebooks têm descarte eletrônico especial!'      },
];

const POWERUP_DEFS = [
  { type:'slowmotion', color:'#9988ff', label:'Slow Motion' },
  { type:'ima',        color:'#ff8844', label:'Ímão'        },
  { type:'escudo',     color:'#44ccff', label:'Escudo'      },
];

const TIPS = [
  '💡 Papel deve estar limpo e seco para ser reciclado!',
  '💡 Plásticos com símbolo ♻ são recicláveis!',
  '💡 Vidro pode ser reciclado infinitas vezes!',
  '💡 Latas de alumínio são 100% recicláveis!',
  '💡 Óleos de cozinha NÃO vão na reciclagem.',
  '💡 Caixa de leite (Tetra Pak) é reciclável!',
  '💡 Papelão molhado ou engordurado não pode ser reciclado.',
  '💡 Isopor tem coleta especial em muitas cidades.',
  '💡 Separar o lixo corretamente salva energia e água!',
  '💡 Reciclar 1 kg de alumínio poupa até 5 kg de minério!',
];

const COMBO_MSGS = ['BOM!', 'ÓTIMO!', 'INCRÍVEL!', 'FANTÁSTICO!', 'LENDÁRIO!'];

// ── SPRITE SYSTEM ─────────────────────────────────────────
const SPRITES = {
  itens: {
    azul:     [],
    vermelho: [],
    verde:    [],
    amarelo:  [],
  },
  hazard: [],
  player: {
    azul:     {},
    vermelho: {},
    verde:    {},
    amarelo:  {},
  },
  efeitos: {},
  powerups: {},
};

/**
 * Carrega uma imagem e retorna o objeto Image.
 * Loga OK ou ERRO no console.
 */
function loadImage(src) {
  const img = new Image();
  img.onload  = () => console.log('OK:', src);
  img.onerror = () => console.error('ERRO ao carregar sprite:', src);
  img.src = src;
  return img;
}

/**
 * Verifica se um sprite está pronto para ser desenhado.
 */
function isSpriteReady(img) {
  return img && img.complete && img.naturalWidth > 0;
}

/**
 * Carrega todos os sprites do jogo.
 * DEVE ser chamado PRIMEIRO, antes de resize() e computeHeights().
 */
function loadAllSprites() {
  console.log('=== Iniciando carregamento de sprites ===');

  // ── ITENS RECICLÁVEIS ─────────────────────────────────
  // Azul (Papel)
  for (let i = 1; i <= 4; i++) {
    SPRITES.itens.azul.push(loadImage(BASE_PATH + 'objAZUL/azul' + i + '.png'));
  }
  // Vermelho (Plástico)
  for (let i = 1; i <= 4; i++) {
    SPRITES.itens.vermelho.push(loadImage(BASE_PATH + 'objVERMELHO/vermelho' + i + '.png'));
  }
  // Verde (Vidro)
  for (let i = 1; i <= 4; i++) {
    SPRITES.itens.verde.push(loadImage(BASE_PATH + 'objVERDE/verde' + i + '.png'));
  }
  // Amarelo (Metal)
  for (let i = 1; i <= 4; i++) {
    SPRITES.itens.amarelo.push(loadImage(BASE_PATH + 'objAMARELO/amarelo' + i + '.png'));
  }

  // ── HAZARDS (Não recicláveis) ─────────────────────────
  HAZARD_DEFS.forEach(def => {
    SPRITES.hazard.push(loadImage(BASE_PATH + 'NAORECICLAVEIS/' + def.file + '.png'));
  });

  // ── PLAYER (Recyclinho) ───────────────────────────────
  SPRITES.player.azul = {
    dir:  loadImage(BASE_PATH + 'recyclinhoazul/AZULdir.png'),
    esq:  loadImage(BASE_PATH + 'recyclinhoazul/AZULesq.png'),
    idle: loadImage(BASE_PATH + 'recyclinhoazul/AZULidle.png'),
    stop: loadImage(BASE_PATH + 'recyclinhoazul/AZULstop.png'),
  };
  SPRITES.player.vermelho = {
    dir:  loadImage(BASE_PATH + 'recyclinhovermelho/VERMELHOdir.png'),
    esq:  loadImage(BASE_PATH + 'recyclinhovermelho/VERMELHOesq.png'),
    idle: loadImage(BASE_PATH + 'recyclinhovermelho/VERMELHOidle.png'),
    stop: loadImage(BASE_PATH + 'recyclinhovermelho/VERMELHOstop.png'),
  };
  SPRITES.player.verde = {
    dir:  loadImage(BASE_PATH + 'recyclinhoverde/VERDEdir.png'),
    esq:  loadImage(BASE_PATH + 'recyclinhoverde/VERDEesq.png'),
    idle: loadImage(BASE_PATH + 'recyclinhoverde/VERDEidle.png'),
    stop: loadImage(BASE_PATH + 'recyclinhoverde/VERDEstop.png'),
  };
  SPRITES.player.amarelo = {
    dir:  loadImage(BASE_PATH + 'recyclinhoamarelo/AMARELOdir.png'),
    esq:  loadImage(BASE_PATH + 'recyclinhoamarelo/AMARELOesq.png'),
    idle: loadImage(BASE_PATH + 'recyclinhoamarelo/AMARELOidle.png'),
    stop: loadImage(BASE_PATH + 'recyclinhoamarelo/AMARELOstop.png'),
  };

  // ── EFEITOS ───────────────────────────────────────────
  SPRITES.efeitos.acerto = loadImage(BASE_PATH + 'EFEITOS/acerto.png');
  SPRITES.efeitos.combo  = loadImage(BASE_PATH + 'EFEITOS/combo.png');
  SPRITES.efeitos.erro   = loadImage(BASE_PATH + 'EFEITOS/erro.png');
  SPRITES.efeitos.perigo = loadImage(BASE_PATH + 'EFEITOS/perigo.png');

  // ── POWERUPS ──────────────────────────────────────────
  SPRITES.powerups.slowmotion = loadImage(BASE_PATH + 'POWEUPS/slowmotion.png');
  SPRITES.powerups.escudo     = loadImage(BASE_PATH + 'POWEUPS/escudo.png');
  SPRITES.powerups.ima        = loadImage(BASE_PATH + 'POWEUPS/ima.png');
  SPRITES.powerups.automatch  = loadImage(BASE_PATH + 'POWEUPS/automatch.png');

  console.log('=== Sprites enviados para carregamento ===');
}

/**
 * Desenha um placeholder de debug quando o sprite não carrega.
 * Quadrado vermelho com X – NUNCA invisível.
 */
function drawMissingSprite(x, y, size) {
  const half = size / 2;
  ctx.save();
  ctx.fillStyle = '#cc0000';
  ctx.fillRect(x - half, y - half, size, size);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - half + 4, y - half + 4);
  ctx.lineTo(x + half - 4, y + half - 4);
  ctx.moveTo(x + half - 4, y - half + 4);
  ctx.lineTo(x - half + 4, y + half - 4);
  ctx.stroke();
  ctx.restore();
}

// ── STATE ─────────────────────────────────────────────────
let score       = 0;
let combo       = 0;
let lives       = 3;
let level       = 1;
let phase       = 1;
let currentType = 1;
let frameCount  = 0;
let lastSpawn   = 0;
let lastPwSpawn = 0;
let gameRunning = false;
let gameOver    = false;

let slowActive   = false; let slowTimer   = 0; const SLOW_MAX   = 300;
let magnetActive = false; let magnetTimer = 0; const MAGNET_MAX = 320;
let shieldActive = false; let shieldTimer = 0; const SHIELD_MAX = 400;

let items    = [];
let parts    = [];
let powerups = [];

// ── PLAYER ───────────────────────────────────────────────
let playerX         = 0;
let playerY         = 0;
let moveLeft        = false;
let moveRight       = false;
let playerSpeed     = 5.5;
let playerDirection = 'idle'; // 'esq' | 'dir' | 'idle' | 'stop'

// ── AUDIO (Web Audio API – 8-bit synth) ──────────────────
let audioCtx = null;

function getAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){}
  }
  return audioCtx;
}

function playBeep(freq, type, dur, vol=0.18, detune=0) {
  const ac = getAudio(); if (!ac) return;
  try {
    const osc  = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, ac.currentTime);
    osc.detune.setValueAtTime(detune, ac.currentTime);
    gain.gain.setValueAtTime(vol, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    osc.connect(gain); gain.connect(ac.destination);
    osc.start(); osc.stop(ac.currentTime + dur);
  } catch(e){}
}

function sfxCorrect(mult) {
  const base = 440 + mult * 80;
  playBeep(base,      'square',    0.12, 0.15);
  playBeep(base*1.25, 'square',    0.10, 0.12, 50);
  playBeep(base*1.5,  'triangle', 0.14, 0.10);
}

function sfxError() {
  playBeep(120, 'sawtooth', 0.18, 0.2);
  playBeep(100, 'sawtooth', 0.22, 0.18, -20);
}

function sfxPowerup() {
  [660,880,1100].forEach((f,i) => setTimeout(() => playBeep(f,'square',0.12,0.12), i*60));
}

function sfxCombo(c) {
  const freqs = [440,550,660,770,880];
  const f = freqs[Math.min(c-2, freqs.length-1)];
  playBeep(f, 'square', 0.18, 0.18);
  setTimeout(() => playBeep(f*1.25, 'triangle', 0.14, 0.14), 80);
}

function sfxLevelUp() {
  [440,550,660,880,1100].forEach((f,i) => setTimeout(()=>playBeep(f,'square',0.15,0.14),i*80));
}

// ── HELPERS ───────────────────────────────────────────────
function rand(a, b)  { return a + Math.random() * (b - a); }
function randi(a, b) { return Math.floor(rand(a, b + 1)); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function speedMult()     { return slowActive ? 0.38 : 1; }
function baseItemSpeed() { return 1.8 + level * 0.28 + phase * 0.14; }
function spawnRate()     { return Math.max(22, 90 - level * 7 - phase * 3); }

// ── PLAYER COLOR KEY ──────────────────────────────────────
function getPlayerColorKey() {
  switch (currentType) {
    case 1: return 'azul';
    case 2: return 'vermelho';
    case 3: return 'verde';
    case 4: return 'amarelo';
    default: return 'azul';
  }
}

// ── SPAWN ─────────────────────────────────────────────────
function spawnItem() {
  const hazardChance = 0.20 + level * 0.012 + phase * 0.01;
  const isHazard     = Math.random() < hazardChance;

  if (isHazard) {
    // Verificação de segurança
    if (SPRITES.hazard.length === 0) {
      console.error('SPRITES.hazard está vazio! Sprites não carregaram.');
      return;
    }
    const idx    = randi(0, HAZARD_DEFS.length - 1);
    const def    = HAZARD_DEFS[idx];
    const sprite = SPRITES.hazard[idx];

    items.push({
      x:      rand(28, W - 28),
      y:      -48,
      vy:     baseItemSpeed() + rand(0, 1.2),
      sprite,
      type:   0,
      label:  def.label,
      tip:    def.tip,
      size:   40,
      wobble: rand(0, Math.PI * 2),
    });

  } else {
    const t      = randi(1, 4);
    const cfg    = TYPES[t];
    const ck     = cfg.colorKey;
    const arr    = SPRITES.itens[ck];

    if (!arr || arr.length === 0) {
      console.error('Array de sprites vazio para tipo:', t, ck);
      return;
    }

    const sprite = arr[randi(0, arr.length - 1)];

    items.push({
      x:      rand(28, W - 28),
      y:      -48,
      vy:     baseItemSpeed() + rand(0, 1.0),
      sprite,
      type:   t,
      color:  cfg.color,
      label:  cfg.label,
      size:   40,
      wobble: rand(0, Math.PI * 2),
    });
  }
}

function spawnPowerup() {
  const pw = POWERUP_DEFS[randi(0, POWERUP_DEFS.length - 1)];
  const sprite = SPRITES.powerups[pw.type];

  powerups.push({
    x:      rand(40, W - 40),
    y:      -48,
    vy:     1.2,
    type:   pw.type,
    sprite,
    color:  pw.color,
    label:  pw.label,
    wobble: rand(0, Math.PI * 2),
  });
}

// ── PARTICLES ─────────────────────────────────────────────
function addTextParticle(x, y, text, color) {
  parts.push({
    kind:  'text',
    x, y,
    vx:    rand(-1, 1),
    vy:    -2.8 - rand(0, 1.5),
    life:  1,
    color,
    text,
    size:  14,
  });
}

function addBurst(x, y, color, count = 10) {
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + rand(-0.3, 0.3);
    const speed = rand(2, 5);
    parts.push({
      kind:  'dot',
      x, y,
      vx:    Math.cos(angle) * speed,
      vy:    Math.sin(angle) * speed,
      life:  1,
      color,
      size:  rand(3, 7),
    });
  }
}

function addRing(x, y, color) {
  parts.push({ kind:'ring', x, y, r:8, life:1, color });
}

/**
 * Partícula de efeito com sprite PNG (acerto / erro / combo / perigo).
 */
function addSpriteEffect(x, y, spriteKey, size = 56) {
  const sprite = SPRITES.efeitos[spriteKey];
  if (!sprite) return;
  parts.push({
    kind:   'sprite',
    x, y,
    vx:     0,
    vy:     -1.2,
    life:   1,
    sprite,
    size,
  });
}

// ── DRAW HELPERS ──────────────────────────────────────────
function drawRoundRect(x, y, w, h, r, fill, stroke, sw = 1) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fill)   { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = sw; ctx.stroke(); }
}

// ── PLAYER DRAW ───────────────────────────────────────────
const PLAYER_W = 64;
const PLAYER_H = 64;

function drawPlayer() {
  const colorKey  = getPlayerColorKey();
  const spriteSet = SPRITES.player[colorKey];

  if (!spriteSet) {
    drawMissingSprite(playerX, playerY, PLAYER_W);
    return;
  }

  const sprite = spriteSet[playerDirection] || spriteSet.idle;

  // Shadow
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  ctx.beginPath();
  ctx.ellipse(playerX, playerY + PLAYER_H / 2 - 4, PLAYER_W * 0.38, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (isSpriteReady(sprite)) {
    ctx.drawImage(
      sprite,
      playerX - PLAYER_W / 2,
      playerY - PLAYER_H / 2,
      PLAYER_W,
      PLAYER_H
    );
  } else {
    drawMissingSprite(playerX, playerY, PLAYER_W);
  }

  // Shield aura
  if (shieldActive) {
    const pulse = 0.55 + Math.sin(frameCount * 0.12) * 0.35;
    ctx.save();
    ctx.strokeStyle = '#44ccff';
    ctx.lineWidth = 3;
    ctx.globalAlpha = pulse;
    ctx.beginPath();
    ctx.arc(playerX, playerY, PLAYER_W * 0.62, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = pulse * 0.22;
    ctx.fillStyle = '#44ccff';
    ctx.beginPath();
    ctx.arc(playerX, playerY, PLAYER_W * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // Magnet field
  if (magnetActive) {
    const pulse = 0.3 + Math.sin(frameCount * 0.1) * 0.15;
    ctx.save();
    ctx.strokeStyle = '#ff8844';
    ctx.lineWidth = 2;
    ctx.globalAlpha = pulse;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.arc(playerX, playerY, MAGNET_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// ── ITEM DRAW ─────────────────────────────────────────────
function drawItem(item) {
  ctx.save();
  item.wobble += 0.04;
  const wx = Math.sin(item.wobble) * 3;
  const cx = item.x + wx;
  const cy = item.y;
  const half = item.size / 2;

  // Highlight for correct-type items
  if (item.type !== 0 && item.type === currentType) {
    const pulse = 0.28 + Math.sin(frameCount * 0.15) * 0.18;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = TYPES[currentType].color;
    ctx.beginPath();
    ctx.arc(cx, cy, half + 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Red danger tinge for hazards
  if (item.type === 0) {
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(cx, cy, half + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  if (isSpriteReady(item.sprite)) {
    ctx.drawImage(item.sprite, cx - half, cy - half, item.size, item.size);
  } else {
    drawMissingSprite(cx, cy, item.size);
  }

  ctx.restore();
}

// ── POWERUP DRAW ──────────────────────────────────────────
const POWERUP_SIZE = 36;

function drawPowerup(pw) {
  ctx.save();
  pw.wobble += 0.06;
  const bob  = Math.sin(pw.wobble) * 4;
  const pulse = 0.5 + Math.sin(frameCount * 0.12) * 0.3;
  const cx   = pw.x;
  const cy   = pw.y + bob;
  const half = POWERUP_SIZE / 2;

  // Glow ring
  ctx.globalAlpha = pulse;
  ctx.strokeStyle = pw.color;
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, half + 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = pulse * 0.25;
  ctx.fillStyle   = pw.color;
  ctx.beginPath();
  ctx.arc(cx, cy, half + 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  if (isSpriteReady(pw.sprite)) {
    ctx.drawImage(pw.sprite, cx - half, cy - half, POWERUP_SIZE, POWERUP_SIZE);
  } else {
    drawMissingSprite(cx, cy, POWERUP_SIZE);
  }

  // Label
  ctx.font      = '600 7px Orbitron, monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = pw.color;
  ctx.globalAlpha = 0.85;
  ctx.fillText(pw.label, cx, cy + half + 12);
  ctx.globalAlpha = 1;

  ctx.restore();
}

// ── PARTICLE DRAW ─────────────────────────────────────────
function drawParticles() {
  parts.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.life;

    if (p.kind === 'text') {
      ctx.font      = 'bold ' + p.size + 'px Orbitron, monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);

    } else if (p.kind === 'dot') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
      ctx.fill();

    } else if (p.kind === 'ring') {
      ctx.strokeStyle = p.color;
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.stroke();

    } else if (p.kind === 'sprite') {
      if (isSpriteReady(p.sprite)) {
        const half = p.size / 2;
        ctx.drawImage(p.sprite, p.x - half, p.y - half, p.size, p.size);
      }
    }

    ctx.restore();
  });
}

// ── BACKGROUND ────────────────────────────────────────────
function drawBg() {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#080c18';
  ctx.fillRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = 'rgba(30,60,100,0.22)';
  ctx.lineWidth   = 1;
  const gridSize  = 50;
  for (let x = 0; x < W; x += gridSize) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += gridSize) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // Floor glow
  const cfg    = TYPES[currentType];
  const floorY = H - 62 - TYPE_BAR_H;
  const grad   = ctx.createLinearGradient(0, floorY - 40, 0, floorY);
  grad.addColorStop(0, 'transparent');
  grad.addColorStop(1, cfg.color + '28');
  ctx.fillStyle = grad;
  ctx.fillRect(0, floorY - 40, W, 40);

  ctx.fillStyle = cfg.color + '55';
  ctx.fillRect(0, floorY, W, 3);
}

// ── HUD HEIGHTS ───────────────────────────────────────────
let HUD_H      = 64;
let TYPE_BAR_H = 62;

function computeHeights() {
  const hud  = document.getElementById('hud');
  const tb   = document.getElementById('typeBar');
  HUD_H      = hud ? hud.offsetHeight  : 64;
  TYPE_BAR_H = tb  ? tb.offsetHeight   : 62;
  playerY    = H - TYPE_BAR_H - 72;
}

// ── COLLISION ─────────────────────────────────────────────
const CATCH_W       = 38;
const CATCH_H       = 38;
const MAGNET_RADIUS = 90;

function collides(item) {
  return (
    Math.abs(item.x - playerX) < CATCH_W &&
    Math.abs(item.y - playerY) < CATCH_H
  );
}

// ── ACTIVATE POWERUP ──────────────────────────────────────
function activatePowerup(type) {
  sfxPowerup();
  if (type === 'slowmotion') {
    slowActive = true; slowTimer = SLOW_MAX;
    showMsg('⏳ SLOW MOTION!', '#9988ff');
  } else if (type === 'ima') {
    magnetActive = true; magnetTimer = MAGNET_MAX;
    showMsg('🧲 ÍMÃO ATIVADO!', '#ff8844');
  } else if (type === 'escudo') {
    shieldActive = true; shieldTimer = SHIELD_MAX;
    showMsg('🛡 ESCUDO ATIVO!', '#44ccff');
  }
  updatePowerBar();
}

// ── UI UPDATES ────────────────────────────────────────────
function updateHUD() {
  document.getElementById('scoreEl').textContent = score;
  document.getElementById('comboEl').textContent = 'x' + Math.max(1, combo);
  document.getElementById('levelEl').textContent = level;
  document.getElementById('phaseEl').textContent = phase;

  const h = lives <= 0
    ? '💀'
    : '❤'.repeat(lives) + (lives < 3 ? '🖤'.repeat(3 - lives) : '');
  document.getElementById('livesEl').textContent = h;
}

function updatePowerBar() {
  const configs = [
    { id:'pw-slow',   active: slowActive,   t: slowTimer,   max: SLOW_MAX,   tid:'timer-slow'   },
    { id:'pw-mag',    active: magnetActive,  t: magnetTimer, max: MAGNET_MAX, tid:'timer-mag'    },
    { id:'pw-shield', active: shieldActive,  t: shieldTimer, max: SHIELD_MAX, tid:'timer-shield' },
  ];
  configs.forEach(c => {
    const el = document.getElementById(c.id);
    const tr = document.getElementById(c.tid);
    if (el) el.classList.toggle('active', c.active);
    if (tr) tr.style.transform = 'scaleX(' + (c.active ? c.t / c.max : 0) + ')';
  });
}

function setType(t) {
  currentType = t;
  document.querySelectorAll('.type-btn').forEach(b => {
    const match = +b.dataset.type === t;
    b.classList.toggle('active',   match);
    b.classList.toggle('inactive', !match);
  });
}

let msgTimeout = null;
function showMsg(text, color, dur = 1200) {
  const el = document.getElementById('msgBanner');
  el.textContent  = text;
  el.style.color  = color;
  el.style.opacity = '1';
  clearTimeout(msgTimeout);
  msgTimeout = setTimeout(() => el.style.opacity = '0', dur);
}

let tipTimeout = null;
function showTip(text) {
  const el = document.getElementById('tipBox');
  el.textContent   = text;
  el.style.opacity = '1';
  clearTimeout(tipTimeout);
  tipTimeout = setTimeout(() => el.style.opacity = '0', 4000);
}

let lvlTimeout = null;
function showLevelBanner(txt) {
  const el = document.getElementById('levelBanner');
  el.textContent   = txt;
  el.style.opacity = '1';
  clearTimeout(lvlTimeout);
  lvlTimeout = setTimeout(() => el.style.opacity = '0', 2200);
}

// ── GAME LOGIC ────────────────────────────────────────────
function catchCorrect(item) {
  combo++;
  const mult = clamp(combo, 1, 10);
  const pts  = 10 * mult;
  score += pts;

  sfxCorrect(mult);
  addBurst(item.x, item.y, item.color, 10);
  addRing(item.x, item.y, item.color);
  addSpriteEffect(item.x, item.y - 24, combo >= 2 ? 'combo' : 'acerto');
  addTextParticle(item.x, item.y - 44, '+' + pts + (mult > 1 ? ' ×' + mult : ''), item.color);

  if (combo >= 2) {
    const msg = COMBO_MSGS[Math.min(combo - 2, COMBO_MSGS.length - 1)];
    showMsg('🔥 ' + msg + ' COMBO ×' + combo, '#ffcc44', 900);
    sfxCombo(combo);
  } else {
    showMsg('✔ ACERTO! +' + pts, item.color, 700);
  }

  // Level / phase check
  const newLevel = Math.floor(score / 250) + 1;
  const newPhase = Math.floor(score / 600) + 1;

  if (newLevel > level) {
    level = newLevel;
    sfxLevelUp();
    showLevelBanner('★ LEVEL ' + level + ' ★');
    showTip(TIPS[randi(0, TIPS.length - 1)]);
  }
  if (newPhase > phase) {
    phase = newPhase;
    showLevelBanner('⬆ FASE ' + phase + ' ⬆');
  }

  updateHUD();
}

function catchHazard(item) {
  if (shieldActive) {
    shieldActive = false; shieldTimer = 0;
    addBurst(item.x, item.y, '#44ccff', 12);
    addRing(item.x, item.y, '#44ccff');
    showMsg('🛡 ESCUDO BLOQUEOU!', '#44ccff');
    updatePowerBar();
    return;
  }
  combo = 0;
  score = Math.max(0, score - 30);
  lives--;
  sfxError();
  addBurst(item.x, item.y, '#ff4466', 12);
  addSpriteEffect(item.x, item.y - 24, 'perigo');
  addTextParticle(item.x, item.y - 44, '-30', '#ff4466');
  showMsg('✗ ERRO! ' + item.label, '#ff5544');
  if (item.tip) showTip(item.tip);
  if (lives <= 0) { endGame(); return; }
  updateHUD();
}

function catchWrongType(item) {
  if (shieldActive) {
    shieldActive = false; shieldTimer = 0;
    addBurst(item.x, item.y, '#44ccff', 12);
    showMsg('🛡 ESCUDO BLOQUEOU!', '#44ccff');
    updatePowerBar();
    return;
  }
  combo = 0;
  score = Math.max(0, score - 15);
  sfxError();
  addBurst(item.x, item.y, '#ff8844', 8);
  addSpriteEffect(item.x, item.y - 24, 'erro');
  addTextParticle(item.x, item.y - 44, '-15', '#ff8844');
  const rightType = TYPES[item.type];
  showMsg('✗ TIPO ERRADO! Use ' + rightType.label + ' (' + item.type + ')', '#ff8844');
  showTip('Isso é ' + rightType.name + '! Pressione ' + item.type + ' para coletar.');
  updateHUD();
}

// ── UPDATE LOOP ───────────────────────────────────────────
function update() {
  frameCount++;

  const sm = speedMult();

  // Player movement + direction state
  if (moveLeft) {
    playerX        -= playerSpeed;
    playerDirection = 'esq';
  } else if (moveRight) {
    playerX        += playerSpeed;
    playerDirection = 'dir';
  } else {
    playerDirection = 'idle';
  }

  playerX = clamp(playerX, 26, W - 26);
  playerY = H - TYPE_BAR_H - 72;

  // Spawn items
  if (frameCount - lastSpawn > spawnRate()) {
    spawnItem();
    if (level >= 3 && Math.random() < 0.3) spawnItem();
    if (level >= 6 && Math.random() < 0.2) spawnItem();
    lastSpawn = frameCount;
  }

  // Spawn powerups
  const pwRate = Math.max(300, 700 - level * 20);
  if (frameCount - lastPwSpawn > pwRate) {
    if (Math.random() < 0.5) spawnPowerup();
    lastPwSpawn = frameCount;
  }

  // Power-up timers
  if (slowActive) {
    slowTimer--;
    if (slowTimer <= 0) { slowActive = false; showMsg('⧖ Slow Motion acabou', '#9988ff', 800); }
  }
  if (magnetActive) {
    magnetTimer--;
    if (magnetTimer <= 0) { magnetActive = false; showMsg('⦿ Ímão desativado', '#ff8844', 800); }
  }
  if (shieldActive) {
    shieldTimer--;
    if (shieldTimer <= 0) { shieldActive = false; showMsg('◈ Escudo acabou', '#44ccff', 800); }
  }
  updatePowerBar();

  // Magnet pull (only correct-type items)
  if (magnetActive) {
    items.forEach(item => {
      if (item.type === currentType) {
        const dx   = playerX - item.x;
        const dy   = playerY - item.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MAGNET_RADIUS && dist > 1) {
          const force = 5 * (1 - dist / MAGNET_RADIUS);
          item.x += (dx / dist) * force;
          item.y += (dy / dist) * force;
        }
      }
    });
  }

  // Update items
  items = items.filter(item => {
    item.y += item.vy * sm;

    if (collides(item)) {
      if (item.type === 0)                catchHazard(item);
      else if (item.type === currentType) catchCorrect(item);
      else                                catchWrongType(item);
      return false;
    }

    // Missed recyclable of current type → break combo
    if (item.y > H + 30) {
      if (item.type === currentType) { combo = 0; updateHUD(); }
      return false;
    }
    return true;
  });

  // Update powerups
  powerups = powerups.filter(pw => {
    pw.y += pw.vy * sm;
    const dx = Math.abs(pw.x - playerX);
    const dy = Math.abs(pw.y - playerY);
    if (dx < 36 && dy < 40) { activatePowerup(pw.type); return false; }
    return pw.y < H + 30;
  });

  // Update particles
  parts.forEach(p => {
    p.x  += p.vx || 0;
    p.y  += p.vy || 0;
    p.vy  = (p.vy || 0) + 0.09;
    p.life -= 0.022;
    if (p.kind === 'ring') { p.r += 2; p.life -= 0.035; }
  });
  parts = parts.filter(p => p.life > 0);
}

// ── DRAW LOOP ─────────────────────────────────────────────
function draw() {
  drawBg();
  items.forEach(drawItem);
  powerups.forEach(drawPowerup);
  drawPlayer();
  drawParticles();

  // Floor label
  const cfg    = TYPES[currentType];
  const floorY = H - TYPE_BAR_H - 10;
  ctx.save();
  ctx.font      = 'bold 11px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = cfg.color;
  ctx.globalAlpha = 0.7;
  ctx.fillText('▼ COLETANDO: ' + cfg.label, W / 2, floorY);
  ctx.restore();
}

// ── MAIN LOOP ─────────────────────────────────────────────
let rafId = null;

function loop() {
  if (!gameRunning) return;
  update();
  draw();
  rafId = requestAnimationFrame(loop);
}

// ── INIT / RESET ──────────────────────────────────────────
function init() {
  score  = 0; combo = 0; lives = 3;
  level  = 1; phase = 1;
  frameCount = 0; lastSpawn = 0; lastPwSpawn = 0;
  items  = []; parts = []; powerups = [];
  slowActive = magnetActive = shieldActive = false;
  slowTimer  = magnetTimer  = shieldTimer  = 0;
  currentType     = 1;
  playerDirection = 'idle';
  playerX = W / 2;
  computeHeights();
  setType(1);
  updateHUD();
  updatePowerBar();
}

// ── GAME OVER ─────────────────────────────────────────────
function endGame() {
  gameRunning = false;
  cancelAnimationFrame(rafId);
  gameOver = true;

  const grade =
    score >= 2000 ? '⭐⭐⭐ MESTRE RECICLADOR'       :
    score >= 1000 ? '⭐⭐ RECICLADOR EXPERIENTE'      :
    score >=  400 ? '⭐ APRENDIZ VERDE'               :
                    '🌱 CONTINUE TENTANDO';

  const sdEl = document.getElementById('overlayScoreDisplay');
  sdEl.innerHTML =
    'SCORE FINAL<br>' +
    '<span style="font-size:20px; color:#ffcc44">' + score + '</span><br><br>' +
    grade + '<br>' +
    '<span style="font-size:8px; color:#4a6080">Level ' + level + ' · Fase ' + phase + '</span>';
  sdEl.style.display = 'block';

  document.getElementById('overlaySubtitle').textContent = 'FIM DE JOGO';
  document.getElementById('overlayDesc').innerHTML =
    'Continue reciclando na vida real!<br>Cada atitude conta para o planeta. ♻';
  document.getElementById('overlayBtn').textContent = '▶ JOGAR NOVAMENTE';
  document.getElementById('overlay').style.display  = 'flex';
}

// ── START ─────────────────────────────────────────────────
function startGame() {
  document.getElementById('overlay').style.display = 'none';
  init();
  gameRunning = true;
  gameOver    = false;
  cancelAnimationFrame(rafId);
  loop();
}

// ── CONTROLS – KEYBOARD ───────────────────────────────────
document.addEventListener('keydown', e => {
  if (!gameRunning && e.key === 'Enter') { startGame(); return; }
  if (!gameRunning) return;
  if (e.key === 'ArrowLeft'  || e.key === 'a') { moveLeft  = true; e.preventDefault(); }
  if (e.key === 'ArrowRight' || e.key === 'd') { moveRight = true; e.preventDefault(); }
  if (e.key === '1') setType(1);
  if (e.key === '2') setType(2);
  if (e.key === '3') setType(3);
  if (e.key === '4') setType(4);
});

document.addEventListener('keyup', e => {
  if (e.key === 'ArrowLeft'  || e.key === 'a') moveLeft  = false;
  if (e.key === 'ArrowRight' || e.key === 'd') moveRight = false;
});

// ── CONTROLS – TYPE BUTTONS ───────────────────────────────
document.querySelectorAll('.type-btn').forEach(btn => {
  btn.addEventListener('click', () => { if (gameRunning) setType(+btn.dataset.type); });
});

// ── CONTROLS – MOBILE TOUCH (canvas drag) ─────────────────
let touchStartX = null;
let touchLastX  = null;

canvas.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
  touchLastX  = touchStartX;
}, { passive: true });

canvas.addEventListener('touchmove', e => {
  if (touchLastX === null) return;
  const dx = e.touches[0].clientX - touchLastX;
  playerX += dx * 1.6;
  playerX  = clamp(playerX, 26, W - 26);
  touchLastX = e.touches[0].clientX;
  e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchend', () => {
  touchStartX = null;
  touchLastX  = null;
  playerDirection = 'idle';
});

// ── CONTROLS – MOBILE BUTTONS ─────────────────────────────
const btnLeft  = document.getElementById('btnLeft');
const btnRight = document.getElementById('btnRight');

btnLeft.addEventListener('touchstart',  () => moveLeft  = true,  { passive: true });
btnLeft.addEventListener('touchend',    () => moveLeft  = false, { passive: true });
btnLeft.addEventListener('mousedown',   () => moveLeft  = true);
btnLeft.addEventListener('mouseup',     () => moveLeft  = false);
btnLeft.addEventListener('mouseleave',  () => moveLeft  = false);

btnRight.addEventListener('touchstart', () => moveRight = true,  { passive: true });
btnRight.addEventListener('touchend',   () => moveRight = false, { passive: true });
btnRight.addEventListener('mousedown',  () => moveRight = true);
btnRight.addEventListener('mouseup',    () => moveRight = false);
btnRight.addEventListener('mouseleave', () => moveRight = false);

// ── OVERLAY BUTTON ────────────────────────────────────────
document.getElementById('overlayBtn').addEventListener('click', startGame);

// ── INIT ON LOAD (ORDEM CRÍTICA) ──────────────────────────
window.addEventListener('load', () => {
  // 1º – Carregar sprites (PRIMEIRO, sempre)
  loadAllSprites();

  // 2º – Ajustar canvas
  resize();
  computeHeights();

  // 3º – Desenhar fundo e preview estático do player
  drawBg();
  playerX = W / 2;
  playerY = H / 2 + 60;

  // Player preview aparece quando a imagem carregar
  const previewSprite = SPRITES.player.azul.idle;
  if (previewSprite) {
    previewSprite.onload = () => {
      drawBg();
      drawPlayer();
    };
    // Se já carregou (cache)
    if (isSpriteReady(previewSprite)) {
      drawPlayer();
    }
  }
});

document.addEventListener("click", () => {
  music.volume = 0.3;
  music.play();
}, { once: true });

function goMenu() {
  window.location.href = "index.html";
}

function goGame2() {
  window.location.href = "game2.html";
}