// Builds the teacher's internal review page for one marking batch.
//
//   node tools/review-page.mjs --batch Q1
//
// Reads from the data folder (never from the repo):
//   batches/<batch>/assessment.json   keys, topics, explanations, part labels
//   batches/<batch>/<batch>.draft.json the marking draft (one record per student)
//   batches/<batch>/<batch>.review.json the teacher's saved review, if any
//   roster.csv                         names and lab sections
// Writes batches/<batch>/review.html next to the scan images (web/*.webp).
// The page is for the teacher only: it is written into the data folder and is
// never copied to dist/ or published.
import fs from 'node:fs';
import path from 'node:path';
import { REPO, dataDir, argValue, readCsv, fail } from './lib.mjs';

const batch = argValue('--batch') ?? fail('Give the batch name, e.g. --batch Q1');
const DATA = dataDir();
const dir = path.join(DATA, 'batches', batch);
const need = (f) => { const p = path.join(dir, f); if (!fs.existsSync(p)) fail(`Missing ${p}`); return p; };
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

const assessment = readJson(need('assessment.json'));
const draft = readJson(need(`${batch}.draft.json`));
const reviewPath = path.join(dir, `${batch}.review.json`);
const saved = fs.existsSync(reviewPath) ? readJson(reviewPath) : null;

const names = new Map(readCsv(path.join(DATA, 'roster.csv')).map((r) => [r.id, { name: r.name, lab: r.lab }]));

const students = draft.map((d) => {
  const who = names.get(d.id) ?? fail(`Student ${d.id} is in the draft but not in roster.csv`);
  const v = assessment.versions[d.v] ?? fail(`Unknown version ${d.v} for ${d.id}`);
  const ans = d.mcq + d.tf;
  if (ans.length !== v.objective.length) fail(`${d.id}: ${ans.length} objective answers, expected ${v.objective.length}`);
  if (d.q11.length !== v.short[0].parts.length || d.q12.length !== v.short[1].parts.length) fail(`${d.id}: short-answer parts do not match the version`);
  for (const f of ['web']) if (!fs.existsSync(path.join(dir, f, `${d.id}_p1.webp`))) fail(`${d.id}: no scan images in ${f}/`);
  return { id: d.id, name: who.name, lab: who.lab, v: d.v, ans, flags: d.flags ?? [], second: d.second ?? '',
    t11: d.t11, t12: d.t12, q11: d.q11, q12: d.q12, n11: d.n11, n12: d.n12 };
});

const payload = { batch, generatedAt: new Date().toISOString(), assessment, students, saved, images: 'web/' };
// Keep "</script>" out of the inline JSON.
const json = JSON.stringify(payload).replace(/</g, '\\u003c');
const template = fs.readFileSync(path.join(REPO, 'review', 'review.template.html'), 'utf8');
if (!template.includes('/*__DATA__*/')) fail('Template placeholder not found');
const out = path.join(dir, 'review.html');
fs.writeFileSync(out, template.replace('/*__DATA__*/', () => json));
console.log(`Review page: ${out}`);
console.log(`${students.length} students${saved ? `, saved review from ${saved.savedAt} included` : ''}.`);
console.log('Open it in Chrome or Edge. Saving writes ' + `${batch}.review.json` + ' into this folder.');
