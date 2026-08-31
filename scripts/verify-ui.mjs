// PitForge UI verification — drives the Studio in headless Chromium.
// Run: node scripts/verify-ui.mjs   (dev server must be running on :4321)
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = 'http://localhost:4321';
let passed = 0;
let failed = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name} ${detail}`); }
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(10000);
const step = (s) => console.log("STEP:", s);
page.on('pageerror', (e) => console.log('PAGE ERROR:', e.message));

// --- open project ---
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.click('.studio-pages-table tbody tr:has-text("LuckyBet DE")');
await page.waitForSelector('.studio-canvas .pf-editable');
ok('project opens, editable elements outlined', (await page.$$('.studio-canvas .pf-editable')).length > 10);

// save original content to restore later
const origContent = await (await fetch(`${BASE}/api/projects/dogecoin-casino`)).json().then((p) => p.content);

// --- outline toggle ---
await page.click('.studio-el-iconbtn[title="Toggle edit outlines"]');
const outlineAfterToggle = await page.$eval('.studio-canvas .pf-editable', (el) => getComputedStyle(el).outlineStyle);
ok('outline toggle hides outlines', outlineAfterToggle === 'none');
await page.click('.studio-el-iconbtn[title="Toggle edit outlines"]');

// --- click-select picks innermost field ---
await page.click('.game-card >> nth=0 >> .game-name');
await page.waitForSelector('.studio-el-key');
const selectedKey = await page.textContent('.studio-el-key');
ok('click selects innermost field', selectedKey === 'games.slides.0.name', `got ${selectedKey}`);
const hasSelectedClass = await page.$eval('.game-card >> nth=0 >> .game-name', (el) => el.classList.contains('pf-selected'));
ok('selected element gets pf-selected', hasSelectedClass);

// --- typing in page updates inspector ---
await page.click('h1.hero-title');
await page.keyboard.press('End');
await page.keyboard.type('XX');
await page.waitForTimeout(400); // 150ms debounce + render
let inspectorVal = await page.inputValue('.studio-inspector textarea');
ok('typing in page updates inspector', inspectorVal.includes('XX'), `inspector: ...${inspectorVal.slice(-20)}`);

// --- typing in inspector updates page ---
await page.fill('.studio-inspector textarea', 'Inspector Driven Title');
await page.waitForTimeout(300);
const h1Text = await page.textContent('h1.hero-title');
ok('typing in inspector updates page', h1Text === 'Inspector Driven Title', `h1: ${h1Text}`);

// --- character counter shown ---
const meter = await page.textContent('.studio-meter span');
ok('character counter shown', /\d+\/70/.test(meter ?? ''), `meter: ${meter}`);

// --- Esc deselects ---
await page.click('.game-card >> nth=1 >> .game-name');
await page.keyboard.press('Escape');
await page.waitForSelector('.studio-el-elements');
ok('Esc deselects (back to Elements panel)', true);

// --- undo across 20+ steps (topbar Undo button) ---
await page.click('h1.hero-title');
for (let i = 1; i <= 22; i++) {
  await page.fill('.studio-inspector textarea', `Title step ${i}`);
  await page.waitForTimeout(60);
}
ok('22 edits applied', (await page.textContent('h1.hero-title')) === 'Title step 22');
for (let i = 0; i < 22; i++) await page.click('.studio-el-iconbtn[title="Undo"]');
await page.waitForTimeout(300);
const afterUndo = await page.textContent('h1.hero-title');
ok('undo works across 22 steps', afterUndo === 'Inspector Driven Title', `got: ${afterUndo}`);
// restore the original title before the reorder test
await page.fill('.studio-inspector textarea', origContent['hero.title']);

// --- reorder persists ---
// select the repeat field via the List view panel
await page.keyboard.press('Escape');
await page.click('.studio-el-blockrow:text("Games")');
await page.click('.studio-el-fieldrow:text("Game slides")');
await page.waitForSelector('.studio-repeat-list .studio-repeat-row');
const firstNameBefore = await page.textContent('.studio-repeat-row >> nth=0 >> .studio-repeat-title');
await page.click('.studio-repeat-row >> nth=0 >> button[title="Move down"]');
await page.waitForTimeout(1500); // autosave 800ms
await page.reload({ waitUntil: 'networkidle' });
await page.click('.studio-pages-table tbody tr:has-text("LuckyBet DE")');
await page.waitForSelector('.studio-canvas .pf-editable');
await page.keyboard.press('Escape');
await page.click('.studio-el-blockrow:text("Games")');
await page.click('.studio-el-fieldrow:text("Game slides")');
await page.waitForSelector('.studio-repeat-list .studio-repeat-row');
const firstNameAfter = await page.textContent('.studio-repeat-row >> nth=0 >> .studio-repeat-title');
ok('reorder persists after reload', firstNameBefore !== firstNameAfter, `before=${firstNameBefore} after=${firstNameAfter}`);

// --- repeat: add respects max, remove respects min ---
const countSlides = () => page.$$eval('.games-grid > div', (els) => els.length);
const addBtn = '.games .pf-repeat-add';
ok('demo starts with 4 slides', (await countSlides()) === 4);
for (let i = 0; i < 10 && (await countSlides()) < 8; i++) await page.click(addBtn);
ok('add works up to 8', (await countSlides()) === 8);
const addDisabled = await page.$eval(addBtn, (b) => b.disabled).catch(() => true);
ok('add disabled at max=8', addDisabled || (await page.$(addBtn)) === null);
for (let i = 0; i < 10 && (await countSlides()) > 2; i++) await page.click(".games .pf-repeat-remove >> nth=0");
const removeDisabled = await page.$$eval('.games .pf-repeat-remove', (bs) => bs.every((b) => b.disabled));
ok('remove disabled at min=2', removeDisabled);

// --- restore original content ---
await fetch(`${BASE}/api/projects/dogecoin-casino/content`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(origContent),
});
await page.reload({ waitUntil: 'networkidle' });
await page.click('.studio-pages-table tbody tr:has-text("LuckyBet DE")');
await page.waitForSelector('.studio-canvas .pf-editable');

// --- Preview tab fidelity at 360/768/1280 ---
fs.mkdirSync('shots', { recursive: true });
for (const w of [360, 768, 1280]) {
  await page.click(`.studio-width-switcher button:text("${w}")`);
  await page.click('.studio-el-iconbtn[title="Toggle edit outlines"]'); // hide outlines for clean shot
  await page.waitForTimeout(300);
  const editText = await page.$eval('.studio-page', (el) => el.innerText.replace(/\s+/g, ' ').trim());
  await page.screenshot({ path: `shots/edit-${w}.png`, clip: await page.locator('.studio-page').boundingBox() });
  await page.click('.studio-el-iconbtn[title="Toggle edit outlines"]');

  await page.click('.studio-el-iconbtn[title="Preview"]');
  const frame = page.frames().find((f) => f !== page.mainFrame());
  await page.waitForTimeout(500);
  const previewText = frame ? (await frame.$eval('body', (el) => el.innerText.replace(/\s+/g, ' ').trim())) : '';
  const norm = (s) => s.replace(/×|\+ Add item/g, '').replace(/\s+/g, ' ').trim();
  ok(`preview matches edit at ${w}px (text)`, norm(previewText) === norm(editText), editText.slice(0, 60));
  const iframeBox = await page.locator('.studio-preview').boundingBox();
  if (frame) {
    await frame.evaluate((width) => { document.documentElement.style.width = width + 'px'; }, w);
    await page.waitForTimeout(200);
  }
  await page.screenshot({ path: `shots/preview-${w}.png`, clip: iframeBox });
  await page.click('.studio-el-exit-preview');
  await page.waitForSelector('.studio-canvas .pf-editable');
}

// --- SEO sidebar (Page tab) smoke ---
await page.click('.studio-el-tabs button:text("Page")');
await page.waitForSelector('.studio-seo');
ok('SEO tab renders fields', (await page.textContent('.studio-seo'))?.includes('Focus keyword'));
await page.waitForTimeout(800);
ok('SEO checks list renders', (await page.$$('.studio-check')).length === 15);
const serpTitle = await page.textContent('.studio-serp-title');
ok('SERP preview shows title', (serpTitle ?? '').length > 10);

await browser.close();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
