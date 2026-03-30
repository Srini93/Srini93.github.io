---
name: Updated Navigation
description: Applies the unified navigation bar and chatbot sidebar to any HTML page in this portfolio site. Replaces existing header/nav with the "srini" logo, desktop menu, hamburger menu, chatbot sparkle icon, Get in Touch button, and chatbot sidebar with content-push behavior. Use when the user asks to add navigation, update nav, add chatbot, or apply consistent nav/chatbot to a page.
---

# Apply Navigation & Chatbot to a Page

Applies the standard navigation and chatbot from `index.html` to any other HTML page in this site. Use `about.html` and `index.html` as the canonical references.

## Pre-flight

1. Read the target page to understand its current `<head>`, header/nav, and `</body>` structure.
2. Read `about.html` as the completed reference implementation for pages using `style-3.css`.
3. Read `index.html` lines 48–108 (logo + nav CSS), 488–948 (hamburger/desk-menu/get-in-touch CSS), 1100–1130 (nav HTML), 1661–1745 (chatbot HTML/CSS/JS) as the source of truth.
4. Identify what the target page already has so you only add what's missing.

## Step 1 — Font imports in `<head>`

Ensure these Google Fonts `<link>` tags exist (add if missing, don't duplicate):

```html
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
```

## Step 2 — Logo + Hamburger overlay (before `<header>`)

Place these **before** the `<header>` tag (outside it):

```html
<a href="index.html" class="logo-srini" data-text="srini">srini</a>

<div class="hamburgler-menu">
  <ul class="hamburgler-menu-list">
    <li><a href="about.html">About</a></li>
    <li><a href="index.html#Selectedworks">Works</a></li>
    <li><a class="contact" href="Resume_Srinivasan.pdf" target="_blank">Résumé</a></li>
    <li><a class="get-in-touch-btn" href="mailto:tcsreeni93@gmail.com">Get in Touch</a></li>
  </ul>
</div>
```

## Step 3 — Inline `<style>` block (nav + layout overrides)

Add a `<style>` block (before `<header>`) with the exact styles below. Copy from `about.html` lines 65–359 for the complete working implementation.

**CRITICAL**: Pages using `style-3.css` have deep conflicts that MUST be overridden with `!important`. The overrides below are battle-tested and solve all known issues.

### Logo styles

```css
.logo-srini {
  position: absolute;
  z-index: 10001;
  font-family: 'Press Start 2P', 'Courier New', 'Monaco', monospace;
  font-size: 16px;
  color: #666;
  text-decoration: none;
  letter-spacing: 2px;
  cursor: pointer;
  text-transform: uppercase;
  line-height: 1.5;
  display: inline-block;
  padding-bottom: 4px;
}
.logo-srini::after { display: none; }

@media screen and (min-width: 769px) {
  .logo-srini {
    top: 68px;
    transform: translateY(-50%);
    left: 4rem;
  }
}
@media screen and (max-width: 768px) {
  .logo-srini {
    font-size: 12px;
    top: 2rem;
    left: 5%;
    letter-spacing: 1px;
    transform: none;
  }
}
```

### Header styles

```css
header {
  background: #fff;
  display: flex;
  align-items: center;
  min-height: 65px;
  justify-content: flex-end;
  padding: 0 2rem 0 0;
  overflow: visible;
}
header nav {
  display: flex;
  justify-content: flex-end;
  flex: 1;
}
```

### Hamburger menu overrides (critical for style-3.css pages)

```css
.hamburgler-icon-wrapper {
  z-index: 10000 !important;
  position: absolute !important;
  top: 2rem !important;
  right: 2rem !important;
  height: 26px !important;
  width: 26px !important;
  cursor: pointer !important;
}
.hamburgler-icon, .hamburgler-icon:before, .hamburgler-icon:after {
  background: #000 !important;
}
.hamburgler-active .hamburgler-icon {
  background: transparent !important;
  transform: rotate(-135deg) !important;
}
.hamburgler-active .hamburgler-icon:before,
.hamburgler-active .hamburgler-icon:after {
  top: 0 !important;
  background: black !important;
}
.hamburgler-active .hamburgler-icon:before {
  transform: rotate(90deg) !important;
}

.hamburgler-menu {
  opacity: 0 !important;
  pointer-events: none !important;
  position: fixed !important;
  top: 12px !important;
  right: 12px !important;
  bottom: auto !important;
  left: 12px !important;
  width: auto !important;
  background-color: #fbfaf4 !important;
  color: #000 !important;
  text-align: center !important;
  border-radius: 20px !important;
  padding: 5rem 2rem 2.5rem !important;
  box-shadow: 0 8px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04) !important;
  z-index: 9998 !important;
  transform: translateY(-12px) scale(0.98) !important;
  transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
}
.hamburgler-active .hamburgler-menu {
  opacity: 1 !important;
  pointer-events: initial !important;
  transform: translateY(0) scale(1) !important;
  z-index: 9998 !important;
}
.hamburgler-active {
  overflow: visible !important;
  max-height: none !important;
}

.hamburgler-menu-list {
  display: flex !important;
  flex-direction: column !important;
  gap: 0.25rem !important;
  float: none !important;
  text-align: center !important;
  padding: 0 !important;
  margin: 0 !important;
  list-style-type: none !important;
  position: static !important;
  transform: none !important;
  font-size: 110% !important;
  overflow: visible !important;
}
.hamburgler-active .hamburgler-menu-list {
  transform: none !important;
}
.hamburgler-menu-list li {
  line-height: 1.4 !important;
  float: none !important;
  display: block !important;
  margin: 0 !important;
  text-align: center !important;
}
.hamburgler-menu-list li a:not(.get-in-touch-btn) {
  display: block !important;
  padding: 0.85rem 1rem !important;
  border-radius: 12px !important;
  color: #000 !important;
  text-decoration: none !important;
  transition: background 0.2s ease !important;
}
.hamburgler-menu-list li a:not(.get-in-touch-btn):hover {
  background: rgba(0,0,0,0.05) !important;
}

.hamburgler-backdrop {
  position: fixed; inset: 0; z-index: 9997;
  background: rgba(0,0,0,0); pointer-events: none;
  transition: background 0.3s ease;
}
.hamburgler-backdrop.active {
  background: rgba(0,0,0,0.15); pointer-events: auto;
}
```

### Desktop menu styles

```css
.desk-menu {
  display: flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  height: 100%;
  padding-top: 40px !important;
  padding-right: 1rem !important;
  overflow: visible !important;
}
.desk-menu li {
  display: flex !important;
  align-items: center !important;
  float: none !important;
  height: 100%;
}
.desk-menu li a:not(.get-in-touch-btn) {
  display: flex !important;
  align-items: center !important;
  height: 100%;
  padding: 0 25px !important;
  font-family: 'Space Mono', 'Courier New', 'Monaco', monospace !important;
  font-size: 14px !important;
  letter-spacing: 0.5px !important;
  text-transform: uppercase !important;
  color: #000 !important;
  text-decoration: none;
}
.desk-menu li a:hover { color: #666 !important; }

/* Hamburger menu links */
.hamburgler-menu-list li a {
  font-family: 'Space Mono', 'Courier New', 'Monaco', monospace !important;
  font-size: 16px !important;
  letter-spacing: 0.5px !important;
  text-transform: uppercase !important;
}
```

### Get in Touch button styles

```css
/* Desktop glassmorphism variant */
.get-in-touch-btn {
  position: relative;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 8px;
  padding: 14px 28px !important;
  min-height: auto !important;
  min-width: auto !important;
  background: rgba(255, 255, 255, 0.1) !important;
  backdrop-filter: blur(24px) !important;
  -webkit-backdrop-filter: blur(24px) !important;
  border: 1px solid rgba(255, 255, 255, 0.3) !important;
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.1) !important;
  color: #000 !important;
  border-radius: 9999px !important;
  font-size: 13px !important;
  font-weight: 400 !important;
  font-family: 'Space Mono', 'Courier New', 'Monaco', monospace !important;
  text-decoration: none !important;
  transition: all 0.3s ease !important;
  cursor: pointer !important;
  line-height: 1 !important;
  letter-spacing: 0.5px !important;
  text-transform: uppercase !important;
  margin-left: 8px !important;
  vertical-align: middle !important;
  overflow: hidden;
}
.get-in-touch-btn::before {
  content: '';
  position: absolute; inset: 0; z-index: 0;
  background: rgba(255, 255, 255, 0.05);
  transform: translateX(-100%);
  transition: transform 0.3s ease-out;
}
.get-in-touch-btn:hover::before { transform: translateX(0); }
.get-in-touch-btn:hover {
  border-color: rgba(255, 255, 255, 0.5) !important;
  transform: scale(1.03) !important;
  box-shadow:
    0 12px 32px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 0 rgba(255, 255, 255, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.2) !important;
}
.get-in-touch-btn:active { transform: scale(0.98) !important; }

/* Mobile hamburger variant — solid black pill */
.hamburgler-menu-list .get-in-touch-btn {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  margin: 1.25rem auto 0 !important;
  padding: 16px 32px !important;
  width: 100%;
  max-width: 280px;
  min-height: 56px;
  background: #000 !important;
  color: #fff !important;
  border: none !important;
  border-radius: 9999px !important;
  font-size: 14px !important;
  font-weight: 200 !important;
  letter-spacing: 0.5px !important;
  box-shadow: 0 4px 14px rgba(0,0,0,0.15) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  transition: transform 0.2s ease, box-shadow 0.2s ease !important;
}
.hamburgler-menu-list .get-in-touch-btn:hover {
  transform: scale(1.03) !important;
  box-shadow: 0 6px 20px rgba(0,0,0,0.2) !important;
  background: #222 !important;
  color: #fff !important;
}
.hamburgler-menu-list .get-in-touch-btn:active {
  transform: scale(0.98) !important;
}
```

### Responsive overrides (CRITICAL — must include BOTH breakpoints)

`style-3.css` has `ul { display: none }` in TWO separate media queries: `@media (max-width: 768px)` and `@media (max-width: 601px)`. It also has `header { padding-bottom: 20% }` at 601px. Both must be overridden.

```css
@media screen and (max-width: 768px) {
  .desk-menu { display: none !important; }
  .hamburgler-icon-wrapper { display: block !important; }
  .hamburgler-menu { display: block !important; opacity: 0; }
  ul.hamburgler-menu-list { display: flex !important; flex-direction: column !important; overflow: visible !important; }
  .hamburgler-menu-list li { display: block !important; float: none !important; }
  header { padding-bottom: 0 !important; }
  .srini-chat-nav-li { display: none !important; }
}
@media screen and (max-width: 601px) {
  .desk-menu { display: none !important; }
  .hamburgler-icon-wrapper { display: block !important; }
  .hamburgler-menu { display: block !important; opacity: 0; }
  ul.hamburgler-menu-list { display: flex !important; flex-direction: column !important; overflow: visible !important; }
  .hamburgler-menu-list li { display: block !important; float: none !important; }
  header { padding-bottom: 0 !important; }
}
```

### Key `style-3.css` conflicts reference

| `style-3.css` rule | Required override |
|---|---|
| `.hamburgler-menu { position: fixed; top: 0; bottom: 0; left: 0; background-color: #000 }` | Wide cream panel: `top: 12px; right: 12px; left: 12px; width: auto; background-color: #fbfaf4; border-radius: 20px; padding: 5rem 2rem 2.5rem; text-align: center` |
| `.hamburgler-active { overflow: hidden; max-height: 100vh }` | `overflow: visible !important; max-height: none !important` |
| `.hamburgler-active .hamburgler-icon:before/after { background: white }` | `background: #000 !important` |
| `.hamburgler-menu-list { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) }` | `position: static !important; transform: none !important` |
| `ul { overflow: hidden }` (global) | `.hamburgler-menu-list { overflow: visible !important }` |
| `li { float: right }` (global) | `.hamburgler-menu-list li { float: none !important }` |
| `@media (max-width: 768px) { ul { display: none } }` | `ul.hamburgler-menu-list { display: flex !important }` inside same media query |
| `@media (max-width: 601px) { ul { display: none }; header { padding-bottom: 20% } }` | Duplicate overrides at 601px breakpoint; `header { padding-bottom: 0 !important }` |
| `@media (max-width: 800px) { li a { color: #fff } }` | `.hamburgler-menu-list li a:not(.get-in-touch-btn) { color: #000 !important }` |
| `.hamburgler-icon-wrapper` needs precise positioning | `position: absolute; top: 2rem; right: 2rem; height: 26px; width: 26px; z-index: 10000` with `!important` |

## Step 4 — Header HTML

Replace the existing `<header>` content with:

```html
<div id="site-content-wrap">
<header>
  <div id="hamburgler" class="hamburgler-icon-wrapper">
    <span class="hamburgler-icon"></span>
  </div>
  <nav>
    <ul class="desk-menu">
      <li><a href="index.html#Selectedworks">Works</a></li>
      <li><a href="about.html">About</a></li>
      <li><a class="contact" href="Resume_Srinivasan.pdf" target="_blank">Résumé</a></li>
      <li class="srini-chat-nav-li"><button type="button" class="srini-chat-trigger srini-chat-nav-btn" aria-label="Open AI chat" aria-expanded="false"><svg class="srini-chat-sparkle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3L13.4302 8.31181C13.6047 8.96 13.692 9.28409 13.8642 9.54905C14.0166 9.78349 14.2165 9.98336 14.451 10.1358C14.7159 10.308 15.04 10.3953 15.6882 10.5698L21 12L15.6882 13.4302C15.04 13.6047 14.7159 13.692 14.451 13.8642C14.2165 14.0166 14.0166 14.2165 13.8642 14.451C13.692 14.7159 13.6047 15.04 13.4302 15.6882L12 21L10.5698 15.6882C10.3953 15.04 10.308 14.7159 10.1358 14.451C9.98336 14.2165 9.78349 14.0166 9.54905 13.8642C9.28409 13.692 8.96 13.6047 8.31181 13.4302L3 12L8.31181 10.5698C8.96 10.3953 9.28409 10.308 9.54905 10.1358C9.78349 9.98336 9.98336 9.78349 10.1358 9.54905C10.308 9.28409 10.3953 8.96 10.5698 8.31181L12 3Z"/></svg></button></li>
      <li><a class="get-in-touch-btn" href="mailto:tcsreeni93@gmail.com">Get in Touch</a></li>
    </ul>
  </nav>
</header>
```

Note: The `<div id="site-content-wrap">` opens here and wraps ALL page content until just before the chatbot elements.

## Step 5 — Close `#site-content-wrap` and add chatbot elements (before `</body>`)

Close the content wrapper, then add the chatbot FAB, sidebar, styles, and scripts:

```html
</div><!-- /site-content-wrap -->

<!-- Chatbot FAB (mobile) -->
<button type="button" class="srini-chat-trigger srini-chat-fab" aria-label="Open AI chat" aria-expanded="false">
  <svg class="srini-chat-fab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3L13.4302 8.31181C13.6047 8.96 13.692 9.28409 13.8642 9.54905C14.0166 9.78349 14.2165 9.98336 14.451 10.1358C14.7159 10.308 15.04 10.3953 15.6882 10.5698L21 12L15.6882 13.4302C15.04 13.6047 14.7159 13.692 14.451 13.8642C14.2165 14.0166 14.0166 14.2165 13.8642 14.451C13.692 14.7159 13.6047 15.04 13.4302 15.6882L12 21L10.5698 15.6882C10.3953 15.04 10.308 14.7159 10.1358 14.451C9.98336 14.2165 9.78349 14.0166 9.54905 13.8642C9.28409 13.692 8.96 13.6047 8.31181 13.4302L3 12L8.31181 10.5698C8.96 10.3953 9.28409 10.308 9.54905 10.1358C9.78349 9.98336 9.98336 9.78349 10.1358 9.54905C10.308 9.28409 10.3953 8.96 10.5698 8.31181L12 3Z"/></svg>
</button>
<div id="chatbot-sidebar" class="chatbot-sidebar" data-chatbot-src="./chatbot/" data-chat-api="http://127.0.0.1:9000" aria-hidden="true"></div>
```

### Chatbot CSS (add as `<style>` block)

```html
<style>
  #site-content-wrap { transition: margin-right 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
  body.chat-open #site-content-wrap { margin-right: 444px; }
  .chatbot-sidebar {
    position: fixed; top: 12px; right: 12px; bottom: 12px; width: 0; overflow: hidden;
    transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1); z-index: 9999;
    background: #fff; box-shadow: 0 0 0 1px rgba(0,0,0,0.06); border-radius: 16px;
  }
  body.chat-open .chatbot-sidebar { width: 420px; }
  .chatbot-sidebar iframe { width: 100%; height: 100%; border: none; display: block; border-radius: 16px; }
  .srini-chat-nav-li { display: flex; align-items: center; }
  .srini-chat-nav-btn { background: #eaeefb; border: 1px solid rgba(255,255,255,0.5); padding: 0; width: 48px; height: 48px; min-width: 48px; min-height: 48px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s, opacity 0.2s; }
  .srini-chat-sparkle { width: 26px; height: 26px; color: #3b65ef; transition: transform 0.2s ease, color 0.2s ease; }
  .srini-chat-nav-btn:hover { background: #dce3f8; opacity: 1 !important; }
  .srini-chat-nav-btn:hover .srini-chat-sparkle { transform: scale(1.15); color: #3b65ef; opacity: 1 !important; }
  header nav .desk-menu:hover .srini-chat-nav-btn,
  header nav .desk-menu:hover .srini-chat-nav-btn .srini-chat-sparkle { opacity: 1 !important; }
  .srini-chat-fab { position: fixed; top: 1.85rem; right: 2rem; z-index: 10002; display: none; align-items: center; justify-content: center; width: 75px; height: 75px; padding: 0; background: #eaeefb; backdrop-filter: blur(20px) saturate(180%); -webkit-backdrop-filter: blur(20px) saturate(180%); border: 1px solid rgba(255,255,255,0.5); border-radius: 50%; cursor: pointer; box-shadow: none; transition: all 0.3s ease; }
  .srini-chat-fab-icon { width: 32px; height: 32px; color: #3b65ef; transition: color 0.2s ease, transform 0.2s ease; }
  .srini-chat-fab:hover { background: #dce3f8; border-color: rgba(255,255,255,0.7); }
  .srini-chat-fab:hover .srini-chat-fab-icon { color: #7da1f7; transform: scale(1.1); }
  .srini-chat-fab:active { transform: scale(0.95); }
  @media (min-width: 769px) { .srini-chat-fab { display: none !important; } }
  @media (max-width: 768px) {
    .srini-chat-fab { display: flex; top: auto; bottom: 24px; right: 24px; width: 75px; height: 75px; }
    .srini-chat-fab-icon { width: 32px; height: 32px; }
    .srini-chat-nav-li { display: none !important; }
    body.chat-open #site-content-wrap { margin-right: 0; }
    .chatbot-sidebar { top: 0; right: 0; bottom: 0; left: 0; width: 100% !important; height: 100%; border-radius: 0; z-index: 10003; transform: translateY(100%); transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1); }
    body.chat-open .chatbot-sidebar { transform: translateY(0); }
    .chatbot-sidebar iframe { border-radius: 0; }
    body.chat-open .srini-chat-fab { display: none; }
  }
</style>
```

### Hamburger + AOS JS (jQuery — ensure jQuery is loaded first)

**CRITICAL**: The AOS (Animate On Scroll) library must be loaded from a working CDN. The old `rawgit.com` URL is dead and will cause `AOS is not defined` errors that crash the entire jQuery ready callback, preventing the hamburger menu click handler from being registered.

- Use `https://unpkg.com/aos@2.3.4/dist/aos.js` (NOT `rawgit.com`)
- Always wrap `AOS.init()` in a `try-catch` so the hamburger JS runs even if AOS fails to load
- If the target page already has an AOS `<script>` tag pointing to `rawgit.com`, replace it

```html
<script src="https://code.jquery.com/jquery-3.2.1.min.js" integrity="sha256-hwg4gsxgFZhOsEEamdOYGBf13FyQuiTwlAQgxVSNgt4=" crossorigin="anonymous"></script>
<script type="text/javascript" src="https://unpkg.com/aos@2.3.4/dist/aos.js"></script>
<script>
  $(function(){
    try { AOS.init({ duration: 1200 }); } catch(e) {}

    // Smooth scroll links
    $('.desk-menu a[href^="#"]').on("click", function(){
      var id = $(this).attr("href");
      $('html, body').animate({ scrollTop:$(id).offset().top }, 500);
      return false;
    });

    // Hamburger Menu and Esc events
    $('#hamburgler').on('click', checkNav);
    $('.hamburgler-menu').on('click', 'a', closeNav);
    $(window).on('keyup', ifEscClose);
    $(document).on('click', '.hamburgler-backdrop', closeNav);

    function checkNav() {
      var isOpen = $('body').hasClass('hamburgler-active');
      $('body').toggleClass('hamburgler-active');
      if (!isOpen) {
        if (!$('.hamburgler-backdrop').length) {
          $('<div class="hamburgler-backdrop"></div>').appendTo('body');
        }
        $('.hamburgler-backdrop').addClass('active');
      } else {
        $('.hamburgler-backdrop').removeClass('active');
      }
    }
    function closeNav(e) {
      $('body').removeClass('hamburgler-active');
      $('.hamburgler-backdrop').removeClass('active');
    }
    function ifEscClose(e) { if (e.keyCode == 27) closeNav() }
  });
</script>
```

### Chatbot JS (vanilla — place after jQuery block)

```html
<script>
(function() {
  var sidebar = document.getElementById('chatbot-sidebar');
  var triggers = document.querySelectorAll('.srini-chat-trigger');
  var iframeLoaded = false;

  function getAppUrl() {
    var src = sidebar && sidebar.getAttribute('data-chatbot-src');
    return (typeof window.CHATBOT_APP_URL !== 'undefined' ? window.CHATBOT_APP_URL : (src || './chatbot/')).replace(/\/$/, '') + '/';
  }

  function getIframeSrc() {
    var base = getAppUrl();
    var api = (sidebar && sidebar.getAttribute('data-chat-api')) || window.SRINI_CHAT_API || '';
    if (api) return base + '?api=' + encodeURIComponent(api.replace(/\/$/, ''));
    return base;
  }

  function setOpen(open) {
    var isOpen = !!open;
    document.body.classList.toggle('chat-open', isOpen);
    if (sidebar) sidebar.setAttribute('aria-hidden', !isOpen);
    triggers.forEach(function(t) {
      t.setAttribute('aria-label', isOpen ? 'Close AI chat' : 'Open AI chat');
      t.setAttribute('aria-expanded', isOpen);
    });
    if (isOpen && sidebar && !iframeLoaded) {
      var iframe = document.createElement('iframe');
      iframe.title = 'Srini AI chat';
      iframe.src = getIframeSrc();
      sidebar.appendChild(iframe);
      iframeLoaded = true;
    }
  }

  triggers.forEach(function(t) {
    t.addEventListener('click', function() {
      var isOpen = document.body.classList.contains('chat-open');
      setOpen(!isOpen);
    });
  });

  window.addEventListener('message', function(e) {
    if (e.data === 'srini-chat-close') setOpen(false);
  });
})();
</script>
```

## Step 6 — Fix AOS CDN in existing scripts

**IMPORTANT**: If the target page already has a `<script>` tag loading AOS from `rawgit.com`, replace it:

- **Find**: `https://rawgit.com/michalsnik/aos/master/dist/aos.js`
- **Replace with**: `https://unpkg.com/aos@2.3.4/dist/aos.js`

Also wrap any existing `AOS.init(...)` call in a `try-catch`:

- **Find**: `AOS.init({ duration: 1200 });`
- **Replace with**: `try { AOS.init({ duration: 1200 }); } catch(e) {}`

This prevents AOS load failures from crashing the jQuery ready callback and breaking the hamburger menu.

## Step 7 — Remove old nav elements

Remove any old navigation elements that were replaced:
- Old back buttons (`.back-button-glass`)
- Old `<header>` inline styles like `style="padding-top: 2%"`
- Old hamburger menu markup (if different from the new one)
- Duplicate jQuery `<script>` tags (keep only one)

## Step 8 — Verify

1. Ensure `<div>` tags are balanced — `#site-content-wrap` opens before `<header>` and closes before the chatbot elements.
2. Ensure jQuery is loaded only once.
3. Ensure no orphaned `</div>` tags at the end.
4. Check for console errors — especially `AOS is not defined` or other JS errors that would prevent the hamburger handler from registering.
5. Open the page in a browser and verify:
   - "srini" logo appears top-left
   - Desktop nav links are right-aligned (WORKS, ABOUT, RÉSUMÉ, sparkle icon, GET IN TOUCH)
   - Hamburger menu works on mobile (cream panel, centered links, black GET IN TOUCH pill, X close icon)
   - Chatbot opens/closes via sparkle icon and pushes content left on desktop
   - Chatbot goes full-screen on mobile

## Reference files

- `index.html` — canonical source for all nav + chatbot code (uses `style.css`)
- `about.html` — completed example of applying these changes to a page using `style-3.css`
