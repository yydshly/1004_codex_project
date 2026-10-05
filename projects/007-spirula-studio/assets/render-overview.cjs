// Requires Playwright and its Chromium browser. Optional second argument: module path.
// Run: node render-overview.cjs [playwright-module-path]
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.argv[2] || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 2000, height: 1900 }, deviceScaleFactor: 2 });
    await page.goto(pathToFileURL(path.join(__dirname, 'spirula-studio-overview.html')).href);
    await page.evaluate(() => document.fonts.ready);
    const poster = page.locator('#poster');
    const bounds = await poster.boundingBox();
    if (!bounds || bounds.width !== 1920) throw new Error('Unexpected poster dimensions');
    const overflow = await page.evaluate(() => [...document.querySelectorAll('#poster,.card,.flow-card,.comparison-table')]
      .filter(el => el.scrollHeight > el.clientHeight + 1 || (!el.classList.contains('flow-card') && el.scrollWidth > el.clientWidth + 1))
      .map(el => ({ element: el.id || el.className, height: [el.scrollHeight, el.clientHeight], width: [el.scrollWidth, el.clientWidth] })));
    if (overflow.length) throw new Error(`Clipped infographic content: ${JSON.stringify(overflow)}`);
    const file = path.join(__dirname, 'spirula-studio-overview.png');
    await poster.screenshot({ path: file, animations: 'disabled' });
    console.log(JSON.stringify({ file, width: bounds.width * 2, height: bounds.height * 2 }));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
