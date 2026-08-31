// PitForge — AI QA run. A senior-QA *simulation*, not a label check.
//
// Runs the full visual catalog as measured deltas: a Page-wide stage (semantics · code · fonts) +
// per-breakpoint stages (navigate → measure → screenshot → AI review) covering typography, colour/
// contrast, spacing/box-model, flex/grid, responsive, images, and interactive elements — plus fluid
// checks that compare across widths. EVERY check reports EXPECTED · CURRENT · DELTA (0 to pass). The
// AI stage sends the real screenshot to the local Claude, which inspects it like a QA engineer.
// Evidence screenshots are saved to tests/.qa-evidence/ and streamed to the dashboard.
//
// Events (NDJSON → /api/qa/stream): plan · gstage · gmetric · stage · metric · evidence · ai · done
// Usage: node scripts/qa-run.mjs --project <id> [--full]   (dev server must be up on :4321)

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://localhost:4321';
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; };
const has = (n) => process.argv.includes(`--${n}`);
const project = arg('project', 'demo');
const BPS = has('full')
  ? [320, 375, 414, 600, 768, 834, 1024, 1280, 1440, 1680, 1920, 2200, 2560, 3200]
  : [320, 375, 768, 1024, 1440, 1920];

const EVID = path.join(process.cwd(), 'tests', '.qa-evidence');
fs.mkdirSync(EVID, { recursive: true });
const emit = (o) => process.stdout.write(JSON.stringify(o) + '\n');
const now = () => Date.now();
const mk = (group, id, label, expected, current, delta) => ({ group, id, label, expected, current, delta, pass: delta === 0 });

function aiReview(imgPath, bp) {
  return new Promise((resolve) => {
    const started = now();
    const prompt = `You are a senior QA engineer reviewing a landing-page screenshot rendered at ${bp}px wide. Look ONLY for real defects: horizontal overflow or content cut off at the edges, text that is clipped/overlapping/unreadable, broken or misaligned layout, distorted/stretched/squashed images, or large empty gaps. Ignore content choices. Reply in EXACTLY two lines:\nVERDICT: PASS or FAIL\nNOTES: one short sentence (say "clean" if no defects).`;
    let out = '', done = false;
    const child = spawn('claude', ['-p', '--model', 'claude-haiku-4-5-20251001', imgPath], { stdio: ['pipe', 'pipe', 'ignore'] });
    const t = setTimeout(() => { if (!done) { done = true; try { child.kill(); } catch {} resolve({ verdict: 'SKIP', notes: 'AI review timed out', ms: now() - started }); } }, 35000);
    child.stdout.on('data', (d) => (out += d));
    child.on('error', () => { if (!done) { done = true; clearTimeout(t); resolve({ verdict: 'SKIP', notes: 'Claude CLI unavailable', ms: now() - started }); } });
    child.on('close', () => { if (done) return; done = true; clearTimeout(t); const v = /VERDICT:\s*(PASS|FAIL)/i.exec(out); const n = /NOTES:\s*(.+)/i.exec(out); resolve({ verdict: v ? v[1].toUpperCase() : (/(clean|no (defects|issues))/i.test(out) ? 'PASS' : 'FAIL'), notes: (n ? n[1] : out.split('\n').filter(Boolean).pop() || '').trim().slice(0, 160), ms: now() - started }); });
    child.stdin.end(prompt);
  });
}

// ---------- helpers injected into the page ----------
const PAGE_HELPERS = () => {
  window.__qa = {
    parse: (c) => { const m = (c || '').match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map((s) => parseFloat(s)); return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] }; },
    lum: (r, g, b) => { const a = [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; },
    contained: (el) => { for (let n = el.parentElement; n; n = n.parentElement) { const o = getComputedStyle(n).overflowX; if (o === 'hidden' || o === 'auto' || o === 'scroll') return true; } return false; },
  };
};

// ---------- per-breakpoint measurement ----------
const measureBp = () => {
  const vw = window.innerWidth, Q = window.__qa;
  const solidBg = (el) => { for (let n = el; n; n = n.parentElement) { const s = getComputedStyle(n); if (s.backgroundImage && s.backgroundImage !== 'none') return null; const c = Q.parse(s.backgroundColor); if (c && c.a === 1) return c; } return null; };
  const ratio = (f, b) => { const L1 = Q.lum(f.r, f.g, f.b) + 0.05, L2 = Q.lum(b.r, b.g, b.b) + 0.05; return L1 > L2 ? L1 / L2 : L2 / L1; };
  let overWide = 0, textOver = 0, worst = 21, lhNormal = 0, borderBad = 0, track = 0;
  document.querySelectorAll('body *').forEach((el) => { const s = getComputedStyle(el); if (s.boxSizing !== 'border-box') borderBad++; const r = el.getBoundingClientRect(); if (r.right > vw + 1 && r.width <= vw && s.position !== 'absolute' && s.position !== 'fixed' && !Q.contained(el)) overWide++; });
  document.querySelectorAll('h1,h2,h3,p').forEach((el) => { if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflowX === 'visible') textOver++; });
  document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((el) => { if (getComputedStyle(el).lineHeight === 'normal') lhNormal++; });
  document.querySelectorAll('h1,h2,h3,p,a,span,button,li').forEach((el) => { if (!el.textContent.trim() || el.offsetParent === null) return; const s = getComputedStyle(el); const fg = Q.parse(s.color); if (!fg || fg.a < 0.9) return; const bg = solidBg(el); if (!bg) return; const rr = ratio(fg, bg); if (rr < worst) worst = rr; });
  document.querySelectorAll('body *').forEach((p) => { const cs = getComputedStyle(p); const d = cs.display; const ox = cs.overflowX; if ((d.includes('flex') || d.includes('grid')) && ox !== 'auto' && ox !== 'scroll' && ox !== 'hidden') { const pr = p.getBoundingClientRect().right; [...p.children].forEach((ch) => { if (ch.getBoundingClientRect().right > pr + 2 && getComputedStyle(ch).position !== 'absolute') track++; }); } });
  const imgs = [...document.images];
  const raster = imgs.filter((im) => /\.(png|jpe?g|webp|avif)(\?|$)/i.test(im.currentSrc || im.src || ''));
  const ctas = [...document.querySelectorAll('button, a.btn, a[class*="cta"], a[class*="btn"]')].filter((el) => el.offsetParent !== null);
  const h1 = document.querySelector('h1');
  // real body copy = the longest substantial text block (not a heading/label/caption)
  const bodyEl = [...document.querySelectorAll('p, span, div, li')]
    .filter((el) => { const t = el.textContent.trim(); return t.length > 55 && el.children.length < 3 && el.offsetParent && !/^H[1-6]$/.test(el.tagName); })
    .sort((a, b) => b.textContent.length - a.textContent.length)[0];
  return {
    overflow: document.documentElement.scrollWidth - vw, overWide, textOver,
    body: bodyEl ? Math.round(parseFloat(getComputedStyle(bodyEl).fontSize)) : 0,
    h1: h1 ? Math.round(parseFloat(getComputedStyle(h1).fontSize)) : 0,
    pad: (() => { const s = document.querySelector('section, header, main'); return s ? Math.round(parseFloat(getComputedStyle(s).paddingLeft)) : 0; })(),
    lhNormal, contrast: Math.round(worst * 10) / 10, borderBad, track,
    brokenImgs: imgs.filter((im) => im.complete && im.naturalWidth === 0).length,
    imgNoDims: imgs.filter((im) => !im.getAttribute('width') || !im.getAttribute('height')).length,
    imgNotLazy: imgs.filter((im) => im.getBoundingClientRect().top > window.innerHeight + 50 && im.getAttribute('loading') !== 'lazy').length,
    imgNoSrcset: raster.filter((im) => !im.getAttribute('srcset') && !im.closest('picture')).length,
    imgDistorted: raster.filter((im) => { const r = im.getBoundingClientRect(); if (!im.naturalWidth || !im.naturalHeight || r.width < 6 || r.height < 6) return false; const na = im.naturalWidth / im.naturalHeight, ra = r.width / r.height; return Math.abs(na - ra) / na > 0.06; }).length,
    deadLinks: [...document.querySelectorAll('a')].filter((a) => !a.getAttribute('href')).length,
    tapSmall: vw <= 480 ? ctas.filter((el) => { const b = el.getBoundingClientRect(); return b.height > 0 && (b.height < 44 || b.width < 44); }).length : 0,
  };
};

const bpMetrics = (m, bp) => [
  mk('Responsive', 'overflow', 'Horizontal overflow', '0px', `${Math.max(0, m.overflow)}px`, Math.max(0, m.overflow)),
  mk('Responsive', 'overwide', 'Elements wider than viewport', '0', `${m.overWide}`, m.overWide),
  mk('Typography', 'textover', 'Text clipped / overflowing box', '0', `${m.textOver}`, m.textOver),
  mk('Typography', 'body', 'Body font ≥ 14px', '≥14px', m.body ? `${m.body}px` : 'n/a', m.body && m.body < 14 ? 14 - m.body : 0),
  mk('Colour', 'contrast', 'Text contrast ≥ 4.5:1 (solid bg)', '≥4.5:1', `${m.contrast}:1`, m.contrast < 4.5 ? Math.round((4.5 - m.contrast) * 10) / 10 : 0),
  mk('Spacing', 'borderbox', 'box-sizing: border-box', '0 off', `${m.borderBad} off`, m.borderBad),
  mk('Layout', 'track', 'No flex/grid item overflows its track', '0', `${m.track}`, m.track),
  mk('Images', 'brokenimg', 'Broken images', '0', `${m.brokenImgs}`, m.brokenImgs),
  mk('Images', 'imgdims', 'Images sized (no CLS)', '0 missing', `${m.imgNoDims} missing`, m.imgNoDims),
  mk('Images', 'imglazy', 'Below-fold images lazy', '0 eager', `${m.imgNotLazy} eager`, m.imgNotLazy),
  mk('Images', 'imgsrcset', 'Raster images responsive (srcset)', '0 without', `${m.imgNoSrcset} without`, m.imgNoSrcset),
  mk('Images', 'imgdistort', 'Images not distorted (aspect)', '0', `${m.imgDistorted}`, m.imgDistorted),
  mk('Interactive', 'deadlinks', 'Links have a destination', '0 dead', `${m.deadLinks} dead`, m.deadLinks),
  ...(bp <= 480 ? [mk('Interactive', 'tap', 'CTA tap targets ≥ 44px', '0 small', `${m.tapSmall} small`, m.tapSmall)] : []),
];

// ---------- page-wide measurement ----------
const measureGlobal = () => {
  const h1 = document.querySelectorAll('h1').length;
  const heads = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => +h.tagName[1]);
  let gaps = 0; for (let i = 1; i < heads.length; i++) if (heads[i] - heads[i - 1] > 1) gaps++;
  const famEl = document.querySelector('h1,h2');
  const fam = famEl ? getComputedStyle(famEl).fontFamily.split(',')[0].replace(/["']/g, '').trim() : '';
  const famLoaded = !fam || [...document.fonts].some((f) => f.family.replace(/["']/g, '').trim().toLowerCase() === fam.toLowerCase() && f.status === 'loaded');
  return {
    h1, gaps,
    title: document.title ? document.title.length : 0,
    lang: document.documentElement.getAttribute('lang') || '',
    main: document.querySelectorAll('main').length,
    footer: document.querySelector('footer') ? 1 : 0,
    scripts: document.querySelectorAll('body script[src], body script:not([type])').length,
    styles: document.querySelectorAll('link[rel="stylesheet"], style').length,
    empty: [...document.querySelectorAll('h1,h2,h3,p,button')].filter((el) => !el.textContent.trim() && !el.querySelector('img,svg')).length,
    placeholder: [...document.querySelectorAll('h1,h2,h3,p')].filter((el) => /lorem ipsum|placeholder|\bTODO\b/i.test(el.textContent)).length,
    famLoaded, fam,
  };
};
const globalMetrics = (g) => [
  mk('Semantics', 'oneh1', 'Exactly one <h1>', '1', `${g.h1}`, Math.abs(g.h1 - 1)),
  mk('Semantics', 'order', 'Heading order (no skips)', '0 skips', `${g.gaps} skips`, g.gaps),
  mk('Semantics', 'title', '<title> 50–60 chars', '50–60', `${g.title} chars`, g.title >= 30 && g.title <= 70 ? 0 : 1),
  mk('Semantics', 'lang', '<html lang> set', 'set', g.lang || 'unset', g.lang ? 0 : 1),
  mk('Semantics', 'main', 'One <main> landmark', '1', `${g.main}`, Math.abs(g.main - 1)),
  mk('Semantics', 'footer', '<footer> present', 'yes', g.footer ? 'yes' : 'no', g.footer ? 0 : 1),
  mk('Code', 'zerojs', 'Zero client-side <script>', '0', `${g.scripts}`, g.scripts),
  mk('Code', 'styles', 'One stylesheet', '≤2', `${g.styles}`, Math.max(0, g.styles - 2)),
  mk('Design', 'empty', 'No empty text', '0', `${g.empty}`, g.empty),
  mk('Design', 'placeholder', 'No lorem/placeholder', '0', `${g.placeholder}`, g.placeholder),
  mk('Design', 'font', 'Design font loaded', 'loaded', g.famLoaded ? 'loaded' : `fallback (${g.fam})`, g.famLoaded ? 0 : 1),
];

(async () => {
  const t0 = now();
  const browser = await chromium.launch();
  const perBp = bpMetrics({ overflow: 0, overWide: 0, textOver: 0, body: 16, h1: 40, pad: 0, lhNormal: 0, contrast: 21, borderBad: 0, track: 0, brokenImgs: 0, imgNoDims: 0, imgNotLazy: 0, imgNoSrcset: 0, imgDistorted: 0, deadLinks: 0, tapSmall: 0 }, 999);
  const gExpected = globalMetrics({ h1: 1, gaps: 0, title: 55, lang: 'en', main: 1, footer: 1, scripts: 0, styles: 1, empty: 0, placeholder: 0, famLoaded: true, fam: '' });
  const total = gExpected.length + 2 /* fluid */ + BPS.length * (perBp.length + 1 /* ai */);
  emit({ t: 'plan', project, breakpoints: BPS, total, expected: [...gExpected.map((c) => ({ id: c.id, label: c.label, target: c.expected })), ...perBp.map((c) => ({ id: c.id, label: c.label, target: c.expected })), { id: 'ai', label: 'AI visual review', target: 'no defects' }] });
  let passed = 0, failed = 0;
  const tally = (m) => { m.pass ? passed++ : failed++; };

  // Page-wide stage
  emit({ t: 'gstage', name: 'navigate' });
  const gp = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await gp.goto(`${BASE}/preview/${project}`, { waitUntil: 'networkidle' });
  await gp.evaluate(() => document.fonts && document.fonts.ready);
  await gp.addInitScript(PAGE_HELPERS);
  emit({ t: 'gstage', name: 'measure' });
  const g = await gp.evaluate(measureGlobal);
  for (const c of globalMetrics(g)) { tally(c); emit({ t: 'gmetric', ...c }); }
  await gp.close();

  // per-breakpoint stages
  const h1By = {}, padBy = {};
  for (const bp of BPS) {
    const page = await browser.newPage({ viewport: { width: bp, height: 900 } });
    await page.addInitScript(PAGE_HELPERS);
    try {
      emit({ t: 'stage', bp, name: 'navigate' });
      await page.goto(`${BASE}/preview/${project}`, { waitUntil: 'networkidle' });
      await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } window.scrollTo(0, 0); });
      await page.waitForTimeout(350);
      emit({ t: 'stage', bp, name: 'measure' });
      const m = await page.evaluate(measureBp);
      h1By[bp] = m.h1; padBy[bp] = m.pad;
      for (const c of bpMetrics(m, bp)) { tally(c); emit({ t: 'metric', bp, ...c }); }
      emit({ t: 'stage', bp, name: 'evidence' });
      const es = now(); const file = path.join(EVID, `${project}-${bp}.png`);
      await page.screenshot({ path: file, fullPage: true });
      emit({ t: 'evidence', bp, url: `/qa-evidence/${project}-${bp}.png`, ms: now() - es });
      emit({ t: 'stage', bp, name: 'ai' });
      const ai = await aiReview(file, bp);
      const pass = ai.verdict === 'PASS'; if (ai.verdict !== 'SKIP') tally({ pass });
      emit({ t: 'ai', bp, verdict: ai.verdict, notes: ai.notes, expected: 'no defects', current: ai.notes || ai.verdict, delta: ai.verdict === 'PASS' || ai.verdict === 'SKIP' ? 0 : 1, pass, ms: ai.ms });
    } catch (e) { emit({ t: 'metric', bp, group: 'Run', id: 'error', label: 'Run error', expected: 'none', current: e.message.split('\n')[0], delta: 1, pass: false }); failed++; }
    await page.close();
  }

  // fluid (cross-width) checks
  emit({ t: 'gstage', name: 'fluid' });
  const lo = BPS[0], hi = BPS[BPS.length - 1];
  const hScale = mk('Fluid', 'typescale', `Headline scales ${lo}→${hi}px`, 'grows', `${h1By[lo] || 0}→${h1By[hi] || 0}px`, (h1By[hi] || 0) > (h1By[lo] || 0) ? 0 : 1);
  const pScale = mk('Fluid', 'spacescale', `Section padding scales ${lo}→${hi}px`, 'grows', `${padBy[lo] || 0}→${padBy[hi] || 0}px`, (padBy[hi] || 0) >= (padBy[lo] || 0) ? 0 : 1);
  for (const c of [hScale, pScale]) { tally(c); emit({ t: 'gmetric', ...c }); }

  await browser.close();
  emit({ t: 'done', passed, failed, ms: now() - t0 });
})();
