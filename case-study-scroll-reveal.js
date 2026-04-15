/**
 * Progressive blur reveal for case study pages: each direct block in .case-study-main-col
 * sharpens and fades in as it enters the viewport (IntersectionObserver).
 */
(function () {
  var main = document.querySelector('.case-study-main-col');
  if (!main) return;

  var blocks = Array.prototype.filter.call(main.children, function (el) {
    if (el.nodeType !== 1) return false;
    var tag = el.tagName;
    return tag !== 'HR' && tag !== 'SCRIPT' && tag !== 'STYLE' && tag !== 'NOSCRIPT';
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
