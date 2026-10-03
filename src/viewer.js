// Full-screen viewer for scanned pages: pinch to zoom, double-tap to zoom,
// drag to pan, swipe (when not zoomed) or buttons/arrow keys to change page.
const $ = (id) => document.getElementById(id);

export function createViewer() {
  const root = $('viewer'), stage = $('viewerStage'), img = $('viewerImg');
  const count = $('viewerCount'), prev = $('viewerPrev'), next = $('viewerNext'), close = $('viewerClose');
  let urls = [], index = 0, lastFocus = null;
  let s = 1, tx = 0, ty = 0;               // scale and translation
  const pointers = new Map();
  let pinch = null, pan = null, swipeStart = null, lastTap = 0;

  const apply = () => { img.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`; };
  const reset = () => { s = 1; tx = 0; ty = 0; apply(); };

  function clamp() {
    // keep the zoomed image covering the stage
    const r = stage.getBoundingClientRect();
    const w = img.offsetWidth * s, h = img.offsetHeight * s;
    const ox = img.offsetLeft, oy = img.offsetTop;
    if (w <= r.width) tx = (r.width - w) / 2 - ox; else tx = Math.min(-ox, Math.max(r.width - w - ox, tx));
    if (h <= r.height) ty = (r.height - h) / 2 - oy; else ty = Math.min(-oy, Math.max(r.height - h - oy, ty));
  }

  // zoom to newScale around point (px, py) in stage coordinates
  function zoomAt(newScale, px, py) {
    newScale = Math.min(5, Math.max(1, newScale));
    const ox = img.offsetLeft, oy = img.offsetTop;
    const ix = (px - ox - tx) / s, iy = (py - oy - ty) / s; // point in image space
    s = newScale;
    tx = px - ox - ix * s; ty = py - oy - iy * s;
    if (s === 1) { tx = 0; ty = 0; } else clamp();
    apply();
  }

  function local(e) { const r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }

  stage.addEventListener('pointerdown', (e) => {
    stage.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, local(e));
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
      pan = null; swipeStart = null;
    } else if (pointers.size === 1) {
      const p = local(e);
      pan = { x: p.x, y: p.y, tx, ty };
      swipeStart = s === 1 ? { x: p.x, y: p.y, t: Date.now() } : null;
    }
  });
  stage.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, local(e));
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      zoomAt(pinch.s * (d / pinch.d), pinch.mx, pinch.my);
    } else if (pan && s > 1) {
      const p = local(e);
      tx = pan.tx + (p.x - pan.x); ty = pan.ty + (p.y - pan.y);
      clamp(); apply();
    }
  });
  const end = (e) => {
    const p = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (pointers.size === 0) {
      if (swipeStart && p && s === 1) {
        const dx = p.x - swipeStart.x, dy = p.y - swipeStart.y, dt = Date.now() - swipeStart.t;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && dt < 600) { go(index + (dx < 0 ? 1 : -1)); swipeStart = null; return; }
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
          const now = Date.now();
          if (now - lastTap < 300) { zoomAt(2.5, p.x, p.y); lastTap = 0; } else lastTap = now;
        }
      } else if (p && s > 1 && pan && Math.abs(p.x - pan.x) < 10 && Math.abs(p.y - pan.y) < 10) {
        const now = Date.now();
        if (now - lastTap < 300) { reset(); lastTap = 0; } else lastTap = now;
      }
      pan = null; swipeStart = null;
    }
  };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);
  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = local(e);
    zoomAt(s * (e.deltaY < 0 ? 1.15 : 1 / 1.15), p.x, p.y);
  }, { passive: false });

  function go(i) {
    if (i < 0 || i >= urls.length) return;
    index = i;
    img.src = urls[index];
    img.alt = `Scanned page ${index + 1} of ${urls.length}`;
    count.textContent = `Page ${index + 1} of ${urls.length}`;
    prev.disabled = index === 0;
    next.disabled = index === urls.length - 1;
    reset();
  }

  function onKey(e) {
    if (e.key === 'Escape') hide();
    else if (e.key === 'ArrowRight') go(index + 1);
    else if (e.key === 'ArrowLeft') go(index - 1);
  }

  function show(list, start = 0) {
    urls = list; lastFocus = document.activeElement;
    root.hidden = false;
    document.body.style.overflow = 'hidden';
    go(start);
    document.addEventListener('keydown', onKey);
    close.focus();
  }

  function hide() {
    root.hidden = true;
    document.body.style.overflow = '';
    img.removeAttribute('src');
    document.removeEventListener('keydown', onKey);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  prev.addEventListener('click', () => go(index - 1));
  next.addEventListener('click', () => go(index + 1));
  close.addEventListener('click', hide);
  window.addEventListener('resize', () => { if (!root.hidden) reset(); });

  return { show, hide, isOpen: () => !root.hidden };
}
