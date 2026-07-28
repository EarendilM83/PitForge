import { chromium } from 'playwright';
import fs from 'node:fs';
const tag = process.argv[2] || 'after';
fs.mkdirSync('shots', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
page.setDefaultTimeout(15000);
await page.goto('http://localhost:4321', { waitUntil: 'networkidle' });
await page.click('text=LuckyBet DE');
await page.waitForSelector('.studio-canvas .pf-editable');
// Edit tab + inspector: select a field to show the inspector
await page.click('h1.hero-title');
await page.waitForSelector('.studio-inspector textarea');
await page.screenshot({ path: `shots/admin-edit-${tag}.png` });
// SEO tab
await page.click('.studio-tabs button:text("SEO")');
await page.waitForSelector('.studio-seo');
await page.waitForTimeout(1200);
await page.screenshot({ path: `shots/admin-seo-${tag}.png`, fullPage: true });
// narrow
await page.setViewportSize({ width: 480, height: 1100 });
await page.waitForTimeout(400);
await page.screenshot({ path: `shots/admin-seo-narrow-${tag}.png`, fullPage: true });
await browser.close();
console.log('shots saved', tag);
