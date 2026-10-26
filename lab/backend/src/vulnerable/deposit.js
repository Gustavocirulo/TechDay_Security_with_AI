// VULN #6 — Falta de validação de entrada (OWASP A04:2021 Insecure Design)
module.exports = (router) => {
  const balances = { alice: 1000, bob: 500 };

  router.get('/accounts', (_req, res) => res.json(balances));

  router.post('/deposit', (req, res) => {
    const { to, amount } = req.body || {};

    balances[to] += amount;

    res.json({ balances });
  });
};
