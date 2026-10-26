// Normaliza e valida a resposta (de LLM ou demo). Nunca confia em texto livre.
const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

// Extrai JSON mesmo que o modelo envolva a resposta em ```json ... ```
function parseJsonLoose(text) {
  if (typeof text !== 'string') throw new Error('Resposta da LLM vazia');
  const trimmed = text.trim();
  try { return JSON.parse(trimmed); } catch { /* tenta extrair */ }
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) { try { return JSON.parse(fenced[1]); } catch { /* segue */ } }
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
  throw new Error('Resposta da LLM não contém JSON válido');
}

// files: { 'backend/src/vulnerable/users.js': '<conteúdo>' }
function normalize(raw, files) {
  const list = Array.isArray(raw) ? raw : raw && raw.vulnerabilities;
  if (!Array.isArray(list)) throw new Error("JSON sem o campo 'vulnerabilities' (array)");

  const paths = Object.keys(files);
  const out = [];
  for (const v of list) {
    if (!v || typeof v !== 'object' || !v.type || !v.file) continue;
    const str = (x) => (x == null ? '' : String(x));

    let file = paths.find((p) => p === v.file) ||
      paths.find((p) => p.endsWith(str(v.file).replace(/^\.?\//, '')) || str(v.file).endsWith(p.split('/').pop()));
    if (!file) continue;

    const code = str(v.code);
    const lines = files[file].split('\n');
    let line = Number.parseInt(v.line, 10);
    // Reposiciona a linha pelo trecho de código, que é mais confiável que o número vindo da LLM
    const firstSnippetLine = code.split('\n').map((l) => l.trim()).find(Boolean);
    if (firstSnippetLine) {
      const idx = lines.findIndex((l) => l.trim() === firstSnippetLine);
      const idx2 = idx !== -1 ? idx : lines.findIndex((l) => l.includes(firstSnippetLine));
      if (idx2 !== -1) line = idx2 + 1;
    }
    if (!Number.isInteger(line) || line < 1 || line > lines.length) line = 1;

    const severity = str(v.severity).toUpperCase();
    out.push({
      type: str(v.type),
      severity: SEVERITIES.includes(severity) ? severity : 'MEDIUM',
      file,
      line,
      title: str(v.title) || str(v.type),
      description: str(v.description),
      code: code || lines[line - 1].trim(),
      recommendation: str(v.recommendation),
      fixed_code: str(v.fixed_code),
    });
  }
  out.sort((a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity) || a.file.localeCompare(b.file));
  return out;
}

function summarize(vulns) {
  const s = { total: vulns.length, CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const v of vulns) s[v.severity]++;
  return s;
}

module.exports = { parseJsonLoose, normalize, summarize, SEVERITIES };
