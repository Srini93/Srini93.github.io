# Site Audit Skill

## Description
A comprehensive site audit workflow for optimizing performance, accessibility, SEO, and code quality with visual regression testing.

## Trigger
Use this skill when the user asks to:
- "Run a site audit"
- "Optimize the site"
- "Check for accessibility issues"
- "Improve SEO"
- "Clean up code"
- "Run performance optimization"

## Workflow Steps

### 1. Capture Baseline Screenshots
Before making any changes, capture screenshots at multiple breakpoints to enable visual regression testing.

```bash
# Ensure screenshot-capture.js exists, then run:
PLAYWRIGHT_BROWSERS_PATH=/root/.cache/ms-playwright node screenshot-capture.js ./screenshots-baseline
```

Breakpoints to capture:
- Desktop: 1440x900
- Tablet: 768x1024
- Mobile: 375x812

### 2. Performance Optimization
- Add `defer` attribute to non-critical scripts
- Update to latest stable library versions
- Add `loading="lazy"` to images below the fold
- Add explicit `width` and `height` to images to prevent CLS
- Use modern CDNs (jsdelivr.net instead of deprecated services)
- Add resource hints (preconnect, dns-prefetch)

### 3. Accessibility Audit
- Ensure all interactive elements are keyboard accessible
- Add proper ARIA attributes:
  - `aria-label` for icon-only buttons
  - `aria-expanded` for toggles
  - `aria-controls` to link triggers with targets
  - `aria-hidden` for decorative elements
- Change `<div>` click handlers to proper `<button>` elements
- Add visible focus styles (outline: 2px solid #3b65ef)
- Ensure all images have descriptive `alt` text
- Add skip-to-main-content link
- Add `rel="noopener"` to external links

### 4. SEO Audit
- Verify meta tags (title, description, canonical URL)
- Add JSON-LD structured data where appropriate:
  - Person/ProfilePage for about pages
  - Organization for company pages
  - Article for blog posts
- Ensure Open Graph and Twitter Card meta tags exist
- Fix any invalid HTML that could affect indexing

### 5. Code Quality
- Fix CSS typos (e.g., "Centre" → "center")
- Remove dead/commented code
- Fix HTML validation issues
- Ensure proper document structure (html, head, body tags)
- Consistent formatting and indentation

### 6. Capture Post-Optimization Screenshots
```bash
PLAYWRIGHT_BROWSERS_PATH=/root/.cache/ms-playwright node screenshot-capture.js ./screenshots-after
```

### 7. Visual Regression Comparison
Compare baseline and post-optimization screenshots to ensure no visual breakage.

### 8. Update CLAUDE.md
Document all changes made in CLAUDE.md for future reference.

## Key Files to Check
- HTML files: index.html, about.html, and all page templates
- CSS files: style.css, style-2.css, style-3.css
- JS files: Any custom JavaScript

## Common Issues to Fix

### Performance
| Issue | Fix |
|-------|-----|
| Render-blocking scripts | Add `defer` or `async` |
| Large images | Add lazy loading |
| Layout shifts | Add width/height attributes |
| Outdated libraries | Update to latest stable versions |

### Accessibility
| Issue | Fix |
|-------|-----|
| Missing alt text | Add descriptive alt attributes |
| Non-semantic buttons | Change div/span to button |
| Missing focus styles | Add :focus CSS rules |
| Missing ARIA | Add appropriate aria-* attributes |

### SEO
| Issue | Fix |
|-------|-----|
| Missing structured data | Add JSON-LD schema |
| Missing meta description | Add meta description tag |
| Invalid HTML | Fix document structure |

## Screenshot Capture Script
If screenshot-capture.js doesn't exist, create it:

```javascript
process.env.PLAYWRIGHT_BROWSERS_PATH = '/root/.cache/ms-playwright';
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const viewports = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 812 }
};

const pages = [
  { name: 'index', path: 'index.html' },
  { name: 'about', path: 'about.html' }
];

async function captureScreenshots(outputDir) {
  const browser = await chromium.launch();
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  for (const page of pages) {
    for (const [viewportName, viewport] of Object.entries(viewports)) {
      const context = await browser.newContext({ viewport });
      const browserPage = await context.newPage();
      const filePath = `file://${path.resolve(__dirname, page.path)}`;
      await browserPage.goto(filePath, { waitUntil: 'networkidle', timeout: 30000 });
      await browserPage.waitForTimeout(2000);
      const screenshotPath = path.join(outputDir, `${page.name}-${viewportName}.png`);
      await browserPage.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Captured: ${screenshotPath}`);
      await context.close();
    }
  }
  await browser.close();
}

const outputDir = process.argv[2] || './screenshots-baseline';
captureScreenshots(outputDir).catch(console.error);
```
