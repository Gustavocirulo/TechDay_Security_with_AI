// Servidor que expõe as duas versões lado a lado:
//   /vulnerable/*  -> código propositalmente inseguro
//   /fixed/*       -> código corrigido
const express = require('express');
const { createDb } = require('./db');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));

const FILES = ['users', 'comments', 'ping', 'auth', 'transfer', 'deposit'];

for (const version of ['vulnerable', 'fixed']) {
  const router = express.Router();
  const db = createDb();
  for (const f of FILES) require(`./${version}/${f}`)(router, db);
  app.use(`/${version}`, router);
}

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const port = process.env.PORT || 3001;
if (require.main === module) {
  app.listen(port, '0.0.0.0', () => console.log(`[backend] http://0.0.0.0:${port}`));
}

module.exports = app;
