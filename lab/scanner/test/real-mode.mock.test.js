// Teste do REAL MODE com LLM simulada (resposta com markdown, linha errada, severidade em minúsculas)
const http = require('node:http');
const { spawn } = require('node:child_process');
const path = require('node:path');

let calls = 0;
const mock = http.createServer((req, res) => {
  calls++;
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    const parsed = JSON.parse(body);
    const prompt = parsed.messages[1].content;
    const content = calls === 1
      ? 'resposta sem json'
      : '```json\n' + JSON.stringify({ vulnerabilities: [{ type: 'SQL Injection', severity: 'critical', file: 'users.js', line: 99,
        code: "const query = \"SELECT id, name, email FROM users WHERE name LIKE '%\" + name + \"%'\";", title: 't', description: 'd', recommendation: 'r', fixed_code: 'f' }] }) + '\n```';
    console.log('mock auth:', req.headers.authorization, '| json_mode:', !!parsed.response_format, '| prompt has numbered lines:', /\s1\| /.test(prompt));
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ choices: [{ message: { content } }] }));
  });
}).listen(9911, async () => {
  const lab = path.join(__dirname, '..', '..');
  const sc = spawn(process.execPath, ['src/server.js'], { cwd: path.join(lab, 'scanner'), stdio: 'inherit', env: { ...process.env,
    PORT: '4011', TARGET_DIR: path.join(lab, 'backend', 'src'), LLM_BASE_URL: 'http://127.0.0.1:9911', LLM_API_KEY: 'test-key', LLM_MODEL: 'mock' } });
  await new Promise((r) => setTimeout(r, 1000));
  const r = await fetch('http://127.0.0.1:4011/scan', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ version: 'vulnerable', mode: 'real' }) });
  const j = await r.json();
  console.log(r.status, j.analyzed_by, j.model, 'calls=' + calls, JSON.stringify(j.vulnerabilities.map((v) => [v.severity, v.file, v.line])));
  const ok = r.status === 200 && j.vulnerabilities.length === 1 && j.vulnerabilities[0].line === 6 && j.vulnerabilities[0].severity === 'CRITICAL' && calls === 2;
  console.log(ok ? 'REAL MODE OK' : 'REAL MODE FAIL');
  sc.kill(); mock.close(); process.exit(ok ? 0 : 1);
});


