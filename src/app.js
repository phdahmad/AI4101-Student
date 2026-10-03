// AI4101 · My Work — student page. Everything happens in this browser:
// the code + ID unlock one encrypted bundle; nothing is sent anywhere.
import {
  ITERATIONS, normalizeId, normalizeToken, fromHex,
  deriveMaster, locatorOf, decryptBundle, unpackPayload,
} from './crypto.js?v=2';
import { createViewer } from './viewer.js?v=2';

const IDLE_MS = 15 * 60 * 1000;
const THEME_KEY = 'ai4101_portal_theme';
const KIND_ORDER = [
  ['activity', 'In-class activities'], ['quiz', 'Quizzes'], ['assignment', 'Assignments'],
  ['lab', 'Labs'], ['midterm', 'Midterm exam'], ['project', 'Group project'], ['final', 'Final exam'],
];
const KIND_SINGULAR = {
  activity: 'In-class activity', quiz: 'Quiz', assignment: 'Assignment', lab: 'Lab',
  midterm: 'Midterm exam', project: 'Group project', final: 'Final exam',
};
const STATUS_LABEL = {
  completed: 'Completed', graded: 'Marked', not_submitted: 'Not submitted',
  excused: 'Excused', marking: 'Being marked', upcoming: 'Not marked yet',
};

const $ = (id) => document.getElementById(id);
const views = { login: $('loginView'), home: $('homeView'), item: $('itemView') };
const viewer = createViewer();
let session = null;   // { data, blobs, urls: Map }
let idleTimer = null;

// ---------- small DOM helper (text only — never innerHTML with data) ----------
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : String(c));
  return el;
}
const svg = (d, cls = 'chev') => {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', cls); s.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', d); s.append(p);
  return s;
};
const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, ''));
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : null;
};

// ---------- theme ----------
function storedTheme() { try { return localStorage.getItem(THEME_KEY); } catch { return null; } }
function applyTheme(t) { if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; }
applyTheme(storedTheme());
$('themeBtn').addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme
    ? document.documentElement.dataset.theme === 'dark'
    : matchMedia('(prefers-color-scheme: dark)').matches;
  const next = dark ? 'light' : 'dark';
  applyTheme(next);
  try { localStorage.setItem(THEME_KEY, next); } catch { /* private mode */ }
});

// ---------- views ----------
function show(name) {
  for (const [k, el] of Object.entries(views)) el.hidden = k !== name;
  $('signOutBtn').hidden = name === 'login';
  window.scrollTo(0, 0);
  $('main').focus({ preventScroll: true });
}

// ---------- sign in ----------
const form = $('loginForm'), btn = $('loginBtn'), err = $('loginError'), notice = $('loginNotice');

$('code').addEventListener('input', (e) => {
  // friendly grouping: XXXX-XXXX-XXXX while typing
  const raw = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 12);
  const grouped = raw.match(/.{1,4}/g)?.join('-') ?? '';
  if (grouped !== e.target.value) e.target.value = grouped;
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  err.hidden = true; notice.hidden = true;
  btn.disabled = true;
  btn.querySelector('.btn-label').textContent = 'Opening…';
  try {
    session = await unlock($('sid').value, $('code').value);
    form.reset();
    renderHome();
    history.replaceState({ view: 'home' }, '');
    show('home');
    armIdle();
  } catch (ex) {
    if (ex && ex.message === 'offline') {
      notice.textContent = 'Could not reach the page. Check your internet connection and try again.';
      notice.hidden = false;
    } else {
      err.hidden = false;
    }
    $('code').select();
  } finally {
    btn.disabled = false;
    btn.querySelector('.btn-label').textContent = 'Open my work';
  }
});

async function unlock(rawId, rawCode) {
  let meta;
  try {
    const r = await fetch('meta.json', { cache: 'no-store' });
    if (!r.ok) throw new Error();
    meta = await r.json();
  } catch { throw new Error('offline'); }
  if (!(meta.iterations >= ITERATIONS)) throw new Error('weak build');

  const id = normalizeId(rawId), code = normalizeToken(rawCode);
  // Same work whether or not the input is well-formed, so timing reveals nothing.
  const master = await deriveMaster(id ?? '0', code ?? 'INVALIDINPUT', fromHex(meta.deploySalt), meta.iterations);
  if (!id || !code) throw new Error('denied');
  const loc = await locatorOf(master);
  let res;
  try { res = await fetch(`bundles/${loc}.bin`, { cache: 'no-store' }); } catch { throw new Error('offline'); }
  if (!res.ok) throw new Error('denied');
  let plain;
  try { plain = await decryptBundle(master, loc, new Uint8Array(await res.arrayBuffer())); } catch { throw new Error('denied'); }
  master.fill(0);
  const { data, blobs } = unpackPayload(plain);
  if (data.student?.id !== id) throw new Error('denied');
  return { data, blobs, urls: new Map() };
}

function blobUrl(i) {
  if (!session.urls.has(i)) {
    const b = session.blobs[i];
    session.urls.set(i, URL.createObjectURL(new Blob([b.bytes], { type: b.type })));
  }
  return session.urls.get(i);
}

function signOut(reason) {
  if (viewer.isOpen()) viewer.hide();
  if (session) for (const u of session.urls.values()) URL.revokeObjectURL(u);
  session = null;
  clearTimeout(idleTimer);
  views.home.replaceChildren(); views.item.replaceChildren();
  form.reset(); err.hidden = true;
  notice.hidden = !reason; notice.textContent = reason ?? '';
  history.replaceState(null, '');
  show('login');
}
$('signOutBtn').addEventListener('click', () => signOut());

function armIdle() {
  clearTimeout(idleTimer);
  if (session) idleTimer = setTimeout(() => signOut('You were signed out after 15 minutes without activity.'), IDLE_MS);
}
for (const ev of ['pointerdown', 'keydown', 'scroll', 'touchstart']) addEventListener(ev, armIdle, { passive: true });

addEventListener('popstate', (e) => {
  if (!session) return;
  if (viewer.isOpen()) viewer.hide();
  if (e.state?.view === 'item') renderItem(e.state.id, false);
  else { show('home'); }
});

// ---------- home ----------
function chip(status) { return h('span', { class: `chip ${status}` }, STATUS_LABEL[status] ?? status); }

function renderHome() {
  const { student, categories, items, course } = session.data;
  const lab = student.lab ? `Lab section ${student.lab}` : null;

  const hello = h('div', { class: 'hello' },
    h('p', { class: 'eyebrow' }, `${course?.code ?? 'AI4101'} · ${course?.term ?? ''}`.replace(/ · $/, '')),
    h('h1', { id: 'homeTitle' }, h('bdi', { class: 'name', dir: 'rtl', lang: 'ar' }, student.name)),
    h('p', { class: 'hello-meta' },
      h('span', {}, 'ID ', h('span', { class: 'mono' }, student.id)),
      lab && h('span', {}, lab)));

  const rows = categories.map((c) => h('li', { class: 'marks-row' },
    h('span', { class: 'cat' }, c.label, h('span', { class: 'weight' }, `${c.weight}% of the course`)),
    c.recorded
      ? h('span', { class: 'val' }, `${fmt(c.earned)} / ${fmt(c.outOf)}`)
      : h('span', { class: 'val none' }, 'Not marked yet')));
  const marks = h('section', { class: 'card marks', 'aria-labelledby': 'marksTitle' },
    h('h2', { id: 'marksTitle' }, 'Course marks so far'),
    h('p', { class: 'marks-sub' }, 'Marks count toward your course grade only after each assessment is marked.'),
    h('ul', { class: 'marks-grid' }, rows),
    h('p', { class: 'marks-note' }, 'Your official grade is the one on the university system.'));

  const groups = KIND_ORDER.map(([kind, label]) => {
    const list = items.filter((i) => i.kind === kind);
    if (!list.length) return null;
    return h('section', { class: 'group' },
      h('h2', {}, label, h('span', { class: 'count' }, String(list.length))),
      h('ul', { class: 'items' }, list.map(itemCard)));
  });

  views.home.replaceChildren(hello, marks, ...groups.filter(Boolean));
}

function itemCard(it) {
  const open = it.state === 'published';
  const sub = [it.module ? `Module ${it.module}` : null, fmtDate(it.date)].filter(Boolean).join(' · ');
  const side = h('span', { class: 'item-side' },
    chip(it.status),
    it.status === 'graded' && h('span', { class: 'item-score' }, `${fmt(it.score)} / ${fmt(it.max)}`));
  return h('li', {}, h('button', {
    type: 'button', class: 'item-btn', disabled: !open,
    onclick: () => { history.pushState({ view: 'item', id: it.id }, ''); renderItem(it.id); },
  },
  h('span', { class: 'item-title' }, it.title),
  sub && h('span', { class: 'item-sub' }, sub),
  side));
}

// ---------- one item ----------
function renderItem(id) {
  const it = session.data.items.find((x) => x.id === id);
  if (!it) return;
  const kindLabel = KIND_SINGULAR[it.kind] ?? '';
  const meta = [kindLabel, it.module ? `Module ${it.module}` : null, fmtDate(it.date)].filter(Boolean).join(' · ');

  const parts = [
    h('button', { type: 'button', class: 'back', onclick: () => history.back() },
      svg('M15 5l-7 7 7 7'), 'All my work'),
    h('div', { class: 'item-head' },
      h('h1', {}, it.title),
      h('div', { class: 'row' }, chip(it.status), h('span', {}, meta))),
  ];

  if (it.status === 'graded') {
    parts.push(h('div', { class: 'score-box' },
      h('span', { class: 'big' }, `${fmt(it.score)} / ${fmt(it.max)}`),
      it.scaled != null && h('span', {}, `= ${fmt(it.scaled)} of ${fmt(it.weight)} course marks`)));
  }

  const intro = {
    completed: it.graded ? null : 'You completed this activity. It is not graded — the feedback below is to help you learn.',
    not_submitted: 'We have no sheet from you for this one. If you think this is a mistake, tell your instructor.',
    excused: 'You are excused from this one. It does not count against you.',
  }[it.status];

  const fb = it.feedback;
  if (intro || fb) {
    const panel = h('section', { class: 'card panel', 'aria-labelledby': 'fbTitle' }, h('h2', { id: 'fbTitle' }, fb ? 'Feedback' : 'Status'));
    if (intro) panel.append(h('p', { class: 'muted' }, intro));
    if (fb?.summary) panel.append(h('p', {}, fb.summary));
    if (fb?.points?.length) {
      panel.append(h('ul', { class: 'points' }, fb.points.map((p) =>
        h('li', {}, p.ref && h('span', { class: 'ref' }, p.ref), p.text))));
    }
    if (fb) panel.append(h('p', { class: 'review-note' }, 'Reviewed by your instructor.'));
    parts.push(panel);
  }

  if (it.pages?.length) {
    const urls = it.pages.map(blobUrl);
    parts.push(h('section', { class: 'card panel', 'aria-labelledby': 'pgTitle' },
      h('h2', { id: 'pgTitle' }, 'Your sheet'),
      h('p', { class: 'muted' }, 'Tap a page to open it. Pinch or double-tap to zoom.'),
      h('div', { class: 'pages' }, urls.map((u, i) =>
        h('button', { type: 'button', class: 'page-thumb', onclick: () => viewer.show(urls, i), 'aria-label': `Open page ${i + 1}` },
          h('img', { src: u, alt: '', loading: 'lazy' }), h('span', {}, `Page ${i + 1}`))))));
  }

  views.item.replaceChildren(...parts);
  show('item');
}
