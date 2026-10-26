// VULN #5 — Falta de validação de entrada (OWASP A04:2021 Insecure Design)
module.exports = (router) => {
  const balances = { alice: 1000, bob: 500 };

  router.get('/accounts', (_req, res) => res.json(balances));

  router.post('/transfer', (req, res) => {
    const { from, to, amount } = req.body || {};

    balances[from] -= amount;
    balances[to] += amount;

    res.json({ balances });
  });
};
