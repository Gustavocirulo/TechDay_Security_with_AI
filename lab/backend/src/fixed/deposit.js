// VULN #6 — Falta de validação de entrada (OWASP A04:2021 Insecure Design)
module.exports = (router) => {
  const balances = { alice: 1000, bob: 500 };
  const isAccount = (k) => typeof k === 'string' && Object.hasOwn(balances, k);

  router.get('/accounts', (_req, res) => res.json(balances));

  router.post('/deposit', (req, res) => {
    const { to, amount } = req.body || {};

    if (!isAccount(to)) {
      return res.status(400).json({ error: 'Conta inválida' });
    }
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Valor inválido' });
    }

    balances[to] += amount;

    res.json({ balances });
  });
};
