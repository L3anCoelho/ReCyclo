'use strict';
/* =====================================================
   game-views.js — Ranked · Loja · Moedas · Navegacao
   Depende do app.js (gameState, getEl, showToast)
   Carregado DEPOIS do app.js
===================================================== */

/* ── Dados da loja ── */
const SHOP_ITEMS = [
  { id: 's1', icon: '🌱', partner: 'Natura',        title: 'Kit Sustentavel',       desc: 'Shampoo solido + sabonete natural. Zero plastico.', discount: '20% OFF', cost: 80,  category: 'eco',       badge: 'NOVO',    coupon: 'NAT-ECO20', couponInfo: 'Valido por 30 dias em naturabrasil.com.br' },
  { id: 's2', icon: '🥦', partner: 'Org Foods',     title: 'Cesta Organica',         desc: 'Verduras e frutas organicas entregues em casa.',     discount: '15% OFF', cost: 60,  category: 'food',      badge: null,      coupon: 'ORG15',     couponInfo: 'Primeira cesta com desconto' },
  { id: 's3', icon: '🚲', partner: 'BikeRide',      title: 'Aluguel de Bike',        desc: '1 mes de bicicleta compartilhada gratuito.',         discount: '1 MES',   cost: 150, category: 'transport', badge: 'DESTAQUE', coupon: 'BIKE1MES',  couponInfo: 'Resgate no app BikeRide' },
  { id: 's4', icon: '🍃', partner: 'EcoClean',      title: 'Produto de Limpeza',     desc: 'Detergente biodegradavel refil 1L.',                 discount: '30% OFF', cost: 45,  category: 'eco',       badge: null,      coupon: 'ECO30',     couponInfo: 'Use em ecoclean.com.br' },
  { id: 's5', icon: '💚', partner: 'Bio Farmacia',  title: 'Suplemento Natural',     desc: 'Vitamina C com Rosa Mosqueta organica.',             discount: '25% OFF', cost: 70,  category: 'health',    badge: null,      coupon: 'BIO25VIT',  couponInfo: 'Valido ate fim do mes' },
  { id: 's6', icon: '☀️', partner: 'SolarCity',     title: 'Consultoria Solar',      desc: 'Analise gratuita de viabilidade solar para sua casa.', discount: 'GRATIS', cost: 200, category: 'eco',      badge: 'HOT',     coupon: 'SOLAR-FREE', couponInfo: 'Agende em solarcity.com.br/gratis' },
  { id: 's7', icon: '🌊', partner: 'Puro Acai',     title: 'Acai Sustentavel',       desc: 'Acai de producao sustentavel 500g.',                 discount: '10% OFF', cost: 30,  category: 'food',      badge: null,      coupon: 'ACAI10',    couponInfo: 'Resgate na loja fisica ou delivery' },
  { id: 's8', icon: '♻️', partner: 'ReUsa',         title: 'Garrafa Termica',        desc: 'Garrafa de aco inox 750ml. Sem BPA.',                discount: '35% OFF', cost: 120, category: 'eco',       badge: 'NOVO',    coupon: 'REUSA35',   couponInfo: 'Frete gratis acima de R$150' },
];

/* ── Sistema de moedas (integrado ao gameState do app.js) ── */
const COINS_PER_GOOD_DECISION = 3;
const COINS_PER_MISSION       = 15;

function getCoins() {
  return (window.gameState && window.gameState.stats && window.gameState.stats.coins) || 0;
}

function addCoins(amount) {
  if (!window.gameState || !window.gameState.stats) return;
  if (!window.gameState.stats.coins) window.gameState.stats.coins = 0;
  window.gameState.stats.coins += amount;
  updateCoinUI();
  showCoinPopup(amount);
}

function updateCoinUI() {
  const coins = getCoins();
  const hudCoins   = getEl('hud-coins');        if (hudCoins)   hudCoins.textContent   = coins;
  const shopCoins  = getEl('shop-coins-display'); if (shopCoins) shopCoins.textContent  = coins;
}

function showCoinPopup(amount) {
  const el = getEl('coin-popup');
  if (!el) return;
  el.textContent = `+${amount} ◈`;
  el.classList.remove('ng-coin-popup--hidden');
  el.style.animation = 'none';
  requestAnimationFrame(() => { el.style.animation = 'xp-rise 1.2s ease both'; });
  setTimeout(() => el.classList.add('ng-coin-popup--hidden'), 1300);
}

/* ── Patch no handleDecision para dar moedas ── */
function patchHandleDecision() {
  const orig = window.handleDecision;
  if (!orig) return;
  window.handleDecision = function(choice) {
    orig.call(this, choice);
    if (choice.type === 'good') addCoins(COINS_PER_GOOD_DECISION);
  };
}

function patchCompleteMission() {
  const orig = window.completeMission;
  if (!orig) return;
  window.completeMission = function(mission) {
    orig.call(this, mission);
    addCoins(COINS_PER_MISSION);
  };
}

/* ── Navegacao entre views ── */
function switchToView(view) {
  const gameGrid   = document.querySelector('.ng-app-grid');
  const rankedView = getEl('view-ranked');
  const shopView   = getEl('view-shop');

  if (gameGrid)   gameGrid.classList.toggle('ng-view--hidden',   view !== 'game');
  if (rankedView) rankedView.classList.toggle('ng-view--hidden', view !== 'ranked');
  if (shopView)   shopView.classList.toggle('ng-view--hidden',   view !== 'shop');

  document.querySelectorAll('.ng-nav-btn').forEach(b => b.classList.remove('ng-nav-btn--active'));
  const active = getEl(`btn-nav-${view}`);
  if (active) active.classList.add('ng-nav-btn--active');

  if (view === 'ranked') renderRanked();
  if (view === 'shop')   { updateCoinUI(); renderShop('all'); }
}

function initNavButtons() {
  const btnGame   = getEl('btn-nav-game');
  const btnRanked = getEl('btn-nav-ranked');
  const btnShop   = getEl('btn-nav-shop');

  if (btnGame)   btnGame.addEventListener('click',   () => switchToView('game'));
  if (btnRanked) btnRanked.addEventListener('click', () => switchToView('ranked'));
  if (btnShop)   btnShop.addEventListener('click',   () => switchToView('shop'));

  // moedas clicavel vai pra loja
  const coinsChip = getEl('hud-coins-chip');
  if (coinsChip) coinsChip.addEventListener('click', () => switchToView('shop'));
}

/* ── RANKED ── */
const FAKE_PLAYERS = [
  { name: 'EcoWarrior',   avatar: '🌿', score: 97 },
  { name: 'GreenHero',    avatar: '🌱', score: 91 },
  { name: 'Natureza+',    avatar: '🌊', score: 85 },
  { name: 'RecycloKing',  avatar: '♻️', score: 79 },
  { name: 'BioStar',      avatar: '⭐', score: 74 },
  { name: 'EcoFreak',     avatar: '🍃', score: 68 },
  { name: 'PlanetSaver',  avatar: '🌍', score: 62 },
  { name: 'GreenMind',    avatar: '💚', score: 55 },
];

const LEAGUES = [
  { name: 'Lenda',     icon: '👑', threshold: 90 },
  { name: 'Mestre',    icon: '💎', threshold: 75 },
  { name: 'Ouro',      icon: '🥇', threshold: 60 },
  { name: 'Prata',     icon: '🥈', threshold: 45 },
  { name: 'Bronze',    icon: '🥉', threshold: 30 },
  { name: 'Iniciante', icon: '🌱', threshold: 0  },
];

function getLeague(score) {
  return LEAGUES.find(l => score >= l.threshold) || LEAGUES[LEAGUES.length - 1];
}

function renderRanked() {
  const playerScore = (window.gameState && window.gameState.stats && window.gameState.stats.score) || 0;
  const playerName  = (window.gameState && window.gameState.profile && window.gameState.profile.name) || 'Voce';
  const playerAvatar = (window.gameState && window.gameState.profile && window.gameState.profile.avatar) || '🌱';

  /* Insere o jogador na lista */
  const allPlayers = [...FAKE_PLAYERS, { name: playerName, avatar: playerAvatar, score: playerScore, isYou: true }]
    .sort((a, b) => b.score - a.score);

  /* Podium top 3 */
  const podium = getEl('ranked-podium');
  if (podium) {
    const top3 = allPlayers.slice(0, 3);
    const order = [top3[1], top3[0], top3[2]].filter(Boolean); // 2-1-3
    const pos   = [2, 1, 3];
    podium.innerHTML = order.map((p, i) => `
      <div class="ng-podium-slot ng-podium-slot--${pos[i]}">
        <div class="ng-podium-slot__avatar">
          ${pos[i] === 1 ? '<span class="ng-podium-slot__crown">👑</span>' : ''}
          ${p.avatar}
        </div>
        <div class="ng-podium-slot__name">${p.name}</div>
        <div class="ng-podium-slot__score">${p.score} pts</div>
        <div class="ng-podium-block"><span class="ng-podium-block__rank">#${pos[i]}</span></div>
      </div>
    `).join('');
  }

  /* Liga do jogador */
  const league = getLeague(playerScore);
  const next   = LEAGUES[Math.max(0, LEAGUES.indexOf(league) - 1)];
  const lb = { icon: getEl('lb-icon'), name: getEl('lb-name'), pts: getEl('lb-pts'), bar: getEl('lb-bar'), nextEl: getEl('lb-next') };
  if (lb.icon) lb.icon.textContent = league.icon;
  if (lb.name) lb.name.textContent = league.name;
  if (lb.pts)  lb.pts.textContent  = `${playerScore} pts`;
  if (lb.bar)  lb.bar.style.width  = Math.min(100, (playerScore / (next ? next.threshold : 100)) * 100) + '%';
  if (lb.nextEl) lb.nextEl.textContent = next ? `${next.threshold - playerScore} pts p/ ${next.name}` : 'Liga maxima atingida!';

  /* Tabela completa */
  const table = getEl('ranked-table');
  if (table) {
    table.innerHTML = allPlayers.map((p, i) => `
      <div class="ng-ranked-row ng-ranked-row--${i + 1}${p.isYou ? ' ng-ranked-row--you' : ''}">
        <span class="ng-ranked-row__pos">#${i + 1}</span>
        <div class="ng-ranked-row__avatar">${p.avatar}</div>
        <span class="ng-ranked-row__name">${p.name}</span>
        <span class="ng-ranked-row__score">${p.score} pts</span>
      </div>
    `).join('');
  }
}

/* ── LOJA ── */
let currentCat = 'all';
let purchasedItems = new Set(JSON.parse(localStorage.getItem('recyclo_purchased') || '[]'));

function renderShop(cat) {
  currentCat = cat;
  document.querySelectorAll('.ng-shop-cat-btn').forEach(b => {
    b.classList.toggle('ng-shop-cat-btn--active', b.dataset.cat === cat);
  });

  const grid = getEl('shop-grid');
  if (!grid) return;
  const filtered = cat === 'all' ? SHOP_ITEMS : SHOP_ITEMS.filter(i => i.category === cat);

  grid.innerHTML = filtered.map(item => {
    const sold   = purchasedItems.has(item.id);
    const canBuy = getCoins() >= item.cost && !sold;
    return `
      <div class="ng-shop-card${sold ? ' ng-shop-card--sold' : ''}">
        ${item.badge ? `<span class="ng-shop-card__badge${item.badge === 'HOT' ? ' ng-shop-card__badge--hot' : item.badge === 'NOVO' ? ' ng-shop-card__badge--new' : ''}">${item.badge}</span>` : ''}
        <div class="ng-shop-card__icon">${item.icon}</div>
        <div class="ng-shop-card__partner">${item.partner}</div>
        <div class="ng-shop-card__title">${item.title}</div>
        <div class="ng-shop-card__desc">${item.desc}</div>
        <div class="ng-shop-card__discount">${item.discount}</div>
        <div class="ng-shop-card__footer">
          <div class="ng-shop-card__cost"><span class="ng-coin-icon">◈</span> ${item.cost}</div>
          <button class="ng-shop-btn${!canBuy ? ' ng-shop-btn--disabled' : ''}"
            data-item="${item.id}"
            ${!canBuy ? 'disabled' : ''}>
            ${sold ? 'Resgatado' : 'Resgatar'}
          </button>
        </div>
      </div>
    `;
  }).join('');

  /* Eventos dos botoes */
  grid.querySelectorAll('.ng-shop-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => openPurchaseModal(btn.dataset.item));
  });
}

function openPurchaseModal(itemId) {
  const item = SHOP_ITEMS.find(i => i.id === itemId);
  if (!item) return;

  const modal = getEl('modal-purchase');
  if (!modal) return;

  window._currentPurchaseItem = item;

  const set = (id, val) => { const el = getEl(id); if (el) el.textContent = val; };
  set('mp-icon',    item.icon);
  set('mp-title',   item.title);
  set('mp-partner', item.partner);
  set('mp-desc',    item.desc);
  set('mp-cost',    item.cost);
  set('mp-balance', getCoins());

  const couponBox = getEl('mp-coupon-box');
  if (couponBox) couponBox.classList.add('ng-modal-purchase__coupon--hidden');

  const btns  = getEl('mp-btns');
  const close = getEl('btn-purchase-close');
  if (btns)  btns.style.display  = 'flex';
  if (close) close.style.display = 'none';

  modal.classList.remove('modal--hidden');
}

function initShopListeners() {
  /* Categorias */
  document.querySelectorAll('.ng-shop-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => renderShop(btn.dataset.cat));
  });

  /* Confirmar compra */
  const btnConfirm = getEl('btn-purchase-confirm');
  if (btnConfirm) {
    btnConfirm.addEventListener('click', () => {
      const item = window._currentPurchaseItem;
      if (!item) return;
      const coins = getCoins();
      if (coins < item.cost) {
        if (window.showToast) showToast('Moedas insuficientes!', 'bad', '◈');
        return;
      }
      /* Deduz moedas */
      if (window.gameState && window.gameState.stats) {
        window.gameState.stats.coins -= item.cost;
        updateCoinUI();
      }
      /* Marca como comprado */
      purchasedItems.add(item.id);
      localStorage.setItem('recyclo_purchased', JSON.stringify([...purchasedItems]));

      /* Mostra cupom */
      const set = (id, val) => { const el = getEl(id); if (el) el.textContent = val; };
      set('mp-coupon-code', item.coupon);
      set('mp-coupon-info', item.couponInfo);
      const couponBox = getEl('mp-coupon-box');
      if (couponBox) couponBox.classList.remove('ng-modal-purchase__coupon--hidden');

      const btns  = getEl('mp-btns');
      const close = getEl('btn-purchase-close');
      if (btns)  btns.style.display  = 'none';
      if (close) close.style.display = 'block';

      if (window.showToast) showToast(`Cupom resgatado: ${item.coupon}!`, 'good', '◈');
      renderShop(currentCat);
    });
  }

  /* Cancelar */
  const btnCancel = getEl('btn-purchase-cancel');
  if (btnCancel) {
    btnCancel.addEventListener('click', () => {
      const modal = getEl('modal-purchase');
      if (modal) modal.classList.add('modal--hidden');
    });
  }

  /* Fechar apos compra */
  const btnClose = getEl('btn-purchase-close');
  if (btnClose) {
    btnClose.addEventListener('click', () => {
      const modal = getEl('modal-purchase');
      if (modal) modal.classList.add('modal--hidden');
    });
  }
}

/* ── Boot ── */
document.addEventListener('DOMContentLoaded', () => {
  /* Espera o app.js terminar (boot() roda imediatamente) */
  setTimeout(() => {
    patchHandleDecision();
    patchCompleteMission();
    initNavButtons();
    initShopListeners();
    updateCoinUI();
  }, 100);
});

/* ── Patch: atualiza barras ambientais a cada decisão ── */
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const _orig = window.handleDecision;
    if (!_orig) return;

    window.handleDecision = function(choice) {
      _orig.call(this, choice);

      const s = window.gameState && window.gameState.stats;
      if (!s) return;

      if (choice.type === 'bad') {
        s.plastic  = Math.min(6,  (s.plastic  || 0) + 1);
        s.emission = Math.min(6,  (s.emission || 0) + 1);
        s.waste    = Math.min(30, (s.waste    || 0) + 3);
      } else if (choice.type === 'good') {
        s.plastic  = Math.max(0, (s.plastic  || 0) - 0.5);
        s.emission = Math.max(0, (s.emission || 0) - 0.5);
        s.waste    = Math.max(0, (s.waste    || 0) - 1.5);
      }

      const barP = document.getElementById('bar-p');
      const barE = document.getElementById('bar-e');
      const barW = document.getElementById('bar-w');
      if (barP) barP.style.width = Math.round((s.plastic  / 6)  * 100) + '%';
      if (barE) barE.style.width = Math.round((s.emission / 6)  * 100) + '%';
      if (barW) barW.style.width = Math.round((s.waste    / 30) * 100) + '%';
    };
  }, 200);
});