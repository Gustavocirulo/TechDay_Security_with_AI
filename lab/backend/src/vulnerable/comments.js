// VULN #2 — Cross-Site Scripting armazenado (OWASP A03:2021 Injection)
module.exports = (router) => {
  const comments = [{ author: 'alice', text: 'Bem-vindos ao TechDay!' }];

  router.post('/comments', (req, res) => {
    const { author = 'anon', text = '' } = req.body || {};
    comments.push({ author, text });
    res.status(201).json({ total: comments.length });
  });

  router.get('/comments/view', (_req, res) => {
    const items = comments
      .map((c) => `<li><b>${c.author}</b>: ${c.text}</li>`)
      .join('');
    res.type('html').send(`<!doctype html><h3>Comentários</h3><ul>${items}</ul>`);
  });
};
