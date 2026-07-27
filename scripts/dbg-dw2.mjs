import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(15000);
await page.goto('http://localhost:4321', { waitUntil: 'networkidle' });
await page.click('text=Drops & Wins');
await page.waitForSelector('.studio-canvas .pf-editable');
await page.click('.studio-canvas-toolbar button:text("Outlines")');
await page.click('.studio-width-switcher button:text("1280")');
await page.waitForTimeout(800);
const boxes = await page.$$eval('.studio-page > *', (els) =>
  els.map((e) => { const r = e.getBoundingClientRect(); return `${e.className}: y=${Math.round(r.top)} h=${Math.round(r.height)} visible=${getComputedStyle(e).visibility} color=${getComputedStyle(e).color} bg=${getComputedStyle(e).background.slice(0,40)}`; })
);
console.log(boxes.join('\n'));
const pageBg = await page.$eval('.studio-page', (e) => getComputedStyle(e).background);
const pageH = await page.$eval('.studio-page', (e) => e.getBoundingClientRect().height);
console.log('.studio-page h=', pageH, 'bg=', pageBg.slice(0, 60));
await browser.close();
