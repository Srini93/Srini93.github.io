(function () {
  'use strict';

  function primeFirstFrame(video) {
    function seek() {
      try {
        if (video.readyState < 1) return;
        var d = video.duration;
        if (!d || !isFinite(d)) return;
        video.currentTime = Math.min(0.08, Math.max(0.04, d * 0.002));
      } catch (e) {}
    }
    video.addEventListener('loadedmetadata', seek, { once: true });
    if (video.readyState >= 1) seek();
  }

  function bindWrap(wrap) {
    var video = wrap.querySelector('video');
    var btn = wrap.querySelector('.srini-video-play');
    if (!video || !btn) return;

    primeFirstFrame(video);

    function setPlaying(on) {
      if (on) wrap.classList.add('srini-video-wrap--playing');
      else wrap.classList.remove('srini-video-wrap--playing');
    }

    btn.addEventListener('click', function () {
      var p = video.play();
      if (p && typeof p.catch === 'function') p.catch(function () {});
    });

    var controlsEnabled = false;
    video.addEventListener('play', function () {
      if (!controlsEnabled) {
        video.controls = true;
        controlsEnabled = true;
      }
      setPlaying(true);
    });
    video.addEventListener('pause', function () {
      setPlaying(false);
    });
    video.addEventListener('ended', function () {
      setPlaying(false);
    });
  }

  document.querySelectorAll('.srini-video-wrap').forEach(bindWrap);
})();
