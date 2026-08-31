// PitForge — AI QA run. A senior-QA *simulation*, section by section, breakpoint by breakpoint.
//
// Discovers the page's SECTIONS (Header, Hero, …, Footer from pitforge.json block order) and tests
// EACH section at EVERY breakpoint: measure (overflow, height, images, text) + screenshot the section
// as evidence + AI review of that section's screenshot. Plus a Page-wide stage (semantics/SEO/zero-JS/
// fonts) and fluid checks. Every check reports EXPECTED · CURRENT · DELTA (0 to pass).
//
// Events (NDJSON → /api/qa/stream):
//   plan {breakpoints, sections:[{idx,name}], total}
//   gstage · gmetric                                   (page-wide + fluid)
//   bpstage {bp, name}                                 (navigate per breakpoint)
//   section {bp, idx, name, metrics:[...], evidence, pass}
//   section-ai {bp, idx, verdict, notes, delta, pass, ms}
//   done {passed, failed, ms}
//
// Usage: node scripts/qa-run.mjs --project <id> [--full]   (dev server must be up on :4321)

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://localhost:4321';
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; };
const has = (n) => process.argv.includes(`--${n}`);
const project = arg('project', 'dogecoin-casino');
const BPS = has('full')
  ? [320, 375, 414, 600, 768, 834, 1024, 1280, 1440, 1680, 1920, 2200, 2560, 3200]
  : [320, 375, 768, 1024, 1440, 1920];
// AI-review each section at a mobile + a desktop width (bounds cost; measure at all widths)
const AI_WIDTHS = new Set([BPS[0], BPS[Math.min(BPS.length - 1, Math.max(0, BPS.indexOf(1440) > -1 ? BPS.indexOf(1440) : BPS.length - 2))]]);

const EVID = path.join(process.cwd(), 'tests', '.qa-evidence');
fs.mkdirSync(EVID, { recursive: true });
// Design source references, if the build saved them: projects/<id>/design/<Block>[-mobile|-desktop].png
const DESIGN = path.join(process.cwd(), 'projects', project, 'design');
const designRef = (block, bp) => {
  if (!block) return null;
  const dev = bp <= 480 ? 'mobile' : 'desktop';
  for (const c of [`${block}-${dev}`, block, block.toLowerCase()]) { const p = path.join(DESIGN, `${c}.png`); if (fs.existsSync(p)) return p; }
  return null;
};
const emit = (o) => process.stdout.write(JSON.stringify(o) + '\n');
const now = () => Date.now();
const mk = (group, id, label, expected, current, delta) => ({ group, id, label, expected, current, delta, pass: delta === 0 });
const humanize = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ').replace(/^./, (c) => c.toUpperCase());

// Design-aware, advisory AI review. Expected comes from the DESIGN SOURCE (Figma reference, if we
// have one) + user-perspective UX judgment. Verdicts: OK · DEFECT (a real bug) · RECOMMENDATION
// (advice when the design doesn't answer). Intentional patterns (carousels, bleeds) are NOT defects.
function aiReview(builtImg, designImg, subject, bp) {
  return new Promise((resolve) => {
    const started = now();
    const hasDesign = !!designImg;
    const prompt = `You are a senior product designer QA-reviewing the "${subject}" section of a landing page rendered at ${bp}px wide.${hasDesign
      ? ' The SECOND image is the INTENDED DESIGN from the Figma source; the FIRST image is what was actually built. Compare the build to the design.'
      : ' You do NOT have the Figma design source for this section, so you cannot confirm intent.'}
Judge like a real user looking at the page and classify the built section:
- OK — looks correct${hasDesign ? ' and faithful to the design' : ' and nothing looks broken'}.
- DEFECT — a clear bug: content UNINTENTIONALLY cut off, text clipped/overlapping/unreadable, broken or misaligned layout, distorted/stretched images, an element that plainly looks broken.
- RECOMMENDATION — no clear bug, but from a UI/UX best-practice view something could be improved (tight margins/padding, small tap target, weak contrast, alignment, spacing rhythm, hierarchy).
CRITICAL RULES:
- Intentional design patterns are NOT defects. A horizontal card carousel that shows a partially-visible NEXT card at the right edge is a scroll-snap pattern by design; decorative images may bleed past a card edge by design. Never report these as defects.
- ${hasDesign ? 'Only call DEFECT what deviates from the design or is clearly broken.' : 'Because you lack the design source, do NOT hard-fail anything that could be a deliberate design choice. If unsure whether something is intentional, use RECOMMENDATION and note the design source should confirm.'}
Reply in EXACTLY two lines:
VERDICT: OK or DEFECT or RECOMMENDATION
NOTES: one or two sentences from the user's perspective.${hasDesign ? '' : ` For RECOMMENDATION, phrase as advice, e.g. "The design source doesn't specify this, but the button's padding looks tight — consider increasing it."`}`;
    let out = '', done = false;
    const args = ['-p', '--model', 'claude-haiku-4-5-20251001', builtImg]; if (hasDesign) args.push(designImg);
    const child = spawn('claude', args, { stdio: ['pipe', 'pipe', 'ignore'] });
    const t = setTimeout(() => { if (!done) { done = true; try { child.kill(); } catch {} resolve({ verdict: 'SKIP', notes: 'timed out', ms: now() - started }); } }, 40000);
    child.stdout.on('data', (d) => (out += d));
    child.on('error', () => { if (!done) { done = true; clearTimeout(t); resolve({ verdict: 'SKIP', notes: 'Claude CLI unavailable', ms: now() - started }); } });
    child.on('close', () => { if (done) return; done = true; clearTimeout(t); const v = /VERDICT:\s*(OK|DEFECT|RECOMMENDATION)/i.exec(out); const n = /NOTES:\s*(.+)/i.exec(out); const verdict = v ? v[1].toUpperCase() : (/\bdefect|broken|cut off|clipped|overlap/i.test(out) ? 'DEFECT' : /recommend|consider|could|improve/i.test(out) ? 'RECOMMENDATION' : 'OK'); resolve({ verdict, notes: (n ? n[1] : out.split('\n').filter(Boolean).pop() || '').trim().slice(0, 200), designUsed: hasDesign, ms: now() - started }); });
    child.stdin.end(prompt);
  });
}

const PAGE_HELPERS = () => {
  window.__qa = {
    contained: (el, stop) => { for (let n = el.parentElement; n && n !== stop; n = n.parentElement) { const o = getComputedStyle(n).overflowX; if (o === 'hidden' || o === 'auto' || o === 'scroll') return true; } return false; },
  };
};

// measured inside the page, scoped to one section element
const measureSection = (el, vw) => {
  const Q = window.__qa;
  const r = el.getBoundingClientRect();
  let overVw = 0, textOver = 0;
  el.querySelectorAll('*').forEach((n) => { const b = n.getBoundingClientRect(); const s = getComputedStyle(n); if (b.right > vw + 1 && b.width <= vw && s.position !== 'absolute' && s.position !== 'fixed' && !Q.contained(n, el.parentElement)) overVw++; });
  el.querySelectorAll('h1,h2,h3,p').forEach((n) => { if (n.scrollWidth > n.clientWidth + 2 && getComputedStyle(n).overflowX === 'visible') textOver++; });
  const imgs = [...el.querySelectorAll('img')];
  return {
    height: Math.round(r.height),
    overVw,
    textOver,
    brokenImg: imgs.filter((im) => im.complete && im.naturalWidth === 0).length,
    imgNoDims: imgs.filter((im) => !im.getAttribute('width') || !im.getAttribute('height')).length,
    imgDistort: imgs.filter((im) => { const b = im.getBoundingClientRect(); if (!im.naturalWidth || !im.naturalHeight || b.width < 6 || b.height < 6) return false; const na = im.naturalWidth / im.naturalHeight, ra = b.width / b.height; return Math.abs(na - ra) / na > 0.06; }).length,
  };
};
const sectionMetrics = (m) => [
  mk('Layout', 'over', 'Content fits (no overflow)', '0', `${m.overVw}`, m.overVw),
  mk('Layout', 'height', 'Section not collapsed', '>0px', `${m.height}px`, m.height < 2 ? 1 : 0),
  mk('Typography', 'text', 'Text not clipped', '0', `${m.textOver}`, m.textOver),
  mk('Images', 'broken', 'No broken images', '0', `${m.brokenImg}`, m.brokenImg),
  mk('Images', 'dims', 'Images sized', '0 missing', `${m.imgNoDims} missing`, m.imgNoDims),
  mk('Images', 'distort', 'Images not distorted', '0', `${m.imgDistort}`, m.imgDistort),
];

const measureGlobal = () => {
  const h1 = document.querySelectorAll('h1').length;
  const heads = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => +h.tagName[1]);
  let gaps = 0; for (let i = 1; i < heads.length; i++) if (heads[i] - heads[i - 1] > 1) gaps++;
  const famEl = document.querySelector('h1,h2'); const fam = famEl ? getComputedStyle(famEl).fontFamily.split(',')[0].replace(/["']/g, '').trim() : '';
  const famLoaded = !fam || [...document.fonts].some((f) => f.family.replace(/["']/g, '').trim().toLowerCase() === fam.toLowerCase() && f.status === 'loaded');
  return { h1, gaps, title: document.title.length, lang: document.documentElement.getAttribute('lang') || '', main: document.querySelectorAll('main').length, footer: document.querySelector('footer') ? 1 : 0, scripts: document.querySelectorAll('body script[src], body script:not([type])').length, styles: document.querySelectorAll('link[rel="stylesheet"], style').length, empty: [...document.querySelectorAll('h1,h2,h3,p,button')].filter((el) => !el.textContent.trim() && !el.querySelector('img,svg')).length, placeholder: [...document.querySelectorAll('h1,h2,h3,p')].filter((el) => /lorem ipsum|placeholder|\bTODO\b/i.test(el.textContent)).length, famLoaded, fam };
};
const globalMetrics = (g) => [
  mk('Semantics', 'oneh1', 'Exactly one <h1>', '1', `${g.h1}`, Math.abs(g.h1 - 1)),
  mk('Semantics', 'order', 'Heading order (no skips)', '0 skips', `${g.gaps} skips`, g.gaps),
  mk('Semantics', 'title', '<title> present', '50–60', `${g.title} chars`, g.title >= 30 && g.title <= 70 ? 0 : 1),
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
  // section names from the project's block order
  let blocks = [];
  try { blocks = (await (await fetch(`${BASE}/api/projects/${project}`)).json()).config.blocks || []; } catch {}
  const browser = await chromium.launch();

  // discover the rendered top-level sections
  const disc = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await disc.goto(`${BASE}/preview/${project}`, { waitUntil: 'networkidle' });
  const count = await disc.evaluate(() => (document.querySelector('main') || document.body).children.length);
  await disc.close();
  const sections = Array.from({ length: count }, (_, i) => ({ idx: i, name: blocks[i] ? humanize(blocks[i]) : `Section ${i + 1}` }));

  const gExpected = globalMetrics({ h1: 1, gaps: 0, title: 55, lang: 'en', main: 1, footer: 1, scripts: 0, styles: 1, empty: 0, placeholder: 0, famLoaded: true, fam: '' });
  const total = gExpected.length + 2 + sections.length * BPS.length + sections.length * AI_WIDTHS.size;
  emit({ t: 'plan', project, breakpoints: BPS, sections, total });
  let passed = 0, failed = 0; const tally = (p) => { p ? passed++ : failed++; };
  // run summary → persisted for the QA-setup loop engine to assess coverage across iterations
  const summary = { project, at: new Date().toISOString(), breakpoints: BPS, globalFails: [], defects: [], recommendations: [], sections: sections.map((s) => ({ idx: s.idx, name: s.name, block: blocks[s.idx] || null })) };

  // Page-wide stage
  emit({ t: 'gstage', name: 'Page-wide' });
  const gp = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await gp.goto(`${BASE}/preview/${project}`, { waitUntil: 'networkidle' });
  await gp.evaluate(() => document.fonts && document.fonts.ready);
  const g = await gp.evaluate(measureGlobal);
  for (const c of globalMetrics(g)) { tally(c.pass); if (!c.pass) summary.globalFails.push({ id: c.id, label: c.label, current: c.current }); emit({ t: 'gmetric', ...c }); }
  await gp.close();

  // sections × breakpoints
  const heights = {};
  for (const bp of BPS) {
    emit({ t: 'bpstage', bp, name: 'navigate' });
    const page = await browser.newPage({ viewport: { width: bp, height: 1000 } });
    await page.addInitScript(PAGE_HELPERS);
    try {
      await page.goto(`${BASE}/preview/${project}`, { waitUntil: 'networkidle' });
      await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 35)); } window.scrollTo(0, 0); });
      await page.waitForTimeout(300);
      const els = await page.$$('main > *');
      for (let i = 0; i < sections.length; i++) {
        const el = els[i]; if (!el) continue;
        const m = await el.evaluate(measureSection, bp);
        const mets = sectionMetrics(m); mets.forEach((c) => tally(c.pass));
        mets.filter((c) => !c.pass).forEach((c) => summary.defects.push({ section: sections[i].name, bp, source: 'measure', id: c.id, label: c.label, current: c.current }));
        const file = path.join(EVID, `${project}-s${i}-${bp}.png`);
        try { await el.screenshot({ path: file }); } catch { fs.writeFileSync(file.replace('.png', '.txt'), ''); }
        emit({ t: 'section', bp, idx: i, name: sections[i].name, metrics: mets, evidence: `/qa-evidence/${project}-s${i}-${bp}.png`, pass: mets.every((c) => c.pass), height: m.height });
        heights[i] = heights[i] || {}; heights[i][bp] = m.height;
        if (AI_WIDTHS.has(bp)) {
          const ai = await aiReview(file, designRef(blocks[i], bp), sections[i].name, bp);
          const kind = ai.verdict === 'DEFECT' ? 'defect' : ai.verdict === 'RECOMMENDATION' ? 'recommendation' : ai.verdict === 'SKIP' ? 'skip' : 'ok';
          const delta = kind === 'defect' ? 1 : 0; const pass = kind !== 'defect';
          if (kind !== 'skip') tally(pass);
          if (kind === 'defect') summary.defects.push({ section: sections[i].name, bp, source: 'ai', designUsed: ai.designUsed, notes: ai.notes });
          if (kind === 'recommendation') summary.recommendations.push({ section: sections[i].name, bp, designUsed: ai.designUsed, notes: ai.notes });
          emit({ t: 'section-ai', bp, idx: i, verdict: ai.verdict, kind, notes: ai.notes, designUsed: ai.designUsed, delta, pass, ms: ai.ms });
        }
      }
    } catch (e) { emit({ t: 'section', bp, idx: -1, name: 'run', metrics: [mk('Run', 'err', 'Run error', 'none', e.message.split('\n')[0], 1)], pass: false }); failed++; }
    await page.close();
  }

  // fluid — a section's height should grow (or hold) from mobile to desktop; page-level type/space scale
  emit({ t: 'gstage', name: 'Fluid' });
  const lo = BPS[0], hi = BPS[BPS.length - 1];
  const fp = await browser.newPage({ viewport: { width: lo, height: 1000 } });
  await fp.goto(`${BASE}/preview/${project}`, { waitUntil: 'networkidle' });
  const at = async (w) => { await fp.setViewportSize({ width: w, height: 1000 }); await fp.waitForTimeout(150); return fp.evaluate(() => { const h = document.querySelector('h1'); const s = document.querySelector('section, header, main'); return { h1: h ? Math.round(parseFloat(getComputedStyle(h).fontSize)) : 0, pad: s ? Math.round(parseFloat(getComputedStyle(s).paddingLeft)) : 0 }; }); };
  const a = await at(lo), bmax = await at(hi); await fp.close();
  for (const c of [mk('Fluid', 'type', `Headline scales ${lo}→${hi}px`, 'grows', `${a.h1}→${bmax.h1}px`, bmax.h1 > a.h1 ? 0 : 1), mk('Fluid', 'space', `Padding scales ${lo}→${hi}px`, 'grows', `${a.pad}→${bmax.pad}px`, bmax.pad >= a.pad ? 0 : 1)]) { tally(c.pass); emit({ t: 'gmetric', ...c }); }

  await browser.close();
  // persist the run summary for the setup loop (projects/<id>/qa/last-run.json)
  try {
    const qaDir = path.join(process.cwd(), 'projects', project, 'qa');
    fs.mkdirSync(qaDir, { recursive: true });
    summary.passed = passed; summary.failed = failed; summary.designUsed = summary.recommendations.concat(summary.defects).some((x) => x.designUsed);
    fs.writeFileSync(path.join(qaDir, 'last-run.json'), JSON.stringify(summary, null, 2));
  } catch {}
  emit({ t: 'done', passed, failed, ms: now() - t0 });
})();
