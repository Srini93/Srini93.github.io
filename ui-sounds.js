/**
 * UI sounds: chirp on chatbot open/close and CTA clicks.
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

  /**
   * Play a short two-tone chirp (bird-like, subtle).
   * @param {number} [variant] - 0 = default chirp, 1 = slightly higher (e.g. for CTAs)
   */
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

  function onChirpClick(e) {
    var target = e.target.closest('.srini-chat-trigger, .get-in-touch-btn, .see-more, .read-more-glass, .back-button-glass');
    if (!target) return;
    // Chat trigger = default chirp; CTAs = slightly higher chirp
    var variant = target.classList.contains('srini-chat-trigger') ? 0 : 1;
    playChirp(variant);
  }

  // One user gesture unlocks audio on iOS/Safari
  function unlockAudio() {
    var ctx = getContext();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  document.addEventListener('click', onChirpClick, true);
  document.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
  document.addEventListener('keydown', unlockAudio, { once: true });
})();
