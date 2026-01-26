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
      const context = await browser.newContext({
        viewport: viewport
      });
      const browserPage = await context.newPage();

      const filePath = `file://${path.resolve(__dirname, page.path)}`;
      await browserPage.goto(filePath, { waitUntil: 'networkidle', timeout: 30000 });

      // Wait for animations to settle
      await browserPage.waitForTimeout(2000);

      const screenshotPath = path.join(outputDir, `${page.name}-${viewportName}.png`);
      await browserPage.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Captured: ${screenshotPath}`);

      await context.close();
    }
  }

  await browser.close();
  console.log('All screenshots captured!');
}

const outputDir = process.argv[2] || './screenshots-baseline';
captureScreenshots(outputDir).catch(console.error);
