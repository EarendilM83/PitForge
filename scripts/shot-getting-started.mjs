// One-off: capture the "first SPA" journey for the getting-started report.
// Runs against the already-running Studio at :4321. The onboarding wizard
// auto-opens on load, so we capture it, then dismiss it before each step.
import { chromium } from 'playwright';

const OUT = 'docs/getting-started/img';
const BASE = 'http://localhost:4321';
const done = [], miss = [];

const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

async function shot(name) {
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  done.push(name); console.log('  ✓', name);
}
async function dismissWizard() {
  try { await page.click('.pf-wiz-skip', { timeout: 1500 }); await page.waitForTimeout(300); }
  catch { /* not open */ }
}
async function fresh() {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
}
async function step(name, fn) {
  try { await fn(); await shot(name); }
  catch (e) { miss.push(`${name}: ${e.message.split('\n')[0]}`); console.log('  ✗', name, '—', e.message.split('\n')[0]); }
}

// 2. The onboarding wizard (auto-open on first load) — capture BEFORE dismissing
await fresh();
await step('02-how-it-works', async () => { await page.waitForSelector('.pf-wiz-btn, .pf-wiz-close', { timeout: 4000 }); });

// 1. Clean dashboard / site list
await dismissWizard();
await step('01-dashboard', async () => {});

// 3. New-site dialog
await step('03-new-site', async () => { await page.click('.pf-dash-new', { timeout: 3000 }); await page.waitForTimeout(500); });
// 4. From-Figma card selected
await step('04-from-figma', async () => { await page.click('.studio-newsite-card', { timeout: 2500 }); await page.waitForTimeout(400); });

// ---- Editor flow: fresh load + dismiss wizard for a clean state ----
await fresh(); await dismissWizard();
await step('05-editor', async () => {
  await page.click('.pf-card-cover', { timeout: 4000 });
  await page.waitForSelector('.studio-el-panel', { timeout: 6000 });
  await page.waitForTimeout(1400);
});
await step('06-inspector', async () => {
  const el = page.locator('[data-pf-field]').first();
  await el.scrollIntoViewIfNeeded({ timeout: 3000 });
  await el.click({ timeout: 3000 });
  await page.waitForTimeout(700);
});
await step('07-seo', async () => { await page.click('.studio-el-tabs >> text=Page', { timeout: 3000 }); await page.waitForTimeout(700); });
await step('08-export', async () => { await page.click('button.studio-el-export >> text=Export', { timeout: 3000 }); await page.waitForTimeout(800); });

// 9. Live preview of the built site
await step('09-preview', async () => { await page.goto(`${BASE}/preview/dogecoin-casino`, { waitUntil: 'networkidle' }); await page.waitForTimeout(900); });

await b.close();
console.log('\nCAPTURED:', done.length, '| MISSED:', miss.length);
if (miss.length) console.log('misses:\n  ' + miss.join('\n  '));
