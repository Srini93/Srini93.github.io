/**
 * Frosted folder cards — adapted from
 * https://github.com/fayazara/portfolio-site-template (MIT)
 */
import { animate, hover } from 'https://cdn.jsdelivr.net/npm/motion@12.43.0/+esm';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const instant = { duration: 0 };
const spring = (s) => (reduced ? instant : s);

const openSpring = { type: 'spring', duration: 0.55, bounce: 0.35 };
const closeSpring = { type: 'spring', duration: 0.3, bounce: 0.1 };
const focusSpring = { type: 'spring', duration: 0.3, bounce: 0.18 };
const flingSpring = { type: 'spring', duration: 0.45, bounce: 0.2 };
const stageSpring = { type: 'spring', duration: 0.55, bounce: 0.18 };
const homeSpring = { type: 'spring', duration: 0.5, bounce: 0.12 };
const shutSpring = { type: 'spring', duration: 0.6, bounce: 0.25 };

const PUSH = 4;
const SIDE = 0.6;
const GAP = 0.08;

const tilt = (i) => {
  const n = Math.sin((i + 1) * 127.1) * 43758.5453;
  return (n - Math.floor(n)) * 12 - 6;
};

const controllers = new Map();
let stage = null;
let bootstrapped = false;

function ensureOverlay() {
  let overlay = document.querySelector('.fstage');
  if (overlay) return overlay;

  overlay = document.createElement('div');
  overlay.className = 'fstage';
  overlay.innerHTML = `
    <header class="fstage-bar">
      <div>
        <p class="fstage-title"></p>
        <p class="fstage-meta"></p>
      </div>
      <button class="fstage-close" type="button" aria-label="Close">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <path d="M4 4l8 8M12 4l-8 8" stroke-linecap="round"></path>
        </svg>
      </button>
    </header>
    <p class="fstage-hint">← →</p>`;
  document.body.appendChild(overlay);
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

function render(opts, stagger = 0) {
  if (!stage) return;
  const { c, active, base } = stage;
  const unit = Math.min(innerWidth * 0.46, innerHeight * 0.52);

  const fit = (i) => {
    const item = c.items[i];
    if (i === active && isNote(c, i)) {
      return Math.min(
        (innerWidth * 0.6) / item.offsetWidth,
        (innerHeight * 0.82) / item.offsetHeight,
      );
    }
    const s = unit / Math.max(item.offsetWidth, item.offsetHeight);
    return i === active ? s : s * SIDE;
  };

  const halfCentre = (fit(active) * c.items[active].offsetWidth) / 2;
  const reach = halfCentre + unit * GAP + (unit * SIDE) / 2;

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
        y: innerHeight / 2 - base[i].y,
        scale: fit(i),
        rotate: d === 0 ? 0 : tilt(i),
        opacity: Math.max(0.3, 1 - Math.abs(d) * 0.16),
      },
      { ...opts, delay: Math.abs(d) * stagger },
    );
  });
}

function openStage(slug, push) {
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
  overlay.classList.add('is-open');
  document.documentElement.style.overflow = 'hidden';
  c.folder.classList.add('is-stage', 'is-scaled');

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
  render(spring(stageSpring), 0.05);
}

async function closeStage() {
  if (!stage || stage.closing) return;
  stage.closing = true;
  const { c } = stage;
  const overlay = ensureOverlay();

  overlay.classList.remove('is-open');
  document.documentElement.style.overflow = '';
  c.folder.classList.remove('is-scaled');

  const w = c.wrap.offsetWidth;
  await Promise.all(
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
          { ...spring(homeSpring), delay: Math.abs(c.offset(i)) * 0.03 },
        ).finished,
    ),
  );

  await animate(c.flap, { rotateX: 0, opacity: 1 }, spring(shutSpring)).finished;

  c.deactivate();
  c.items.forEach((item, i) => animate(item, c.closedPct(i), instant));
  c.folder.classList.remove('is-stage');
  stage = null;
}

function go(next) {
  if (!stage || stage.closing) return;
  const clamped = Math.max(0, Math.min(stage.c.items.length - 1, next));
  if (clamped === stage.active) return;
  stage.active = clamped;
  render(spring(stageSpring));
}

function requestClose() {
  if (history.state && history.state.folder) history.back();
  else closeStage();
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

  const setOpen = (isOpen) => {
    expanded = isOpen;
    if (!isOpen) focused = null;
    restack();
    animate(flap, { rotateX: isOpen ? -30 : 0 }, spring(isOpen ? openSpring : closeSpring));
    apply(spring(isOpen ? openSpring : closeSpring), isOpen ? 0.04 : 0.02);
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

  overlay.addEventListener('click', (event) => {
    const target = event.target;
    if (target === overlay || target.closest('.fstage-close')) requestClose();
  });

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
