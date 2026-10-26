const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const { analyze } = require('./llm');
const { normalize, summarize } = require('./normalize');

const TARGET_DIR = process.env.TARGET_DIR || '/target';
const VERSIONS = ['vulnerable', 'fixed'];
const IGNORED = new Set(['db.js', 'server.js']);

const cfg = {
  baseUrl: process.env.LLM_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai',
  apiKey: process.env.LLM_API_KEY || '',
  model: process.env.LLM_MODEL || 'gemini-3.5-flash-lite',
  jsonMode: (process.env.LLM_JSON_MODE || 'true') !== 'false',
  timeoutMs: Number(process.env.LLM_TIMEOUT_MS || 90000),
  debug: process.env.LLM_DEBUG === 'true',
};
const defaultMode = (process.env.SCANNER_MODE || 'demo').toLowerCase() === 'real' ? 'real' : 'demo';
const demoDelay = Number(process.env.DEMO_DELAY_MS || 1800);

function loadFiles(version) {
  const dir = path.join(TARGET_DIR, version);
  const files = {};
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.js') && !IGNORED.has(n)).sort()) {
    files[`backend/src/${version}/${f}`] = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\r\n/g, '\n');
  }
  return files;
}

const app = express();
app.use(express.json({ limit: '10kb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/config', (_req, res) =>
  res.json({ defaultMode, model: cfg.model, llmConfigured: Boolean(cfg.apiKey), baseUrl: new URL(cfg.baseUrl).host }));

app.get('/files', (req, res) => {
  const version = req.query.version;
  if (!VERSIONS.includes(version)) return res.status(400).json({ error: 'version inválida' });
  res.json({ version, files: loadFiles(version) });
});

app.post('/scan', async (req, res) => {
  const version = (req.body || {}).version;
  const mode = (req.body || {}).mode || defaultMode;
  if (!VERSIONS.includes(version)) return res.status(400).json({ error: "version deve ser 'vulnerable' ou 'fixed'" });
  if (!['demo', 'real'].includes(mode)) return res.status(400).json({ error: "mode deve ser 'demo' ou 'real'" });

  const started = Date.now();
  try {
    const files = loadFiles(version);
    let raw;
    if (mode === 'demo') {
      // DEMO MODE: resultado pré-preparado (demo/*.json), sem chamar nenhuma API externa
      await new Promise((r) => setTimeout(r, demoDelay));
      raw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'demo', `${version}.json`), 'utf8'));
    } else {
      // REAL MODE: análise feita por uma LLM
      raw = await analyze(files, cfg);
    }
    const vulnerabilities = normalize(raw, files);
    res.json({
      mode,
      analyzed_by: mode === 'real' ? 'LLM' : 'DEMO (resultado pré-preparado)',
      model: mode === 'real' ? cfg.model : null,
      version,
      files_analyzed: Object.keys(files),
      duration_ms: Date.now() - started,
      summary: summarize(vulnerabilities),
      vulnerabilities,
    });
  } catch (err) {
    console.error('[scanner] erro:', err.message);
    res.status(502).json({ error: err.message, mode });
  }
});

const port = process.env.PORT || 4000;
if (require.main === module) app.listen(port, '0.0.0.0', () => console.log(`[scanner] :${port} modo padrão=${defaultMode}`));
module.exports = app;
