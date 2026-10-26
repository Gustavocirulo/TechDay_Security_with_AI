// VULN #4 — Hardcoded Secret (OWASP A02:2021 Cryptographic Failures / A07)
const crypto = require('node:crypto');

const JWT_SECRET = 'cadmus-super-secret-2024';

module.exports = (router) => {
  router.get('/token', (req, res) => {
    const user = req.query.user || 'guest';
    const payload = Buffer.from(JSON.stringify({ user })).toString('base64url');
    const sig = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('base64url');
    res.json({ token: `${payload}.${sig}` });
  });
};
