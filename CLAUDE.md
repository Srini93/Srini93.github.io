# Site Optimization Changelog

## Overview
This document tracks optimizations made to srinivasan.design for performance, accessibility, SEO, and code quality.

## Changes Made (January 2026)

### Performance Optimizations
- **Upgraded jQuery**: Updated from jQuery 3.2.1 to 3.7.1 with SRI integrity hash
- **Deferred Script Loading**: Added `defer` attribute to non-critical scripts (jQuery, AOS)
- **Modern CDN for AOS**: Replaced deprecated rawgit.com with cdn.jsdelivr.net for AOS library
- **Lazy Loading Images**: Added `loading="lazy"` attribute to images below the fold
- **Image Dimensions**: Added explicit `width` and `height` attributes to prevent layout shifts

### Accessibility Improvements
- **ARIA Labels**: Added proper `aria-label`, `aria-expanded`, `aria-controls`, and `aria-hidden` attributes to hamburger menu
- **Semantic Hamburger Button**: Changed hamburger menu trigger from `<div>` to `<button>` with proper type attribute
- **Mobile Menu Dialog**: Added `role="dialog"` and proper labeling to mobile navigation overlay
- **Focus Styles**: Added visible focus outlines (2px solid #3b65ef) for keyboard navigation
- **Skip to Main Content**: Added skip link on index.html for screen reader users
- **Alt Text**: Ensured all images have descriptive alt text
- **Link Security**: Added `rel="noopener"` to external links with `target="_blank"`

### SEO Improvements
- **JSON-LD Structured Data**: Added ProfilePage schema to about.html with:
  - Person entity
  - Job title and employer
  - Educational background
  - Skills and expertise
- **Fixed Meta Tags**: Corrected favicon type from `type="favi.png"` to `type="image/png"`
- **Viewport Meta**: Simplified viewport meta to standard responsive configuration

### Code Quality Fixes
- **CSS Typos**: Fixed "Centre" to "center" in text-align properties across all CSS files (style.css, style-2.css, style-3.css)
- **HTML Structure**: Fixed missing `<body>` tag in about.html
- **Consistent Formatting**: Improved HTML structure and indentation

## Visual Regression Testing
Screenshots were captured at three breakpoints (desktop: 1440px, tablet: 768px, mobile: 375px) before and after changes:
- `screenshots-baseline/` - Before optimization
- `screenshots-after/` - After optimization

All visual comparisons confirmed no breaking changes to the design.

## Files Modified
- `index.html` - Performance, accessibility, SEO improvements
- `about.html` - Performance, accessibility, SEO improvements, structural fixes
- `style.css` - CSS typo fixes
- `style-2.css` - CSS typo fixes
- `style-3.css` - CSS typo fixes

## Tools Used
- Playwright for automated screenshot capture
- Visual comparison for regression testing
