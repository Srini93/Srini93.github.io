/**
 * iPhone Duo: viewport can jump mid-session when the device opens or closes.
 * Close chrome that belongs to the previous size class; don't cache width on load.
 */
(function () {
  var navMq = window.matchMedia('(min-width: 769px)');
  var lastDesktop = navMq.matches;

  function closeHamburger() {
    var body = document.body;
    if (!body || !body.classList.contains('hamburgler-active')) return;
    body.classList.remove('hamburgler-active');
    var backdrop = document.querySelector('.hamburgler-backdrop');
    if (backdrop) backdrop.classList.remove('active');
  }

  function onViewportChange() {
    var desktop = navMq.matches;
    if (desktop !== lastDesktop) {
      lastDesktop = desktop;
      closeHamburger();
    }
  }

  if (typeof navMq.addEventListener === 'function') {
    navMq.addEventListener('change', onViewportChange);
  } else if (typeof navMq.addListener === 'function') {
    navMq.addListener(onViewportChange);
  }

  window.addEventListener('resize', onViewportChange, { passive: true });
  window.addEventListener('orientationchange', onViewportChange, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', onViewportChange, { passive: true });
  }
})();
