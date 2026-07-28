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

## Project: drops-wins (added 2026-07-28)
Second project at `projects/drops-wins/` — "Drops & Wins" casino tournament landing page
(dark navy + gold, bright orange CTA). 7 blocks: Hero (priority banner, kicker, h1, prize
pool, CTA `nofollow sponsored`), Steps (3× icon/title/text repeat), DailyTable (10 rank/prize
rows, ~$20k daily, gold top-3 + zebra), DropsTable (8 quantity×multiplier rows, ~$350k
weekly, red top-2), Games (6 cards w/ generated thumbs), Faq (4 Q&A, mirrored into
seo.schema.faq), Footer (richtext, nofollow link, inline 18+ SVG).
Assets generated locally (`scripts/gen-drops-wins-assets.mjs`): SVG-composited hero
(navy gradient + gold coins), 6 gradient game thumbs, 3 step icons + 18+ icon.

Verified:
- Listed by `/api/projects` alongside demo.
- All 15 checks pass via `/api/projects/drops-wins/checks` (zero warnings this time).
- `npm run export -- --project drops-wins --domain https://example.com` → zero fails, ZIP
  produced; unzipped + served statically: index/assets/robots/sitemap 200, 0 script tags,
  no localhost, icons inlined as SVG (loose SVG files correctly not shipped).
- Screenshots eyeballed at 1280 + 360 in Studio and at 1280 from the static export —
  studio and export are visually identical.

Bugs found & fixed while building (project-side only, no runtime/server changes):
- Asset name collision with demo (`hero-1600.jpg`, `icons/18plus.svg`) → dev middleware
  served demo's files; renamed drops-wins assets (see DECISIONS.md).
- `.dw-table*` classes shared between DailyTable/DropsTable → red highlight leaked into the
  daily table; classes now block-scoped.
- Sections needed own `background: var(--bg)` for Studio/export background parity.

## Studio admin redesign (2026-07-28) — presentation layer only
- `src/studio/studio.css` rewritten around an ADS token set (CSS custom properties):
  palette #F7F8F9/#FFFFFF/#091E4224/#172B4D/#0C66E4 + status tints, 8px grid, 3px/8px
  radii, underline tabs, segmented controls, lozenges, slim length meters.
- `src/studio/SeoTab.tsx` restructured on the Yoast model: Focus keyword card with stat
  pills → Google preview card (real-result SERP + snippet editor with meters + sync
  badges) → SEO analysis (Problems/Improvements/Good results, traffic-light bullets,
  count lozenges, expandable rows with "How to fix") → Social sharing → Indexing & robots
  → Structured data → Links on this page → Advanced drawer. Plain-language headlines via
  CHECK_TITLES; field keys demoted to small monospace. All §10.1 fields still editable,
  derive/sync + reset, live previews, copyable Advanced output.
- Save indicator is now a lozenge; ExportDialog uses the primary-button style.
- `docs/seo-ux-analysis.md` documents the Yoast patterns and their mapping.
- Screenshots: shots/admin-{seo,edit}-before.png vs admin-seo-full-after.png /
  admin-edit-after2.png / admin-seo-narrow-after2.png — eyeballed and iterated
  (meter slimming, group rows kept in DOM when collapsed).
- `scripts/verify-ui.mjs`: 21/21 pass after the redesign (one fix: collapsed check group
  keeps rows in DOM).
- Runtime/server/checks logic/project content untouched.

## WordPress editor flow (2026-07-28, commits d8e7c43 + a5c7b9e)
Replaces the Edit/Preview/SEO tab model with a WP/Gutenberg flow:
- **Sites list** (`PagesList.tsx`, home): WP "Pages"-style table — Name, Blocks,
  Last modified (new `modified` field from `/api/projects`), Edit/Export row actions.
- **Editor shell**: top bar = ← back, project name, save lozenge, Undo, List view
  toggle, Preview, primary Export ZIP. No tabs; the edit canvas is the main view.
- **Right sidebar** (`Sidebar.tsx`): Page / Field tabs. Page = `SeoPanel.tsx`
  (SeoTab dismantled into accordion panels: Focus keyword, Google preview+snippet
  editor, SEO analysis w/ summary lozenge, Social sharing, Indexing & robots,
  Structured data, Links, Advanced as modal). Field = inspector; sidebar
  auto-switches to Field when a field is selected (Canvas + ListView route
  selection through App's onSelect wrapper).
- **List view** (`ListView.tsx`): the old Outline as a left overlay panel;
  left rail (Content/Media) removed — media stays in the image inspector.
- **Preview** is a canvas mode (iframe static render) with an Exit preview state.
- Screenshots: shots/wp-pages.png, wp-editor-page-tab.png, wp-editor-field-tab.png,
  wp-listview.png, wp-preview.png — eyeballed, one CSS fix (outline list-style).
- verify-ui.mjs updated to the new flow: **21/21 pass**.

## Elementor editor chrome (2026-07-28, commit 7319f2f)
User rejected the Gutenberg/ADS editor ("nothing looks like WordPress"); editor chrome
rebuilt to Elementor anatomy. Plumbing (reducer, inspectors, SeoPanel, preview iframe,
chokidar banner, ExportDialog) reused unchanged; Sites list stays light ADS.
- **Layout**: no top bar. Dark 320px left panel (#3f4449, cyan #71d7f7 accent) + independent
  scrolling canvas on light gray.
- **Panel default**: header (← back, page name), Elements tab (block navigator tree with
  icons, expandable field rows, click selects + scrolls) / Page tab (Yoast SEO panels,
  dark-restyled via scoped overrides). Docked bottom bar: settings, navigator, undo,
  outlines toggle, device widths (360/768/1280/Full), preview eye, save-state text, green
  Export (#39b54a).
- **Element selected** (`ElementEdit.tsx`): back arrow, label + monospace key, Content
  (existing inspector) | Style (locked — design-controlled) | Advanced (field meta: block,
  type, constraints, sync state).
- **Canvas handles** (CSS-only, no runtime change): hover = cyan outline + pencil chip,
  selected = solid cyan + field-key chip. Fixed a real CSS bug: hover+selected cascades
  combined left/right offsets and stretched the chip full-width (explicit auto offsets).
- **Preview**: eye button hides the panel; floating dark "Back to editor".
- Deleted: Sidebar.tsx, ListView.tsx, topbar/rail CSS. Canvas page rendering untouched.
- Screenshots: shots/el-default.png, el-selected.png, el-page-tab.png, el-preview.png.
- verify-ui.mjs updated to Elementor selectors: **21/21 pass**.

## Marketer-facing shell (added 2026-07-28)
- Sites screen now sits in a dark WP-admin shell (logo + nav), with a "New site" primary
  action and a 4-step "how it works" strip (Create → Edit → SEO → Export).
- Empty state for zero projects with a create CTA.
- NewSiteDialog: From Figma (numbered handoff + copyable agent prompt) / Start blank
  (real scaffold via `POST /api/projects`, Hero-only starter template).
- Verified: blank project created + loaded via API (then removed), 21/21 UI checks pass,
  screenshots: shots/sites-shell.png, sites-newsite.png, sites-figma.png.
