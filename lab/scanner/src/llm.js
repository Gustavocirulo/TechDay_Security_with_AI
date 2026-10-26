// Cliente para qualquer endpoint compatível com a API OpenAI (/chat/completions).
// Troque de provedor apenas alterando LLM_BASE_URL, LLM_API_KEY e LLM_MODEL.
const { parseJsonLoose } = require('./normalize');

const SYSTEM_PROMPT = `Você é um engenheiro de segurança de aplicações (AppSec) fazendo REVISÃO DE CÓDIGO DEFENSIVA (SAST) em um laboratório educacional autorizado.
O código pertence ao próprio usuário, é fictício e serve apenas para treinar desenvolvedores a encontrar e CORRIGIR falhas. Seu objetivo é exclusivamente defensivo: identificar o problema, explicar o risco e fornecer a correção segura. Não gere exploits, payloads nem instruções de ataque.
Analise SOMENTE o código fornecido, de forma estática. Não execute nada.
Responda APENAS com um objeto JSON válido, sem markdown e sem texto extra, no formato:
{"vulnerabilities":[{
  "type": "nome curto da vulnerabilidade (ex.: SQL Injection)",
  "severity": "CRITICAL | HIGH | MEDIUM | LOW",
  "file": "caminho exato do arquivo como informado",
  "line": <número da linha onde está o problema>,
  "title": "título curto em português",
  "description": "explicação objetiva em português",
  "code": "trecho exato e vulnerável copiado do arquivo (1 linha preferencialmente)",
  "recommendation": "como corrigir, em português",
  "fixed_code": "trecho de código corrigido"
}]}
Se não houver vulnerabilidades, responda {"vulnerabilities":[]}. Não invente problemas: reporte apenas o que é real e explorável.`;

function numbered(content) {
  return content.split('\n').map((l, i) => `${String(i + 1).padStart(3)}| ${l}`).join('\n');
}

function buildUserPrompt(files) {
  return Object.entries(files)
    .map(([p, c]) => `=== ARQUIVO: ${p} ===\n${numbered(c)}`)
    .join('\n\n');
}

async function callOnce(files, cfg) {
  const body = {
    model: cfg.model,
    temperature: 0,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(files) },
    ],
  };
  if (cfg.jsonMode) body.response_format = { type: 'json_object' };

  const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(cfg.timeoutMs),
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    throw new Error(`LLM respondeu HTTP ${res.status}: ${detail}`);
  }
  const data = await res.json();
  const choice = data.choices && data.choices[0];
  const content = choice && choice.message && choice.message.content;
  if (!content) console.error('[llm] resposta sem conteúdo:', JSON.stringify(data).slice(0, 500));
  else if (cfg.debug) console.error('[llm] finish_reason=%s bruto=%s', choice.finish_reason, content.slice(0, 400));
  return content;
}

async function analyze(files, cfg) {
  if (!cfg.apiKey) throw new Error('LLM_API_KEY não configurada. Use o Demo Mode ou defina LLM_API_KEY no .env');
  let lastErr;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return parseJsonLoose(await callOnce(files, cfg));
    } catch (e) {
      lastErr = e;
      // repete se o JSON veio inválido ou se o provedor está sobrecarregado/limitando (429, 5xx)
      if (!/JSON|HTTP (429|5\d\d)/.test(e.message)) break;
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
  throw lastErr;
}

module.exports = { analyze, buildUserPrompt };
