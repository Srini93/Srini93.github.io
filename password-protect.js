/**
 * Password Protection Component
 *
 * Turns any page into a password-protected case study page.
 *
 * Usage:
 *   1. Add <div id="password-protect" data-payload="BASE64_ENCRYPTED_DATA"></div>
 *      somewhere in your page body.
 *   2. Include the CSS:  <link rel="stylesheet" href="password-protect.css">
 *   3. Include this JS:  <script src="password-protect.js"></script>
 *
 * The component will:
 *   - Render a password dialog over the page
 *   - Decrypt the payload on correct password
 *   - Load decrypted HTML into a full-screen iframe
 *   - Patch the decrypted content with the site's standard nav/chatbot
 *   - Hide the parent page's nav once the iframe is displayed
 */
(function () {
  'use strict';

  // ─── Locate config element ──────────────────────────────────────────
  var configEl = document.getElementById('password-protect');
  if (!configEl) return;

  var payload = configEl.getAttribute('data-payload') || '';
  if (!payload) {
    console.warn('[password-protect] No data-payload attribute found.');
    return;
  }

  // ─── Inject dialog HTML ─────────────────────────────────────────────
  var dialogHTML =
    '<iframe id="pp-contentFrame" style="display:none" allowfullscreen></iframe>' +
    '<div id="pp-dialogWrap">' +
    '  <div id="pp-dialogWrapCell">' +
    '    <div id="pp-mainDialog">' +
    '      <div class="pp-lock-icon">' +
    '        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '          <rect x="4" y="11" width="16" height="10" rx="2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '          <path d="M8 11V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '        </svg>' +
    '      </div>' +
    '      <div id="pp-dialogText">This page is password protected.</div>' +
    '      <div id="pp-passArea">' +
    '        <input id="pp-pass" type="password" name="pass" placeholder="Enter password" autofocus>' +
    '        <div>' +
    '          <div id="pp-messageWrapper">' +
    '            <span id="pp-invalidPass" class="pp-error">Sorry, please try again.</span>' +
    '            <span id="pp-trycatcherror" class="pp-error">Sorry, something went wrong.</span>' +
    '            <span id="pp-success" class="pp-notify">Success!</span>' +
    '          </div>' +
    '          <button id="pp-submitPass" type="button"><span>Submit</span></button>' +
    '        </div>' +
    '      </div>' +
    '      <div id="pp-getInTouch">' +
    '        <a href="mailto:tcsreeni93@gmail.com">Get in touch to request access.</a>' +
    '      </div>' +
    '      <div id="pp-securecontext" class="pp-error"><p>Sorry, but password protection only works over a secure connection. Please load this page via HTTPS.</p></div>' +
    '      <div id="pp-nocrypto" class="pp-error"><p>Your web browser appears to be outdated. Please visit this page using a modern browser.</p></div>' +
    '    </div>' +
    '  </div>' +
    '</div>';

  configEl.innerHTML = dialogHTML;

  // ─── References ─────────────────────────────────────────────────────
  var submitBtn  = document.getElementById('pp-submitPass');
  var passEl     = document.getElementById('pp-pass');
  var invalidEl  = document.getElementById('pp-invalidPass');
  var errorEl    = document.getElementById('pp-trycatcherror');
  var successEl  = document.getElementById('pp-success');
  var dialogWrap = document.getElementById('pp-dialogWrap');
  var frame      = document.getElementById('pp-contentFrame');

  // ─── Sanity checks ─────────────────────────────────────────────────
  if (!isSecureContext) {
    document.getElementById('pp-passArea').style.display = 'none';
    document.getElementById('pp-securecontext').style.display = 'block';
    return;
  }
  if (!crypto.subtle) {
    document.getElementById('pp-passArea').style.display = 'none';
    document.getElementById('pp-nocrypto').style.display = 'block';
    return;
  }

  // ─── Crypto helpers ─────────────────────────────────────────────────
  function str2ab(str) {
    var decoded = atob(str);
    var buf = new ArrayBuffer(decoded.length);
    var view = new Uint8Array(buf);
    for (var i = 0; i < decoded.length; i++) view[i] = decoded.charCodeAt(i);
    return view;
  }

  async function deriveKey(salt, password) {
    var encoder = new TextEncoder();
    var baseKey = await crypto.subtle.importKey(
      'raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      true,
      ['decrypt']
    );
  }

  // ─── Nav / chatbot injection for decrypted content ──────────────────
  function patchDecryptedContent(html) {
    // 1. Fix AOS CDN (rawgit is dead)
    html = html.replace(
      'https://rawgit.com/michalsnik/aos/master/dist/aos.js',
      'https://unpkg.com/aos@2.3.4/dist/aos.js'
    );

    // 2. Wrap AOS.init in try-catch
    html = html.replace(
      'AOS.init({\n  duration: 1200,\n})',
      'try { AOS.init({ duration: 1200 }); } catch(e) {}'
    );

    // 3. Add Google Fonts to <head>
    var fontLinks =
      '<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">' +
      '<link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">';
    html = html.replace(
      '<link rel="stylesheet" href="style-2.css">',
      fontLinks + '<link rel="stylesheet" href="style-2.css">'
    );

    // 4. Replace old hamburger menu with updated version
    var oldHamMenu =
      '<div class="hamburgler-menu">\n  <ul class="hamburgler-menu-list">\n' +
      ' <li><a href="index.html#Selectedworks">Works</a></li>\n' +
      '  <li><a href="About.html">About</a></li>\n' +
      '           \n' +
      '    <li><a class="contact" href="Resume_Srinivasan.pdf" target="_blank">R\u00e9sum\u00e9</a></li>\n' +
      '         \n        \n  </ul>\n</div>';
    var newHamMenu =
      '<a href="index.html" class="logo-srini" data-text="srini">srini</a>\n' +
      '<div class="hamburgler-menu">\n  <ul class="hamburgler-menu-list">\n' +
      '    <li><a href="about.html">About</a></li>\n' +
      '    <li><a href="index.html#Selectedworks">Works</a></li>\n' +
      '    <li><a class="contact" href="Resume_Srinivasan.pdf" target="_blank">R\u00e9sum\u00e9</a></li>\n' +
      '    <li><a class="get-in-touch-btn" href="mailto:tcsreeni93@gmail.com">Get in Touch</a></li>\n' +
      '  </ul>\n</div>';
    html = html.replace(oldHamMenu, newHamMenu);

    // 5. Replace old <header> with new nav
    var headerMatch = html.match(/<header[^>]*>[\s\S]*?<\/header>/i);
    if (headerMatch) {
      var sparkle = '<svg class="srini-chat-sparkle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3L13.4302 8.31181C13.6047 8.96 13.692 9.28409 13.8642 9.54905C14.0166 9.78349 14.2165 9.98336 14.451 10.1358C14.7159 10.308 15.04 10.3953 15.6882 10.5698L21 12L15.6882 13.4302C15.04 13.6047 14.7159 13.692 14.451 13.8642C14.2165 14.0166 14.0166 14.2165 13.8642 14.451C13.692 14.7159 13.6047 15.04 13.4302 15.6882L12 21L10.5698 15.6882C10.3953 15.04 10.308 14.7159 10.1358 14.451C9.98336 14.2165 9.78349 14.0166 9.54905 13.8642C9.28409 13.692 8.96 13.6047 8.31181 13.4302L3 12L8.31181 10.5698C8.96 10.3953 9.28409 10.308 9.54905 10.1358C9.78349 9.98336 9.98336 9.78349 10.1358 9.54905C10.308 9.28409 10.3953 8.96 10.5698 8.31181L12 3Z"/></svg>';
      var newHeader =
        '<header>\n' +
        '  <div id="hamburgler" class="hamburgler-icon-wrapper">\n' +
        '    <span class="hamburgler-icon"></span>\n' +
        '  </div>\n' +
        '  <nav>\n' +
        '    <ul class="desk-menu">\n' +
        '      <li><a href="index.html#Selectedworks">Works</a></li>\n' +
        '      <li><a href="about.html">About</a></li>\n' +
        '      <li><a class="contact" href="Resume_Srinivasan.pdf" target="_blank">R\u00e9sum\u00e9</a></li>\n' +
        '      <li class="srini-chat-nav-li"><button type="button" class="srini-chat-trigger srini-chat-nav-btn" aria-label="Open AI chat" aria-expanded="false"><span class="srini-chat-hovertip" role="tooltip" style="opacity:0;visibility:hidden;pointer-events:none">Ask about Srini to Proxy</span>' + sparkle + '</button></li>\n' +
        '      <li><a class="get-in-touch-btn" href="mailto:tcsreeni93@gmail.com">Get in Touch</a></li>\n' +
        '    </ul>\n' +
        '  </nav>\n' +
        '</header>';
      html = html.replace(headerMatch[0], newHeader);
    }

    // 6. Inject nav CSS
    var navCSS = '<style>' +
      '.logo-srini{position:absolute;z-index:10001;font-family:"Press Start 2P","Courier New","Monaco",monospace;font-size:16px;color:#666;text-decoration:none;letter-spacing:2px;cursor:pointer;text-transform:uppercase;line-height:1.5;display:inline-block;padding-bottom:4px}' +
      '.logo-srini::after{display:none}' +
      '@media screen and (min-width:769px){.logo-srini{top:68px;transform:translateY(-50%);left:4rem}}' +
      '@media screen and (max-width:768px){.logo-srini{font-size:12px;top:2rem;left:5%;letter-spacing:1px;transform:none}}' +
      'header{background:#fff;display:flex;align-items:center;min-height:65px;justify-content:flex-end;padding:0 2rem 0 0;overflow:visible}' +
      'header nav{display:flex;justify-content:flex-end;flex:1}' +
      '.hamburgler-icon-wrapper{z-index:10000!important;position:absolute!important;top:2rem!important;right:2rem!important;height:26px!important;width:26px!important;cursor:pointer!important}' +
      '.hamburgler-icon,.hamburgler-icon:before,.hamburgler-icon:after{background:#000!important}' +
      '.hamburgler-active .hamburgler-icon{background:transparent!important;transform:rotate(-135deg)!important}' +
      '.hamburgler-active .hamburgler-icon:before,.hamburgler-active .hamburgler-icon:after{top:0!important;background:black!important}' +
      '.hamburgler-active .hamburgler-icon:before{transform:rotate(90deg)!important}' +
      '.hamburgler-menu{opacity:0!important;pointer-events:none!important;position:fixed!important;top:12px!important;right:12px!important;bottom:auto!important;left:12px!important;width:auto!important;background-color:#fbfaf4!important;color:#000!important;text-align:center!important;border-radius:20px!important;padding:5rem 2rem 2.5rem!important;box-shadow:0 8px 40px rgba(0,0,0,0.12),0 0 0 1px rgba(0,0,0,0.04)!important;z-index:9998!important;transform:translateY(-12px) scale(0.98)!important;transition:opacity 0.3s cubic-bezier(0.16,1,0.3,1),transform 0.3s cubic-bezier(0.16,1,0.3,1)!important}' +
      '.hamburgler-active .hamburgler-menu{opacity:1!important;pointer-events:initial!important;transform:translateY(0) scale(1)!important;z-index:9998!important}' +
      '.hamburgler-active{overflow:visible!important;max-height:none!important}' +
      '.hamburgler-menu-list{display:flex!important;flex-direction:column!important;gap:0.25rem!important;float:none!important;text-align:center!important;padding:0!important;margin:0!important;list-style-type:none!important;position:static!important;transform:none!important;font-size:110%!important;overflow:visible!important}' +
      '.hamburgler-active .hamburgler-menu-list{transform:none!important}' +
      '.hamburgler-menu-list li{line-height:1.4!important;float:none!important;display:block!important;margin:0!important;text-align:center!important}' +
      '.hamburgler-menu-list li a:not(.get-in-touch-btn){display:block!important;padding:0.85rem 1rem!important;border-radius:12px!important;color:#000!important;text-decoration:none!important;transition:background 0.2s ease!important}' +
      '.hamburgler-menu-list li a:not(.get-in-touch-btn):hover{background:rgba(0,0,0,0.05)!important}' +
      '.hamburgler-backdrop{position:fixed;inset:0;z-index:9997;background:rgba(0,0,0,0);pointer-events:none;transition:background 0.3s ease}' +
      '.hamburgler-backdrop.active{background:rgba(0,0,0,0.15);pointer-events:auto}' +
      '.desk-menu{display:flex!important;align-items:center!important;justify-content:flex-end!important;height:100%;padding-top:40px!important;padding-right:1rem!important;overflow:visible!important}' +
      '.desk-menu li{display:flex!important;align-items:center!important;float:none!important;height:100%}' +
      '.desk-menu li a:not(.get-in-touch-btn){display:flex!important;align-items:center!important;height:100%;padding:0 25px!important;font-family:"Space Mono","Courier New","Monaco",monospace!important;font-size:14px!important;letter-spacing:0.5px!important;text-transform:uppercase!important;color:#000!important;text-decoration:none}' +
      '.desk-menu li a:hover{color:#666!important}' +
      '.hamburgler-menu-list li a{font-family:"Space Mono","Courier New","Monaco",monospace!important;font-size:16px!important;letter-spacing:0.5px!important;text-transform:uppercase!important}' +
      '.get-in-touch-btn{position:relative;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:8px;padding:14px 28px!important;min-height:auto!important;min-width:auto!important;background:rgba(255,255,255,0.1)!important;backdrop-filter:blur(24px)!important;-webkit-backdrop-filter:blur(24px)!important;border:1px solid rgba(255,255,255,0.3)!important;box-shadow:0 4px 16px rgba(0,0,0,0.08),inset 0 1px 0 0 rgba(255,255,255,0.4),0 0 0 1px rgba(255,255,255,0.1)!important;color:#000!important;border-radius:9999px!important;font-size:13px!important;font-weight:400!important;font-family:"Space Mono","Courier New","Monaco",monospace!important;text-decoration:none!important;transition:all 0.3s ease!important;cursor:pointer!important;line-height:1!important;letter-spacing:0.5px!important;text-transform:uppercase!important;margin-left:8px!important;vertical-align:middle!important;overflow:hidden}' +
      '.get-in-touch-btn:hover{border-color:rgba(255,255,255,0.5)!important;transform:scale(1.03)!important}' +
      '.get-in-touch-btn:active{transform:scale(0.98)!important}' +
      '.hamburgler-menu-list .get-in-touch-btn{display:flex!important;align-items:center!important;justify-content:center!important;margin:1.25rem auto 0!important;padding:16px 32px!important;width:100%;max-width:280px;min-height:56px;background:#000!important;color:#fff!important;border:none!important;border-radius:9999px!important;font-size:14px!important;font-weight:200!important;letter-spacing:0.5px!important;box-shadow:0 4px 14px rgba(0,0,0,0.15)!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;transition:transform 0.2s ease,box-shadow 0.2s ease!important}' +
      '.hamburgler-menu-list .get-in-touch-btn:hover{transform:scale(1.03)!important;box-shadow:0 6px 20px rgba(0,0,0,0.2)!important;background:#222!important;color:#fff!important}' +
      '@media screen and (max-width:768px){.desk-menu{display:none!important}.hamburgler-icon-wrapper{display:block!important}.hamburgler-menu{display:block!important;opacity:0}ul.hamburgler-menu-list{display:flex!important;flex-direction:column!important;overflow:visible!important}.hamburgler-menu-list li{display:block!important;float:none!important}header{padding-bottom:0!important}.srini-chat-nav-li{display:none!important}}' +
      '@media screen and (max-width:601px){.desk-menu{display:none!important}.hamburgler-icon-wrapper{display:block!important}.hamburgler-menu{display:block!important;opacity:0}ul.hamburgler-menu-list{display:flex!important;flex-direction:column!important;overflow:visible!important}.hamburgler-menu-list li{display:block!important;float:none!important}header{padding-bottom:0!important}}' +
      '.srini-chat-nav-li{display:flex;align-items:center;overflow:visible;z-index:2}.srini-chat-nav-li,.srini-chat-nav-btn{opacity:1!important}' +
      '.srini-chat-hovertip{position:absolute;top:calc(100% + 10px);left:50%;transform:translateX(-50%) translateY(6px);padding:8px 14px;background:#000;color:#fff;font-family:"Space Mono","Courier New",Monaco,monospace;font-size:11px;font-weight:500;letter-spacing:0.03em;white-space:nowrap;border-radius:999px;box-shadow:0 8px 28px rgba(0,0,0,0.22);opacity:0;visibility:hidden;pointer-events:none;transition:opacity 0.2s ease,transform 0.2s ease,visibility 0.2s;z-index:10005}' +
      '.srini-chat-hovertip::after{content:"";position:absolute;bottom:100%;left:50%;margin-left:-6px;border:6px solid transparent;border-bottom-color:#000}' +
      '.srini-chat-nav-btn:hover .srini-chat-hovertip,.srini-chat-nav-btn:focus-visible .srini-chat-hovertip,.srini-chat-fab:hover .srini-chat-hovertip,.srini-chat-fab:focus-visible .srini-chat-hovertip{opacity:1!important;visibility:visible!important;transform:translateX(-50%) translateY(0)!important}' +
      '.srini-chat-nav-btn{background:#eaeefb;border:1px solid rgba(255,255,255,0.5);padding:0;width:48px;height:48px;min-width:48px;min-height:48px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.2s;position:relative}' +
      '.srini-chat-sparkle{width:26px;height:26px;color:#3b65ef;transition:transform 0.2s ease,color 0.2s ease}' +
      '.srini-chat-nav-btn:hover{background:#dce3f8}' +
      '.srini-chat-nav-btn:hover .srini-chat-sparkle{transform:scale(1.15);color:#7da1f7}' +
      '</style>';
    html = html.replace(
      '<link rel="stylesheet" href="style-2.css">',
      '<link rel="stylesheet" href="style-2.css">' + navCSS
    );

    // 7. Replace old hamburger JS with backdrop-aware version
    var oldJS =
      "function checkNav() {\n" +
      "        $('body').toggleClass('hamburgler-active');\n" +
      "      }\n\n" +
      "      function closeNav(e) {\n" +
      "         $('body').removeClass('hamburgler-active');\n" +
      "      }";
    var newJS =
      "function checkNav() {\n" +
      "        var isOpen = $('body').hasClass('hamburgler-active');\n" +
      "        $('body').toggleClass('hamburgler-active');\n" +
      "        if (!isOpen) {\n" +
      "          if (!$('.hamburgler-backdrop').length) {\n" +
      "            $('<div class=\"hamburgler-backdrop\"></div>').appendTo('body');\n" +
      "          }\n" +
      "          $('.hamburgler-backdrop').addClass('active');\n" +
      "        } else {\n" +
      "          $('.hamburgler-backdrop').removeClass('active');\n" +
      "        }\n" +
      "      }\n\n" +
      "      function closeNav(e) {\n" +
      "        $('body').removeClass('hamburgler-active');\n" +
      "        $('.hamburgler-backdrop').removeClass('active');\n" +
      "      }";
    html = html.replace(oldJS, newJS);

    // 8. Add backdrop click handler
    html = html.replace(
      "$(window).on('keyup', ifEscClose);",
      "$(window).on('keyup', ifEscClose);\n      $(document).on('click', '.hamburgler-backdrop', closeNav);"
    );

    // 9. Wrap body content in #site-content-wrap for content-push behavior
    var bodyOpenMatch = html.match(/<body[^>]*>/i);
    if (bodyOpenMatch) {
      html = html.replace(bodyOpenMatch[0], bodyOpenMatch[0] + '<div id="site-content-wrap">');
    }

    // 10. Inject chatbot sidebar + FAB + JS before </body>, closing the wrap first
    var parentSidebar = document.getElementById('chatbot-sidebar');
    var chatSrc = (parentSidebar && parentSidebar.getAttribute('data-chatbot-src')) || './chatbot/';
    var chatApi = (parentSidebar && parentSidebar.getAttribute('data-chat-api')) || '';

    var chatbotHTML =
      '</div><!-- /site-content-wrap -->' +
      '<button type="button" class="srini-chat-trigger srini-chat-fab" aria-label="Open AI chat" aria-expanded="false">' +
      '<span class="srini-chat-hovertip" role="tooltip" style="opacity:0;visibility:hidden;pointer-events:none">Ask about Srini to Proxy</span>' +
      '<svg class="srini-chat-fab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3L13.4302 8.31181C13.6047 8.96 13.692 9.28409 13.8642 9.54905C14.0166 9.78349 14.2165 9.98336 14.451 10.1358C14.7159 10.308 15.04 10.3953 15.6882 10.5698L21 12L15.6882 13.4302C15.04 13.6047 14.7159 13.692 14.451 13.8642C14.2165 14.0166 14.0166 14.2165 13.8642 14.451C13.692 14.7159 13.6047 15.04 13.4302 15.6882L12 21L10.5698 15.6882C10.3953 15.04 10.308 14.7159 10.1358 14.451C9.98336 14.2165 9.78349 14.0166 9.54905 13.8642C9.28409 13.692 8.96 13.6047 8.31181 13.4302L3 12L8.31181 10.5698C8.96 10.3953 9.28409 10.308 9.54905 10.1358C9.78349 9.98336 9.98336 9.78349 10.1358 9.54905C10.308 9.28409 10.3953 8.96 10.5698 8.31181L12 3Z"/></svg>' +
      '</button>' +
      '<div id="chatbot-sidebar" class="chatbot-sidebar" data-chatbot-src="' + chatSrc + '"' +
      (chatApi ? ' data-chat-api="' + chatApi + '"' : '') +
      ' aria-hidden="true"></div>';

    var chatbotCSS =
      '<style>' +
      '#site-content-wrap{transition:margin-right 0.3s cubic-bezier(0.16,1,0.3,1)}' +
      'body.chat-open #site-content-wrap{margin-right:444px}' +
      '.chatbot-sidebar{position:fixed;top:12px;right:12px;bottom:12px;width:0;overflow:hidden;transition:width 0.3s cubic-bezier(0.16,1,0.3,1);z-index:9999;background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,0.06);border-radius:16px}' +
      'body.chat-open .chatbot-sidebar{width:420px}' +
      '.chatbot-sidebar iframe{width:100%;height:100%;border:none;display:block;border-radius:16px}' +
      '@keyframes srini-chat-attention{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(59,101,239,0)}35%{transform:scale(1.12);box-shadow:0 8px 24px rgba(59,101,239,0.28)}55%{transform:scale(1.06);box-shadow:0 4px 14px rgba(59,101,239,0.15)}}' +
      '@keyframes srini-chat-bounce-load{0%{transform:scale(1);box-shadow:0 0 0 0 rgba(59,101,239,0)}48%{transform:scale(1.13);box-shadow:0 8px 24px rgba(59,101,239,0.24)}100%{transform:scale(1);box-shadow:0 0 0 0 rgba(59,101,239,0)}}' +
      '@media (prefers-reduced-motion:no-preference){.srini-chat-trigger.srini-chat-bounce-enter{animation:srini-chat-bounce-load 0.9s cubic-bezier(0.45,0,0.55,1) 0.4s 1 both!important}.srini-chat-fab{animation:srini-chat-attention 2.75s ease-in-out infinite}.srini-chat-fab:hover{animation-play-state:paused}body.chat-open .srini-chat-fab{animation:none!important}}' +
      '.srini-chat-hovertip{position:absolute;top:calc(100% + 10px);left:50%;transform:translateX(-50%) translateY(6px);padding:8px 14px;background:#000;color:#fff;font-family:"Space Mono","Courier New",Monaco,monospace;font-size:11px;font-weight:500;letter-spacing:0.03em;white-space:nowrap;border-radius:999px;box-shadow:0 8px 28px rgba(0,0,0,0.22);opacity:0;visibility:hidden;pointer-events:none;transition:opacity 0.2s ease,transform 0.2s ease,visibility 0.2s;z-index:10005}' +
      '.srini-chat-hovertip::after{content:"";position:absolute;bottom:100%;left:50%;margin-left:-6px;border:6px solid transparent;border-bottom-color:#000}' +
      '.srini-chat-nav-btn:hover .srini-chat-hovertip,.srini-chat-nav-btn:focus-visible .srini-chat-hovertip,.srini-chat-fab:hover .srini-chat-hovertip,.srini-chat-fab:focus-visible .srini-chat-hovertip{opacity:1!important;visibility:visible!important;transform:translateX(-50%) translateY(0)!important}' +
      '.srini-chat-fab{position:fixed;top:1.85rem;right:2rem;z-index:10002;display:none;align-items:center;justify-content:center;width:75px;height:75px;padding:0;background:#eaeefb;backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px) saturate(180%);border:1px solid rgba(255,255,255,0.5);border-radius:50%;cursor:pointer;box-shadow:none;transition:all 0.3s ease;overflow:visible}' +
      '.srini-chat-fab-icon{width:32px;height:32px;color:#3b65ef;transition:color 0.2s ease,transform 0.2s ease}' +
      '.srini-chat-fab:hover{background:#dce3f8;border-color:rgba(255,255,255,0.7)}' +
      '.srini-chat-fab:hover .srini-chat-fab-icon{color:#7da1f7;transform:scale(1.1)}' +
      '.srini-chat-fab:active{animation:none!important;transform:scale(0.95)}' +
      '@media(min-width:769px){.srini-chat-fab{display:none!important}}' +
      '@media(max-width:768px){' +
      '.srini-chat-fab{display:flex;top:auto;bottom:24px;right:24px;width:75px;height:75px}' +
      '.srini-chat-fab-icon{width:32px;height:32px}' +
      '.srini-chat-nav-li{display:none!important}' +
      'body.chat-open #site-content-wrap{margin-right:0}' +
      '.chatbot-sidebar{top:0;right:0;bottom:0;left:0;width:100%!important;height:100%;border-radius:0;z-index:10003;transform:translateY(100%);transition:transform 0.35s cubic-bezier(0.16,1,0.3,1)}' +
      'body.chat-open .chatbot-sidebar{transform:translateY(0)}' +
      '.chatbot-sidebar iframe{border-radius:0}' +
      'body.chat-open .srini-chat-fab{display:none}' +
      '}' +
      '</style>';

    var chatbotJS =
      '<script>' +
      '(function(){' +
      'var sidebar=document.getElementById("chatbot-sidebar");' +
      'var triggers=document.querySelectorAll(".srini-chat-trigger");' +
      'var iframeLoaded=false;' +
      'function resolveChatApi(e){e=String(e||"").trim();if(!e)return"";try{var t=new URL(e);if(t.hostname==="localhost"||t.hostname==="127.0.0.1")return"https://srinilm.onrender.com"}catch(x){}return e.replace(/\\/$/,"")}' +
      'function getAppUrl(){var src=sidebar&&sidebar.getAttribute("data-chatbot-src");return(typeof window.CHATBOT_APP_URL!=="undefined"?window.CHATBOT_APP_URL:(src||"./chatbot/")).replace(/\\/$/,"")+"/";}' +
      'function getIframeSrc(){var base=getAppUrl();var api=resolveChatApi((sidebar&&sidebar.getAttribute("data-chat-api"))||window.SRINI_CHAT_API||"");var cb="6";if(api)return base+"?api="+encodeURIComponent(api)+"&cb="+cb;return base+"?cb="+cb;}' +
      'function setOpen(open){var isOpen=!!open;document.body.classList.toggle("chat-open",isOpen);if(sidebar)sidebar.setAttribute("aria-hidden",!isOpen);triggers.forEach(function(t){t.setAttribute("aria-label",isOpen?"Close AI chat":"Open AI chat");t.setAttribute("aria-expanded",isOpen);});if(isOpen&&sidebar&&!iframeLoaded){var iframe=document.createElement("iframe");iframe.title="Proxy AI chat";iframe.src=getIframeSrc();sidebar.appendChild(iframe);iframeLoaded=true;}}' +
      'triggers.forEach(function(t){t.addEventListener("click",function(){var isOpen=document.body.classList.contains("chat-open");setOpen(!isOpen);});});' +
      'window.addEventListener("message",function(e){if(e.data==="srini-chat-close")setOpen(false);});' +
      'function runChatBounceIntro(){try{if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;}catch(x){return;}triggers.forEach(function(t){t.classList.add("srini-chat-bounce-enter");function onEnd(ev){if(ev.animationName!=="srini-chat-bounce-load")return;t.classList.remove("srini-chat-bounce-enter");t.removeEventListener("animationend",onEnd);}t.addEventListener("animationend",onEnd);});}if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",runChatBounceIntro);}else{runChatBounceIntro();}' +
      '})();' +
      '<\/script>';

    if (html.includes('</body>')) {
      html = html.replace('</body>', chatbotHTML + chatbotCSS + chatbotJS + '</body>');
    } else {
      html = html + chatbotHTML + chatbotCSS + chatbotJS;
    }

    return html;
  }

  // ─── Hide parent page nav once iframe loads ─────────────────────────
  function hideParentNav() {
    var selectors = [
      '.logo-srini', 'header', '.hamburgler-menu',
      '.srini-chat-fab', '#chatbot-sidebar'
    ];
    selectors.forEach(function (sel) {
      var el = sel.startsWith('#')
        ? document.getElementById(sel.slice(1))
        : document.querySelector(sel);
      if (el && el.closest('#password-protect') === null) {
        el.style.display = 'none';
      }
    });
  }

  // ─── Submit handler ─────────────────────────────────────────────────
  async function doSubmit() {
    if (passEl.value.trim().length === 0) return;

    submitBtn.classList.remove('enabled');
    submitBtn.disabled = true;
    passEl.disabled = true;

    var iv, ciphertext, key;

    try {
      var raw = str2ab(payload);
      var salt = raw.slice(0, 32);
      iv = raw.slice(32, 32 + 16);
      ciphertext = raw.slice(32 + 16);
      key = await deriveKey(salt, passEl.value);
    } catch (e) {
      errorEl.style.display = 'inline';
      submitBtn.disabled = false;
      passEl.disabled = false;
      submitBtn.classList.remove('enabled');
      console.error(e);
      return;
    }

    try {
      var decryptedArray = new Uint8Array(
        await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, ciphertext)
      );
      var decrypted = new TextDecoder().decode(decryptedArray);
      if (decrypted === '') throw 'No data returned';

      // Standard iframe helpers
      var basestr = '<base href="." target="_top">';
      var sectionStyle = '<style>#Selectedworks { background: #fff !important; }</style>';
      var anchorfix =
        '<script>' +
        'Array.from(document.links).forEach(function(a){' +
        'var h=a.getAttribute("href");' +
        'if(h&&h.startsWith("#")){' +
        'a.addEventListener("click",function(e){' +
        'e.preventDefault();' +
        'var t=document.getElementById(this.getAttribute("href").substring(1));' +
        'if(t)t.scrollIntoView();' +
        '});}});' +
        '<\/script>';

      if (decrypted.includes('<head>'))
        decrypted = decrypted.replace('<head>', '<head>' + basestr + sectionStyle);
      else if (decrypted.includes('<!DOCTYPE html>'))
        decrypted = decrypted.replace('<!DOCTYPE html>', '<!DOCTYPE html>' + basestr + sectionStyle);
      else
        decrypted = basestr + sectionStyle + decrypted;

      if (decrypted.includes('</body>'))
        decrypted = decrypted.replace('</body>', anchorfix + '</body>');
      else if (decrypted.includes('</html>'))
        decrypted = decrypted.replace('</html>', anchorfix + '</html>');
      else
        decrypted = decrypted + anchorfix;

      // Patch nav/chatbot/AOS
      decrypted = patchDecryptedContent(decrypted);

      frame.style.display = 'block';
      frame.srcdoc = decrypted;

      successEl.style.display = 'inline';
      setTimeout(function () {
        dialogWrap.style.display = 'none';
        hideParentNav();
      }, 1000);
    } catch (e) {
      invalidEl.style.display = 'inline';
      passEl.value = '';
      submitBtn.disabled = false;
      passEl.disabled = false;
      submitBtn.classList.remove('enabled');
      console.error(e);
    }
  }

  // ─── Button state management ────────────────────────────────────────
  function checkButtonState() {
    if (passEl.value.trim().length > 0) {
      submitBtn.classList.add('enabled');
    } else {
      submitBtn.classList.remove('enabled');
    }
  }

  passEl.addEventListener('input', checkButtonState);
  passEl.addEventListener('paste', function () {
    setTimeout(checkButtonState, 10);
  });
  checkButtonState();

  submitBtn.onclick = doSubmit;
  passEl.onkeypress = function (e) {
    if (!e) e = window.event;
    var keyCode = e.keyCode || e.which;
    invalidEl.style.display = 'none';
    if (keyCode === 13) {
      if (passEl.value.trim().length > 0) doSubmit();
      return false;
    }
  };
})();
