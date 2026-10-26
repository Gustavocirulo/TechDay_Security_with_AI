// Banco SQLite 100% em memória com dados FICTÍCIOS (nada é gravado em disco).
const { DatabaseSync } = require('node:sqlite');

function createDb() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT, password_hash TEXT);
    INSERT INTO users VALUES
      (1, 'alice', 'alice@example.test', 'FAKE_HASH_alice'),
      (2, 'bob',   'bob@example.test',   'FAKE_HASH_bob'),
      (3, 'carol', 'carol@example.test', 'FAKE_HASH_carol');
  `);
  return db;
}

module.exports = { createDb };
