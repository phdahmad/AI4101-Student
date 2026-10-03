// Publish guard: refuses an output folder that contains anything that is not
// (a) a known page file, or (b) an encrypted bundle that looks encrypted.
// Also refuses if any student ID or name appears anywhere in the output.
//
// Usage: node tools/guard.mjs [--out dist] [--data <dataDir>]
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { MAGIC, VERSION, HEADER_LEN, ITERATIONS } from '../src/crypto.js';

export const ALLOWED_PAGE_FILES = new Set([
  'index.html', 'styles.css', 'app.js', 'crypto.js', 'viewer.js',
  'meta.json', '.nojekyll', 'robots.txt', 'favicon.svg', '404.html',
  'fonts/inter-latin-400-normal.woff2', 'fonts/inter-latin-600-normal.woff2',
  'fonts/inter-latin-700-normal.woff2', 'fonts/crimson-pro-latin-600-normal.woff2',
  'fonts/crimson-pro-latin-700-normal.woff2', 'fonts/jetbrains-mono-latin-500-normal.woff2',
  'fonts/OFL.txt',
]);
const BUNDLE_RE = /^bundles\/[0-9a-f]{64}\.bin$/;
const META_KEYS = new Set(['schema', 'deploySalt', 'iterations', 'built', 'bundleSize']);

function walk(dir, base = dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, base, out);
    else out.push(path.relative(base, p).split(path.sep).join('/'));
  }
  return out;
}

function entropy(bytes) {
  const f = new Array(256).fill(0);
  for (const b of bytes) f[b]++;
  let h = 0;
  for (const c of f) if (c) { const p = c / bytes.length; h -= p * Math.log2(p); }
  return h;
}

// students: [{id, name}] — every ID and name must be absent from the output.
export function guard(dist, students = [], { minIterations = ITERATIONS } = {}) {
  const problems = [];
  if (!fs.existsSync(dist)) return ['Output folder does not exist: ' + dist];
  const files = walk(dist);
  const bundleSizes = new Set();
  const needles = [];
  for (const s of students) {
    if (s.id) needles.push(Buffer.from(String(s.id), 'utf8'));
    if (s.name) {
      needles.push(Buffer.from(s.name, 'utf8'));
      // also each name part of 4+ letters, to catch partial leaks of the family name
      for (const part of s.name.split(/\s+/)) if (part.length >= 5) needles.push(Buffer.from(part, 'utf8'));
    }
  }

  for (const rel of files) {
    const abs = path.join(dist, rel);
    const buf = fs.readFileSync(abs);
    if (BUNDLE_RE.test(rel)) {
      const okMagic = MAGIC.every((b, i) => buf[i] === b) && buf[4] === VERSION;
      if (!okMagic) problems.push(`${rel}: not an encrypted bundle (bad header)`);
      if (buf.length < HEADER_LEN + 1024) problems.push(`${rel}: too small to be a real bundle`);
      const sample = buf.subarray(HEADER_LEN, Math.min(buf.length, HEADER_LEN + (1 << 20)));
      const h = entropy(sample);
      if (h < 7.95) problems.push(`${rel}: low entropy ${h.toFixed(3)} — looks unencrypted`);
      bundleSizes.add(buf.length);
    } else if (!ALLOWED_PAGE_FILES.has(rel)) {
      problems.push(`${rel}: not allowed in the publish folder`);
    }
    if (rel === 'meta.json') {
      try {
        const m = JSON.parse(buf.toString('utf8'));
        for (const k of Object.keys(m)) if (!META_KEYS.has(k)) problems.push(`meta.json: unexpected key "${k}"`);
        if (!(m.iterations >= minIterations)) problems.push(`meta.json: iterations ${m.iterations} below ${minIterations}`);
      } catch { problems.push('meta.json: not valid JSON'); }
    }
    for (const n of needles) {
      if (buf.indexOf(n) !== -1) { problems.push(`${rel}: contains student data ("${n.toString('utf8').slice(0, 3)}…")`); break; }
    }
  }
  if (bundleSizes.size > 1) problems.push(`bundles have ${bundleSizes.size} different sizes — padding failed`);
  return problems;
}

// CLI
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { distDir, dataDir, readCsv } = await import('./lib.mjs');
  const dist = distDir();
  const roster = readCsv(path.join(dataDir(), 'roster.csv'));
  const problems = guard(dist, roster);
  if (problems.length) {
    console.error('GUARD FAILED:\n  - ' + problems.join('\n  - '));
    process.exit(1);
  }
  console.log(`Guard passed: ${dist} contains only page files and encrypted bundles.`);
}
