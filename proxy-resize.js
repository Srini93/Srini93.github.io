/**
 * Left-edge resize for the Proxy sidebar on ultra-wide viewports (min-width: 2801px).
 */
(function () {
  if (window.__sriniProxyResize) return;
  window.__sriniProxyResize = true;

  var MQ = '(min-width: 2801px)';
  var MIN_WIDTH = 420;
  var MIN_CONTENT = 1440;
  var GUTTER = 24;
  var NAV_EXTRA = 56;
  var STORAGE_KEY = 'srini-proxy-width';
  var DEFAULT_WIDTH = 420;

  var sidebar = document.getElementById('chatbot-sidebar');
  if (!sidebar) return;

  var style = document.createElement('style');
  style.setAttribute('data-proxy-resize', '');
  style.textContent =
    ':root{--proxy-panel-width:420px}' +
    '.proxy-resize-handle{display:none;position:absolute;top:0;bottom:0;left:-6px;width:14px;padding:0;border:0;background:transparent;cursor:ew-resize;z-index:4;touch-action:none}' +
    '.proxy-resize-handle::after{content:"";position:absolute;top:50%;left:50%;width:4px;height:48px;margin:-24px 0 0 -2px;border-radius:999px;background:rgba(43,43,43,0.18);transition:background .15s ease,height .15s ease,margin-top .15s ease}' +
    '.proxy-resize-handle:hover::after,.proxy-resize-handle:focus-visible::after,body.proxy-resizing .proxy-resize-handle::after{background:#3b65ef;height:72px;margin-top:-36px}' +
    '@media (min-width:2801px){' +
    'body.chat-open .proxy-resize-handle{display:block}' +
    'body.chat-open .chatbot-sidebar{width:var(--proxy-panel-width,420px)!important;overflow:visible}' +
    'body.chat-open #site-content-wrap{margin-right:calc(var(--proxy-panel-width,420px) + ' + GUTTER + 'px)!important}' +
    'body.chat-open.nav-persistent header nav,body.chat-open.nav-persistent.nav-expanded header nav{right:calc(var(--proxy-panel-width,420px) + ' + NAV_EXTRA + 'px)!important}' +
    'body.chat-open.nav-persistent.nav-expanded header nav{width:min(560px,calc(100vw - var(--proxy-panel-width,420px) - 120px))!important}' +
    '}' +
    'body.proxy-resizing,body.proxy-resizing *{cursor:ew-resize!important;user-select:none!important}' +
    'body.proxy-resizing .chatbot-sidebar,body.proxy-resizing #site-content-wrap{transition:none!important}' +
    'body.proxy-resizing .chatbot-sidebar iframe{pointer-events:none}';
  document.head.appendChild(style);

  var handle = document.createElement('button');
  handle.type = 'button';
  handle.className = 'proxy-resize-handle';
  handle.setAttribute('aria-label', 'Resize Proxy panel');
  handle.setAttribute('title', 'Drag to resize');
  sidebar.appendChild(handle);

  var wideMq = window.matchMedia(MQ);
  var dragging = false;

  function maxWidth() {
    return Math.max(MIN_WIDTH, window.innerWidth - MIN_CONTENT - GUTTER);
  }

  function clamp(width) {
    return Math.round(Math.min(maxWidth(), Math.max(MIN_WIDTH, width)));
  }

  function readStored() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var n = parseInt(raw, 10);
      if (n) return clamp(n);
    } catch (err) {}
    return DEFAULT_WIDTH;
  }

  function save(width) {
    try {
      localStorage.setItem(STORAGE_KEY, String(width));
    } catch (err) {}
  }

  function applyWidth(width, persist) {
    var next = clamp(width);
    document.documentElement.style.setProperty('--proxy-panel-width', next + 'px');
    handle.setAttribute('aria-valuenow', String(next));
    if (persist) save(next);
    return next;
  }

  function isWide() {
    return wideMq.matches;
  }

  function syncFromStorage() {
    if (!isWide()) {
      document.documentElement.style.setProperty('--proxy-panel-width', DEFAULT_WIDTH + 'px');
      return;
    }
    applyWidth(readStored(), false);
  }

  handle.setAttribute('role', 'separator');
  handle.setAttribute('aria-orientation', 'vertical');
  handle.setAttribute('aria-valuemin', String(MIN_WIDTH));
  handle.setAttribute('aria-valuemax', String(maxWidth()));

  syncFromStorage();

  function onPointerMove(event) {
    if (!dragging) return;
    var rightInset = 12;
    applyWidth(window.innerWidth - event.clientX - rightInset, false);
  }

  function stopDrag() {
    if (!dragging) return;
    dragging = false;
    document.body.classList.remove('proxy-resizing');
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', stopDrag);
    window.removeEventListener('pointercancel', stopDrag);
    applyWidth(parseInt(getComputedStyle(document.documentElement).getPropertyValue('--proxy-panel-width'), 10) || DEFAULT_WIDTH, true);
  }

  handle.addEventListener('pointerdown', function (event) {
    if (!isWide() || !document.body.classList.contains('chat-open')) return;
    if (event.button != null && event.button !== 0) return;
    event.preventDefault();
    dragging = true;
    document.body.classList.add('proxy-resizing');
    try {
      handle.setPointerCapture(event.pointerId);
    } catch (err) {}
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', stopDrag);
    window.addEventListener('pointercancel', stopDrag);
    onPointerMove(event);
  });

  handle.addEventListener('dblclick', function () {
    if (!isWide()) return;
    applyWidth(DEFAULT_WIDTH, true);
  });

  handle.addEventListener('keydown', function (event) {
    if (!isWide() || !document.body.classList.contains('chat-open')) return;
    var current = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--proxy-panel-width'), 10) || DEFAULT_WIDTH;
    var step = event.shiftKey ? 48 : 16;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      applyWidth(current + step, true);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      applyWidth(current - step, true);
    } else if (event.key === 'Home') {
      event.preventDefault();
      applyWidth(DEFAULT_WIDTH, true);
    } else if (event.key === 'End') {
      event.preventDefault();
      applyWidth(maxWidth(), true);
    }
  });

  function onMqChange() {
    handle.setAttribute('aria-valuemax', String(maxWidth()));
    syncFromStorage();
  }

  if (typeof wideMq.addEventListener === 'function') {
    wideMq.addEventListener('change', onMqChange);
  } else if (typeof wideMq.addListener === 'function') {
    wideMq.addListener(onMqChange);
  }
  window.addEventListener('resize', onMqChange, { passive: true });
})();
