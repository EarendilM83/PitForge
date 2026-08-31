---
name: pitforge-qa
description: >-
  Senior QA (manual + automation) for a PitForge site. FORCES a full visual & end-to-end QA pass —
  typography, colour/contrast, spacing/box-model, flex/grid, responsive 320→3200, images, interactive
  elements (mouse + keyboard, zero-JS), motion, semantics/SEO, performance, editor↔preview parity, and
  fidelity to the Figma design — before any PitForge work is called "done".
  Use when: finishing a Figma→PitForge build, editing a site, changing a block/CSS, before publish or
  export, "is this ready to ship", "QA this", "test every screen", "did we break responsiveness".
  Not for: writing new product features (that's the build) — this is the gate AFTER building.
  Related: pitforge-responsive-fluid, pitforge-seo, pitforge-accessibility. Complements the
  qa-skills standard (npx skills add petrkindlmann/qa-skills): playwright-automation, visual-testing.
license: MIT
metadata:
  author: pitforge
  version: "1.0"
  category: process
---

<objective>
A landing page that "works" can still ship broken: a headline that overflows at 414px, a card row
that squishes instead of stacking, a hero image at the wrong aspect ratio, a button with no focus
ring, a mobile view that's really desktop-squeezed. Functional tests miss all of these. This skill
forces a deterministic, senior-QA pass — every visual detail, every breakpoint, mouse AND keyboard —
against a fixed catalog, so "done" means proven, not assumed.
</objective>

## The rule

**You may not report a PitForge site as complete, or publish/export it, until this pass is green and
its evidence is recorded.** No "looks fine". Every check has a deterministic expected result
(`tests/qa-catalog.md`), one assertion each.

## Protocol (run in order)

1. **Automation gate.** Dev server up (`npm run dev`), then `npm run test:ui`. It must be GREEN
   (routes · screens · layout 320→3200 · SEO/a11y · assets/perf · fluid type & spacing · every editor
   interaction · editor↔preview parity). If red, fix and re-run — do not proceed.
2. **Visual pass.** Open the editor → **▶ Test**. For EACH breakpoint tile (320→3200): **hover** to
   auto-scroll the whole page, **⤢ Zoom** to real size, and walk the `MANUAL`/`HYBRID` rows of the
   catalog (§1–§8). Capture zoom screenshots for at least {320, 768, 1440, 3200}.
3. **Device parity.** In the editor, switch Desktop / Tablet / Mobile. Confirm Mobile is the real
   stacked layout (an iframe at 390px = the published output), not desktop squished (§11).
4. **Interaction pass.** Drive every button, link, accordion, carousel and menu with BOTH mouse and
   keyboard (Tab / Enter / Space / Esc). Confirm hover + focus-visible states and zero-JS behavior
   (§7). This is the part functional tests miss — do it by hand.
5. **Diff to design.** Compare /preview at ~1920 and ~390 to the Figma frames (§12). Establish/refresh
   `toHaveScreenshot` baselines for the key page × {390, 1440}.
6. **Close the loop.** Any failure OR any check you couldn't verify → add/adjust a case in
   `tests/cases.json` (it persists to disk and the next run inherits it). Never silently pass.

## The catalog

`tests/qa-catalog.md` is the authoritative, deterministic checklist — 13 suites, ~90 checks, tagged
`AUTO` / `MANUAL` / `HYBRID`, with a breakpoint matrix. `tests/cases.json` is the same catalog as the
editable dashboard library (▶ Test → any tile → its checklist). Read the catalog before starting.

## Deterministic discipline (from qa-skills)

- **An expected result must be checkable without guessing.** Name an exact value, a named element and
  its computed state, a pixel bound, a ratio, or a count. "Works / looks right / is fine" fails review.
- **One assertion per step.** A failed step must point at exactly one broken thing.
- **Screenshots are evidence, not results.** Attach expected/actual for anything visual.
- **Graduate manual → automated** whenever a check becomes cheap and deterministic (hover/focus deltas,
  contrast ratios, reduced-motion, visual baselines). Prefer automating over re-running by hand.

## Evidence to record

- `npm run test:ui` output (all AUTO rows green).
- Zoom screenshots for {320, 768, 1440, 3200}.
- One line per MANUAL/HYBRID row: pass/fail + the concrete thing observed.
- Any failure filed as a `tests/cases.json` case with repro + expected.
