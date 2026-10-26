// VULN #3 — Command Injection (OWASP A03:2021 Injection)
const { exec } = require('node:child_process');

module.exports = (router) => {
  router.get('/ping', (req, res) => {
    const host = req.query.host || '127.0.0.1';

    exec(`ping -c 1 ${host}`, { timeout: 5000 }, (err, stdout, stderr) => {
      res.json({ output: stdout + stderr });
    });
  });
};
