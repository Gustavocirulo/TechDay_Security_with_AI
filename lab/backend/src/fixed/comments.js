// CORRIGIDO #2 — Escape de saída HTML + Content-Security-Policy
const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

module.exports = (router) => {
  const comments = [{ author: 'alice', text: 'Bem-vindos ao TechDay!' }];

  router.post('/comments', (req, res) => {
    const { author = 'anon', text = '' } = req.body || {};
    comments.push({ author: String(author).slice(0, 40), text: String(text).slice(0, 500) });
    res.status(201).json({ total: comments.length });
  });

  router.get('/comments/view', (_req, res) => {
    const items = comments
      .map((c) => `<li><b>${escapeHtml(c.author)}</b>: ${escapeHtml(c.text)}</li>`)
      .join('');
    res.set('Content-Security-Policy', "default-src 'none'");
    res.type('html').send(`<!doctype html><h3>Comentários</h3><ul>${items}</ul>`);
  });
};
