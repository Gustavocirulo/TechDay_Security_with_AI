const assert = require('node:assert');
const { parseJsonLoose, normalize, summarize } = require('../src/normalize');

const files = { 'backend/src/vulnerable/users.js': 'a\nconst q = "SELECT " + x;\nb' };

assert.deepStrictEqual(parseJsonLoose('{"vulnerabilities":[]}'), { vulnerabilities: [] });
assert.deepStrictEqual(parseJsonLoose('```json\n{"vulnerabilities":[]}\n```'), { vulnerabilities: [] });
assert.deepStrictEqual(parseJsonLoose('Aqui está: {"vulnerabilities":[]} fim'), { vulnerabilities: [] });
assert.throws(() => parseJsonLoose('sem json'));

const v = normalize({ vulnerabilities: [
  { type: 'SQL Injection', severity: 'high', file: 'users.js', line: 99, code: 'const q = "SELECT " + x;' },
  { type: 'X', file: 'inexistente.js' },
  { nope: true },
] }, files);
assert.strictEqual(v.length, 1);
assert.strictEqual(v[0].line, 2, 'linha deve ser reposicionada pelo trecho de código');
assert.strictEqual(v[0].severity, 'HIGH');
assert.strictEqual(v[0].file, 'backend/src/vulnerable/users.js');
assert.strictEqual(summarize(v).HIGH, 1);
assert.throws(() => normalize({ foo: 1 }, files));
console.log('normalize tests OK');
