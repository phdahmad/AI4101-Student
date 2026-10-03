// node --test tests/   — security and correctness tests (fake data only).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  ALPHABET, TOKEN_LEN, generateToken, normalizeToken, normalizeId, fromHex,
  deriveMaster, locatorOf, decryptBundle, unpackPayload,
} from '../src/crypto.js';
import { build } from '../tools/build.mjs';
import { guard } from '../tools/guard.mjs';
import { readCsv } from '../tools/lib.mjs';
import { makeData, FAKE } from './fixture.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IT = 1000; // fast iterations for unit tests only; the page refuses anything below 600,000
const quiet = () => {};

// What the page does, step for step.
async function login(dist, id, code) {
  const meta = JSON.parse(fs.readFileSync(path.join(dist, 'meta.json'), 'utf8'));
  const nid = normalizeId(id), tok = normalizeToken(code);
  if (!nid || !tok) return null;
  const master = await deriveMaster(nid, tok, fromHex(meta.deploySalt), meta.iterations);
  const loc = await locatorOf(master);
  const file = path.join(dist, 'bundles', loc + '.bin');
  if (!fs.existsSync(file)) return null;
  try { return unpackPayload(await decryptBundle(master, loc, fs.readFileSync(file))); } catch { return null; }
}
const tokensOf = (data) => Object.fromEntries(readCsv(path.join(data, 'tokens.csv')).map((r) => [r.id, r.token]));
const run = (args) => spawnSync(process.execPath, args, { cwd: REPO, encoding: 'utf8' });

test('access codes: 12 characters, no ambiguous characters, unbiased alphabet', () => {
  for (const bad of ['0', 'O', '1', 'I', 'L']) assert.ok(!ALPHABET.includes(bad));
  const seen = new Set();
  for (let i = 0; i < 2000; i++) {
    const t = generateToken();
    assert.equal(t.length, TOKEN_LEN);
    assert.match(t, /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{12}$/);
    seen.add(t);
  }
  assert.equal(seen.size, 2000);
  assert.equal(normalizeToken('k7qm-4xrt 9hzp'), 'K7QM4XRT9HZP');
  assert.equal(normalizeToken('K7QM-4XRT-9HZ0'), null);       // 0 is not allowed
  assert.equal(normalizeId('٤٤٥٠٠١٧٣٤'), '445001734');          // Arabic-keyboard digits
});

test('each student sees only their own data', async () => {
  const { data, dist } = makeData();
  await build({ data, dist, iterations: IT, log: quiet });
  const tokens = tokensOf(data);
  assert.equal(fs.readdirSync(path.join(dist, 'bundles')).length, FAKE.length);
  for (const s of FAKE) {
    const r = await login(dist, s.id, tokens[s.id]);
    assert.ok(r, `${s.id} could not log in`);
    assert.equal(r.data.student.id, s.id);
    assert.equal(r.data.student.name, s.name);
    const text = JSON.stringify(r.data);
    for (const o of FAKE.filter((x) => x.id !== s.id)) {
      assert.ok(!text.includes(o.id), `${s.id} bundle contains another student's ID`);
      assert.ok(!text.includes(o.name), `${s.id} bundle contains another student's name`);
    }
  }
  const a = await login(dist, FAKE[0].id, tokens[FAKE[0].id]);
  assert.ok(JSON.stringify(a.data).includes('SECRET-FEEDBACK-A'));
  assert.ok(!JSON.stringify(a.data).includes('SECRET-FEEDBACK-B'));
  assert.equal(a.blobs.length, 2);                                   // own two pages only
  const q1 = a.data.items.find((i) => i.id === 'Q1');
  assert.equal(q1.scaled, 1.88);                                     // 12/16 × 2.5
  const c = await login(dist, FAKE[2].id, tokens[FAKE[2].id]);
  assert.equal(c.data.items.find((i) => i.id === 'M1-ACT1').status, 'not_submitted');
  assert.equal(c.blobs.length, 0);
});

test('wrong code, wrong ID, or another student\'s code is refused', async () => {
  const { data, dist } = makeData();
  await build({ data, dist, iterations: IT, log: quiet });
  const t = tokensOf(data);
  const [a, b] = FAKE;
  assert.equal(await login(dist, a.id, 'AAAA-BBBB-CCCC'), null);     // wrong code
  assert.equal(await login(dist, '900000999', t[a.id]), null);       // wrong ID, right code
  assert.equal(await login(dist, a.id, t[b.id]), null);              // someone else's code
  assert.equal(await login(dist, b.id, t[a.id]), null);
  const flipped = t[a.id].slice(0, -1) + (t[a.id].endsWith('Z') ? 'Y' : 'Z');
  assert.equal(await login(dist, a.id, flipped), null);              // one character off
});

test('a tampered bundle does not decrypt', async () => {
  const { data, dist } = makeData();
  await build({ data, dist, iterations: IT, log: quiet });
  const t = tokensOf(data);
  const meta = JSON.parse(fs.readFileSync(path.join(dist, 'meta.json'), 'utf8'));
  const master = await deriveMaster(FAKE[0].id, normalizeToken(t[FAKE[0].id]), fromHex(meta.deploySalt), IT);
  const loc = await locatorOf(master);
  const buf = fs.readFileSync(path.join(dist, 'bundles', loc + '.bin'));
  buf[500] ^= 1;
  await assert.rejects(decryptBundle(master, loc, buf));
});

test('all bundles have the same size, and the output holds no plaintext', async () => {
  const { data, dist } = makeData();
  await build({ data, dist, iterations: IT, log: quiet });
  const sizes = new Set(fs.readdirSync(path.join(dist, 'bundles')).map((f) => fs.statSync(path.join(dist, 'bundles', f)).size));
  assert.equal(sizes.size, 1);
  assert.deepEqual(guard(dist, FAKE, { minIterations: IT }), []);
  for (const f of fs.readdirSync(dist, { recursive: true })) {
    const p = path.join(dist, f);
    if (fs.statSync(p).isDirectory()) continue;
    const s = fs.readFileSync(p).toString('latin1');
    assert.ok(!s.includes('SECRET-FEEDBACK'), `${f} contains plaintext feedback`);
    assert.ok(!s.includes('RIFF'), `${f} contains an unencrypted image`);
  }
});

test('guard rejects any unencrypted file in the publish folder', async () => {
  const { data, dist } = makeData();
  await build({ data, dist, iterations: IT, log: quiet });
  const check = (label, mutate, undo) => {
    mutate();
    const p = guard(dist, FAKE, { minIterations: IT });
    assert.ok(p.length > 0, `guard missed: ${label}`);
    undo();
    assert.deepEqual(guard(dist, FAKE, { minIterations: IT }), [], `guard not clean after undo: ${label}`);
  };
  const f = (rel) => path.join(dist, rel);
  check('a JSON data file', () => fs.writeFileSync(f('grades.json'), '{}'), () => fs.rmSync(f('grades.json')));
  check('a scanned image', () => fs.copyFileSync(path.join(data, 'batches/M1-ACT1/web', FAKE[0].id + '_p1.webp'), f('bundles/page.webp')), () => fs.rmSync(f('bundles/page.webp')));
  check('a CSV', () => fs.writeFileSync(f('tokens.csv'), 'id,token'), () => fs.rmSync(f('tokens.csv')));
  check('a plaintext .bin with a bundle name', () => fs.writeFileSync(f('bundles/' + 'a'.repeat(64) + '.bin'), 'A41B' + 'x'.repeat(5000)), () => fs.rmSync(f('bundles/' + 'a'.repeat(64) + '.bin')));
  const html = fs.readFileSync(f('index.html'));
  check('a student ID inside the page', () => fs.appendFileSync(f('index.html'), FAKE[1].id), () => fs.writeFileSync(f('index.html'), html));
  check('a student name inside the page', () => fs.appendFileSync(f('index.html'), FAKE[1].name), () => fs.writeFileSync(f('index.html'), html));
  const meta = fs.readFileSync(f('meta.json'));
  check('weak iterations in meta.json', () => fs.writeFileSync(f('meta.json'), JSON.stringify({ ...JSON.parse(meta), iterations: 10 })), () => fs.writeFileSync(f('meta.json'), meta));
  assert.ok(guard(dist, FAKE).length > 0, 'production guard must refuse a test build with low iterations');
});

test('build refuses unapproved results and refuses a data folder inside the repository', () => {
  const { data, dist } = makeData({ approved: false });
  let r = run(['tools/build.mjs', '--data', data, '--out', dist, '--iterations', String(IT)]);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /not approved/);
  assert.ok(!fs.existsSync(path.join(dist, 'bundles')));
  r = run(['tools/build.mjs', '--data', path.join(REPO, 'tests'), '--out', dist, '--iterations', String(IT)]);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /inside the repository/);
});

test('every build uses a new salt, new bundle names and new ciphertext', async () => {
  const { data, dist } = makeData();
  await build({ data, dist, iterations: IT, log: quiet });
  const m1 = JSON.parse(fs.readFileSync(path.join(dist, 'meta.json'))); const n1 = fs.readdirSync(path.join(dist, 'bundles')).sort();
  await build({ data, dist, iterations: IT, log: quiet });
  const m2 = JSON.parse(fs.readFileSync(path.join(dist, 'meta.json'))); const n2 = fs.readdirSync(path.join(dist, 'bundles')).sort();
  assert.notEqual(m1.deploySalt, m2.deploySalt);
  assert.equal(n1.filter((x) => n2.includes(x)).length, 0);
  const t = tokensOf(data);
  for (const s of FAKE) assert.ok(await login(dist, s.id, t[s.id]), 'codes keep working across builds');
});

test('re-issuing one code re-encrypts only that student', async () => {
  const { data, dist } = makeData();
  await build({ data, dist, iterations: IT, log: quiet });
  const before = tokensOf(data);
  const snap = Object.fromEntries(fs.readdirSync(path.join(dist, 'bundles')).map((f) => [f, fs.readFileSync(path.join(dist, 'bundles', f))]));
  const r = run(['tools/reissue.mjs', '--id', FAKE[0].id, '--data', data, '--out', dist]);
  assert.equal(r.status, 0, r.stderr);
  const after = tokensOf(data);
  assert.notEqual(after[FAKE[0].id], before[FAKE[0].id]);
  assert.equal(await login(dist, FAKE[0].id, before[FAKE[0].id]), null, 'old code must stop working');
  assert.ok(await login(dist, FAKE[0].id, after[FAKE[0].id]), 'new code must work');
  for (const s of FAKE.slice(1)) {
    assert.equal(after[s.id], before[s.id]);
    assert.ok(await login(dist, s.id, after[s.id]));
  }
  const now = fs.readdirSync(path.join(dist, 'bundles'));
  const unchanged = now.filter((f) => snap[f] && snap[f].equals(fs.readFileSync(path.join(dist, 'bundles', f))));
  assert.equal(unchanged.length, FAKE.length - 1, 'other bundles must be byte-for-byte unchanged');
  assert.equal(now.length, FAKE.length, 'old bundle must be deleted');
  const log = readCsv(path.join(data, 'tokens_log.csv'));
  assert.ok(log.some((l) => l.id === FAKE[0].id && l.action === 'reissued'));
});
