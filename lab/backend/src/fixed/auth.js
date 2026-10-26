// CORRIGIDO #4 — Segredo vindo de variável de ambiente
const crypto = require('node:crypto');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET não definido');

module.exports = (router) => {
  router.get('/token', (req, res) => {
    const user = String(req.query.user || 'guest').slice(0, 40);
    const payload = Buffer.from(JSON.stringify({ user })).toString('base64url');
    const sig = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('base64url');
    res.json({ token: `${payload}.${sig}` });
  });
};
