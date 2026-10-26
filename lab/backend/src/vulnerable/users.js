// VULN #1 — SQL Injection (OWASP A03:2021 Injection)
module.exports = (router, db) => {
  router.get('/users/search', (req, res) => {
    const name = req.query.name || '';

    const query = "SELECT id, name, email FROM users WHERE name LIKE '%" + name + "%'";

    try {
      res.json(db.prepare(query).all());
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
};
