/**
 * Mobile Proxy FAB: drag freely, then snap to a corner.
 * Persists the chosen corner in localStorage across pages.
 */
(function () {
  var STORAGE_KEY = 'srini-chat-fab-corner';
  var CORNERS = ['br', 'bl', 'tr', 'tl'];
  var DEFAULT_CORNER = 'br';
  var INSET = 24;
  var DRAG_THRESHOLD = 10;
  var STYLE_ID = 'srini-chat-fab-position-style';

  function isMobile() {
    try {
      return window.matchMedia('(max-width: 768px)').matches;
    } catch (e) {
      return window.innerWidth <= 768;
    }
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var css =
      '.srini-chat-fab{touch-action:none;-webkit-user-select:none;user-select:none}' +
      '.srini-chat-fab.is-dragging{transition:none!important;animation:none!important;cursor:grabbing;opacity:0.92;box-shadow:0 10px 28px rgba(59,101,239,0.28)!important}' +
      '.srini-chat-fab.is-snapping{animation:none!important;transition:top 0.28s cubic-bezier(0.32,0.72,0,1),right 0.28s cubic-bezier(0.32,0.72,0,1),bottom 0.28s cubic-bezier(0.32,0.72,0,1),left 0.28s cubic-bezier(0.32,0.72,0,1)!important}' +
      '@media (max-width:768px){' +
      '.srini-chat-fab[data-corner="br"]{top:auto!important;bottom:' + INSET + 'px!important;left:auto!important;right:' + INSET + 'px!important}' +
      '.srini-chat-fab[data-corner="bl"]{top:auto!important;bottom:' + INSET + 'px!important;left:' + INSET + 'px!important;right:auto!important}' +
      '.srini-chat-fab[data-corner="tr"]{top:' + INSET + 'px!important;bottom:auto!important;left:auto!important;right:' + INSET + 'px!important}' +
      '.srini-chat-fab[data-corner="tl"]{top:' + INSET + 'px!important;bottom:auto!important;left:' + INSET + 'px!important;right:auto!important}' +
      '}';
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  function readSavedCorner() {
    try {
      var value = localStorage.getItem(STORAGE_KEY);
      if (CORNERS.indexOf(value) !== -1) return value;
    } catch (e) {}
    return DEFAULT_CORNER;
  }

  function saveCorner(corner) {
    try {
      localStorage.setItem(STORAGE_KEY, corner);
    } catch (e) {}
  }

  function clearInlinePosition(fab) {
    fab.style.top = '';
    fab.style.right = '';
    fab.style.bottom = '';
    fab.style.left = '';
  }

  function applyCorner(fab, corner, animateFrom) {
    if (CORNERS.indexOf(corner) === -1) corner = DEFAULT_CORNER;
    var size = fab.getBoundingClientRect().width || 75;
    var target = cornerPositions(size)[corner];

    if (animateFrom) {
      fab.classList.remove('is-dragging');
      fab.classList.add('is-snapping');
      fab.removeAttribute('data-corner');
      fab.style.right = 'auto';
      fab.style.bottom = 'auto';
      fab.style.left = animateFrom.left + 'px';
      fab.style.top = animateFrom.top + 'px';
      // Force layout so the transition starts from the drag position.
      fab.offsetWidth;
      fab.style.left = target.left + 'px';
      fab.style.top = target.top + 'px';

      var settled = false;
      function settle() {
        if (settled) return;
        settled = true;
        fab.classList.remove('is-snapping');
        clearInlinePosition(fab);
        fab.setAttribute('data-corner', corner);
        fab.removeEventListener('transitionend', onEnd);
      }
      function onEnd(ev) {
        if (ev.target !== fab) return;
        if (ev.propertyName !== 'left' && ev.propertyName !== 'top') return;
        settle();
      }
      fab.addEventListener('transitionend', onEnd);
      window.setTimeout(settle, 360);
    } else {
      clearInlinePosition(fab);
      fab.setAttribute('data-corner', corner);
    }
  }

  function cornerPositions(size) {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    return {
      br: { left: vw - INSET - size, top: vh - INSET - size },
      bl: { left: INSET, top: vh - INSET - size },
      tr: { left: vw - INSET - size, top: INSET },
      tl: { left: INSET, top: INSET }
    };
  }

  function nearestCorner(left, top, size) {
    var positions = cornerPositions(size);
    var best = DEFAULT_CORNER;
    var bestDist = Infinity;
    for (var i = 0; i < CORNERS.length; i++) {
      var key = CORNERS[i];
      var p = positions[key];
      var dx = left - p.left;
      var dy = top - p.top;
      var dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        best = key;
      }
    }
    return best;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function bindFab(fab) {
    if (fab.getAttribute('data-fab-position-bound') === '1') return;
    fab.setAttribute('data-fab-position-bound', '1');

    var pointerId = null;
    var startX = 0;
    var startY = 0;
    var originLeft = 0;
    var originTop = 0;
    var dragging = false;
    var moved = false;
    var size = 75;

    function onPointerDown(e) {
      if (!isMobile()) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (document.body.classList.contains('chat-open')) return;

      var rect = fab.getBoundingClientRect();
      size = rect.width || 75;
      pointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      originLeft = rect.left;
      originTop = rect.top;
      dragging = false;
      moved = false;

      fab.classList.remove('is-snapping');
      try {
        fab.setPointerCapture(pointerId);
      } catch (err) {}
    }

    function onPointerMove(e) {
      if (pointerId === null || e.pointerId !== pointerId) return;
      if (!isMobile()) return;

      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (!dragging) {
        if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
        dragging = true;
        moved = true;
        fab.classList.add('is-dragging');
        fab.removeAttribute('data-corner');
        fab.style.right = 'auto';
        fab.style.bottom = 'auto';
        fab.style.left = originLeft + 'px';
        fab.style.top = originTop + 'px';
      }

      e.preventDefault();
      var nextLeft = clamp(originLeft + dx, 0, window.innerWidth - size);
      var nextTop = clamp(originTop + dy, 0, window.innerHeight - size);
      fab.style.left = nextLeft + 'px';
      fab.style.top = nextTop + 'px';
    }

    function finishDrag(e) {
      if (pointerId === null || (e && e.pointerId !== pointerId)) return;
      pointerId = null;

      if (!dragging) {
        fab.classList.remove('is-dragging');
        return;
      }

      var left = parseFloat(fab.style.left) || 0;
      var top = parseFloat(fab.style.top) || 0;
      var corner = nearestCorner(left, top, size);
      applyCorner(fab, corner, { left: left, top: top });
      saveCorner(corner);
      dragging = false;
    }

    function onClickCapture(e) {
      if (!moved) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      moved = false;
    }

    fab.addEventListener('pointerdown', onPointerDown);
    fab.addEventListener('pointermove', onPointerMove, { passive: false });
    fab.addEventListener('pointerup', finishDrag);
    fab.addEventListener('pointercancel', finishDrag);
    fab.addEventListener('click', onClickCapture, true);

    applyCorner(fab, readSavedCorner(), false);
  }

  function init() {
    injectStyles();
    var fabs = document.querySelectorAll('.srini-chat-fab');
    for (var i = 0; i < fabs.length; i++) bindFab(fabs[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.addEventListener('resize', function () {
    if (!isMobile()) return;
    var fabs = document.querySelectorAll('.srini-chat-fab');
    for (var i = 0; i < fabs.length; i++) {
      applyCorner(fabs[i], fabs[i].getAttribute('data-corner') || readSavedCorner(), false);
    }
  });
})();
