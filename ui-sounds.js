/**
 * UI sounds: chirp on chatbot open and CTA clicks; soft descending close sound
 * when the chatbot sidebar is dismissed. Chatbot iframe calls
 * window.SRINI_CHAT_SOUND('answer') for bot replies.
 * Uses Web Audio API (no external audio files). Plays only after user gesture.
 */
(function() {
  'use strict';

  var audioContext = null;

  function getContext() {
    if (audioContext) return audioContext;
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      return null;
    }
    return audioContext;
  }

  function playChirp(variant) {
    var ctx = getContext();
    if (!ctx) return;

    var now = ctx.currentTime;
    var duration = 0.07;
    var gap = 0.03;
    var freq1 = variant === 1 ? 720 : 580;
    var freq2 = variant === 1 ? 960 : 780;

    var gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.18, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    function tone(freq, start) {
      var osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      osc.connect(gainNode);
      osc.start(start);
      osc.stop(start + duration);
    }

    tone(freq1, now);
    tone(freq2, now + duration + gap);
  }

  function playCloseSound() {
    var ctx = getContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    var t0 = ctx.currentTime;

    var g = ctx.createGain();
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.15, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.25);

    var freqs = [784, 587.33];
    var noteLen = 0.08;
    freqs.forEach(function(freq, i) {
      var osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t0 + i * noteLen);
      osc.connect(g);
      osc.start(t0 + i * noteLen);
      osc.stop(t0 + i * noteLen + noteLen * 0.9);
    });
  }

  function onChirpClick(e) {
    var target = e.target.closest('.srini-chat-trigger, .get-in-touch-btn, .see-more, .read-more-glass, .back-button-glass');
    if (!target) return;
    var variant = target.classList.contains('srini-chat-trigger') ? 0 : 1;
    playChirp(variant);
  }

  function unlockAudio() {
    var ctx = getContext();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  document.addEventListener('click', onChirpClick, true);
  document.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
  document.addEventListener('keydown', unlockAudio, { once: true });

  /* ── Detect chatbot close via body.chat-open removal ── */
  var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(m) {
      if (m.type !== 'attributes' || m.attributeName !== 'class') return;
      var wasChatOpen = (m.oldValue || '').indexOf('chat-open') !== -1;
      var isChatOpen = document.body.classList.contains('chat-open');
      if (wasChatOpen && !isChatOpen) playCloseSound();
    });
  });
  observer.observe(document.body, { attributes: true, attributeOldValue: true });

  /* ── Chatbot iframe: answer received ── */
  function playAnswerChime() {
    var ctx = getContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    var t0 = ctx.currentTime;
    var g = ctx.createGain();
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.16, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.55);
    var freqs = [392, 523.25, 659.25, 784];
    var noteLen = 0.075;
    freqs.forEach(function (freq, i) {
      var osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t0 + i * noteLen);
      osc.connect(g);
      osc.start(t0 + i * noteLen);
      osc.stop(t0 + i * noteLen + noteLen * 0.9);
    });
  }

  window.SRINI_CHAT_SOUND = function (kind) {
    if (kind === 'answer') playAnswerChime();
  };
})();
