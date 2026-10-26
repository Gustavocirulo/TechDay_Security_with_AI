// CORRIGIDO #3 — Validação por allowlist + execFile (sem shell)
const { execFile } = require('node:child_process');

const HOST_RE = /^[a-zA-Z0-9]([a-zA-Z0-9.-]{0,251}[a-zA-Z0-9])?$/;

module.exports = (router) => {
  router.get('/ping', (req, res) => {
    const host = String(req.query.host || '127.0.0.1');
    if (!HOST_RE.test(host)) return res.status(400).json({ error: 'Host inválido' });

    execFile('ping', ['-c', '1', host], { timeout: 5000 }, (err, stdout, stderr) => {
      res.json({ output: stdout + stderr });
    });
  });
};
