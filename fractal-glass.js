/* ============================================================
   Fractal Glass — vanilla JS port of the React component.
   See fractal-glass-demo.html and fractal-glass-yc.html for usage.
   ============================================================ */
(function () {
  'use strict';

  var DEFAULT_CONFIG = {
    columnCount: 12,
    blur: 200,
    columnBorderWidth: 8,
    columnOpacity: 0.2,
    darkStop: 31.127,
    darkOpacity: 0.2,
    insetHighlight: 8,
    insetOpacity: 0.3,
    bgColor: '#d9d9d9',
    glowColor: '#ff4500',
    glowSecondary: '#ff8c42',
    glowSize: 60,
    glowY: 60,
    glowIntensity: 1,
    blendMode: 'overlay',
    wrap: 60
  };

  function withAlpha(hex, alpha) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var r = parseInt(h.slice(0, 2), 16);
    var g = parseInt(h.slice(2, 4), 16);
    var b = parseInt(h.slice(4, 6), 16);
    var a = Math.max(0, Math.min(1, Number(alpha)));
    return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ')';
  }

  function el(tag, className) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    node.setAttribute('aria-hidden', 'true');
    return node;
  }

  function create(container, userConfig) {
    if (!container || container.nodeType !== 1) {
      throw new Error('FractalGlass.create: first argument must be an element');
    }
    var config = Object.assign({}, DEFAULT_CONFIG, userConfig || {});

    var preExisting = [];
    while (container.firstChild) {
      preExisting.push(container.firstChild);
      container.removeChild(container.firstChild);
    }

    container.classList.add('fg-scene');

    container.style.setProperty('--fg-bg', config.bgColor);
    container.style.setProperty('--fg-blur', config.blur + 'px');
    container.style.setProperty('--fg-col-border', config.columnBorderWidth + 'px');
    container.style.setProperty('--fg-col-op', config.columnOpacity);
    container.style.setProperty('--fg-dark-stop', config.darkStop + '%');
    container.style.setProperty('--fg-dark-op', config.darkOpacity);
    container.style.setProperty('--fg-inset', config.insetHighlight + 'px');
    container.style.setProperty('--fg-inset-op', config.insetOpacity);
    container.style.setProperty('--fg-glow-size', config.glowSize + '%');
    container.style.setProperty('--fg-glow-y', config.glowY + '%');
    container.style.setProperty('--fg-blend', config.blendMode);

    var glow = el('div', 'fg-glow');
    var glowSizeY = config.glowSize * 0.92;
    glow.style.background =
      'radial-gradient(ellipse ' + config.glowSize + '% ' + glowSizeY + '% at 50% 50%, ' +
      withAlpha(config.glowColor, config.glowIntensity) + ' 0%, ' +
      withAlpha(config.glowColor, config.glowIntensity * 0.85) + ' 18%, ' +
      withAlpha(config.glowSecondary, config.glowIntensity * 0.8) + ' 35%, ' +
      withAlpha(config.glowSecondary, 0.4 * config.glowIntensity) + ' 55%, ' +
      withAlpha(config.glowSecondary, 0) + ' 75%)';
    container.appendChild(glow);

    container.appendChild(el('div', 'fg-noise'));

    var columns = el('div', 'fg-columns');
    for (var i = 0; i < config.columnCount; i++) {
      var wrapper = el('div', 'fg-column-wrapper');
      var col = el('div', 'fg-column');
      col.appendChild(el('div', 'fg-specular'));
      col.appendChild(el('div', 'fg-chroma-left'));
      col.appendChild(el('div', 'fg-chroma-right'));
      col.appendChild(el('div', 'fg-bevel'));
      wrapper.appendChild(col);
      columns.appendChild(wrapper);
    }
    container.appendChild(columns);

    if (config.wrap > 0) {
      var shapeWrap = el('div', 'fg-shape-wrap');
      shapeWrap.style.opacity = String(config.wrap / 100);
      var maskGrad =
        'radial-gradient(ellipse ' + config.glowSize + '% ' + (config.glowSize * 0.92) +
        '% at 50% ' + config.glowY + '%, ' +
        'rgba(0,0,0,1) 0%, rgba(0,0,0,0.95) 45%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0) 75%)';
      shapeWrap.style.webkitMaskImage = maskGrad;
      shapeWrap.style.maskImage = maskGrad;

      for (var j = 0; j < config.columnCount; j++) {
        var w2 = el('div', 'fg-column-wrapper');
        var cw = el('div', 'fg-column-wrapped');
        cw.appendChild(el('div', 'fg-specular'));
        cw.appendChild(el('div', 'fg-bevel'));
        w2.appendChild(cw);
        shapeWrap.appendChild(w2);
      }
      container.appendChild(shapeWrap);
    }

    container.appendChild(el('div', 'fg-inset-highlight'));

    if (preExisting.length > 0) {
      var content = document.createElement('div');
      content.className = 'fg-content';
      for (var k = 0; k < preExisting.length; k++) content.appendChild(preExisting[k]);
      container.appendChild(content);
    }

    return {
      container: container,
      config: config,
      destroy: function () {
        container.classList.remove('fg-scene');
        container.innerHTML = '';
      }
    };
  }

  function autoInit() {
    var nodes = document.querySelectorAll('[data-fractal-glass]');
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (node.__fgInstance) continue;
      var cfg = {};
      var raw = node.getAttribute('data-fractal-glass');
      if (raw && raw.trim()) {
        try { cfg = JSON.parse(raw); }
        catch (e) { console.warn('FractalGlass: invalid JSON in data-fractal-glass', e, raw); }
      }
      node.__fgInstance = create(node, cfg);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }

  window.FractalGlass = {
    create: create,
    DEFAULT_CONFIG: DEFAULT_CONFIG,
    autoInit: autoInit
  };
})();
