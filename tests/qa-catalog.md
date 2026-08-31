# PitForge — Visual & E2E QA Catalog (senior QA, manual + automation)

> The forcing spec. Any agent (Claude, Codex, Cursor, Gemini…) that touches a PitForge site MUST
> run this catalog end-to-end before calling work "done", and record evidence per §Evidence.
> Modeled on the [qa-skills](https://github.com/petrkindlmann/qa-skills) standard
> (`npx skills add petrkindlmann/qa-skills`): **every expected result is deterministically checkable;
> one assertion per step; screenshots are the evidence, not the result.**

## How to run this catalog

1. **Automation first** — dev server up, then `npm run test:ui` (routes · screens · layout 320→3200 ·
   SEO/a11y · assets/perf · fluid · editor · parity). It must be **green** before manual QA.
2. **Visual pass** — open **▶ Test** in the editor. For EVERY breakpoint tile: **hover** to auto-scroll
   the whole page, **⤢ Zoom** to real size, and walk the relevant catalog checks below. Repeat for the
   editor **Device** tabs (Desktop/Tablet/Mobile).
3. **Interaction pass** — drive every interactive element (§7) with mouse AND keyboard.
4. **Diff to design** — compare against the Figma frames at the two designed widths (§12).
5. **File gaps** — any failure or missing coverage → add/adjust a case in `tests/cases.json` (it saves
   to disk so the next run inherits it). Never silently pass.

**Breakpoint ladder (14):** 320 · 375 · 414 · 600 · 768 · 834 · 1024 · 1280 · 1440 · 1680 · 1920 · 2200 · 2560 · 3200.
**Verify column:** `AUTO` = covered by `npm run test:ui`; `MANUAL` = eyes-on via the Test dashboard / zoom; `HYBRID` = automated signal + human confirm.

---

## 1 — Typography

| ID | Precondition → Step | Expected (deterministic) | Verify |
|----|---------------------|--------------------------|--------|
| TY-01 | On /preview, inspect the display heading (h1). | `getComputedStyle(h1).fontFamily` first token is the design's display font AND a matching FontFace has `status:"loaded"` (not a system fallback). | AUTO |
| TY-02 | Inspect body paragraph. | Body font-family first token is the design's body font, loaded. | AUTO |
| TY-03 | Measure h1 font-size at 320 vs 1920. | Strictly larger at 1920 (fluid `clamp`, not fixed); the 320 value is within ±2px of the design's mobile spec. | AUTO |
| TY-04 | Measure body font-size at 320. | ≥ 14px (legible on a phone). | AUTO |
| TY-05 | Measure h1 font-size at 3200. | Does not exceed the design's desktop spec + 10% (no runaway growth on ultrawide). | HYBRID |
| TY-06 | Inspect each heading & paragraph, all 14 widths. | `scrollWidth ≤ clientWidth + 2` — text never overflows or is clipped by its box. | AUTO |
| TY-07 | Inspect headings. | `line-height` is set (not `normal`) and `letter-spacing` matches the design token. | HYBRID |
| TY-08 | Read every headline at 320 and 375. | No single-word orphan lines / broken two-tone headlines; wraps read naturally. | MANUAL |
| TY-09 | Reload /preview 3×. | No flash of fallback font then swap that shifts layout (font-display: swap with sized fallback, or preloaded). | MANUAL |
| TY-10 | Inspect font weights used. | Every weight referenced in CSS (e.g. 400/700/800) has a loaded FontFace of that weight. | HYBRID |

## 2 — Colour & contrast

| ID | Step | Expected | Verify |
|----|------|----------|--------|
| CO-01 | For every text node over its background. | Contrast ≥ 4.5:1 (normal text) / ≥ 3:1 (≥24px or ≥19px bold). | AUTO |
| CO-02 | Inspect link, button, heading colours. | Match the project's design tokens (no off-palette hex). | HYBRID |
| CO-03 | Hover each link/button. | A **visible** colour/background change vs. rest state. | MANUAL |
| CO-04 | Keyboard-focus each interactive element. | A **visible focus ring** (outline/box-shadow), contrast ≥ 3:1 vs adjacent. | HYBRID |
| CO-05 | Active/pressed a button. | A distinct pressed state (not identical to hover/rest). | MANUAL |
| CO-06 | Editor chrome in dark mode. | Panel text ≥ 4.5:1 on its surface; accent states legible. | MANUAL |

## 3 — Spacing & box model

| ID | Step | Expected | Verify |
|----|------|----------|--------|
| SP-01 | Sample elements across the page. | `box-sizing: border-box` on all (padding never overflows width). | AUTO |
| SP-02 | Measure a section's padding at 320 vs 1920. | Grows with width (proportional `--u`, not fixed). | AUTO |
| SP-03 | Inspect margins/paddings site-wide. | Values come from a consistent scale (no random 13px/27px one-offs). | MANUAL |
| SP-04 | At 320/375, inspect gaps. | No cramped/overlapping content; nothing touches the viewport edge unintentionally. | MANUAL |
| SP-05 | Between sections, all widths. | Consistent vertical rhythm; no doubled or collapsed gaps. | MANUAL |
| SP-06 | Any fixed-px width/margin element at 320. | Does not exceed the viewport (no fixed-px overflow). | AUTO |

## 4 — Layout engine (flex / grid)

| ID | Step | Expected | Verify |
|----|------|----------|--------|
| LA-01 | Every flex/grid container, all widths. | No child's right edge exceeds the container's (no track overflow). | AUTO |
| LA-02 | Card/tile rows on narrow widths. | Wrap or stack (flex-wrap / auto-fit), never shrink to unreadable. | HYBRID |
| LA-03 | Flex/grid children containing text. | Have `min-width:0` so text can shrink (no blowout that forces page overflow). | AUTO |
| LA-04 | Multi-column sections from 1280→320. | Collapse to a single column at a sensible point; order stays logical. | MANUAL |
| LA-05 | Inspect gap implementation. | Uses `gap`, not margin hacks that break on wrap. | MANUAL |
| LA-06 | Alignment of items in each row. | Matches design (baseline/center/stretch) — no accidental misalignment. | MANUAL |

## 5 — Responsive (per breakpoint)

For EACH of the 14 widths:

| ID | Step | Expected | Verify |
|----|------|----------|--------|
| RE-01 | Load /preview at the width, scroll top→bottom. | `documentElement.scrollWidth ≤ innerWidth + 1` (no sideways scroll). | AUTO |
| RE-02 | Inspect every element. | None wider than the viewport. | AUTO |
| RE-03 | Inspect sections. | No zero-height / collapsed sections. | AUTO |
| RE-04 | The undesigned widths (768/1024/1280/1440). | Clean interpolation — NOT a desktop layout squished or a mobile layout stretched. | MANUAL |
| RE-05 | Compare 375 vs 390 vs 414. | Layout is stable across the phone band (no reflow thrash). | MANUAL |

## 6 — Images & media

| ID | Step | Expected | Verify |
|----|------|----------|--------|
| IM-01 | Every `<img>`. | Has `width` AND `height` attributes (reserves space → no CLS). | AUTO |
| IM-02 | Below-the-fold images. | `loading="lazy"`. | AUTO |
| IM-03 | Hero/LCP image. | NOT lazy; `fetchpriority="high"`. | HYBRID |
| IM-04 | Raster images. | Ship `srcset` or a `<picture>` with webp/avif sources. | AUTO |
| IM-05 | Every raster image. | Rendered aspect ratio within 6% of natural (no squash/stretch). | AUTO |
| IM-06 | Every image. | Not upscaled beyond ~2.4× natural width (no blur). | AUTO |
| IM-07 | Every image. | Non-null `alt` (empty `alt=""` only for decorative). | AUTO |
| IM-08 | Inline SVG icons. | Render with `currentColor`; crisp at all zooms. | MANUAL |
| IM-09 | Any `<video>`. | Has `poster`, is muted/controlled per design, no autoplay-with-sound. | MANUAL |

## 7 — Interactive elements (mouse + keyboard, zero-JS)

| ID | Step | Expected | Verify |
|----|------|----------|--------|
| IN-01 | Every link/button. | Has a destination (`href`) or an action — no dead controls. | AUTO |
| IN-02 | Hover each. | Visible hover state. | MANUAL |
| IN-03 | Tab through the whole page. | Every interactive element is reachable in a logical order; `:focus-visible` ring shows. | HYBRID |
| IN-04 | Enter/Space on a focused control. | Activates it (link navigates, button acts). | MANUAL |
| IN-05 | On mobile (390), measure CTAs. | Tap target ≥ 44×44px and not crowded (≥ 8px between). | AUTO |
| IN-06 | Accordions / FAQ. | Expand & collapse **without JavaScript** (`<details>`/CSS). Keyboard-operable. | HYBRID |
| IN-07 | Carousels / sliders. | Advance without JS (CSS scroll-snap); reachable by keyboard; no trapped focus. | MANUAL |
| IN-08 | Nav / menu on mobile. | Reflows or opens a menu that is keyboard-operable; closes on Esc. | MANUAL |
| IN-09 | Forms (if any). | Labels tied to inputs; error/empty states visible; submit reachable. | MANUAL |
| IN-10 | Disabled controls (if any). | Look disabled AND are not focusable/activatable. | MANUAL |

## 8 — Motion

| ID | Step | Expected | Verify |
|----|------|----------|--------|
| MO-01 | Trigger each transition/animation. | Smooth (transform/opacity, ~60fps), no jank. | MANUAL |
| MO-02 | Any animation. | Does not cause layout shift (animates transform/opacity, not width/top). | MANUAL |
| MO-03 | OS "reduce motion" on. | `prefers-reduced-motion` respected — non-essential motion removed/reduced. | HYBRID |

## 9 — Semantics, SEO & accessibility

| ID | Step | Expected | Verify |
|----|------|----------|--------|
| SE-01 | Count `<h1>`. | Exactly one per page. | AUTO |
| SE-02 | Heading levels in order. | No skipped level (h2→h4). | AUTO |
| SE-03 | `<title>` and meta description. | Present; title 50–60, description 50–155 chars. | HYBRID |
| SE-04 | Landmarks. | `<header> <nav> <main> <footer>` present; one `<main>`. | HYBRID |
| SE-05 | `<html lang>`. | Set to the page's language (the active i18n language on export). | AUTO |
| SE-06 | Canonical + JSON-LD. | Canonical URL present; structured data validates. | HYBRID |
| SE-07 | Every link/image. | href / alt present (see IN-01, IM-07). | AUTO |
| SE-08 | Colour contrast. | AA (see CO-01). | AUTO |

## 10 — Performance & code

| ID | Step | Expected | Verify |
|----|------|----------|--------|
| PE-01 | Published page `<body>`. | Zero client-side `<script>` (zero-JS). | AUTO |
| PE-02 | Stylesheets. | One minified stylesheet (not many blocking requests). | HYBRID |
| PE-03 | Total page weight (HTML+CSS+images+fonts). | Within budget for the site type (flag if hero+page > ~1.5MB uncached). | MANUAL |
| PE-04 | Fonts. | woff2, preconnected/preloaded; subset if large. | HYBRID |
| PE-05 | Layout stability. | No CLS on load (images sized, fonts swap without shift). | HYBRID |
| PE-06 | No console/page errors on any screen. | Clean console in an editor + preview session. | AUTO |

## 11 — Editor ↔ Preview parity (WYSIWYG)

| ID | Step | Expected | Verify |
|----|------|----------|--------|
| EP-01 | Editor **Tablet/Mobile** tabs. | Render a real iframe at that width → correct media queries. | AUTO |
| EP-02 | Editor Mobile vs /preview @390. | Byte-identical layout (mobile stacks, not desktop squished). | AUTO |
| EP-03 | Change an element's semantic tag (h1→h2). | Tag changes; font-size, colour, margin, weight **unchanged**. | AUTO |
| EP-04 | Apply a bounded style override, then Publish/Export. | Utility classes ship in the export bundle; published render matches editor. | HYBRID |
| EP-05 | Add a translation, switch language. | Canvas renders the translation; English source untouched; export honors active language. | HYBRID |

## AI review model (expected = design + UX judgment)

The 🔬 QA pipeline's AI stage does not guess. For each section it decides:
- **OK** — correct, and faithful to the design.
- **DEFECT** — a clear bug (content unintentionally cut off, text clipped/overlapping, broken/misaligned
  layout, distorted images). Only defects fail (delta 1).
- **💡 Recommendation** — no bug, but a UI/UX best-practice improvement (tight padding, small tap target,
  weak contrast, alignment). **Advisory, not a failure** (delta 0), phrased as advice.

**Where "expected" comes from:** if the build saved a Figma reference for the section at
`projects/<id>/design/<Block>[-mobile|-desktop].png`, the AI compares the build **against the design**
— so intentional patterns (a carousel's peeking card, a decorative bleed) are **not** flagged. When no
reference exists, or the design doesn't answer the question, the AI applies UI/UX best practice and
writes a recommendation, noting the design source should confirm. Populate `projects/<id>/design/`
during the Figma→PitForge build to turn UX recommendations into hard design-fidelity checks.

## 12 — Fidelity to design (diff to Figma)

| ID | Step | Expected | Verify |
|----|------|----------|--------|
| FI-01 | Compare /preview @1920 to the Figma desktop frame. | Section order, composition, spacing, type, colour match (visual regression baseline diff ≤ threshold). | HYBRID |
| FI-02 | Compare /preview @390 to the Figma mobile frame. | Mobile composition & stacking match. | HYBRID |
| FI-03 | Every text field. | No empty / placeholder / lorem / TODO copy. | AUTO |
| FI-04 | Section list vs `pitforge.json` block order. | All designed sections present, in order. | HYBRID |
| FI-05 | Establish/update visual baselines. | `toHaveScreenshot` baselines exist per key page × {390, 1440}; diffs reviewed on change. | HYBRID |

## 13 — Cross-browser (matrix)

| ID | Step | Expected | Verify |
|----|------|----------|--------|
| CB-01 | Chromium (default here). | All of §1–§12 pass. | AUTO |
| CB-02 | Firefox (gecko). | Layout/type/interaction parity; no engine-specific break. | MANUAL |
| CB-03 | WebKit / Safari. | Same; check flex/grid gap, `clamp`, backdrop-filter, sticky. | MANUAL |

---

## Evidence (required to close a QA pass)

- `npm run test:ui` output attached; all `AUTO` rows green.
- Zoom screenshots for at least {320, 768, 1440, 3200} showing no overflow and readable type.
- A note per `MANUAL`/`HYBRID` row: pass/fail + what was observed (deterministic, not "looks fine").
- Any failure filed as a `tests/cases.json` case with repro + expected, so it re-runs next time.

## Automation graduation

A `MANUAL` check graduates to `AUTO` when it becomes deterministic and cheap: e.g. hover/focus-state
presence (assert a computed-style delta on `:hover`/`:focus-visible`), reduced-motion (assert media
query honored), contrast (compute ratio), visual baselines (`toHaveScreenshot`). Prefer graduating a
check over running it by hand every release.
