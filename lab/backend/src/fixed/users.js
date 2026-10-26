// CORRIGIDO #1 — Query parametrizada
module.exports = (router, db) => {
  router.get('/users/search', (req, res) => {
    const name = String(req.query.name || '').slice(0, 50);

    const stmt = db.prepare('SELECT id, name, email FROM users WHERE name LIKE ?');

    try {
      res.json(stmt.all(`%${name}%`));
    } catch {
      res.status(500).json({ error: 'Erro interno' });
    }
  });
};
