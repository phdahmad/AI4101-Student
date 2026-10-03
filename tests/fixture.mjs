// Builds a throw-away data folder with FAKE students (never real data in tests).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeCsv, writeJson } from '../tools/lib.mjs';
import { issueMissing } from '../tools/tokens.mjs';

const FIX = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

export const FAKE = [
  { id: '900000101', name: 'طالب تجريبي الأول', lab: '1' },
  { id: '900000202', name: 'طالب تجريبي الثاني', lab: '2' },
  { id: '90000303', name: 'طالب تجريبي الثالث', lab: '2' },
];

export function makeData({ approved = true } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ai4101-test-'));
  const data = path.join(root, 'data');
  fs.mkdirSync(path.join(data, 'results'), { recursive: true });
  fs.mkdirSync(path.join(data, 'batches', 'M1-ACT1', 'web'), { recursive: true });
  writeCsv(path.join(data, 'roster.csv'), FAKE, ['id', 'name', 'lab']);
  for (const [src, dst] of [['sample_p1', `${FAKE[0].id}_p1`], ['sample_p2', `${FAKE[0].id}_p2`], ['sample_b1', `${FAKE[1].id}_p1`]]) {
    fs.copyFileSync(path.join(FIX, src + '.webp'), path.join(data, 'batches', 'M1-ACT1', 'web', dst + '.webp'));
  }
  writeJson(path.join(data, 'items.json'), {
    course: { code: 'AI4101', title: 'Artificial Intelligence Principles', term: 'Test term' },
    categories: [
      { key: 'assignments', label: 'Assignments', weight: 10 },
      { key: 'quizzes', label: 'Quizzes', weight: 10 },
      { key: 'midterm', label: 'Midterm exam', weight: 20 },
      { key: 'project', label: 'Group project', weight: 20 },
      { key: 'final', label: 'Final exam', weight: 40 },
    ],
    items: [
      { id: 'M1-ACT1', kind: 'activity', title: 'Agent or Not?', module: 1, date: '2026-09-27', graded: false, state: 'published' },
      { id: 'Q1', kind: 'quiz', category: 'quizzes', title: 'Quiz 1', module: 2, date: '2026-10-04', graded: true, max: 16, weight: 2.5, state: 'published' },
      { id: 'A1', kind: 'assignment', category: 'assignments', title: 'Assignment 1', module: 2, graded: true, max: 10, weight: 2.5, state: 'upcoming' },
    ],
  });
  writeJson(path.join(data, 'results', 'M1-ACT1.json'), {
    item: 'M1-ACT1', approved,
    students: {
      [FAKE[0].id]: {
        status: 'completed',
        feedback: { summary: 'SECRET-FEEDBACK-A', points: [{ ref: 'Item 8', text: 'A fixed workflow decides nothing.' }] },
        pages: [`batches/M1-ACT1/web/${FAKE[0].id}_p1.webp`, `batches/M1-ACT1/web/${FAKE[0].id}_p2.webp`],
      },
      [FAKE[1].id]: {
        status: 'completed',
        feedback: { summary: 'SECRET-FEEDBACK-B', points: [] },
        pages: [`batches/M1-ACT1/web/${FAKE[1].id}_p1.webp`],
      },
    },
  });
  writeJson(path.join(data, 'results', 'Q1.json'), {
    item: 'Q1', approved,
    students: { [FAKE[0].id]: { status: 'graded', score: 12, feedback: { summary: 'Good work.' } } },
  });
  issueMissing(data);
  return { root, data, dist: path.join(root, 'dist') };
}
