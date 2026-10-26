// CORRIGIDO #5 — Validação de entrada (tipo, existência, valor positivo, saldo)
module.exports = (router) => {
  const balances = { alice: 1000, bob: 500 };
  const isAccount = (k) => typeof k === 'string' && Object.hasOwn(balances, k);

  router.get('/accounts', (_req, res) => res.json(balances));

  router.post('/transfer', (req, res) => {
    const { from, to, amount } = req.body || {};

    if (!isAccount(from) || !isAccount(to) || from === to) {
      return res.status(400).json({ error: 'Contas inválidas' });
    }
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Valor inválido' });
    }
    if (amount > balances[from]) {
      return res.status(400).json({ error: 'Saldo insuficiente' });
    }

    balances[from] -= amount;
    balances[to] += amount;

    res.json({ balances });
  });
};
