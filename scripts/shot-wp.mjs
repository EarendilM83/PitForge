import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
page.setDefaultTimeout(15000);
await page.goto('http://localhost:4321', { waitUntil: 'networkidle' });
await page.waitForSelector('.studio-pages-table');
await page.screenshot({ path: 'shots/wp-pages.png' });
await page.click('.studio-pages-table tbody tr >> nth=0');
await page.waitForSelector('.studio-canvas .pf-editable');
await page.waitForTimeout(800);
await page.screenshot({ path: 'shots/wp-editor-page-tab.png' });
// select a field -> auto-switch to Field tab
await page.click('h1.hero-title');
await page.waitForSelector('.studio-inspector textarea');
await page.screenshot({ path: 'shots/wp-editor-field-tab.png' });
// open SEO analysis panel + list view
await page.click('.studio-sidebar-tabs button:text("Page")');
await page.click('.studio-topbar button:text("☰ List view")');
await page.waitForSelector('.studio-listview');
await page.screenshot({ path: 'shots/wp-listview.png' });
await page.click('.studio-listview-head button');
// preview mode
await page.click('.studio-topbar button:text("Preview")');
await page.waitForSelector('.studio-preview');
await page.waitForTimeout(800);
await page.screenshot({ path: 'shots/wp-preview.png' });
await browser.close();
console.log('done');
