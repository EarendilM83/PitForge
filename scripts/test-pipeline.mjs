// PitForge — end-to-end test & scan pipeline (Playwright).
//
// Real coverage, not a demo:
//   ROUTES  — every URL/endpoint responds with the right thing.
//   SCREENS — every screen renders with no console/page errors.
//   LAYOUT  — every project's page holds up at every width 320 → 3200 (no overflow/over-wide/
//             broken img/empty section) — offenders identified.
//   EDITOR  — every interaction driven with assertions: layers, selection, breadcrumb, inspector
//             tabs, each Style control (+reset), Marketer/Builder mode, retag (styling-invariant),
//             content edit, device switch, undo, Insert/Test/Export/Preview. Content is snapshotted
//             and restored so tests never pollute a project.
//
// Exits non-zero on any failure → gates publish/export. --stream emits NDJSON for the Studio board.
//
// Usage:  npm run test:ui            (all)   ·  -- --project <id>  ·  --routes-only|--screens-only
//         --sites-only | --editor-only | --stream

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://localhost:4321';
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; };
const has = (n) => process.argv.includes(`--${n}`);

// The full resolution ladder a real audience spans — small phone to a 4K/ultrawide desktop.
export const LADDER = [320, 375, 414, 600, 768, 834, 1024, 1280, 1440, 1680, 1920, 2200, 2560, 3200];
const TOL = 1;

const STREAM = has('stream');
const emit = (o) => { if (STREAM) process.stdout.write(JSON.stringify(o) + '\n'); };
const c = { g: '\x1b[32m', r: '\x1b[31m', y: '\x1b[33m', d: '\x1b[2m', x: '\x1b[0m' };
const ok = (s) => { if (!STREAM) console.log(`  ${c.g}✓${c.x} ${s}`); };
const bad = (s) => { if (!STREAM) console.log(`  ${c.r}✗${c.x} ${s}`); };
const head = (s) => { if (!STREAM) console.log(s); };

let fails = 0;
// central assertion → CLI line + stream event + counter
const check = (cond, label, extra = {}) => {
  if (cond) { ok(label); emit({ type: 'case-pass', label, ...extra }); }
  else { bad(label); emit({ type: 'case-fail', label, ...extra }); fails++; }
  return cond;
};

async function projectIds() {
  const r = await fetch(`${BASE}/api/projects`).catch(() => null);
  if (!r || !r.ok) { console.error(`${c.r}Cannot reach ${BASE}. Start the dev server (npm run dev).${c.x}`); process.exit(2); }
  return (await r.json()).map((p) => p.id);
}

// ---------- open the Studio editor for a project (dashboard flow is robust to the marketing home) ----------
// dismiss any onboarding/guided-tour overlay that intercepts clicks (wizard, coach tour)
async function dismissOverlays(page) {
  for (let i = 0; i < 6; i++) {
    const overlay = await page.$('.pf-wiz-backdrop, .coach, .coach-catch');
    if (!overlay) return;
    const skip = await page.$('.coach button:has-text("Skip"), .coach button:has-text("Done"), .coach button:has-text("Got it"), .coach button:has-text("Finish"), .coach button:has-text("Close"), .pf-wiz button:has-text("Skip")');
    if (skip) await skip.click().catch(() => {}); else await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(250);
  }
}

async function openEditor(page, id, name) {
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await dismissOverlays(page);
  const enter = await page.$('button:has-text("Open Studio")'); if (enter) { await enter.click(); await page.waitForTimeout(600); }
  await dismissOverlays(page);
  const sel = name ? `button[aria-label="Open ${name}"]` : `button[aria-label^="Open "]`;
  await page.click(sel, { timeout: 12000 });
  await page.waitForSelector('.studio-el.builder.pro', { timeout: 15000 });
  await page.waitForSelector('.studio-page', { timeout: 15000 });
  await page.waitForTimeout(1200);
}

// ---------- ROUTES ----------
async function checkRoutes(ids) {
  const ep = async (path, label, want = (r) => r.ok) => {
    try { const r = await fetch(`${BASE}${path}`, { redirect: 'follow' }); check(want(r), `route ${label} (${r.status})`, { kind: 'route' }); }
    catch (e) { check(false, `route ${label} — ${e.message}`, { kind: 'route' }); }
  };
  await ep('/', 'home');
  await ep('/api/projects', 'projects API', (r) => r.ok);
  for (const id of ids) {
    await ep(`/api/projects/${id}`, `project ${id} API`);
    await ep(`/preview/${id}`, `preview ${id}`, (r) => r.ok && r.headers.get('content-type')?.includes('html'));
    await ep(`/api/projects/${id}/version`, `version ${id}`);
  }
  await ep('/api/does-not-exist', '404 handling', (r) => r.status === 404 || r.status === 200);
}

// ---------- SCREENS (render + no errors) ----------
async function checkScreens(browser, ids) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message.split('\n')[0]));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().split('\n')[0]); });
  page.on('requestfailed', (r) => errs.push(`${r.failure()?.errorText || 'request failed'} :: ${r.url()}`));
  const noErr = (label) => check(errs.length === 0, `screen ${label} — no console/page errors${errs.length ? ' :: ' + errs[0] : ''}`, { kind: 'screen' });
  try {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' }); await page.waitForTimeout(800);
    check(await page.$('body') !== null, 'screen home renders', { kind: 'screen' });
    await dismissOverlays(page);
    const enter = await page.$('button:has-text("Open Studio")'); if (enter) { await enter.click(); await page.waitForTimeout(600); }
    await dismissOverlays(page);
    check(await page.$('.pf-card') !== null, 'screen sites list renders', { kind: 'screen' });
    await page.click('.pf-dash-new'); await page.waitForTimeout(200);
    check(await page.$('button:has-text("Upload ZIP")') !== null, 'screen ZIP import option renders', { kind: 'screen' });
    await page.keyboard.press('Escape');
    const modalClose = await page.$('.studio-modal-head .studio-btn-link'); if (modalClose) await modalClose.click();
    errs.length = 0;
    await openEditor(page, ids[0]);
    check(await page.$('.pro-topbar') !== null && await page.$('.pro-rail') !== null && await page.$('.pro-insp') !== null, 'screen editor renders (3 columns)', { kind: 'screen' });
    // preview mode
    await page.click('.pro-btn.ghost:has-text("Preview")'); await page.waitForTimeout(800);
    check(await page.$('.studio-preview, iframe') !== null, 'screen preview mode renders', { kind: 'screen' });
    const backBtn = await page.$('button:has-text("Back to editor")'); if (backBtn) await backBtn.click(); await page.waitForTimeout(500);
    // test overlay
    await page.click('.pro-btn.ghost:has-text("Test")'); await page.waitForTimeout(500);
    check(await page.$('.pf-test-overlay') !== null, 'screen test overlay renders', { kind: 'screen' });
    await page.click('.pf-test-x'); await page.waitForTimeout(300);
    // export dialog
    await page.click('.pro-btn.ghost:has-text("Export")'); await page.waitForTimeout(500);
    check(await page.$('.studio-modal, [class*="export"], [class*="Export"]') !== null, 'screen export dialog opens', { kind: 'screen' });
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    noErr('editor session');
  } catch (e) { check(false, `screens — ${e.message.split('\n')[0]}`, { kind: 'screen' }); }
  await page.close();
}

// ---------- LAYOUT: every site × every width in the ladder ----------
async function checkSite(browser, id) {
  for (const w of LADDER) {
    emit({ type: 'case-start', kind: 'site', site: id, breakpoint: w });
    const page = await browser.newPage({ viewport: { width: w, height: 900 } });
    const brokenImgs = [];
    page.on('response', (r) => { if (r.request().resourceType() === 'image' && r.status() >= 400) brokenImgs.push(r.url().split('/').pop()); });
    try {
      await page.goto(`${BASE}/preview/${id}`, { waitUntil: 'networkidle' });
      await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 800) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 25)); } window.scrollTo(0, 0); });
      await page.waitForTimeout(180);
      const rep = await page.evaluate((tol) => {
        const vw = window.innerWidth;
        const over = document.documentElement.scrollWidth - vw;
        const offenders = [];
        if (over > tol) {
          const contained = (el) => { for (let n = el.parentElement; n; n = n.parentElement) { const o = getComputedStyle(n).overflowX; if (o === 'hidden' || o === 'auto' || o === 'scroll') return true; } return false; };
          document.querySelectorAll('body *').forEach((el) => { const r = el.getBoundingClientRect(); if (r.right > vw + tol && r.width <= vw && !contained(el)) offenders.push((el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : el.tagName.toLowerCase())); });
        }
        const zeroH = [...document.querySelectorAll('main > *, body > main, section')].filter((el) => el.getBoundingClientRect().height < 2).length;
        return { over, offenders: [...new Set(offenders)].slice(0, 5), zeroH };
      }, TOL);
      const problems = [];
      if (rep.over > TOL) problems.push(`overflows ${Math.round(rep.over)}px${rep.offenders.length ? ` (${rep.offenders.join(', ')})` : ''}`);
      if (rep.zeroH) problems.push(`${rep.zeroH} empty section(s)`);
      if (brokenImgs.length) problems.push(`broken img: ${brokenImgs.slice(0, 3).join(', ')}`);
      const label = `${id} @ ${w}px`;
      if (problems.length) { bad(`${label} — ${problems.join('; ')}`); emit({ type: 'case-fail', kind: 'site', site: id, breakpoint: w, over: rep.over, offenders: rep.offenders, detail: problems.join('; '), label }); fails++; }
      else { ok(label); emit({ type: 'case-pass', kind: 'site', site: id, breakpoint: w, label }); }
    } catch (e) { const d = e.message.split('\n')[0]; bad(`${id} @ ${w}px — ${d}`); emit({ type: 'case-fail', kind: 'site', site: id, breakpoint: w, detail: d, label: `${id} @ ${w}px` }); fails++; }
    await page.close();
  }
}

// ---------- CONTENT QUALITY: SEO + accessibility on every published page ----------
async function checkContentQuality(browser, ids) {
  for (const id of ids) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    try {
      await page.goto(`${BASE}/preview/${id}`, { waitUntil: 'networkidle' });
      const r = await page.evaluate(() => ({
        h1: document.querySelectorAll('h1').length,
        title: !!document.title,
        linksNoHref: [...document.querySelectorAll('a')].filter((a) => !a.getAttribute('href')).length,
        imgsNoAlt: [...document.querySelectorAll('img')].filter((im) => im.getAttribute('alt') === null).length,
        levels: [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => +h.tagName[1]),
      }));
      let gap = false;
      for (let i = 1; i < r.levels.length; i++) if (r.levels[i] - r.levels[i - 1] > 1) gap = true;
      check(r.h1 === 1, `seo ${id}: exactly one <h1> (found ${r.h1})`, { kind: 'seo' });
      check(!gap, `seo ${id}: heading levels don't skip`, { kind: 'seo' });
      check(r.title, `seo ${id}: has a <title>`, { kind: 'seo' });
      check(r.linksNoHref === 0, `a11y ${id}: every link has href (${r.linksNoHref} missing)`, { kind: 'a11y' });
      check(r.imgsNoAlt === 0, `a11y ${id}: every image has alt (${r.imgsNoAlt} missing)`, { kind: 'a11y' });
    } catch (e) { check(false, `content ${id} — ${e.message.split('\n')[0]}`, { kind: 'seo' }); }
    await page.close();
  }
}

// ---------- QUALITY: assets, code, box-model, layout engine, image & font fidelity ----------
async function checkQuality(browser, id) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(`${BASE}/preview/${id}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts && document.fonts.ready);
    const q = await page.evaluate(() => {
      const imgs = [...document.querySelectorAll('img')];
      const raster = imgs.filter((im) => /\.(png|jpe?g|webp|avif)(\?|$)/i.test(im.currentSrc || im.src || ''));
      const box = [...document.querySelectorAll('div,section,header,footer,main,p,a,ul,li,span')].slice(0, 80);
      let track = 0;
      document.querySelectorAll('body *').forEach((p) => { const d = getComputedStyle(p).display; if (d.includes('flex') || d.includes('grid')) { const pr = p.getBoundingClientRect().right; [...p.children].forEach((ch) => { if (ch.getBoundingClientRect().right > pr + 2 && getComputedStyle(ch).position !== 'absolute') track++; }); } });
      const h = document.querySelector('h1,h2');
      const fam = h ? getComputedStyle(h).fontFamily.split(',')[0].replace(/["']/g, '').trim() : '';
      // the design font is "loaded" if any weight/style of that family has finished loading
      const famLoaded = !fam || [...document.fonts].some((f) => f.family.replace(/["']/g, '').trim().toLowerCase() === fam.toLowerCase() && f.status === 'loaded');
      return {
        noDims: imgs.filter((im) => !im.getAttribute('width') || !im.getAttribute('height')).length,
        notLazy: imgs.filter((im) => { const r = im.getBoundingClientRect(); return r.top > window.innerHeight + 50 && im.getAttribute('loading') !== 'lazy'; }).length,
        rasterNoSrcset: raster.filter((im) => !im.getAttribute('srcset') && !im.closest('picture')).length,
        oversized: imgs.filter((im) => { const r = im.getBoundingClientRect(); return im.naturalWidth && r.width > 4 && im.naturalWidth > r.width * 2.4; }).length,
        distorted: raster.filter((im) => { const r = im.getBoundingClientRect(); if (!im.naturalWidth || !im.naturalHeight || r.width < 6 || r.height < 6) return false; const na = im.naturalWidth / im.naturalHeight, ra = r.width / r.height; return Math.abs(na - ra) / na > 0.06; }).length,
        scripts: document.querySelectorAll('body script[src], body script:not([type])').length,
        borderBox: box.filter((el) => getComputedStyle(el).boxSizing !== 'border-box').length,
        empty: [...document.querySelectorAll('h1,h2,h3,p,button')].filter((el) => !el.textContent.trim() && !el.querySelector('img,svg')).length,
        placeholder: [...document.querySelectorAll('h1,h2,h3,p')].filter((el) => /lorem ipsum|placeholder|\bTODO\b|lörem/i.test(el.textContent)).length,
        fontOk: famLoaded,
        track,
      };
    });
    check(q.noDims === 0, `assets ${id}: images have width/height — no CLS (${q.noDims} missing)`, { kind: 'perf' });
    check(q.notLazy === 0, `assets ${id}: below-fold images lazy-loaded (${q.notLazy} eager)`, { kind: 'perf' });
    check(q.rasterNoSrcset === 0, `assets ${id}: raster images responsive srcset/picture (${q.rasterNoSrcset} without)`, { kind: 'perf' });
    check(q.oversized === 0, `assets ${id}: images not >2.4x oversized (${q.oversized})`, { kind: 'perf' });
    check(q.scripts === 0, `code ${id}: zero client-side <script> (${q.scripts} found)`, { kind: 'perf' });
    check(q.borderBox === 0, `box-model ${id}: border-box everywhere (${q.borderBox} not)`, { kind: 'layout' });
    check(q.track === 0, `layout ${id}: no flex/grid item overflows its track (${q.track})`, { kind: 'layout' });
    check(q.distorted === 0, `design ${id}: images not distorted (${q.distorted})`, { kind: 'design' });
    check(q.fontOk, `design ${id}: design font loaded, not a fallback`, { kind: 'design' });
    check(q.empty === 0, `design ${id}: no empty text elements (${q.empty})`, { kind: 'design' });
    check(q.placeholder === 0, `design ${id}: no lorem/placeholder copy (${q.placeholder})`, { kind: 'design' });
  } catch (e) { check(false, `quality ${id} — ${e.message.split('\n')[0]}`, { kind: 'perf' }); }
  await page.close();
}

// ---------- FLUID: type + spacing scale with the viewport; no text overflow ----------
async function checkFluid(browser, id) {
  const page = await browser.newPage({ viewport: { width: 375, height: 900 } });
  try {
    await page.goto(`${BASE}/preview/${id}`, { waitUntil: 'networkidle' });
    const measure = async (w) => { await page.setViewportSize({ width: w, height: 900 }); await page.waitForTimeout(180); return page.evaluate(() => {
      const h = document.querySelector('h1');
      const bodySizes = [...document.querySelectorAll('p,li,a,span')]
        .filter((el) => el.textContent?.trim() && el.getBoundingClientRect().height > 0)
        .map((el) => parseFloat(getComputedStyle(el).fontSize))
        .filter((n) => Number.isFinite(n) && n <= 24);
      const pads = [...document.querySelectorAll('main > *, section, header, footer')]
        .map((el) => parseFloat(getComputedStyle(el).paddingLeft))
        .filter(Number.isFinite);
      return { h1: h ? parseFloat(getComputedStyle(h).fontSize) : 0, body: bodySizes.length ? Math.max(...bodySizes) : 0, pad: pads.length ? Math.max(...pads) : 0 };
    }); };
    const a = await measure(375), b = await measure(1440);
    check(b.h1 > a.h1 + 1, `fluid ${id}: headline scales with width (${Math.round(a.h1)}->${Math.round(b.h1)}px)`, { kind: 'fluid' });
    check(a.body >= 13, `fluid ${id}: body text exists and is readable at 375px (${Math.round(a.body)}px)`, { kind: 'fluid' });
    check(a.pad > 0 && b.pad >= a.pad, `fluid ${id}: section padding exists and scales up (${Math.round(a.pad)}->${Math.round(b.pad)}px)`, { kind: 'fluid' });
    await page.setViewportSize({ width: 320, height: 900 }); await page.waitForTimeout(180);
    const over = await page.evaluate(() => [...document.querySelectorAll('h1,h2,h3,p')].filter((el) => el.scrollWidth > el.clientWidth + 4 && getComputedStyle(el).overflowX === 'visible').length);
    check(over === 0, `fluid ${id}: no text overflows its box at 320px (${over})`, { kind: 'fluid' });
  } catch (e) { check(false, `fluid ${id} — ${e.message.split('\n')[0]}`, { kind: 'fluid' }); }
  await page.close();
}

// ---------- INTERACTIVE: tap targets + dead links on mobile ----------
async function checkInteractive(browser, id) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.goto(`${BASE}/preview/${id}`, { waitUntil: 'networkidle' });
    const r = await page.evaluate(() => {
      const ctas = [...document.querySelectorAll('button, a.btn, a[class*="cta"], a[class*="btn"], [class*="cta"] > a')].filter((el) => el.offsetParent !== null);
      const small = ctas.filter((el) => { const b = el.getBoundingClientRect(); return b.height > 0 && (b.height < 40 || b.width < 40); }).length;
      const deadLinks = [...document.querySelectorAll('a')].filter((a) => !a.getAttribute('href')).length;
      const deadButtons = [...document.querySelectorAll('button')].filter((b) => !b.getAttribute('onclick') && b.type !== 'submit').length;
      const unfocusableLinks = [...document.querySelectorAll('a[href]')].filter((a) => a.tabIndex < 0).length;
      return { ctas: ctas.length, small, deadLinks, unfocusableLinks, summaries: document.querySelectorAll('summary').length };
    });
    check(r.deadLinks === 0, `interactive ${id}: no links without a destination (${r.deadLinks})`, { kind: 'interactive' });
    check(r.small === 0, `interactive ${id}: CTA tap targets >= 40px on mobile (${r.small} too small)`, { kind: 'interactive' });
    check(r.unfocusableLinks === 0, `interactive ${id}: links are keyboard-focusable (${r.unfocusableLinks} excluded)`, { kind: 'interactive' });
    if (r.summaries) {
      const summary = page.locator('summary').first();
      const before = await summary.evaluate((el) => el.parentElement?.hasAttribute('open'));
      await summary.focus();
      await page.keyboard.press('Enter');
      const after = await summary.evaluate((el) => el.parentElement?.hasAttribute('open'));
      check(before !== after, `interactive ${id}: FAQ toggles with keyboard Enter`, { kind: 'interactive' });
    }
  } catch (e) { check(false, `interactive ${id} — ${e.message.split('\n')[0]}`, { kind: 'interactive' }); }
  await page.close();
}

// ---------- CONTRAST: WCAG AA for text over a solid background (catalog CO-01) ----------
async function checkContrast(browser, id) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(`${BASE}/preview/${id}`, { waitUntil: 'networkidle' });
    const bad = await page.evaluate(() => {
      const lum = (r, g, b) => { const a = [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; };
      const parse = (c) => { const m = (c || '').match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map((s) => parseFloat(s)); return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] }; };
      const solidBg = (el) => { for (let n = el; n; n = n.parentElement) { const s = getComputedStyle(n); if (s.backgroundImage && s.backgroundImage !== 'none') return null; const c = parse(s.backgroundColor); if (c && c.a === 1) return c; } return null; };
      const ratio = (f, b) => { const L1 = lum(f.r, f.g, f.b) + 0.05, L2 = lum(b.r, b.g, b.b) + 0.05; return L1 > L2 ? L1 / L2 : L2 / L1; };
      const out = [];
      document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,a,span,button,li').forEach((el) => {
        if (!el.textContent.trim() || el.offsetParent === null) return;
        const s = getComputedStyle(el); const fg = parse(s.color); if (!fg || fg.a < 0.9) return;
        const bg = solidBg(el); if (!bg) return; // skip images/gradients/transparent — can't measure
        const size = parseFloat(s.fontSize); const bold = parseInt(s.fontWeight) >= 700;
        const min = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
        const r = ratio(fg, bg);
        if (r < min - 0.05) out.push((el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : el.tagName.toLowerCase()) + ' ' + Math.round(r * 10) / 10 + ':1');
      });
      return [...new Set(out)].slice(0, 8);
    });
    check(bad.length === 0, `a11y ${id}: text contrast AA on solid backgrounds (${bad.length} below${bad.length ? ' — ' + bad.slice(0, 3).join(', ') : ''})`, { kind: 'a11y' });
  } catch (e) { check(false, `contrast ${id} — ${e.message.split('\n')[0]}`, { kind: 'a11y' }); }
  await page.close();
}

// The editor tests type into a real Studio, and autosave persists to the project's
// content/default.json — a git-tracked file for the shipped project. Snapshot the raw BYTES:
// restoring through the API would rewrite the file with JSON.stringify's formatting and LF
// endings, leaving the project dirty in git even after a clean run. Registering the restore on
// exit/SIGINT too means an interrupted run (Ctrl+C mid-test) can't leave test copy behind.
function snapshotContent(id) {
  const file = path.join(process.cwd(), 'projects', id, 'content', 'default.json');
  let bytes;
  try { bytes = fs.readFileSync(file); } catch { return null; }
  const snap = { file, bytes, done: false };
  snap.restore = () => {
    if (snap.done) return;
    snap.done = true;
    try { fs.writeFileSync(snap.file, snap.bytes); } catch {}
  };
  const onSignal = () => { snap.restore(); process.exit(130); };
  snap.release = () => {
    process.off('exit', snap.restore);
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
  };
  process.on('exit', snap.restore);
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);
  return snap;
}

// ---------- EDITOR: drive every interaction, assert its effect, restore content ----------
async function editorE2E(browser, id) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 940 } });
  page.on('dialog', (d) => d.accept('de')); // answer the "new language code" prompt
  const snap = snapshotContent(id);
  try {
    await openEditor(page, id);
    check(await page.$('.builder-layers') !== null, 'editor: Layers rail renders', { kind: 'editor' });
    check(await page.$('.pro-insp') !== null, 'editor: Inspector renders', { kind: 'editor' });
    check(await page.$('.pf-crumbbar') !== null, 'editor: breadcrumb renders', { kind: 'editor' });

    // expand every section, then pick a heading
    await page.evaluate(() => document.querySelectorAll('.builder-group-head:not(.open)').forEach((h) => h.click()));
    await page.waitForTimeout(300);
    check((await page.$$('.builder-node')).length > 0, 'editor: layer tree lists elements', { kind: 'editor' });
    const headingId = await page.evaluate(() => document.querySelector('.studio-page [data-pf-default^="h"]')?.getAttribute('data-pf-el') || null);
    check(!!headingId, 'editor: found a heading to drive', { kind: 'editor' });
    if (!headingId) throw new Error('no heading');
    await page.click(`[data-layer-row="${headingId}"]`, { timeout: 8000 }); await page.waitForTimeout(300);
    check(await page.$('.builder-node.sel') !== null, 'editor: clicking a layer selects it', { kind: 'editor' });
    check(await page.$('.studio-page .pf-selected') !== null, 'editor: selection shows on canvas', { kind: 'editor' });

    // breadcrumb → parent select
    const crumbs = await page.$$('.pf-crumb');
    if (crumbs.length > 1) { await crumbs[0].click(); await page.waitForTimeout(250); check(true, 'editor: breadcrumb selects an ancestor', { kind: 'editor' }); await page.click(`[data-layer-row="${headingId}"]`); await page.waitForTimeout(250); }

    // inspector tabs
    for (const t of ['Style', 'Content', 'Settings']) { await page.click(`.pro-insp-tabs button:has-text("${t}")`); await page.waitForTimeout(150); check(await page.$('.pro-insp-body') !== null, `editor: inspector "${t}" tab opens`, { kind: 'editor' }); }

    // STYLE controls — each sets an override class, then reset clears it
    await page.click('.pro-insp-tabs button:has-text("Style")'); await page.waitForTimeout(200);
    const clsHas = (cn) => page.evaluate(({ cn, id }) => document.querySelector(`[data-pf-el="${id}"]`)?.classList.contains(cn), { cn, id: headingId });
    await page.evaluate(() => document.querySelectorAll('.pro-iseg')[0]?.querySelectorAll('button')[0]?.click()); // align left
    await page.waitForTimeout(300); check(await clsHas('pf-al-left'), 'editor: Style alignment applies (pf-al-left)', { kind: 'editor' });
    await page.evaluate(() => { const s = document.querySelector('.pro-slider'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(s, '50'); s.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.waitForTimeout(300); check(await clsHas('pf-op-50'), 'editor: Style opacity applies (pf-op-50)', { kind: 'editor' });
    // weight
    await page.evaluate(() => { const sel = [...document.querySelectorAll('.pro-input')].find(e => e.tagName === 'SELECT'); if (sel) { sel.value = 'bold'; sel.dispatchEvent(new Event('change', { bubbles: true })); } });
    await page.waitForTimeout(300); check(await clsHas('pf-fw-bold'), 'editor: Style weight applies (pf-fw-bold)', { kind: 'editor' });
    // reset
    await page.click('.pro-reset-all'); await page.waitForTimeout(300);
    check(!(await clsHas('pf-al-left')) && !(await clsHas('pf-op-50')), 'editor: Reset-to-design clears overrides', { kind: 'editor' });

    // Marketer/Builder mode → free-form section
    await page.click('.pro-mode'); await page.waitForTimeout(250);
    check(await page.$('.pro-lockbar.unlocked') !== null, 'editor: Builder mode unlocks free-form', { kind: 'editor' });
    await page.click('.pro-mode'); await page.waitForTimeout(200);

    // SETTINGS retag — styling invariant
    await page.click('.pro-insp-tabs button:has-text("Settings")'); await page.waitForTimeout(200);
    const before = await page.evaluate((id) => { const el = document.querySelector(`[data-pf-el="${id}"]`); const cs = getComputedStyle(el); return { tag: el.tagName, fs: cs.fontSize, color: cs.color, mb: cs.marginBottom, fw: cs.fontWeight }; }, headingId);
    const next = before.tag === 'H1' ? 'h2' : 'h1';
    await page.selectOption('.pro-insp .pf-tb-select', next); await page.waitForTimeout(300);
    const after = await page.evaluate((id) => { const el = document.querySelector(`[data-pf-el="${id}"]`); const cs = getComputedStyle(el); return { tag: el.tagName, fs: cs.fontSize, color: cs.color, mb: cs.marginBottom, fw: cs.fontWeight }; }, headingId);
    check(after.tag.toLowerCase() === next, `editor: retag changes tag (${before.tag}→${after.tag})`, { kind: 'editor' });
    check(after.fs === before.fs && after.color === before.color && after.mb === before.mb && after.fw === before.fw, 'editor: retag NEVER changes look (invariant)', { kind: 'editor' });
    await page.selectOption('.pro-insp .pf-tb-select', before.tag.toLowerCase()); await page.waitForTimeout(200);

    // i18n — add a language, translate a text field, verify render + English source safety
    const textId = await page.evaluate(() => document.querySelector('.studio-page [data-pf-default="span"]')?.getAttribute('data-pf-el') || null);
    if (textId) {
      await page.click(`[data-layer-row="${textId}"]`).catch(() => {});
      await page.waitForTimeout(200);
      await page.click('.pro-insp-tabs button:has-text("Content")'); await page.waitForTimeout(200);
      const enText = await page.evaluate((id) => document.querySelector(`[data-pf-el="${id}"]`).textContent, textId);
      await page.selectOption('.pro-lang', '__add'); await page.waitForTimeout(600);
      check(await page.evaluate(() => document.querySelector('.pro-lang')?.value) === 'de', 'editor: a language can be added (i18n)', { kind: 'i18n' });
      await page.fill('.pro-insp textarea', 'PF_DE_TEST'); await page.waitForTimeout(400);
      check((await page.evaluate((id) => document.querySelector(`[data-pf-el="${id}"]`).textContent, textId)).includes('PF_DE_TEST'), 'editor: translation renders in the active language', { kind: 'i18n' });
      await page.selectOption('.pro-lang', 'en'); await page.waitForTimeout(300);
      check((await page.evaluate((id) => document.querySelector(`[data-pf-el="${id}"]`).textContent, textId)) === enText, 'editor: English source unchanged by translation', { kind: 'i18n' });

      // undo — edit the English text, then undo
      await page.fill('.pro-insp textarea', enText + ' PF_UNDO'); await page.waitForTimeout(300);
      await page.click('.pro-icobtn[title="Undo"]'); await page.waitForTimeout(400);
      check((await page.evaluate((id) => document.querySelector(`[data-pf-el="${id}"]`).textContent, textId)) === enText, 'editor: undo reverts the last change', { kind: 'editor' });
    }

    // editor = preview parity — Tablet/Mobile render a real iframe at that width with no overflow
    await page.click('.pro-seg button:has-text("Mobile")'); await page.waitForTimeout(1000);
    const frameEl = await page.$('.pf-device-frame');
    check(frameEl !== null, 'editor: Tablet/Mobile use a real device iframe (correct media queries)', { kind: 'parity' });
    if (frameEl) {
      const f = await frameEl.contentFrame();
      const over = f ? await f.evaluate(() => document.documentElement.scrollWidth - window.innerWidth).catch(() => 0) : 0;
      check(over <= 1, `editor: mobile device view has no overflow (${Math.round(over)}px) — matches preview`, { kind: 'parity' });
    }
    await page.click('.pro-seg button:has-text("Desktop")'); await page.waitForTimeout(300);

    // Insert palette
    await page.click('.pro-rail-tabs button:has-text("Insert")'); await page.waitForTimeout(200);
    check((await page.$$('.pro-pcard')).length > 0, 'editor: Insert palette renders', { kind: 'editor' });
    await page.click('.pro-rail-tabs button:has-text("Layers")'); await page.waitForTimeout(150);

    // undo/redo available after edits
    check(await page.$('.pro-icobtn[title="Undo"]') !== null, 'editor: undo control present', { kind: 'editor' });
  } catch (e) { check(false, `editor E2E — ${e.message.split('\n')[0]}`, { kind: 'editor' }); }
  finally {
    // Close the page FIRST: the Studio's autosave is debounced 800ms, so a pending PUT would
    // otherwise land after the restore and dirty the file again. Then put the bytes back.
    await page.close().catch(() => {});
    await new Promise((r) => setTimeout(r, 300)); // let any in-flight save finish writing
    if (snap) { snap.restore(); snap.release(); }
  }
}

// ---------- run ----------
const browser = await chromium.launch();
const only = arg('project', null);
const ids = only ? [only] : await projectIds();
const want = (n) => !['routes-only', 'screens-only', 'sites-only', 'editor-only'].some((f) => has(f)) || has(`${n}-only`);

emit({ type: 'run-start', total: (want('sites') ? ids.length * LADDER.length : 0) });

if (want('routes')) { head(`\n${c.d}ROUTES${c.x}`); await checkRoutes(ids); }
if (want('screens')) { head(`\n${c.d}SCREENS${c.x}`); await checkScreens(browser, ids); }
if (want('sites')) { head(`\n${c.d}LAYOUT — ${ids.length} site(s) × ${LADDER.length} widths (320→3200)${c.x}`); for (const id of ids) await checkSite(browser, id); }
if (want('sites')) { head(`\n${c.d}CONTENT — SEO & accessibility${c.x}`); await checkContentQuality(browser, ids); }
if (want('sites')) { head(`\n${c.d}QUALITY — assets, code, box-model, layout, fidelity, contrast${c.x}`); for (const id of ids) { await checkQuality(browser, id); await checkFluid(browser, id); await checkInteractive(browser, id); await checkContrast(browser, id); } }
if (want('editor')) { head(`\n${c.d}EDITOR E2E — all interactions${c.x}`); await editorE2E(browser, ids[0]); }

await browser.close();
emit({ type: 'run-end', failed: fails });
head('');
if (fails) { head(`${c.r}✗ ${fails} check(s) failed — NOT shippable.${c.x}\n`); process.exit(1); }
head(`${c.g}✓ All checks passed — routes, screens, layouts (320→3200) and every editor interaction.${c.x}\n`);
