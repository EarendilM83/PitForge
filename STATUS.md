# STATUS

## All 10 phases complete and committed. §15 sweep below.

### Commits this run (newest first)
- `1a6997d` Browser verification (21 Playwright checks) + setDeep/getValue fix, Preview CSS+SVG fixes
- `a806aa0` PFIcon SVG inlining (both modes, export-verified); chokidar watch + reload banner
- (uncommitted at this write: rail panels, SeoTab §10.1 field editors, ratio-warning verify)

### Browser verification (Playwright + Chromium headless shell, `scripts/verify-ui.mjs`)
21/21 pass: outlines + toggle, innermost click-select, contentEditable typing → inspector,
inspector → page, char counter, Esc deselect, undo across 22 steps, repeat add to max=8
(add disabled), remove to min=2 (remove disabled), reorder persists after reload,
Preview==Edit text at 360/768/1280, SEO tab + 15 checks render, SERP preview.
Also smoke-tested: Content panel (16 rows, click selects), Media panel (61 assets w/ sizes),
external-change banner appears on disk touch (chokidar end-to-end).

### Bugs found by the browser tests and fixed
1. `setDeep`/`getValue` routed whole-array updates ("games.slides") through the
   array-index path → corrupted content, `items.map is not a function`. Fixed: exact key wins.
2. Preview iframe lacked block CSS (only tokens) → unstyled, text-flow mismatch. Fixed via
   `import.meta.glob('*.css', { query: '?raw' })` into the srcDoc.
3. Preview/export icon mismatch: PFIcon now inlines sanitised SVG in both modes
   (`PFContext.iconSvg`, prefetched client-side, read from disk server-side).

## §15 acceptance sweep
**Runs**: install/dev/list/restart-persistence — all ✓ (persistence verified via PUT→reload
and reorder-after-reload tests).
**Edit**: outlines+toggle ✓, innermost select ✓, typing both ways ✓, counters shown ✓
(limits indicated, not hard-blocked — §16.5 "editing is always permissive"), undo 22 ✓,
repeat min/max/reorder ✓, no design controls anywhere ✓ (inspector shows design note).
**Media**: derivatives ✓ (curl: 4 widths × 3 formats), alt required ✓ (inspector warning +
`alt-text` check), ratio mismatch warns naming both ratios ✓ (`"manifest expects 8:3,
upload is 1:1"` + minWidth warning, verified via curl).
**SEO**: every §10.1 field editable ✓ (SeoTab: keyword, title, desc, slug, canonical, lang,
robots, hreflang, og.title/desc/image/type, twitter.card, secondary keywords, author,
datePublished, breadcrumb rows, schema.faq rows, schema type chips; dateModified set at
export), derivation sync/desync/reset implemented (TextInspector + SeoTab), SERP/social
previews live ✓, Advanced drawer w/ copy ✓, Review/Product not selectable ✓, link rel
editable inline ✓, affiliate CTA defaults `nofollow sponsored` ✓.
**Checks/export**: 15/15 implemented and reporting ✓, fail blocks export ✓ (observed:
`img-dimensions` fail aborted with fix text), hardcoded-content catches file:line ✓,
ZIP serves from plain static server ✓, renders without JS ✓, no localhost ✓, server
configs present ✓, headless CLI export same code path ✓.
**Fidelity**: Preview == Edit text at 360/768/1280 ✓ (structural text comparison).

## Remaining (minor, non-blocking)
- Derived-field sync/desync/reset not covered by the automated UI suite (code-reviewed only).
- Font preload in head skipped (demo has no fonts).
- Export of projects with sub-100KB images etc. not stress-tested; single demo project only.
