// Turns a reviewed marking batch into the results file the student page is built from.
//
//   node tools/results-from-review.mjs --batch PQ --approve "Approved by Dr. Ahmad Alhindi on 2026-10-21"
//
// Reads batches/<batch>/assessment.json, <batch>.draft.json and, if present,
// <batch>.review.json (the teacher's edits from review.html win over the draft).
// Writes results/<batch>.json. Without --approve the file is written with
// "approved": false, and build.mjs refuses to publish it.
// The feedback built here is the same as the preview on the review page.
import fs from 'node:fs';
import path from 'node:path';
import { dataDir, argValue, readCsv, fail } from './lib.mjs';

const batch = argValue('--batch') ?? fail('Give the batch name, e.g. --batch PQ');
const approval = argValue('--approve');
const DATA = dataDir();
const dir = path.join(DATA, 'batches', batch);
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const need = (f) => { const p = path.join(dir, f); if (!fs.existsSync(p)) fail(`Missing ${p}`); return p; };

const A = readJson(need('assessment.json'));
const draft = readJson(need(`${batch}.draft.json`));
const reviewPath = path.join(dir, `${batch}.review.json`);
const saved = fs.existsSync(reviewPath) ? readJson(reviewPath) : null;
if (saved && saved.batch !== A.id) fail(`${reviewPath} belongs to batch ${saved.batch}, not ${A.id}`);
const roster = new Set(readCsv(path.join(DATA, 'roster.csv')).map((r) => r.id));

const sum = (a) => a.reduce((x, y) => x + (+y || 0), 0);
const fmt = (n) => (Math.round(n * 100) / 100).toString();
const word = (x) => (x === 'T' ? 'TRUE' : x === 'F' ? 'FALSE' : x);

// Older drafts (Quiz 1) and older saved reviews used q11/q12 keys.
function shortOf(d) {
  if (Array.isArray(d.short)) return d.short;
  return [{ marks: d.q11, note: d.n11, fb: d.fb11 }, { marks: d.q12, note: d.n12, fb: d.fb12 }];
}
function upgrade(rec) {
  if (!rec || !('q11' in rec)) return rec;
  const { q11, q12, n11, n12, f11en, f11ar, f12en, f12ar, ...rest } = rec;
  return { ...rest, sq: [q11, q12], sn: [n11, n12], fen: [f11en, f12en], far: [f11ar, f12ar] };
}

const students = {};
for (const d of draft) {
  if (!roster.has(d.id)) fail(`${d.id} is not in roster.csv`);
  const V = A.versions[d.v] ?? fail(`Unknown version ${d.v} for ${d.id}`);
  const obj = V.objective ?? [], shortQs = V.short ?? [];
  const ans = (d.mcq ?? '') + (d.tf ?? '');
  const sh = shortOf(d);
  const r = {
    obj: obj.map((o, i) => (ans[i] === o.key ? 1 : 0)),
    sq: sh.map((q) => [...(q.marks ?? [])]), sn: sh.map((q) => q.note ?? ''),
    fen: sh.map((q) => q.fb?.en ?? ''), far: sh.map((q) => q.fb?.ar ?? ''),
    wLevel: d.writing?.level ?? '', wTip: d.writing?.tip_ar ?? '', summaryExtra: '',
    ...(upgrade(saved?.students?.[d.id]) ?? {}),
  };
  shortQs.forEach((q, j) => {
    if (r.sq[j].length !== q.parts.length) fail(`${d.id}: question ${q.label ?? q.q} has ${r.sq[j].length} marks, expected ${q.parts.length}`);
    q.parts.forEach((p, k) => { if (r.sq[j][k] < 0 || r.sq[j][k] > p.max) fail(`${d.id}: ${p.label} mark ${r.sq[j][k]} is outside 0–${p.max}`); });
  });
  const score = Math.round((sum(r.obj) + r.sq.reduce((t, q) => t + sum(q), 0)) * 100) / 100;
  if (score > A.max) fail(`${d.id}: score ${score} is above the maximum ${A.max}`);

  const objOk = r.obj.every((x) => x === 1);
  let summary = `You scored ${fmt(score)} out of ${A.max}.` 
    + (!obj.length ? '' : objOk ? ' All your multiple-choice and true/false answers are correct.' : ' The questions you missed are explained below.');
  let summaryAr = `حصلت على ${fmt(score)} من ${A.max}.` 
    + (!obj.length ? '' : objOk ? ' إجاباتك في الاختيار من متعدد والصح والخطأ كلها صحيحة.' : ' الأسئلة التي أخطأت فيها مشروحة أدناه.');
  if (r.summaryExtra?.trim()) summary += ' ' + r.summaryExtra.trim();

  const points = [];
  obj.forEach((o, i) => {
    if (r.obj[i] === 1) return;
    const a = ans[i];
    const chose = a === '-' ? 'You left this blank.' : a === 'X' ? 'You marked two answers, which scores 0.' : `You chose ${word(a)}.`;
    points.push({ ref: `Q${o.q} · ${o.topic}`, text: `${chose} The answer is ${word(o.key)}. ${o.why}` });
  });
  shortQs.forEach((q, j) => {
    const max = sum(q.parts.map((p) => p.max));
    const marks = q.parts.length ? ` · ${fmt(sum(r.sq[j]))}/${fmt(max)}` : '';
    if (!r.fen[j] && !r.far[j]) return;
    const pt = { ref: `${q.label ?? 'Q' + q.q} · ${q.topic}${marks}`, text: r.fen[j] };
    if (r.far[j]) pt.textAr = r.far[j];
    points.push(pt);
  });
  const feedback = { summary, summaryAr, points };
  if (A.writingTip !== false && r.wTip) feedback.writing = { level: r.wLevel, tipAr: r.wTip };

  const pages = Array.from({ length: A.pages ?? 3 }, (_, i) => `batches/${batch}/web/${d.id}_p${i + 1}.webp`);
  for (const p of pages) if (!fs.existsSync(path.join(DATA, p))) fail(`${d.id}: missing ${p}`);
  students[d.id] = { status: 'graded', score, feedback, pages };
}

const out = {
  item: A.id,
  approved: !!approval,
  ...(approval ? { approvedOn: new Date().toISOString().slice(0, 10), approvalNote: approval } : {}),
  source: saved ? `${batch}.draft.json + ${batch}.review.json (saved ${saved.savedAt})` : `${batch}.draft.json (no edits saved on the review page)`,
  students,
};
fs.mkdirSync(path.join(DATA, 'results'), { recursive: true });
const file = path.join(DATA, 'results', `${A.id}.json`);
fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
const scores = Object.values(students).map((s) => s.score);
console.log(`${file}: ${scores.length} students, mean ${fmt(sum(scores) / scores.length)} / ${A.max}, ${approval ? 'APPROVED' : 'not approved'}${saved ? ', with saved review' : ''}.`);
