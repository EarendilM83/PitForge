import { chromium } from 'playwright';
import fs from 'node:fs';
fs.mkdirSync('shots', { recursive: true });
const browser = await chromium.launch();
for (const [w, name] of [[1280, '1280'], [360, '360']]) {
  const page = await browser.newPage({ viewport: { width: w === 360 ? 500 : 1500, height: 4300 } });
  page.setDefaultTimeout(15000);
  await page.goto('http://localhost:4321', { waitUntil: 'networkidle' });
  await page.click('text=Drops & Wins');
  await page.waitForSelector('.studio-canvas .pf-editable');
  await page.click('.studio-canvas-toolbar button:text("Outlines")');
  await page.click(`.studio-width-switcher button:text("${w}")`);
  await page.waitForTimeout(1200);
  await page.locator('.studio-page').screenshot({ path: `shots/dw-${name}.png` });
  await page.close();
}
await browser.close();
console.log('shots saved');
