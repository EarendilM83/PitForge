// PitForge — responsive verification gate.
//
// A designer usually delivers only two Figma frames: desktop (~1920) and mobile (~490).
// The deployed SPA must work at EVERY width in between — tablet, small laptop, large phone —
// that nobody designed. This script renders a project across a full width ladder and fails if
// anything breaks, so "works on all screens" is proven by the system, not assumed by the AI.
//
// Usage:  node scripts/verify-responsive.mjs --project <id>        (dev server must run on :4321)
//         npm run verify -- --project <id>
//
// Checks per width: no horizontal overflow, no element wider than the viewport, no broken images,
// no zero-height sections. Exits non-zero if any width fails.

import { chromium } from 'playwright';

const BASE = 'http://localhost:4321';
const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : def;
};
const project = arg('project', 'demo');

// The ladder: phones → large phone → tablet portrait/landscape → laptops → desktop → locked.
// The two ends (490, 1920) are usually designed; everything else must be derived by the fluid system.
const WIDTHS = [320, 360, 390, 490, 600, 768, 834, 1024, 1180, 1280, 1366, 1440, 1600, 1920, 2200];
const HEIGHT = 1000;
const TOL = 1; // px tolerance for sub-pixel rounding

const browser = await chromium.launch();
let failures = 0;
console.log(`\nResponsive gate — project "${project}" across ${WIDTHS.length} widths\n`);

for (const w of WIDTHS) {
  const page = await browser.newPage({ viewport: { width: w, height: HEIGHT } });
  const brokenImgReqs = [];
  page.on('response', (r) => {
    if (r.request().resourceType() === 'image' && r.status() >= 400) brokenImgReqs.push(r.url().split('/').pop());
  });
  try {
    await page.goto(`${BASE}/preview/${project}`, { waitUntil: 'networkidle' });
    // force any lazy content to load
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 800) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 40));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(250);

    const report = await page.evaluate((tol) => {
      const vw = window.innerWidth;
      // THE real signal: does the page itself scroll sideways? Carousels and clipped glows
      // don't (their overflow is contained) — only a genuine break widens the document.
      const docOverflow = document.documentElement.scrollWidth - vw;

      // When the page overflows, find the elements actually causing it: extend past the
      // viewport AND are not contained by a scroll/clip ancestor (so a carousel's off-screen
      // cards and an overflow:hidden glow are correctly ignored).
      const contained = (el) => {
        let p = el.parentElement;
        while (p && p !== document.documentElement) {
          const ox = getComputedStyle(p).overflowX;
          if (ox === 'hidden' || ox === 'auto' || ox === 'scroll' || ox === 'clip') return true;
          p = p.parentElement;
        }
        return false;
      };
      const offenders = [];
      const seen = new Set();
      if (docOverflow > tol) {
        for (const el of document.querySelectorAll('body *')) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if ((r.right > vw + tol || r.left < -tol) && !contained(el)) {
            const cls = (el.className || el.tagName).toString().split(' ')[0] || el.tagName;
            if (!seen.has(cls)) {
              seen.add(cls);
              offenders.push(`${cls} (right ${Math.round(r.right)} vs vw ${vw})`);
            }
          }
        }
      }
      const brokenImgs = [...document.querySelectorAll('img')].filter((i) => !(i.complete && i.naturalWidth > 0)).length;
      const emptySections = [...document.querySelectorAll('main > *, section, header, footer')].filter(
        (e) => e.getBoundingClientRect().height < 2
      ).length;
      return { docOverflow, offenders: offenders.slice(0, 6), brokenImgs, emptySections };
    }, TOL);

    const issues = [];
    if (report.docOverflow > TOL) issues.push(`horizontal overflow +${report.docOverflow}px${report.offenders.length ? ' from ' + report.offenders.join(', ') : ''}`);
    if (report.brokenImgs) issues.push(`${report.brokenImgs} broken image(s)`);
    if (brokenImgReqs.length) issues.push(`img 404s: ${brokenImgReqs.slice(0, 4).join(', ')}`);
    if (report.emptySections) issues.push(`${report.emptySections} zero-height section(s)`);

    if (issues.length) {
      failures++;
      console.log(`  ✗ ${String(w).padStart(4)}px  ${issues.join(' | ')}`);
    } else {
      console.log(`  ✓ ${String(w).padStart(4)}px`);
    }
  } catch (e) {
    failures++;
    console.log(`  ✗ ${String(w).padStart(4)}px  ERROR ${e.message.slice(0, 80)}`);
  }
  await page.close();
}

await browser.close();
console.log(
  `\n${failures ? '✗' : '✓'} ${WIDTHS.length - failures}/${WIDTHS.length} widths clean` +
    (failures ? ` — ${failures} need a fluid/reflow fix (do NOT patch with fixed px; see pitforge-responsive-fluid).` : ' — ships on every screen.') +
    '\n'
);
process.exit(failures ? 1 : 0);
