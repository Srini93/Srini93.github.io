/**
 * Progressive blur reveal: case-study main-column blocks and [data-scroll-reveal]
 * (e.g. About) sharpen and fade in as they enter the viewport.
 */
(function () {
  var blocks = [];
  var main = document.querySelector('.case-study-main-col');
  if (main) {
    Array.prototype.forEach.call(main.children, function (el) {
      if (el.nodeType !== 1) return;
      var tag = el.tagName;
      if (tag === 'HR' || tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return;
      blocks.push(el);
    });
  }
  document.querySelectorAll('[data-scroll-reveal]').forEach(function (el) {
    if (blocks.indexOf(el) === -1) blocks.push(el);
  });

  if (!blocks.length) return;

  function revealAll() {
    blocks.forEach(function (el) {
      el.classList.add('case-study-scroll-reveal', 'is-revealed');
    });
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    revealAll();
    return;
  }

  if (!('IntersectionObserver' in window)) {
    revealAll();
    return;
  }

  blocks.forEach(function (el) {
    el.classList.add('case-study-scroll-reveal');
  });

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var t = entry.target;
        t.classList.add('is-revealed');
        io.unobserve(t);
      });
    },
    {
      root: null,
      rootMargin: '0px 0px -5% 0px',
      threshold: [0, 0.06, 0.12],
    }
  );

  blocks.forEach(function (el) {
    io.observe(el);
  });
})();
