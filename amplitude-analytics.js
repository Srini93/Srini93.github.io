/**
 * Amplitude analytics bootstrap for the portfolio site.
 *
 * Single source of truth for the Browser API key + init options.
 * Loads Amplitude's Unified Script (CDN) with autocapture + Session Replay,
 * then wires a small set of custom Object Action events.
 *
 * Usage: <script src="amplitude-analytics.js" defer></script> in <head> or before </body>.
 * Localhost / file://: SDK is not initialized (keeps production data clean).
 * Personal opt-out: visit any page with ?notrack=1 to persist opt-out in localStorage
 * (no events / no Session Replay). ?notrack=0 clears it and re-enables tracking.
 * Call window.sriniAnalytics.track(name, props) from other scripts after load.
 */
(function () {
  'use strict';

  var API_KEY = '8c6afd25524af38e56ef1220653a8d4f';
  /** Starter plan includes Session Replay; portfolio traffic is low so capture most sessions. */
  var SESSION_REPLAY_SAMPLE_RATE = 0.5;
  var NOTRACK_STORAGE_KEY = 'srini-amplitude-notrack';

  var CASE_STUDY_NAMES = {
    'intuit.html': 'Intuit Assist',
    'intuit-case-study-plain.html': 'Intuit Assist',
    'api.html': 'API Platform',
    'api-case-study-plain.html': 'API Platform',
    'norton.html': 'Norton',
    'norton-case-study-plain.html': 'Norton',
    'nortonp.html': 'Norton',
    'google.html': 'Google',
    'zoho sheet.html': 'Zoho Sheet',
    'holachef.html': 'Holachef',
    'zeta.html': 'Zeta',
    'accu drive.html': 'Accu Drive',
    'experiment.html': 'Experiment',
    'prioritize.html': 'Prioritize',
    'case study template.html': 'Case Study Template'
  };

  var queue = [];
  var initialized = false;

  function isLocalHost() {
    try {
      if (window.location.protocol === 'file:') return true;
      var h = String(window.location.hostname || '').toLowerCase();
      return h === 'localhost' || h === '127.0.0.1' || h === '::1';
    } catch (e) {
      return false;
    }
  }

  function readNoTrackFlag() {
    try {
      return window.localStorage.getItem(NOTRACK_STORAGE_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function writeNoTrackFlag(on) {
    try {
      if (on) window.localStorage.setItem(NOTRACK_STORAGE_KEY, '1');
      else window.localStorage.removeItem(NOTRACK_STORAGE_KEY);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Apply ?notrack=1 / ?notrack=0 before any SDK load so autocapture / replay never start.
   * Also honors a persisted flag, and parent-frame opt-out for unlocked case-study iframes.
   */
  function resolveOptOut() {
    var paramAction = null;
    try {
      var qs = new URLSearchParams(window.location.search || '');
      var raw = qs.get('notrack');
      if (raw === '1' || raw === 'true') paramAction = 'opt_out';
      else if (raw === '0' || raw === 'false') paramAction = 'opt_in';
    } catch (e) {}

    if (paramAction === 'opt_out') writeNoTrackFlag(true);
    else if (paramAction === 'opt_in') writeNoTrackFlag(false);

    if (readNoTrackFlag()) {
      return { optedOut: true, reason: paramAction === 'opt_out' ? 'query' : 'stored' };
    }

    // Same-origin unlock iframes share localStorage; this is a belt-and-suspenders check.
    try {
      if (
        window.parent &&
        window.parent !== window &&
        window.parent.sriniAnalytics &&
        window.parent.sriniAnalytics.optedOut
      ) {
        return { optedOut: true, reason: 'parent' };
      }
    } catch (e2) {}

    return {
      optedOut: false,
      reason: paramAction === 'opt_in' ? 'query_cleared' : 'default'
    };
  }

  function pageFileName() {
    try {
      var path = window.location.pathname || '';
      var parts = path.split('/');
      var last = parts[parts.length - 1] || '';
      if (!last || last.indexOf('.') === -1) return 'index.html';
      return decodeURIComponent(last);
    } catch (e) {
      return '';
    }
  }

  function caseStudyName() {
    var file = pageFileName().toLowerCase();
    if (CASE_STUDY_NAMES[file]) return CASE_STUDY_NAMES[file];
    try {
      if (window.parent && window.parent !== window) {
        var parentPath = window.parent.location.pathname || '';
        var parentFile = decodeURIComponent(parentPath.split('/').pop() || '').toLowerCase();
        if (CASE_STUDY_NAMES[parentFile]) return CASE_STUDY_NAMES[parentFile];
      }
    } catch (e) {}
    return null;
  }

  function flushQueue() {
    if (!window.amplitude || typeof window.amplitude.track !== 'function') return;
    while (queue.length) {
      var item = queue.shift();
      try {
        window.amplitude.track(item.name, item.props || {});
      } catch (e) {}
    }
  }

  function track(name, props) {
    if (!name) return;
    if (window.sriniAnalytics && window.sriniAnalytics.disabled) return;
    var payload = props || {};
    if (!initialized) {
      queue.push({ name: name, props: payload });
      return;
    }
    try {
      if (window.amplitude && typeof window.amplitude.track === 'function') {
        window.amplitude.track(name, payload);
      }
    } catch (e) {}
  }

  // Resolve personal opt-out BEFORE creating the public API / loading the CDN.
  var opt = resolveOptOut();

  window.sriniAnalytics = {
    apiKey: API_KEY,
    disabled: false,
    optedOut: !!opt.optedOut,
    ready: false,
    track: track,
    caseStudyName: caseStudyName,
    pageFileName: pageFileName
  };

  if (opt.optedOut) {
    window.sriniAnalytics.disabled = true;
    window.sriniAnalytics.ready = true;
    queue = [];
    try {
      console.info(
        '[srini analytics] opted out — no Amplitude events or Session Replay on this browser. Visit any page with ?notrack=0 to re-enable.'
      );
    } catch (e) {}
    return;
  }

  if (isLocalHost()) {
    window.sriniAnalytics.disabled = true;
    window.sriniAnalytics.ready = true;
    try {
      console.info('[srini analytics] disabled on localhost / file:// (production data stays clean).');
    } catch (e) {}
    return;
  }

  try {
    if (opt.reason === 'query_cleared') {
      console.info('[srini analytics] tracking re-enabled (?notrack=0). Amplitude will load on this page.');
    } else {
      console.info('[srini analytics] tracking enabled.');
    }
  } catch (e) {}

  function bindCustomEvents() {
    // Case Study Viewed — once per page load for known case-study URLs.
    // Password shells fire this from password-protect.js after a successful unlock.
    // Plain payloads loaded inside the unlock iframe skip to avoid double-counting.
    var study = caseStudyName();
    var file = pageFileName().toLowerCase();
    var isPasswordShell =
      file === 'intuit.html' || file === 'api.html' || file === 'norton.html' || file === 'nortonp.html';
    var inIframe = false;
    try {
      inIframe = window.self !== window.top;
    } catch (e) {
      inIframe = true;
    }
    var isPlainInShell = inIframe && /-case-study-plain\.html$/i.test(file);
    if (study && !isPasswordShell && !isPlainInShell) {
      track('Case Study Viewed', {
        case_study_name: study,
        page_path: window.location.pathname || ''
      });
    }

    document.addEventListener(
      'click',
      function (e) {
        var el = e.target;
        if (!el || !el.closest) return;

        var resume = el.closest('a[href*="Resume_Srinivasan.pdf"], a[href*="Resume_srinivasan.pdf"]');
        if (resume) {
          var resumeSource = 'link';
          if (resume.closest('header, .desk-menu, .hamburgler-menu, .pp-desk-menu, .pp-hamburgler-menu')) {
            resumeSource = 'nav';
          } else if (resume.closest('#contact, footer')) {
            resumeSource = 'footer';
          }
          track('Resume Downloaded', {
            source: resumeSource,
            page_path: window.location.pathname || ''
          });
          return;
        }

        var contact =
          el.closest('a.get-in-touch-btn, a.pp-get-in-touch-btn, a[href^="mailto:"], a.contact-link') ||
          el.closest('a[href*="linkedin.com/in/srinivasanchakkarapani"]');
        if (contact) {
          var method = 'other';
          var href = (contact.getAttribute('href') || '').toLowerCase();
          if (contact.classList.contains('get-in-touch-btn') || contact.classList.contains('pp-get-in-touch-btn')) {
            method = 'get_in_touch';
          } else if (href.indexOf('mailto:') === 0) {
            method = 'email';
          } else if (href.indexOf('linkedin.com') !== -1) {
            method = 'linkedin';
          } else if (href.indexOf('twitter.com') !== -1 || href.indexOf('x.com') !== -1) {
            method = 'twitter';
          } else if (href.indexOf('dribbble.com') !== -1) {
            method = 'dribbble';
          }
          track('Contact Clicked', {
            contact_method: method,
            page_path: window.location.pathname || ''
          });
          return;
        }

        var chatTrigger = el.closest('.srini-chat-trigger');
        if (chatTrigger && !document.body.classList.contains('chat-open')) {
          var triggerType = chatTrigger.classList.contains('srini-chat-fab') ? 'fab' : 'nav';
          track('Chatbot Opened', {
            trigger: triggerType,
            page_path: window.location.pathname || ''
          });
        }
      },
      true
    );

    // Deep-link open (?chat=1 / #chat) — body may already have chat-open before we bind
    if (document.body && document.body.classList.contains('chat-open')) {
      track('Chatbot Opened', {
        trigger: 'url',
        page_path: window.location.pathname || ''
      });
    }

    // Chatbot message sent — host hears iframe postMessage (never includes message text)
    window.addEventListener('message', function (e) {
      if (e.data === 'srini-chat-sound-send') {
        track('Chatbot Message Sent', {
          page_path: window.location.pathname || ''
        });
      }
    });

    // Native / custom video play (once per media element until pause/end)
    function bindVideo(video) {
      if (!video || video.getAttribute('data-amp-bound') === '1') return;
      video.setAttribute('data-amp-bound', '1');
      var firedForPlay = false;
      video.addEventListener('play', function () {
        if (firedForPlay) return;
        firedForPlay = true;
        var label =
          video.getAttribute('aria-label') ||
          video.getAttribute('title') ||
          '';
        var src = '';
        try {
          var source = video.querySelector('source');
          src = (source && source.getAttribute('src')) || video.currentSrc || video.src || '';
          if (src) src = src.split('/').pop().split('?')[0];
        } catch (err) {}
        var props = {
          page_path: window.location.pathname || ''
        };
        if (label) props.video_label = label;
        if (src) props.video_file = src;
        var cs = caseStudyName();
        if (cs) props.case_study_name = cs;
        track('Video Played', props);
      });
      video.addEventListener('pause', function () {
        firedForPlay = false;
      });
      video.addEventListener('ended', function () {
        firedForPlay = false;
      });
    }

    function scanVideos(root) {
      (root || document).querySelectorAll('video').forEach(bindVideo);
    }
    scanVideos(document);
    if (typeof MutationObserver !== 'undefined') {
      try {
        var mo = new MutationObserver(function (mutations) {
          mutations.forEach(function (m) {
            m.addedNodes &&
              m.addedNodes.forEach(function (node) {
                if (node.nodeType !== 1) return;
                if (node.tagName === 'VIDEO') bindVideo(node);
                else if (node.querySelectorAll) scanVideos(node);
              });
          });
        });
        mo.observe(document.documentElement, { childList: true, subtree: true });
      } catch (e) {}
    }
  }

  function initAmplitude() {
    if (!window.amplitude || typeof window.amplitude.init !== 'function') return;
    try {
      if (window.sessionReplay && typeof window.sessionReplay.plugin === 'function' && window.amplitude.add) {
        window.amplitude.add(
          window.sessionReplay.plugin({ sampleRate: SESSION_REPLAY_SAMPLE_RATE })
        );
      }
      window.amplitude.init(API_KEY, {
        fetchRemoteConfig: true,
        autocapture: {
          attribution: true,
          pageViews: true,
          sessions: true,
          formInteractions: true,
          fileDownloads: true,
          elementInteractions: true
        }
      });
      initialized = true;
      window.sriniAnalytics.ready = true;
      flushQueue();
      bindCustomEvents();
    } catch (e) {
      console.warn('[amplitude-analytics] init failed', e);
    }
  }

  // Avoid double-loading if a page still has a legacy inline snippet
  if (window.amplitude && window.amplitude._iq === undefined && typeof window.amplitude.init === 'function') {
    initAmplitude();
    return;
  }

  var existing = document.querySelector('script[src*="cdn.amplitude.com/script/"]');
  if (existing) {
    if (window.amplitude && typeof window.amplitude.init === 'function') {
      initAmplitude();
    } else {
      existing.addEventListener('load', initAmplitude);
    }
    return;
  }

  var script = document.createElement('script');
  script.async = true;
  script.src = 'https://cdn.amplitude.com/script/' + API_KEY + '.js';
  script.onload = initAmplitude;
  script.onerror = function () {
    console.warn('[amplitude-analytics] failed to load Amplitude CDN script');
  };
  (document.head || document.documentElement).appendChild(script);
})();
