/* ══════════════════════════════════════════════════════
   ReCyclo — ia.js
   Lógica do IA Scan · Reconhecimento de produtos
   Integração com Anthropic API (Claude)
══════════════════════════════════════════════════════ */

// ─── ESTADO GLOBAL ───────────────────────────
let apiKey             = localStorage.getItem('recyclo_ia_api_key') || '';
let currentImageBase64 = null;
let currentImageMime   = 'image/jpeg';
let currentTab         = 'photo';
let lastResult         = null;
let selectedCat        = '';

// ─── INICIALIZAÇÃO ───────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (!apiKey) showModal();
  setupDragDrop();
  renderHistory();
  syncXPFromGame();
});

// Sincroniza XP/level do jogo principal (se houver)
function syncXPFromGame() {
  // Tenta ler progresso do jogo do localStorage
  try {
    const gameState = localStorage.getItem('recyclo_state');
    if (gameState) {
      const state = JSON.parse(gameState);
      // Se quiser exibir o XP do jogador no header da IA, podemos ler:
      // state.xp, state.level, state.score
    }
  } catch (e) { /* silent */ }
}

// Adiciona XP no jogo principal quando a análise é concluída
function addXPToGame(amount) {
  try {
    const raw = localStorage.getItem('recyclo_state');
    if (!raw) return;
    const state = JSON.parse(raw);
    state.xp = (state.xp || 0) + amount;
    state.score = (state.score || 0) + Math.floor(amount / 5);
    localStorage.setItem('recyclo_state', JSON.stringify(state));
  } catch (e) { /* silent */ }
}

// ─── MODAL DE API KEY ────────────────────────
function showModal() {
  document.getElementById('api-key-input').value = apiKey;
  document.getElementById('modal').style.display = 'flex';
}

function saveKey() {
  const val = document.getElementById('api-key-input').value.trim();
  if (!val) {
    showToast('Insira uma chave válida');
    return;
  }
  apiKey = val;
  localStorage.setItem('recyclo_ia_api_key', val);
  document.getElementById('modal').style.display = 'none';
  showToast('🔑 Chave salva!');
}

// ─── TABS ────────────────────────────────────
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.ia-tab').forEach(b => b.classList.remove('ia-tab--active'));
  document.querySelectorAll('.ia-panel').forEach(p => p.classList.remove('ia-panel--active'));
  document.getElementById('tab-' + tab).classList.add('ia-tab--active');
  document.getElementById('panel-' + tab).classList.add('ia-panel--active');
  hideResults();
}

// ─── CATEGORIA ───────────────────────────────
function setCat(el, cat) {
  document.querySelectorAll('.ia-cat').forEach(b => b.classList.remove('ia-cat--active'));
  el.classList.add('ia-cat--active');
  selectedCat = cat;
}

// ─── UPLOAD DE IMAGEM ────────────────────────
function handleFile(e) {
  const file = e.target.files[0];
  if (file) readFile(file);
}

function readFile(file) {
  if (!file.type.startsWith('image/')) {
    showError('O arquivo precisa ser uma imagem (JPG, PNG ou WEBP).');
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showError('Imagem muito grande (máximo 10MB).');
    return;
  }
  currentImageMime = file.type === 'image/png' ? 'image/png'
                   : file.type === 'image/webp' ? 'image/webp'
                   : 'image/jpeg';
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = document.getElementById('preview-img');
    img.src = ev.target.result;
    img.style.display = 'block';
    currentImageBase64 = ev.target.result.split(',')[1];
  };
  reader.readAsDataURL(file);
}

function setupDragDrop() {
  const zone = document.getElementById('upload-zone');
  if (!zone) return;
  zone.addEventListener('dragover', e => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) readFile(file);
  });
}

// ─── COLAR URL ───────────────────────────────
async function pasteUrl() {
  try {
    const text = await navigator.clipboard.readText();
    document.getElementById('url-input').value = text;
  } catch {
    document.getElementById('url-input').focus();
  }
}

// ─── UI HELPERS ──────────────────────────────
function hideResults() {
  document.getElementById('results-area').style.display  = 'none';
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('error-box').style.display     = 'none';
}

function showError(msg) {
  const el = document.getElementById('error-box');
  el.textContent = '⚠ ' + msg;
  el.style.display = 'block';
  document.getElementById('loading-state').style.display = 'none';
}

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ─── ECO-SCORE RING ANIMADO ──────────────────
function animateRing(score) {
  const circumference = 188.5;
  const fill  = document.getElementById('score-ring-fill');
  const label = document.getElementById('score-val');
  // Cores no estilo do ReCyclo (vermelho/amarelo/verde neon)
  const color = score < 35 ? '#f87171' : score < 65 ? '#fbbf24' : '#4ade80';

  fill.style.stroke = color;
  setTimeout(() => {
    fill.style.strokeDashoffset = circumference - (score / 100) * circumference;
  }, 80);

  label.textContent  = score;
  label.style.color  = color;
}

// ─── COPIAR RESULTADO ────────────────────────
function copyResult() {
  if (!lastResult) return;
  const alts = (lastResult.alternatives || [])
    .map((a, i) => `${i + 1}. ${a.name} — Eco-score: ${a.eco_score}/100\n   ${a.why_sustainable}`)
    .join('\n');
  const text = [
    '♻ ReCyclo IA — Análise de Sustentabilidade',
    '',
    `Produto: ${lastResult.product_name}`,
    `Eco-score: ${lastResult.eco_score}/100`,
    '',
    lastResult.product_description,
    '',
    'Alternativas sustentáveis:',
    alts,
    '',
    lastResult.tip ? `💡 ${lastResult.tip}` : '',
    '',
    '— ReCyclo · Sistema de Apoio Inteligente'
  ].filter(Boolean).join('\n');

  navigator.clipboard.writeText(text)
    .then(() => showToast('✓ Resultado copiado!'))
    .catch(() => showToast('Não foi possível copiar'));
}

// ─── NOVA ANÁLISE ────────────────────────────
function newAnalysis() {
  hideResults();
  currentImageBase64 = null;
  const img = document.getElementById('preview-img');
  img.style.display = 'none';
  img.src = '';
  document.getElementById('file-input').value    = '';
  document.getElementById('url-input').value     = '';
  document.getElementById('photo-context').value = '';
  document.getElementById('url-context').value   = '';
  document.getElementById('text-desc').value     = '';
  document.querySelectorAll('.ia-cat').forEach(b => b.classList.remove('ia-cat--active'));
  selectedCat = '';
  document.getElementById('scan-area').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── HISTÓRICO ───────────────────────────────
function loadHistory() {
  const raw = localStorage.getItem('recyclo_ia_history');
  return raw ? JSON.parse(raw) : [];
}

function saveHistory(item) {
  const hist = loadHistory();
  hist.unshift({
    ...item,
    date: new Date().toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    })
  });
  localStorage.setItem('recyclo_ia_history', JSON.stringify(hist.slice(0, 8)));
  renderHistory();
}

function clearHistory() {
  localStorage.removeItem('recyclo_ia_history');
  renderHistory();
  showToast('🗑 Histórico limpo');
}

function renderHistory() {
  const hist    = loadHistory();
  const section = document.getElementById('history-section');
  const list    = document.getElementById('history-list');

  if (hist.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  list.innerHTML = '';

  hist.forEach(item => {
    const score = item.eco_score || 0;
    let color, bgColor;
    if (score < 35) {
      color = '#f87171';
      bgColor = 'rgba(248, 113, 113, 0.15)';
    } else if (score < 65) {
      color = '#fbbf24';
      bgColor = 'rgba(251, 191, 36, 0.15)';
    } else {
      color = '#4ade80';
      bgColor = 'rgba(74, 222, 128, 0.15)';
    }

    const el = document.createElement('div');
    el.className = 'ia-hist-item';
    el.innerHTML = `
      <div class="ia-hist-badge" style="background:${bgColor};color:${color};border:1px solid ${color}55;">${score}</div>
      <div class="ia-hist-info">
        <div class="ia-hist-name"></div>
        <div class="ia-hist-date"></div>
      </div>
      <div class="ia-hist-arrow">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </div>
    `;
    el.querySelector('.ia-hist-name').textContent = item.product_name || 'Produto';
    el.querySelector('.ia-hist-date').textContent = item.date || '';
    el.onclick = () => {
      renderResults(item);
      document.getElementById('results-area').scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    list.appendChild(el);
  });
}

// ─── RENDERIZAR RESULTADOS ───────────────────
function renderResults(data) {
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('results-area').style.display  = 'block';
  lastResult = data;

  document.getElementById('res-name').textContent = data.product_name || 'Produto';
  document.getElementById('res-desc').textContent = data.product_description || '';

  // Chips de impacto
  const chipsEl = document.getElementById('res-chips');
  chipsEl.innerHTML = '';
  (data.impact_tags || []).forEach(tag => {
    const chip = document.createElement('span');
    const cls = tag.type === 'negative' ? 'ia-chip--negative'
              : tag.type === 'neutral'  ? 'ia-chip--neutral'
              : 'ia-chip--positive';
    chip.className = 'ia-chip ' + cls;
    chip.textContent = tag.label;
    chipsEl.appendChild(chip);
  });

  // Anel de score
  const score = Math.max(0, Math.min(100, parseInt(data.eco_score) || 0));
  animateRing(score);

  // Cards de alternativas
  const grid = document.getElementById('alts-grid');
  grid.innerHTML = '';
  (data.alternatives || []).forEach((alt, i) => {
    const card = document.createElement('div');
    card.className = 'ia-alt';
    card.style.animationDelay = (i * 0.08) + 's';
    const where = alt.where_to_find ? `<div class="ia-alt__where">📍 ${escapeHtml(alt.where_to_find)}</div>` : '';
    card.innerHTML = `
      <div class="ia-alt__rank">${i + 1}</div>
      <div class="ia-alt__name"></div>
      <div class="ia-alt__why"></div>
      <div class="ia-alt__score"><div class="ia-alt__score-dot"></div> Eco-score: ${alt.eco_score || 0}/100</div>
      ${where}
    `;
    card.querySelector('.ia-alt__name').textContent = alt.name || '';
    card.querySelector('.ia-alt__why').textContent  = alt.why_sustainable || '';
    grid.appendChild(card);
  });

  // Dica
  const tipBox  = document.getElementById('tip-box');
  const tipText = document.getElementById('tip-text');
  if (data.tip) {
    tipText.innerHTML = '<strong>Dica verde:</strong> ' + escapeHtml(data.tip);
    tipBox.style.display = 'flex';
  } else {
    tipBox.style.display = 'none';
  }

  document.getElementById('results-area').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ─── ANALISAR (chama a API Anthropic) ────────
async function analyze(mode) {
  if (!apiKey) { showModal(); return; }
  hideResults();

  // Validações
  if (mode === 'photo' && !currentImageBase64) {
    showError('Envie uma imagem antes de analisar.'); return;
  }
  if (mode === 'url' && !document.getElementById('url-input').value.trim()) {
    showError('Cole um link de produto.'); return;
  }
  if (mode === 'text' && !document.getElementById('text-desc').value.trim()) {
    showError('Descreva o produto antes de analisar.'); return;
  }

  // Estado de carregamento
  document.getElementById('loading-state').style.display = 'block';
  const btn     = document.getElementById('btn-' + mode);
  const spinner = document.getElementById('spinner-' + mode);
  const btnText = document.getElementById('btn-' + mode + '-text');
  btn.disabled          = true;
  spinner.style.display = 'block';
  btnText.textContent   = 'Analisando...';

  // Prompt do sistema
  const systemPrompt = `Você é um especialista em sustentabilidade ambiental e consumo consciente no Brasil, atuando como a IA do ReCyclo. Analise o produto fornecido e responda APENAS com JSON puro, sem markdown, sem texto fora do JSON.

Formato obrigatório:
{
  "product_name": "Nome claro do produto",
  "product_description": "2-3 frases sobre o impacto ambiental (emissões, plástico, cadeia produtiva, etc)",
  "eco_score": 45,
  "impact_tags": [
    {"label": "Plástico não reciclável", "type": "negative"},
    {"label": "Produção local",          "type": "positive"},
    {"label": "Embalagem neutra",        "type": "neutral"}
  ],
  "alternatives": [
    {
      "name": "Alternativa sustentável 1",
      "why_sustainable": "Por que é mais sustentável (2 frases concretas)",
      "eco_score": 82,
      "where_to_find": "Onde encontrar no Brasil"
    },
    {
      "name": "Alternativa sustentável 2",
      "why_sustainable": "Justificativa clara e específica",
      "eco_score": 75,
      "where_to_find": "Onde encontrar"
    },
    {
      "name": "Alternativa sustentável 3",
      "why_sustainable": "Justificativa",
      "eco_score": 68,
      "where_to_find": "Onde encontrar"
    }
  ],
  "tip": "Dica prática e acionável para consumir de forma mais sustentável nesta categoria"
}

Regras:
- eco_score: 0 (péssimo para o ambiente) a 100 (ideal)
- impact_tags type: "negative", "positive" ou "neutral"
- 3 alternativas reais disponíveis no Brasil, com nomes de produtos ou marcas
- Português brasileiro
- APENAS JSON, nada mais`;

  // Monta mensagens por modo
  let messages;
  try {
    if (mode === 'photo') {
      const ctx = document.getElementById('photo-context').value.trim();
      messages = [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: currentImageMime, data: currentImageBase64 } },
          { type: 'text',  text: 'Analise este produto' + (ctx ? ` — contexto: ${ctx}` : '') + '. Retorne o JSON.' }
        ]
      }];

    } else if (mode === 'url') {
      const url = document.getElementById('url-input').value.trim();
      const ctx = document.getElementById('url-context').value.trim();
      messages = [{
        role: 'user',
        content: `Produto: ${url}${ctx ? `\nContexto: ${ctx}` : ''}\n\nAnalise e retorne o JSON.`
      }];

    } else {
      const desc = document.getElementById('text-desc').value.trim();
      const cat  = selectedCat ? `\nCategoria: ${selectedCat}` : '';
      messages = [{
        role: 'user',
        content: `Produto descrito pelo usuário: "${desc}"${cat}\n\nAnalise e retorne o JSON.`
      }];
    }

    // Chamada à API Anthropic
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system:     systemPrompt,
        messages
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Erro HTTP ${response.status}`);
    }

    const data   = await response.json();
    const raw    = data.content.map(b => b.text || '').join('');
    const clean  = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    renderResults(parsed);
    saveHistory(parsed);
    addXPToGame(50);
    showToast('⚡ +50 XP · Análise concluída!');

  } catch (err) {
    showError('Falha na análise: ' + err.message + '. Verifique sua chave de API.');
  } finally {
    btn.disabled          = false;
    spinner.style.display = 'none';
    const labels = { photo: 'Analisar Produto', url: 'Analisar Link', text: 'Analisar Produto' };
    btnText.textContent = labels[mode];
  }
}
