// Todo conteúdo vindo do scanner/LLM é inserido com textContent (nunca innerHTML).
const $ = (id) => document.getElementById(id);
const state = { mode: 'demo', version: 'vulnerable', view: 'vulnerable', result: null, selected: null, filesCache: {} };

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function setToggle(id, value) {
  document.querySelectorAll(`#${id} button`).forEach((b) => b.classList.toggle('active', b.dataset.value === value));
}
function bindToggle(id, cb) {
  document.querySelectorAll(`#${id} button`).forEach((b) => b.addEventListener('click', () => cb(b.dataset.value)));
}

async function api(path, opts) {
  const res = await fetch(path, opts);
  let data = null;
  try { data = await res.json(); } catch { /* corpo não-JSON */ }
  if (!res.ok) throw new Error((data && data.error) || `HTTP ${res.status}`);
  return data;
}

async function getFiles(version) {
  if (!state.filesCache[version]) state.filesCache[version] = (await api(`/api/files?version=${version}`)).files;
  return state.filesCache[version];
}

function updateModeHint(cfg) {
  $('mode-hint').textContent = state.mode === 'demo'
    ? 'Resultado pré-preparado — funciona sem internet'
    : cfg && !cfg.llmConfigured ? '⚠ LLM_API_KEY não configurada no .env' : `LLM: ${cfg ? cfg.model : ''}`;
}

let config = null;

async function init() {
  try {
    config = await api('/api/config');
    state.mode = config.defaultMode;
  } catch { /* scanner indisponível: erro aparece ao analisar */ }
  setToggle('mode-toggle', state.mode);
  setToggle('version-toggle', state.version);
  updateModeHint(config);
}

bindToggle('mode-toggle', (v) => { state.mode = v; setToggle('mode-toggle', v); updateModeHint(config); });
bindToggle('version-toggle', (v) => { state.version = v; setToggle('version-toggle', v); });
bindToggle('view-toggle', (v) => { state.view = v; renderViewer(); });

$('scan-btn').addEventListener('click', runScan);

async function runScan() {
  $('scan-btn').disabled = true;
  $('error').hidden = true; $('results').hidden = true; $('status').hidden = false;
  state.selected = null;
  try {
    const data = await api('/api/scan', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ version: state.version, mode: state.mode }),
    });
    state.result = data;
    renderResults();
  } catch (e) {
    $('error').textContent = `Falha na análise: ${e.message}` +
      (state.mode === 'real' ? '\n\nDica: verifique LLM_API_KEY no .env ou use o DEMO MODE.' : '');
    $('error').hidden = false;
  } finally {
    $('status').hidden = true;
    $('scan-btn').disabled = false;
  }
}

function renderResults() {
  const r = state.result;
  $('results').hidden = false;
  const by = $('analyzed-by');
  by.className = 'badge' + (r.mode === 'demo' ? ' demo' : '');
  by.textContent = r.mode === 'real' ? `Analyzed by LLM · ${r.model}` : 'DEMO MODE · resultado pré-preparado (simula a LLM)';
  $('meta').textContent = `${r.version === 'fixed' ? 'Corrigido' : 'Vulnerável'} · ${r.files_analyzed.length} arquivos · ${(r.duration_ms / 1000).toFixed(1)}s`;

  const sum = $('summary'); sum.replaceChildren();
  [['total', 'Encontradas'], ['CRITICAL', 'Critical'], ['HIGH', 'High'], ['MEDIUM', 'Medium'], ['LOW', 'Low']].forEach(([k, label]) => {
    const t = el('div', `tile ${k}`); t.append(el('b', null, r.summary[k]), el('span', null, label)); sum.append(t);
  });

  $('empty').hidden = r.vulnerabilities.length > 0;
  $('viewer').hidden = true;
  const cards = $('cards'); cards.replaceChildren();
  r.vulnerabilities.forEach((v, i) => {
    const c = el('div', `card ${v.severity}`);
    c.append(el('div', 'sev', v.severity), el('h3', null, v.type), el('div', 'loc', `${v.file} — linha ${v.line}`), el('p', null, v.title));
    const a = el('div', 'actions');
    const b1 = el('button', null, 'Ver código'); const b2 = el('button', null, 'Ver correção');
    b1.onclick = (e) => { e.stopPropagation(); select(i, 'vulnerable'); };
    b2.onclick = (e) => { e.stopPropagation(); select(i, 'fixed'); };
    a.append(b1, b2); c.append(a);
    c.onclick = () => select(i, 'vulnerable');
    cards.append(c);
  });
  $('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function select(i, view) {
  state.selected = i; state.view = view;
  [...$('cards').children].forEach((c, idx) => c.classList.toggle('selected', idx === i));
  renderViewer();
}

function findLine(lines, snippet) {
  const first = (snippet || '').split('\n').map((l) => l.trim()).find(Boolean);
  if (!first) return -1;
  const exact = lines.findIndex((l) => l.trim() === first);
  return exact !== -1 ? exact : lines.findIndex((l) => l.includes(first));
}

async function renderViewer() {
  if (state.selected == null) return;
  const v = state.result.vulnerabilities[state.selected];
  $('viewer').hidden = false;
  setToggle('view-toggle', state.view);
  $('v-title').textContent = `${v.type} — ${v.title}`;
  $('v-loc').textContent = `${v.file} — linha ${v.line}`;
  $('v-code').textContent = v.code;
  $('v-fixed').textContent = v.fixed_code || '(sem sugestão)';
  $('v-reco').textContent = `💡 ${v.recommendation}`;

  const ver = state.view;
  const path = v.file.replace(/\/(vulnerable|fixed)\//, `/${ver}/`);
  let files;
  try { files = await getFiles(ver); } catch (e) { $('v-file').textContent = e.message; return; }
  const content = files[path];
  const box = $('v-file'); box.replaceChildren();
  if (content == null) { box.textContent = `Arquivo indisponível nesta versão (${path})`; return; }
  const lines = content.split('\n');
  const sameFile = path === v.file;
  let hl = sameFile ? v.line - 1 : findLine(lines, ver === 'fixed' ? (v.fixed_code || '').split('\n')[0] : v.code);
  if (hl == null || hl < 0) hl = -1;
  lines.forEach((text, idx) => {
    const good = ver === 'fixed' && !sameFile;
    const row = el('div', 'ln' + (idx === hl ? ` hl${good ? ' good' : ''}` : ''));
    row.append(el('span', null, idx + 1), el('span', null, text));
    box.append(row);
  });
  const target = box.querySelector('.hl');
  if (target) box.scrollTop = Math.max(0, target.offsetTop - 120);
}

$('search-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const data = await api(`/app/${state.version}/users/search?name=${encodeURIComponent($('search-input').value)}`);
    $('search-out').textContent = JSON.stringify(data, null, 2);
  } catch (err) { $('search-out').textContent = err.message; }
});

init();
