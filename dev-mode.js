/**
 * Pro Mode — A fun developer inspection overlay
 * Toggle methods:
 *   1. Keyboard: Ctrl+Shift+D (or Cmd+Shift+D on Mac)
 *   2. Easter egg: Click the logo 3 times rapidly
 *   3. Konami code: ↑ ↑ ↓ ↓ ← → ← → B A
 */
(function () {
  var STORAGE_KEY = 'srini-pro-mode';
  var POS_KEY = 'srini-pro-mode-pos';
  var active = false;
  var panel = null;
  var gridOverlay = null;
  var fpsEl = null;
  var frameCount = 0;
  var lastTime = performance.now();
  var fps = 0;
  var rafId = null;
  var panelDragCleanup = null;

  // Konami code sequence
  var konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  var konamiIndex = 0;

  // Logo click tracker
  var logoClicks = [];
  var CLICK_THRESHOLD = 3;
  var CLICK_WINDOW = 3000; // 3 seconds to complete 7 clicks

  var styles = document.createElement('style');
  styles.id = 'pro-mode-styles';
  styles.textContent = [
    '/* Pro Mode Styles */',
    '.pro-mode-panel {',
    '  position: fixed;',
    '  left: 16px;',
    '  bottom: 16px;',
    '  top: auto;',
    '  right: auto;',
    '  z-index: 99999;',
    '  touch-action: manipulation;',
    '  background: rgba(15, 15, 15, 0.92);',
    '  backdrop-filter: blur(12px);',
    '  -webkit-backdrop-filter: blur(12px);',
    '  border: 1px solid rgba(255,255,255,0.1);',
    '  border-radius: 12px;',
    '  padding: 14px 18px;',
    '  font-family: "SF Mono", "Fira Code", "Consolas", monospace;',
    '  font-size: 11px;',
    '  color: #0f0;',
    '  line-height: 1.6;',
    '  min-width: 200px;',
    '  box-shadow: 0 8px 32px rgba(0,0,0,0.4);',
    '  user-select: none;',
    '}',
    '.pro-mode-panel.unlock-anim {',
    '  animation: pro-unlock 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);',
    '}',
    '@keyframes pro-unlock {',
    '  0% { transform: scale(0.5) rotate(-10deg); opacity: 0; }',
    '  50% { transform: scale(1.1) rotate(2deg); }',
    '  100% { transform: scale(1) rotate(0); opacity: 1; }',
    '}',
    '.pro-mode-panel h3 {',
    '  margin: 0 0 10px;',
    '  font-size: 10px;',
    '  font-weight: 600;',
    '  text-transform: uppercase;',
    '  letter-spacing: 1.5px;',
    '  color: #0f0;',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 6px;',
    '}',
    '.pro-mode-panel h3::before {',
    '  content: "";',
    '  width: 6px;',
    '  height: 6px;',
    '  background: #0f0;',
    '  border-radius: 50%;',
    '  animation: pro-pulse 1s ease-in-out infinite;',
    '}',
    '@keyframes pro-pulse {',
    '  0%, 100% { opacity: 1; box-shadow: 0 0 8px #0f0; }',
    '  50% { opacity: 0.4; box-shadow: 0 0 2px #0f0; }',
    '}',
    '.pro-mode-row {',
    '  display: flex;',
    '  justify-content: space-between;',
    '  gap: 16px;',
    '  padding: 3px 0;',
    '  border-bottom: 1px solid rgba(255,255,255,0.05);',
    '}',
    '.pro-mode-row:last-child { border-bottom: none; }',
    '.pro-mode-label { color: rgba(255,255,255,0.5); }',
    '.pro-mode-value { color: #0f0; font-weight: 500; }',
    '.pro-mode-fps { color: #0f0; }',
    '.pro-mode-fps.warn { color: #fa0; }',
    '.pro-mode-fps.bad { color: #f44; }',
    '.pro-mode-toggle-row {',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: space-between;',
    '  padding: 6px 0 2px;',
    '  cursor: pointer;',
    '}',
    '.pro-mode-toggle-row:hover .pro-mode-label { color: rgba(255,255,255,0.8); }',
    '.pro-mode-checkbox {',
    '  width: 32px;',
    '  height: 16px;',
    '  background: rgba(255,255,255,0.15);',
    '  border-radius: 8px;',
    '  position: relative;',
    '  transition: background 0.2s;',
    '}',
    '.pro-mode-checkbox.on { background: #0a4; }',
    '.pro-mode-checkbox::after {',
    '  content: "";',
    '  position: absolute;',
    '  top: 2px;',
    '  left: 2px;',
    '  width: 12px;',
    '  height: 12px;',
    '  background: #fff;',
    '  border-radius: 50%;',
    '  transition: left 0.2s;',
    '}',
    '.pro-mode-checkbox.on::after { left: 18px; }',
    '',
    '/* Grid overlay */',
    '.pro-mode-grid-overlay {',
    '  position: fixed;',
    '  inset: 0;',
    '  z-index: 99990;',
    '  pointer-events: none;',
    '  background-image:',
    '    linear-gradient(to right, rgba(0,255,100,0.07) 1px, transparent 1px),',
    '    linear-gradient(to bottom, rgba(0,255,100,0.07) 1px, transparent 1px);',
    '  background-size: 8px 8px;',
    '}',
    '.pro-mode-grid-overlay::before {',
    '  content: "";',
    '  position: absolute;',
    '  inset: 0;',
    '  background-image:',
    '    linear-gradient(to right, rgba(0,255,100,0.12) 1px, transparent 1px),',
    '    linear-gradient(to bottom, rgba(0,255,100,0.12) 1px, transparent 1px);',
    '  background-size: 64px 64px;',
    '}',
    '',
    '/* Box overlay — outlines all elements (except pro panel) */',
    'body.pro-mode-boxes *:not(.pro-mode-panel):not(.pro-mode-panel *):not(.pro-mode-grid-overlay) {',
    '  outline: 1px solid rgba(0, 150, 255, 0.25) !important;',
    '}',
    'body.pro-mode-boxes *:not(.pro-mode-panel):not(.pro-mode-panel *):not(.pro-mode-grid-overlay):hover {',
    '  outline: 1px solid rgba(255, 100, 0, 0.6) !important;',
    '  background: rgba(255, 100, 0, 0.05) !important;',
    '}',
    '',
    '/* Spacings — show margins/paddings on hover (except pro panel) */',
    'body.pro-mode-spacings *:not(.pro-mode-panel):not(.pro-mode-panel *):not(.pro-mode-grid-overlay):hover {',
    '  box-shadow:',
    '    inset 0 0 0 2000px rgba(0, 200, 100, 0.08),',
    '    0 0 0 1px rgba(0, 200, 100, 0.3) !important;',
    '}',
    '',
    '/* Ensure pro panel always stays dark */',
    '.pro-mode-panel, .pro-mode-panel * {',
    '  outline: none !important;',
    '}',
    '.pro-mode-panel {',
    '  box-shadow: 0 8px 32px rgba(0,0,0,0.4) !important;',
    '}',
    '',
    '/* Close button */',
    '.pro-mode-close {',
    '  position: absolute;',
    '  top: 10px;',
    '  right: 10px;',
    '  width: 20px;',
    '  height: 20px;',
    '  background: rgba(255,255,255,0.08);',
    '  border: none;',
    '  border-radius: 50%;',
    '  cursor: pointer;',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  padding: 0;',
    '  transition: background 0.2s, transform 0.2s;',
    '}',
    '.pro-mode-close:hover {',
    '  background: rgba(255,80,80,0.3);',
    '  transform: scale(1.1);',
    '}',
    '.pro-mode-close svg {',
    '  width: 10px;',
    '  height: 10px;',
    '  stroke: rgba(255,255,255,0.5);',
    '  stroke-width: 2;',
    '  transition: stroke 0.2s;',
    '}',
    '.pro-mode-close:hover svg {',
    '  stroke: #fff;',
    '}',
    '.pro-mode-panel.is-dragging {',
    '  cursor: grabbing !important;',
    '  transition: none !important;',
    '  user-select: none !important;',
    '}',
    '.pro-mode-panel:not(.is-dragging) {',
    '  cursor: grab;',
    '}',
    '.pro-mode-panel .pro-mode-close,',
    '.pro-mode-panel .pro-mode-toggle-row,',
    '.pro-mode-panel .pro-mode-checkbox {',
    '  cursor: pointer;',
    '}',
    '',
    '/* Easter egg unlock flash */',
    '.pro-mode-unlock-flash {',
    '  position: fixed;',
    '  inset: 0;',
    '  z-index: 99998;',
    '  background: radial-gradient(circle at center, rgba(0,255,100,0.3) 0%, transparent 70%);',
    '  pointer-events: none;',
    '  animation: pro-flash 0.5s ease-out forwards;',
    '}',
    '@keyframes pro-flash {',
    '  0% { opacity: 1; transform: scale(0.8); }',
    '  100% { opacity: 0; transform: scale(2); }',
    '}',
  ].join('\n');

  function readSavedPanelPos() {
    try {
      var raw = localStorage.getItem(POS_KEY);
      if (!raw) return null;
      var p = JSON.parse(raw);
      var l = Number(p.left);
      var t = Number(p.top);
      if (!isFinite(l) || !isFinite(t)) return null;
      return { left: l, top: t };
    } catch (e) {
      return null;
    }
  }

  function applyPanelPosition(el, pos) {
    if (!pos) return;
    el.style.right = 'auto';
    el.style.bottom = 'auto';
    el.style.left = Math.round(pos.left) + 'px';
    el.style.top = Math.round(pos.top) + 'px';
  }

  function persistPanelPosition(el) {
    if (!el || !el.getBoundingClientRect) return;
    try {
      var r = el.getBoundingClientRect();
      localStorage.setItem(POS_KEY, JSON.stringify({ left: r.left, top: r.top }));
    } catch (e) {}
  }

  function setupPanelDrag(el) {
    if (panelDragCleanup) {
      panelDragCleanup();
      panelDragCleanup = null;
    }

    function clampToViewport() {
      var w = el.offsetWidth;
      var h = el.offsetHeight;
      var l = parseFloat(el.style.left);
      var t = parseFloat(el.style.top);
      if (isNaN(l) || isNaN(t)) {
        var r = el.getBoundingClientRect();
        l = r.left;
        t = r.top;
      }
      var maxL = Math.max(8, window.innerWidth - w - 8);
      var maxT = Math.max(8, window.innerHeight - h - 8);
      l = Math.max(8, Math.min(maxL, l));
      t = Math.max(8, Math.min(maxT, t));
      el.style.bottom = 'auto';
      el.style.left = l + 'px';
      el.style.top = t + 'px';
    }

    var dragging = false;
    var offsetX = 0;
    var offsetY = 0;

    function onPointerMove(e) {
      if (!dragging) return;
      var w = el.offsetWidth;
      var h = el.offsetHeight;
      var l = e.clientX - offsetX;
      var t = e.clientY - offsetY;
      l = Math.max(8, Math.min(window.innerWidth - w - 8, l));
      t = Math.max(8, Math.min(window.innerHeight - h - 8, t));
      el.style.left = l + 'px';
      el.style.top = t + 'px';
      el.style.bottom = 'auto';
    }

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      el.classList.remove('is-dragging');
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', endDrag);
      document.removeEventListener('pointercancel', endDrag);
      try {
        el.releasePointerCapture(e.pointerId);
      } catch (err) {}
      persistPanelPosition(el);
    }

    function onPointerDown(e) {
      if (e.button !== 0) return;
      if (e.target.closest && (e.target.closest('.pro-mode-close') || e.target.closest('.pro-mode-toggle-row'))) return;

      dragging = true;
      el.classList.add('is-dragging');
      var rect = el.getBoundingClientRect();
      el.style.bottom = 'auto';
      el.style.top = rect.top + 'px';
      el.style.left = rect.left + 'px';
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      try {
        el.setPointerCapture(e.pointerId);
      } catch (err) {}
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', endDrag);
      document.addEventListener('pointercancel', endDrag);
      e.preventDefault();
    }

    el.addEventListener('pointerdown', onPointerDown);

    function onResize() {
      if (!active || !el.parentNode) return;
      clampToViewport();
    }
    window.addEventListener('resize', onResize, { passive: true });

    requestAnimationFrame(function () {
      clampToViewport();
    });

    panelDragCleanup = function () {
      el.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', endDrag);
      document.removeEventListener('pointercancel', endDrag);
      window.removeEventListener('resize', onResize);
    };
  }

  function showUnlockFlash() {
    var flash = document.createElement('div');
    flash.className = 'pro-mode-unlock-flash';
    document.body.appendChild(flash);
    setTimeout(function() { flash.remove(); }, 500);
  }

  function playOpenSound() {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var now = ctx.currentTime;

      // Rising confirmation beep
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1100, now + 0.08);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);

      setTimeout(function() { ctx.close(); }, 300);
    } catch (e) {}
  }

  function playCloseSound() {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var now = ctx.currentTime;

      // Descending beep
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1100, now);
      osc.frequency.setValueAtTime(880, now + 0.08);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);

      setTimeout(function() { ctx.close(); }, 250);
    } catch (e) {}
  }

  function createPanel(withAnimation) {
    panel = document.createElement('div');
    panel.className = 'pro-mode-panel' + (withAnimation ? ' unlock-anim' : '');
    panel.innerHTML = [
      '<button class="pro-mode-close" aria-label="Close Pro Mode"><svg viewBox="0 0 12 12"><line x1="2" y1="2" x2="10" y2="10"/><line x1="10" y1="2" x2="2" y2="10"/></svg></button>',
      '<h3>Pro Mode</h3>',
      '<div class="pro-mode-row">',
      '  <span class="pro-mode-label">FPS</span>',
      '  <span class="pro-mode-value pro-mode-fps" id="pro-fps">--</span>',
      '</div>',
      '<div class="pro-mode-row">',
      '  <span class="pro-mode-label">Viewport</span>',
      '  <span class="pro-mode-value" id="pro-viewport">--</span>',
      '</div>',
      '<div class="pro-mode-row">',
      '  <span class="pro-mode-label">Scroll Y</span>',
      '  <span class="pro-mode-value" id="pro-scroll">--</span>',
      '</div>',
      '<div class="pro-mode-row">',
      '  <span class="pro-mode-label">DOM nodes</span>',
      '  <span class="pro-mode-value" id="pro-dom">--</span>',
      '</div>',
      '<div class="pro-mode-row">',
      '  <span class="pro-mode-label">Memory</span>',
      '  <span class="pro-mode-value" id="pro-mem">--</span>',
      '</div>',
      '<div style="height:8px"></div>',
      '<div class="pro-mode-toggle-row" data-toggle="grid">',
      '  <span class="pro-mode-label">Grid overlay</span>',
      '  <span class="pro-mode-checkbox" id="pro-chk-grid"></span>',
      '</div>',
      '<div class="pro-mode-toggle-row" data-toggle="boxes">',
      '  <span class="pro-mode-label">Element boxes</span>',
      '  <span class="pro-mode-checkbox" id="pro-chk-boxes"></span>',
      '</div>',
      '<div class="pro-mode-toggle-row" data-toggle="spacings">',
      '  <span class="pro-mode-label">Spacing hints</span>',
      '  <span class="pro-mode-checkbox" id="pro-chk-spacings"></span>',
      '</div>',
      '<div style="margin-top:10px;color:rgba(255,255,255,0.3);font-size:9px;text-align:center">',
      '  <kbd style="background:rgba(255,255,255,0.1);padding:2px 5px;border-radius:3px">Ctrl+Shift+D</kbd> to close',
      '</div>',
    ].join('');
    document.body.appendChild(panel);

    var savedPos = readSavedPanelPos();
    if (savedPos) {
      applyPanelPosition(panel, savedPos);
    }

    fpsEl = document.getElementById('pro-fps');

    panel.querySelectorAll('.pro-mode-toggle-row').forEach(function (row) {
      row.addEventListener('click', function () {
        var t = row.getAttribute('data-toggle');
        if (t === 'grid') toggleGrid();
        if (t === 'boxes') toggleBoxes();
        if (t === 'spacings') toggleSpacings();
      });
    });

    panel.querySelector('.pro-mode-close').addEventListener('click', function () {
      deactivate();
    });

    setupPanelDrag(panel);
  }

  function createGridOverlay() {
    gridOverlay = document.createElement('div');
    gridOverlay.className = 'pro-mode-grid-overlay';
  }

  var gridOn = false;
  var boxesOn = false;
  var spacingsOn = false;

  function toggleGrid() {
    gridOn = !gridOn;
    if (gridOn) {
      document.body.appendChild(gridOverlay);
    } else {
      gridOverlay.remove();
    }
    document.getElementById('pro-chk-grid').classList.toggle('on', gridOn);
  }

  function toggleBoxes() {
    boxesOn = !boxesOn;
    document.body.classList.toggle('pro-mode-boxes', boxesOn);
    document.getElementById('pro-chk-boxes').classList.toggle('on', boxesOn);
  }

  function toggleSpacings() {
    spacingsOn = !spacingsOn;
    document.body.classList.toggle('pro-mode-spacings', spacingsOn);
    document.getElementById('pro-chk-spacings').classList.toggle('on', spacingsOn);
  }

  function updateStats() {
    frameCount++;
    var now = performance.now();
    if (now - lastTime >= 500) {
      fps = Math.round((frameCount * 1000) / (now - lastTime));
      frameCount = 0;
      lastTime = now;
    }

    if (fpsEl) {
      fpsEl.textContent = fps;
      fpsEl.className = 'pro-mode-value pro-mode-fps' + (fps < 30 ? ' bad' : fps < 55 ? ' warn' : '');
    }

    var vpEl = document.getElementById('pro-viewport');
    if (vpEl) vpEl.textContent = window.innerWidth + ' × ' + window.innerHeight;

    var scrollEl = document.getElementById('pro-scroll');
    if (scrollEl) scrollEl.textContent = Math.round(window.scrollY) + 'px';

    var domEl = document.getElementById('pro-dom');
    if (domEl) domEl.textContent = document.querySelectorAll('*').length;

    var memEl = document.getElementById('pro-mem');
    if (memEl) {
      if (performance.memory) {
        var mb = (performance.memory.usedJSHeapSize / 1048576).toFixed(1);
        memEl.textContent = mb + ' MB';
      } else {
        memEl.textContent = 'N/A';
      }
    }

    rafId = requestAnimationFrame(updateStats);
  }

  function activate(withAnimation, playSound) {
    if (active) return;
    active = true;
    document.head.appendChild(styles);
    createPanel(withAnimation);
    createGridOverlay();
    updateStats();

    // Enable all overlays by default
    toggleGrid();
    toggleBoxes();
    toggleSpacings();

    // Play open sound
    if (playSound !== false) {
      playOpenSound();
    }

    try { localStorage.setItem(STORAGE_KEY, '1'); } catch (e) {}
  }

  function deactivate() {
    if (!active) return;
    playCloseSound();
    if (panel) {
      persistPanelPosition(panel);
    }
    if (panelDragCleanup) {
      panelDragCleanup();
      panelDragCleanup = null;
    }
    active = false;
    if (rafId) cancelAnimationFrame(rafId);
    if (panel) panel.remove();
    if (gridOverlay) gridOverlay.remove();
    if (styles.parentNode) styles.remove();
    document.body.classList.remove('pro-mode-boxes', 'pro-mode-spacings');
    panel = null;
    gridOverlay = null;
    gridOn = false;
    boxesOn = false;
    spacingsOn = false;
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  }

  function toggle(withAnimation) {
    if (active) deactivate();
    else {
      if (withAnimation) showUnlockFlash();
      activate(withAnimation, true);
    }
  }

  // Keyboard shortcut: Ctrl+Shift+D
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      toggle(false);
      return;
    }

    // Konami code detection
    var key = e.key.toLowerCase();
    if (e.key.startsWith('Arrow')) key = e.key; // Keep arrow keys as-is
    
    if (key === konamiCode[konamiIndex] || e.key === konamiCode[konamiIndex]) {
      konamiIndex++;
      if (konamiIndex === konamiCode.length) {
        konamiIndex = 0;
        if (!active) {
          toggle(true); // Unlock with animation!
          console.log('%c🎮 KONAMI CODE ACTIVATED! Pro Mode unlocked!', 'color: #0f0; font-size: 16px; font-weight: bold;');
        }
      }
    } else {
      konamiIndex = 0;
    }
  });

  // Easter egg: Click logo 7 times rapidly
  function setupLogoEasterEgg() {
    var logo = document.querySelector('.logo-srini');
    if (!logo) return;

    logo.addEventListener('click', function (e) {
      var now = Date.now();
      
      // Remove old clicks outside the time window
      logoClicks = logoClicks.filter(function(t) { return now - t < CLICK_WINDOW; });
      logoClicks.push(now);

      if (logoClicks.length >= CLICK_THRESHOLD) {
        logoClicks = [];
        if (!active) {
          e.preventDefault();
          toggle(true); // Unlock with animation!
          console.log('%c🔓 SECRET UNLOCKED! You found the hidden Pro Mode!', 'color: #0f0; font-size: 16px; font-weight: bold;');
        }
      } else if (logoClicks.length >= 2) {
        // Hint when getting close
        var remaining = CLICK_THRESHOLD - logoClicks.length;
        console.log('%c🤔 ' + remaining + ' more click' + (remaining > 1 ? 's' : '') + '...', 'color: #888; font-size: 12px;');
      }
    });
  }

  // Initialize logo easter egg when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupLogoEasterEgg);
  } else {
    setupLogoEasterEgg();
  }

  // Restore state from localStorage (no sound on page reload)
  try {
    if (localStorage.getItem(STORAGE_KEY) === '1') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { activate(false, false); });
      } else {
        activate(false, false);
      }
    }
  } catch (e) {}
})();
