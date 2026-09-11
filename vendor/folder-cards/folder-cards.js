/**
 * Frosted folder cards — adapted from
 * https://github.com/fayazara/portfolio-site-template (MIT)
 */
import { animate, hover } from 'https://cdn.jsdelivr.net/npm/motion@12.43.0/+esm';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const instant = { duration: 0 };
const spring = (s) => (reduced ? instant : s);

const openSpring = { type: 'spring', duration: 0.28, bounce: 0.18 };
const closeSpring = { type: 'spring', duration: 0.2, bounce: 0.05 };
const focusSpring = { type: 'spring', duration: 0.2, bounce: 0.12 };
const flingSpring = { type: 'spring', duration: 0.28, bounce: 0.12 };
const stageSpring = { type: 'spring', duration: 0.32, bounce: 0.12 };
const homeSpring = { type: 'spring', duration: 0.3, bounce: 0.08 };
const shutSpring = { type: 'spring', duration: 0.2, bounce: 0.06 };

const FSTAGE_HINT_INNER = `
      <span class="fstage-hint-keys">
        <span class="fstage-hint-group">
          <span class="fstage-hint-label">Previous</span>
          <button type="button" class="fstage-key fstage-key-prev" aria-label="Previous item">
            <span class="fstage-key-cap"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          </button>
        </span>
        <span class="fstage-hint-group">
          <button type="button" class="fstage-key fstage-key-next" aria-label="Next item">
            <span class="fstage-key-cap"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          </button>
          <span class="fstage-hint-label">Next</span>
        </span>
      </span>`;

const PUSH = 4;
const SIDE = 0.6;
const GAP = 0.08;
/* Keep staged media clear of the title bar + bottom chrome */
const STAGE_TOP = 112;
const STAGE_BOTTOM = 72;
const STAGE_BOTTOM_TRY = 156;
const stageBottom = () => (stage?.slug === 'chatbot' ? STAGE_BOTTOM_TRY : STAGE_BOTTOM);
const stageSafeH = () => Math.max(240, innerHeight - STAGE_TOP - stageBottom());
const stageCenterY = () => STAGE_TOP + stageSafeH() / 2;

const tilt = (i) => {
  const n = Math.sin((i + 1) * 127.1) * 43758.5453;
  return (n - Math.floor(n)) * 12 - 6;
};

const controllers = new Map();
let stage = null;
let bootstrapped = false;

function hydrateFolderMedia(folder) {
  folder.querySelectorAll('video[data-src]').forEach((video) => {
    if (video.getAttribute('src')) return;
    video.src = video.dataset.src;
    video.preload = 'metadata';
  });
}

function ensureCloseButton() {
  let closeBtn = document.querySelector('.fstage-close');
  if (!closeBtn) {
    closeBtn = document.createElement('button');
    closeBtn.className = 'fstage-close';
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close');
    document.body.appendChild(closeBtn);
  } else if (closeBtn.closest('.fstage')) {
    document.body.appendChild(closeBtn);
  }
  return closeBtn;
}

function ensureTryButton() {
  let tryBtn = document.querySelector('.fstage-try-btn');
  if (!tryBtn) {
    tryBtn = document.createElement('button');
    tryBtn.className = 'fstage-try-btn';
    tryBtn.type = 'button';
    tryBtn.setAttribute('aria-label', 'Try the chatbot');
    tryBtn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3L13.4302 8.31181C13.6047 8.96 13.692 9.28409 13.8642 9.54905C14.0166 9.78349 14.2165 9.98336 14.451 10.1358C14.7159 10.308 15.04 10.3953 15.6882 10.5698L21 12L15.6882 13.4302C15.04 13.6047 14.7159 13.692 14.451 13.8642C14.2165 14.0166 14.0166 14.2165 13.8642 14.451C13.692 14.7159 13.6047 15.04 13.4302 15.6882L12 21L10.5698 15.6882C10.3953 15.04 10.308 14.7159 10.1358 14.451C9.98336 14.2165 9.78349 14.0166 9.54905 13.8642C9.28409 13.692 8.96 13.6047 8.31181 13.4302L3 12L8.31181 10.5698C8.96 10.3953 9.28409 10.308 9.54905 10.1358C9.78349 9.98336 9.98336 9.78349 10.1358 9.54905C10.308 9.28409 10.3953 8.96 10.5698 8.31181L12 3Z"/></svg>Try it';
    document.body.appendChild(tryBtn);
  } else if (tryBtn.closest('.fstage')) {
    document.body.appendChild(tryBtn);
  }
  return tryBtn;
}

function updateStageHint() {
  if (!stage || stage.closing) return;
  const hintPrev = document.querySelector('.fstage-key-prev');
  const hintNext = document.querySelector('.fstage-key-next');
  const atStart = stage.active <= 0;
  const atEnd = stage.active >= stage.c.items.length - 1;
  if (hintPrev) {
    hintPrev.disabled = atStart;
    hintPrev.setAttribute('aria-disabled', atStart ? 'true' : 'false');
  }
  if (hintNext) {
    hintNext.disabled = atEnd;
    hintNext.setAttribute('aria-disabled', atEnd ? 'true' : 'false');
  }
}

function ensureOverlay() {
  let overlay = document.querySelector('.fstage');
  if (overlay) {
    ensureCloseButton();
    ensureTryButton();
    return overlay;
  }

  overlay = document.createElement('div');
  overlay.className = 'fstage';
  overlay.innerHTML = `
    <div class="fstage-backdrop" aria-hidden="true"></div>
    <header class="fstage-bar">
      <div>
        <p class="fstage-title"></p>
        <p class="fstage-meta"></p>
      </div>
    </header>
    <p class="fstage-hint">${FSTAGE_HINT_INNER}</p>`;
  document.body.appendChild(overlay);
  ensureCloseButton();
  ensureTryButton();
  return overlay;
}

function isNote(c, i) {
  return c.items[i].dataset.kind === 'note';
}

function baseCenter(c, i) {
  const rect = c.wrap.getBoundingClientRect();
  const item = c.items[i];
  return {
    x: rect.left + item.offsetLeft + item.offsetWidth / 2,
    y: rect.top + item.offsetTop + item.offsetHeight / 2,
  };
}

/** Lay out stage cards near final size so Motion scale≈1 (keeps photos + type sharp). */
function sizeStageItems(c, enable) {
  c.items.forEach((item) => {
    const kind = item.dataset.kind;
    if (kind !== 'photo' && kind !== 'note' && kind !== 'video') return;

    if (!enable) {
      if (item.dataset.foldW != null) {
        item.style.width = item.dataset.foldW;
        item.style.height = item.dataset.foldH;
        item.style.marginLeft = item.dataset.foldMl;
        item.style.aspectRatio = item.dataset.foldAr;
        delete item.dataset.foldW;
        delete item.dataset.foldH;
        delete item.dataset.foldMl;
        delete item.dataset.foldAr;
      }
      return;
    }

    item.dataset.foldW = item.style.width;
    item.dataset.foldH = item.style.height;
    item.dataset.foldMl = item.style.marginLeft;
    item.dataset.foldAr = item.style.aspectRatio;

    if (kind === 'photo' || kind === 'video') {
      const media = kind === 'video' ? item.querySelector('video') : item.querySelector('img');
      const nw = (kind === 'video' ? media?.videoWidth : media?.naturalWidth) || 0;
      const nh = (kind === 'video' ? media?.videoHeight : media?.naturalHeight) || 0;
      if (!nw || !nh) return;
      const maxW = Math.min(innerWidth * (kind === 'video' ? 0.64 : 0.78), kind === 'video' ? 780 : 980);
      const maxH = stageSafeH() * (kind === 'video' ? 0.88 : 0.92);
      const scale = Math.min(maxW / nw, maxH / nh);
      const w = Math.max(1, Math.round(nw * scale));
      const h = Math.max(1, Math.round(nh * scale));
      item.style.width = `${w}px`;
      item.style.height = `${h}px`;
      item.style.marginLeft = `${-w / 2}px`;
      item.style.aspectRatio = 'auto';
      return;
    }

    /* Notes: readable layout size — avoid transform-upscaling tiny folder type. */
    const maxW = Math.min(innerWidth * 0.38, 400);
    const maxH = Math.min(stageSafeH() * 0.85, 520);
    const ar = 3 / 4.2;
    let w = maxW;
    let h = w / ar;
    if (h > maxH) {
      h = maxH;
      w = h * ar;
    }
    w = Math.max(1, Math.round(w));
    h = Math.max(1, Math.round(h));
    item.style.width = `${w}px`;
    item.style.height = `${h}px`;
    item.style.marginLeft = `${-w / 2}px`;
    item.style.aspectRatio = 'auto';
  });
}

function render(opts, stagger = 0) {
  if (!stage) return;
  const { c, active, base } = stage;
  const safeH = stageSafeH();
  const unit = Math.min(innerWidth * 0.78, safeH * 0.92);

  const fit = (i) => {
    const item = c.items[i];
    /*
     * Photos + notes are pre-sized via sizeStageItems — keep active at 1 so
     * type and bitmaps aren't transform-upscaled (looks pixelated).
     */
    if (item.dataset.kind === 'photo' || item.dataset.kind === 'note' || item.dataset.kind === 'video') {
      const s = Math.min(
        (innerWidth * 0.78) / Math.max(item.offsetWidth, 1),
        safeH / Math.max(item.offsetHeight, 1),
        1,
      );
      return i === active ? s : s * SIDE;
    }
    const s = unit / Math.max(item.offsetWidth, item.offsetHeight, 1);
    return i === active ? s : s * SIDE;
  };

  const halfCentre = (fit(active) * c.items[active].offsetWidth) / 2;
  const reach = halfCentre + unit * GAP + (unit * SIDE) / 2;
  const midY = stageCenterY();

  c.items.forEach((item, i) => {
    const d = i - active;
    const x =
      d === 0
        ? innerWidth / 2
        : innerWidth / 2 +
          Math.sign(d) * (reach + (Math.abs(d) - 1) * unit * (SIDE + GAP));
    item.style.zIndex = String(30 + c.items.length - Math.abs(d));
    animate(
      item,
      {
        x: x - base[i].x,
        y: midY - base[i].y,
        scale: fit(i),
        rotate: d === 0 ? 0 : tilt(i),
        opacity: Math.max(0.3, 1 - Math.abs(d) * 0.16),
      },
      { ...opts, delay: Math.abs(d) * stagger },
    );
  });
}

async function openStage(slug, push) {
  const c = controllers.get(slug);
  if (!c || stage) return;
  const overlay = ensureOverlay();
  const overlayTitle = overlay.querySelector('.fstage-title');
  const overlayMeta = overlay.querySelector('.fstage-meta');

  stage = { slug, c, active: 0, base: [], closing: false };

  if (push) {
    history.pushState(
      { folder: slug },
      '',
      `${location.pathname}${location.search}#folder-${slug}`,
    );
  }

  overlayTitle.textContent = c.folder.dataset.title ?? '';
  overlayMeta.textContent = c.folder.dataset.meta ?? '';

  const tryBtn = ensureTryButton();
  const showTry = slug === 'chatbot';
  tryBtn.classList.toggle('is-visible', showTry);
  document.body.classList.toggle('folder-stage-try', showTry);

  overlay.classList.add('is-open');
  document.body.classList.add('folder-stage-open');
  document.documentElement.style.overflow = 'hidden';
  c.folder.classList.add('is-stage', 'is-scaled');
  c.folder.closest('.ai-labs-folders')?.classList.add('is-staging');

  hydrateFolderMedia(c.folder);

  await Promise.all(
    c.items.map(async (item) => {
      const img = item.querySelector('img');
      const video = item.querySelector('video');
      if (img) {
        if (!img.complete) {
          await new Promise((resolve) => {
            img.addEventListener('load', resolve, { once: true });
            img.addEventListener('error', resolve, { once: true });
          });
        }
        try {
          await img.decode();
        } catch {
          /* ignore decode failures; natural size may still be available */
        }
        return;
      }
      if (video) {
        if (video.readyState < 1) {
          await new Promise((resolve) => {
            video.addEventListener('loadedmetadata', resolve, { once: true });
            video.addEventListener('error', resolve, { once: true });
          });
        }
        try {
          await video.play();
        } catch {
          /* autoplay may be blocked; still show the frame */
        }
      }
    }),
  );
  /* Bail if a close happened while we waited on images. */
  if (!stage || stage.slug !== slug || stage.closing) return;

  sizeStageItems(c, true);
  /* Force layout with stage photo sizes before measuring centers / scale. */
  void c.folder.offsetWidth;

  c.items.forEach((item, i) => {
    stage.base[i] = baseCenter(c, i);
    const m = new DOMMatrix(getComputedStyle(item).transform);
    animate(
      item,
      {
        x: m.e,
        y: m.f,
        scale: Math.hypot(m.a, m.b) || 1,
        rotate: (Math.atan2(m.b, m.a) * 180) / Math.PI,
      },
      instant,
    );
  });

  animate(c.flap, { rotateX: -80, opacity: 0 }, spring(flingSpring));
  render(spring(stageSpring), 0.02);
  updateStageHint();
}

async function closeStage() {
  if (!stage || stage.closing) return;
  stage.closing = true;
  const { c } = stage;
  const overlay = ensureOverlay();

  overlay.classList.remove('is-open');
  document.body.classList.remove('folder-stage-open', 'folder-stage-try');
  ensureTryButton().classList.remove('is-visible');
  document.documentElement.style.overflow = '';
  c.items.forEach((item) => {
    const video = item.querySelector('video');
    if (video) {
      video.pause();
      try { video.currentTime = 0; } catch { /* ignore */ }
    }
  });

  /*
   * FLIP close: photos are laid out at stage size for sharpness, so restoring
   * folder % widths would snap. Capture visuals, restore layout, invert with
   * transform, then spring home — all in one frame before paint.
   */
  const first = c.items.map((item) => {
    const r = item.getBoundingClientRect();
    const m = new DOMMatrix(getComputedStyle(item).transform);
    return {
      cx: r.left + r.width / 2,
      cy: r.top + r.height / 2,
      w: Math.max(r.width, 1),
      rotate: (Math.atan2(m.b, m.a) * 180) / Math.PI,
      opacity: Number.parseFloat(getComputedStyle(item).opacity) || 1,
    };
  });

  c.folder.classList.remove('is-scaled');
  sizeStageItems(c, false);

  c.items.forEach((item) => {
    animate(item, { x: 0, y: 0, scale: 1, rotate: 0 }, instant);
  });
  void c.folder.offsetWidth;

  const last = c.items.map((item) => {
    const r = item.getBoundingClientRect();
    return {
      cx: r.left + r.width / 2,
      cy: r.top + r.height / 2,
      w: Math.max(r.width, 1),
    };
  });

  c.items.forEach((item, i) => {
    animate(
      item,
      {
        x: first[i].cx - last[i].cx,
        y: first[i].cy - last[i].cy,
        scale: first[i].w / last[i].w,
        rotate: first[i].rotate,
        opacity: first[i].opacity,
      },
      instant,
    );
  });
  void c.folder.offsetWidth;

  const w = c.wrap.offsetWidth;
  /* Let the glass flap animate (CSS was forcing it hidden during stage). */
  c.folder.classList.add('is-closing');
  animate(c.flap, { rotateX: -80, opacity: 0 }, instant);

  const cardsHome = Promise.all(
    c.items.map(
      (item, i) =>
        animate(
          item,
          {
            x: ((c.offset(i) * 6) / 100) * w,
            y: 0,
            rotate: c.closedRotate(i),
            scale: 1,
            opacity: 1,
          },
          { ...spring(homeSpring), delay: Math.abs(c.offset(i)) * 0.012 },
        ).finished,
    ),
  );

  /* Shut the flap with the cards — not after they finish landing. */
  const flapShut = animate(
    c.flap,
    { rotateX: 0, opacity: 1 },
    { ...spring(shutSpring), delay: reduced ? 0 : 0.08 },
  ).finished;

  await Promise.all([cardsHome, flapShut]);

  c.deactivate();
  c.items.forEach((item, i) => animate(item, c.closedPct(i), instant));
  c.folder.classList.remove('is-stage', 'is-closing');
  c.folder.closest('.ai-labs-folders')?.classList.remove('is-staging');
  stage = null;
  updateStageHint();
}

function go(next) {
  if (!stage || stage.closing) return;
  const clamped = Math.max(0, Math.min(stage.c.items.length - 1, next));
  if (clamped === stage.active) return;
  stage.active = clamped;
  render(spring(stageSpring));
  updateStageHint();
}

const PEEK_COPY = ['you found this.', 'nice peel.', 'still sticky.', 'keep looking.'];
const PEEL_HINT = 0;

function bindStickyPeel(note, index) {
  const frame = note.parentElement;
  if (!frame || note.dataset.peelBound) return;
  note.dataset.peelBound = '1';

  const flap = document.createElement('div');
  flap.className = 'sticky-peel-flap';
  flap.setAttribute('aria-hidden', 'true');
  flap.innerHTML = `<span class="sticky-peel-back">${PEEK_COPY[index % PEEK_COPY.length]}</span>`;

  const hit = document.createElement('div');
  hit.className = 'sticky-peel-hit';
  hit.setAttribute('aria-hidden', 'true');

  frame.append(flap, hit);

  const setPeel = (px, peeling) => {
    const size = Math.max(note.offsetWidth, note.offsetHeight, 1);
    const max = size * 0.62;
    const next = Math.max(PEEL_HINT, Math.min(max, px));
    frame.style.setProperty('--peel-px', `${next}px`);
    note.style.setProperty('--peel-px', `${next}px`);
    note.classList.toggle('is-peeling', peeling);
    frame.classList.toggle('is-peeling', peeling);
    frame.classList.toggle('is-peeled', next > max * 0.42);
  };

  const release = () => {
    note.classList.remove('is-peeling');
    frame.classList.remove('is-peeling');
    note.classList.add('is-unpeeling');
    frame.classList.remove('is-peeled');
    frame.style.setProperty('--peel-px', `${PEEL_HINT}px`);
    note.style.setProperty('--peel-px', `${PEEL_HINT}px`);
    const done = () => note.classList.remove('is-unpeeling');
    note.addEventListener('transitionend', done, { once: true });
    setTimeout(done, 560);
  };

  let dragging = false;

  hit.addEventListener('pointerdown', (event) => {
    if (!note.closest('.folder.is-stage')) return;
    event.preventDefault();
    event.stopPropagation();
    dragging = true;
    note.classList.remove('is-unpeeling');
    hit.setPointerCapture(event.pointerId);
    setPeel(PEEL_HINT + 8, true);
  });

  hit.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    event.preventDefault();
    const rect = note.getBoundingClientRect();
    const dist = Math.hypot(rect.right - event.clientX, rect.bottom - event.clientY);
    setPeel(dist * 1.05, true);
  });

  const stopDrag = (event) => {
    if (!dragging) return;
    dragging = false;
    try {
      hit.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }
    release();
  };

  hit.addEventListener('pointerup', stopDrag);
  hit.addEventListener('pointercancel', stopDrag);
  hit.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
}

function requestClose() {
  if (!stage || stage.closing) return;
  const { slug } = stage;
  if (location.hash === `#folder-${slug}`) {
    history.replaceState(
      null,
      '',
      `${location.pathname}${location.search}#Selectedworks-ai-labs`,
    );
  }
  closeStage();
}

function bindFolder(folder) {
  const slug = folder.dataset.folder ?? '';
  if (!slug || controllers.has(slug)) return;

  const flap = folder.querySelector('[data-folder-flap]');
  const wrap = flap && flap.parentElement;
  const items = [...folder.querySelectorAll('[data-folder-item]')];
  if (!flap || !wrap || !items.length) return;

  const mid = (items.length - 1) / 2;
  const offset = (i) => i - mid;
  const gaps = Math.max(items.length - 1, 1);
  const widthOf = (el) => Number(el.dataset.w) || 36;
  const step = (100 - Math.max(...items.map(widthOf))) / gaps;
  const toEl = (i, folderPct) => `${(folderPct / widthOf(items[i])) * 100}%`;

  let expanded = false;
  let focused = null;

  const naturalZ = (i) => items.length - Math.round(Math.abs(offset(i)));
  const restack = () =>
    items.forEach((item, i) => {
      item.style.zIndex = String(i === focused ? items.length + 1 : naturalZ(i));
    });

  const closedRotate = (i) => offset(i) * (6 / gaps);
  const closedPct = (i) => ({
    x: toEl(i, offset(i) * 6),
    y: '0%',
    rotate: closedRotate(i),
    scale: 1,
    opacity: 1,
  });

  const positionOf = (i) => {
    if (!expanded) return closedPct(i);
    const isFocus = i === focused;
    const yields = focused !== null && !isFocus;
    return {
      x: toEl(i, offset(i) * step + (yields ? Math.sign(i - focused) * PUSH : 0)),
      y: isFocus ? '-34%' : '-24%',
      rotate: isFocus ? 0 : offset(i) * (11 / gaps),
      scale: isFocus ? 1.05 : 1,
    };
  };

  const apply = (s, stagger = 0) =>
    items.forEach((item, i) =>
      animate(item, positionOf(i), {
        ...s,
        delay: Math.abs(offset(i)) * stagger,
      }),
    );

  restack();
  apply(instant);
  folder.addEventListener('pointerenter', () => hydrateFolderMedia(folder), { once: true, passive: true });
  folder.addEventListener('focus', () => hydrateFolderMedia(folder), { once: true });
  items.forEach((item, i) => {
    const note = item.querySelector('.folder-note');
    if (note) bindStickyPeel(note, i);
  });

  const setOpen = (isOpen) => {
    expanded = isOpen;
    if (!isOpen) focused = null;
    restack();
    animate(flap, { rotateX: isOpen ? -30 : 0 }, spring(isOpen ? openSpring : closeSpring));
    apply(spring(isOpen ? openSpring : closeSpring), isOpen ? 0.012 : 0.008);
  };

  controllers.set(slug, {
    slug,
    folder,
    wrap,
    flap,
    items,
    offset,
    gaps,
    closedPct,
    closedRotate,
    restack,
    deactivate() {
      expanded = false;
      focused = null;
    },
  });

  hover(folder, () => {
    if (stage) return;
    setOpen(true);
    return () => {
      if (stage) return;
      setOpen(false);
    };
  });

  items.forEach((item, i) =>
    hover(item, () => {
      if (stage) return;
      focused = i;
      restack();
      apply(spring(focusSpring));
      return () => {
        if (stage) return;
        if (focused === i) focused = null;
        apply(spring(focusSpring));
      };
    }),
  );

  folder.addEventListener('focusin', () => !stage && setOpen(true));
  folder.addEventListener('focusout', () => !stage && setOpen(false));

  folder.addEventListener('click', (event) => {
    if (event.target.closest('.sticky-peel-hit')) return;
    event.preventDefault();
    if (stage && stage.c === controllers.get(slug) && !stage.closing) {
      const hit = event.target.closest('[data-folder-item]');
      if (hit) go(items.indexOf(hit));
      else requestClose();
      return;
    }
    if (!stage) openStage(slug, true);
  });
}

function bindGlobalOnce() {
  if (bootstrapped) return;
  bootstrapped = true;

  const overlay = ensureOverlay();
  document.querySelector('.fstage-nav')?.remove();
  if (!overlay.querySelector('.fstage-backdrop')) {
    overlay.insertAdjacentHTML(
      'afterbegin',
      '<div class="fstage-backdrop" aria-hidden="true"></div>',
    );
  }
  const closeBtn = ensureCloseButton();
  const backdrop = overlay.querySelector('.fstage-backdrop');
  const hint = overlay.querySelector('.fstage-hint');
  if (hint && !hint.querySelector('.fstage-key-prev')) {
    hint.innerHTML = FSTAGE_HINT_INNER;
  }

  const hintPrev = overlay.querySelector('.fstage-key-prev');
  const hintNext = overlay.querySelector('.fstage-key-next');

  if (hintPrev && !hintPrev.dataset.bound) {
    hintPrev.dataset.bound = '1';
    hintPrev.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      go(stage.active - 1);
    });
  }

  if (hintNext && !hintNext.dataset.bound) {
    hintNext.dataset.bound = '1';
    hintNext.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      go(stage.active + 1);
    });
  }

  if (!closeBtn.dataset.bound) {
    closeBtn.dataset.bound = '1';
    closeBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      requestClose();
    });
  }

  if (!backdrop?.dataset.bound) {
    backdrop.dataset.bound = '1';
    backdrop.addEventListener('click', () => {
      requestClose();
    });
  }

  const tryBtn = ensureTryButton();

  if (!tryBtn.dataset.bound) {
    tryBtn.dataset.bound = '1';
    tryBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      requestClose();
      setTimeout(() => {
        const chatTrigger = document.querySelector('.srini-chat-trigger');
        if (chatTrigger) chatTrigger.click();
      }, 280);
    });
  }

  addEventListener('keydown', (event) => {
    if (!stage || stage.closing) return;
    if (event.key === 'ArrowRight') go(stage.active + 1);
    else if (event.key === 'ArrowLeft') go(stage.active - 1);
    else if (event.key === 'Escape') requestClose();
    else return;
    event.preventDefault();
  });

  addEventListener('popstate', () => {
    const hash = location.hash.replace(/^#/, '');
    const slug = hash.startsWith('folder-') ? hash.slice(7) : '';
    if (stage) {
      if (slug !== stage.slug) closeStage();
    } else if (slug && controllers.has(slug)) {
      openStage(slug, false);
    }
  });

  addEventListener('resize', () => {
    if (!stage || stage.closing) return;
    stage.base = stage.c.items.map((_, i) => baseCenter(stage.c, i));
    render(instant);
  });
}

export function initFolderCards(root = document) {
  bindGlobalOnce();
  root.querySelectorAll('[data-folder]').forEach(bindFolder);
}

export function refreshFolderCards(root = document) {
  root.querySelectorAll('[data-folder]').forEach((folder) => {
    const slug = folder.dataset.folder;
    const c = controllers.get(slug);
    if (!c || stage) return;
    c.restack();
    c.items.forEach((item, i) => animate(item, c.closedPct(i), instant));
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initFolderCards());
} else {
  initFolderCards();
}
