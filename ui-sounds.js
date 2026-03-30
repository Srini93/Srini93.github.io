/**
 * UI sounds: chirp on chatbot open/close and CTA clicks; chatbot iframe calls
 * window.SRINI_CHAT_SOUND('hover'|'answer') for suggestion hovers and bot replies.
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

  /* ── Chatbot iframe (same-origin): hover on suggestions + answer received ── */
  var lastChatHoverAt = 0;

  function playHoverTick() {
    var now = Date.now();
    if (now - lastChatHoverAt < 120) return;
    lastChatHoverAt = now;
    var ctx = getContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    var t0 = ctx.currentTime;
    var g = ctx.createGain();
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.14, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.08);
    var osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1040, t0);
    osc.frequency.exponentialRampToValueAtTime(1320, t0 + 0.04);
    osc.connect(g);
    osc.start(t0);
    osc.stop(t0 + 0.055);
  }

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

  /**
   * Called from chatbot iframe: 'hover' = suggestion hover, 'answer' = bot reply ready.
   * (Does not honor prefers-reduced-motion — that setting is for motion; sounds stay audible.)
   */
  window.SRINI_CHAT_SOUND = function (kind) {
    if (kind === 'hover') playHoverTick();
    else if (kind === 'answer') playAnswerChime();
  };
})();
