# PitForge Pro Editor — Full Build Spec

Status: **DRAFT for approval** · Owner: Claude (this terminal) · Date: 2026-08-28
Rule: *every small detail is designed here before any implementation code is written.*

This spec is the contract for three bodies of work:
- **A. Editable controls** — let marketers make real edit decisions, with guardrails.
- **B. Editing tools** — floating element toolbar (repeat items) + inline responsive re-run on device switch.
- **C. Live test/scan visual layer** — watch the Playwright suite run and scan the site, live, in the Studio.

Followed by **D. Test-case audit → 100% UI/UX coverage** and **E. build order**.

---

## 0. Principles (unchanged, they bound everything)

1. **Structure is locked; content + bounded style is editable.** Marketers cannot add/remove sections. They *can* edit content, add/remove/reorder repeat items within min/max, and change *bounded* style (see §1).
2. **Faithful-to-Figma by default.** Every editable style control ships with the Figma value as its default and a one-click **Reset to design**. Overrides are visibly flagged.
3. **Nothing free-form that can break brand or responsiveness.** Colours come from the project theme palette, sizes/spacing from a fixed scale — never arbitrary hex or px that a marketer could use to wreck the layout. This is what "allow edit decisions" means: *decisions within safe rails*.
4. **Every output stays test-gated.** Any new editable dimension is covered by the responsive gate at all breakpoints before publish/export.

---

## 1. Edit-decision model — what is editable vs locked

### 1.1 Capability matrix (per element family)

| Dimension | Text (h*/p/span) | Button/Link | Image/Icon | Repeat item | Container/Section |
|---|---|---|---|---|---|
| Text content | ✅ edit | ✅ label | — | (its fields) | — |
| Semantic tag | ✅ (h1–h6/p/…) | — | — | — | ✅ (div/section/header) |
| Text align | ✅ bounded | ✅ | — | — | — |
| Font size | ✅ scale (S/M/L/XL relative to design) | ✅ scale | — | — | — |
| Font weight | ✅ {regular, medium, semibold, bold} | ✅ | — | — | — |
| Colour | ✅ theme palette only | ✅ theme palette | — | — | — |
| Spacing (margin/pad) | ✅ scale {none,xs,s,m,l} | ✅ | ✅ | — | ✅ |
| Radius / shadow | — | ✅ preset | ✅ preset | — | — |
| Opacity | ✅ 0–100 | ✅ | ✅ | — | ✅ |
| Link href / target | — | ✅ | ✅ (if wrapped) | — | — |
| Alt text | — | — | ✅ | — | — |
| Responsive visibility | ✅ per device | ✅ | ✅ | ✅ | ✅ |
| Duplicate / reorder / delete | — | — | — | ✅ (within min/max) | — |

"Scale" and "palette" = the guardrail. No raw hex, no raw px.

### 1.2 Override storage (content-resident, so it round-trips + gates + exports)

New reserved content keys, each a map keyed by element id (same pattern as `_tags`):

```
content._tags   : { [elId]: "h2" }                    // already shipped
content._style  : { [elId]: { align?, size?, weight?, color?, space?, radius?, shadow?, opacity? } }
content._vis    : { [elId]: { desktop:bool, tablet:bool, mobile:bool } }
content._order  : { [repeatFieldId]: number[] }        // item index order (reorder without moving data)
```

- Values are **tokens, not raw CSS**: `size:"lg"`, `color:"accent"`, `space:"m"`. The runtime maps tokens → the project's design tokens (from `tokens.css`), so output stays on the design system.
- Empty/absent = use the design default. Deleting the key = reset.

### 1.3 Runtime application (how a token becomes a class, never inline free-form)

- The runtime resolves `_style[elId]` into **utility classes** appended to the element (`pf-al-center`, `pf-sz-lg`, `pf-fw-bold`, `pf-c-accent`, `pf-sp-m`, `pf-op-80`, `pf-hide-mobile`). These classes are defined once in a generated `pf-utilities.css` bound to the project's tokens.
- **Styling still depends on classes, never the tag** — invariant preserved. The new twist: some classes are now *chosen by the marketer*, not just authored. They still come from a closed set.
- Static/export mode applies the exact same classes → published site === editor.

### 1.4 State machine per style control

```
              ┌──────────── edit ───────────┐
   [Design]  ──────────────▶  [Overridden]  ──── reset ───▶  [Design]
   (default)   shows value       shows value + ● dot + "Reset"
```
- **Design**: control shows the computed design value, muted, no dot.
- **Overridden**: control shows the chosen token, an accent ● indicator on the field, and a **Reset to design** link. Publish/export keep the override.
- Reset removes the key from `_style[elId]` (and the map if it becomes empty).

### 1.5 Inspector "Style" tab — control-by-control

Each control row = `label · control · [● overridden] · [↺ reset]`.

| Control | Widget | Values | Default source | Notes |
|---|---|---|---|---|
| Alignment | 4-icon segmented | left/center/right/justify | computed `text-align` | text/button only |
| Size | segmented S M L XL | tokens `sm/md/lg/xl` mapped to clamp() steps | design size → nearest token | never smaller than min legible |
| Weight | dropdown | regular/medium/semibold/bold | computed weight | |
| Colour | palette swatches | project theme colours only + "inherit" | computed colour → nearest token | no colour picker |
| Spacing | segmented none/xs/s/m/l for top & bottom | token scale | design margins | shown on a mini box-model |
| Radius | segmented none/s/m/full | preset | design | button/image |
| Shadow | dropdown none/soft/strong/glow | preset | design | button/image |
| Opacity | slider 0–100 (10 steps) | integer×10 | 100 | snaps to 10s |
| Visibility | 3 device toggles | bool×3 | all on | writes `_vis` |

"Locked" dimensions (font family, exact px, layout) remain **read-only specs** with the 🔒 bar.

---

## 2. Canvas — selection chrome & floating element toolbar

### 2.1 Floating toolbar (appears above the selected element)

Actions are **capability-gated** (only render what the element allows):

| Button | Shown when | Action |
|---|---|---|
| ▲ Move up | element is a repeat item AND index>0 | reorder via `_order` |
| ▼ Move down | repeat item AND index<len-1 | reorder |
| ⧉ Duplicate | repeat item AND len<max | clone item content, insert after |
| 🚫 Hide on… | any element | opens the 3 device toggles (writes `_vis`) |
| 🗑 Delete | repeat item AND len>min | remove item |
| ↕ Reset style | element has `_style` override | clear overrides |

- Non-repeat elements show only **Hide on…** and **Reset style** (never fake duplicate/delete on locked structure).
- Positioning: reuse the proven anchor logic (above; flip below near top; clamp horizontally). One toolbar only.
- Keyboard: `Delete`/`Backspace` on a repeat item = delete (guarded by min). `Cmd/Ctrl+D` = duplicate. Arrow up/down with modifier = reorder.

### 2.2 Repeat reorder/duplicate/delete wiring

- Duplicate: read the item object from the repeat array, deep-clone, `splice(index+1,0,clone)`, dispatch `change`.
- Delete: `splice(index,1)` (guard `len>min`).
- Reorder: swap adjacent items in the array (simplest, no `_order` needed for content-backed repeats — reordering the actual array is fine and keeps content+order together). *(Decision: reorder the array directly; drop `_order` from §1.2 unless a non-content repeat appears.)*
- All honour `min`/`max` from the manifest; buttons disable at the bounds with a tooltip.

---

## 3. Top bar — device switcher + inline responsive re-run

### 3.1 Device switch behaviour

- Desktop=`full`, Tablet=`768`, Mobile=`390` (already wired to `canvasWidth`).
- On switch: animate artboard width (existing), and **auto-run a client-side responsive scan at that width** (see §4.1) → the device button shows a live status pip: ⏳ scanning → ✓ clean / ⚠ N issues.
- Clicking the pip opens the **Test panel** (§4) focused on that breakpoint.

### 3.2 "Test all" affordance

- A **Test** button in the top bar (next to Preview) opens the full testing dashboard (§4) and runs all breakpoints.

---

## 4. Live test & scan visual layer (the headline new feature)

Two engines, one dashboard. The dashboard is a right-docked or full-overlay panel.

### 4.1 Client-side live scanner (instant, no backend)

- For each breakpoint, mount an **iframe** loading `/preview/:id` sized to that width, off-screen but rendered.
- Run the **same overflow-detection logic** used by the gate (documentElement.scrollWidth vs innerWidth; offender walk; zero-height sections; broken images) *inside the iframe* via `contentWindow`.
- **Visualisation:** each breakpoint is a **tile** showing a live thumbnail of the iframe; during scan, an animated **scan line** sweeps top→bottom; offenders get a pulsing red outline drawn over the thumbnail; the tile header shows `320px ⏳ → ✓ / ⚠ 12px overflow (.hero-inner)`.
- This gives *immediate* visual feedback with zero Node round-trip. It IS "the scanning process shown live."

### 4.2 Backend Playwright runner (authoritative, streamed)

- New endpoint `POST /api/test/run` (SSE) that spawns `node scripts/test-pipeline.mjs --stream` and streams NDJSON events:
  ```
  {type:'run-start', total:N}
  {type:'case-start', kind:'site'|'editor', site, breakpoint}
  {type:'case-pass',  ...}
  {type:'case-fail',  ..., detail, offenders:[...] }
  {type:'run-end', passed, failed}
  ```
- `test-pipeline.mjs` gains a `--stream` mode that emits these events to stdout.
- The dashboard subscribes via `EventSource`, and **overlays the authoritative Playwright result on the same tiles** as §4.1 (client scan = fast preview, Playwright = source of truth; if they disagree, Playwright wins and the tile flags it).
- **This is the "visual representation of the testing process with Playwright"**: a live board of every case going pending → running (scan animation) → pass/fail, with a running counter, elapsed time, and drill-down detail on click.

### 4.3 Dashboard anatomy

```
┌ Testing ───────────────────────────────── ▶ Run all · ⏱ 12.4s · 30/32 ✓ · 2 ⚠ ┐
│ SITES                                                                          │
│  ┌ dogecoin ─────────┐  each tile: live thumb + scan line + status header      │
│  │ 320  375  414  768 │  green ✓ / amber ⚠ (click → detail drawer)             │
│  │ 1024 1280 1440 1920│                                                         │
│  └────────────────────┘                                                         │
│ EDITOR SMOKE                                                                    │
│  [Layers ✓] [Inspector ✓] [Retag ✓] [Styling-invariant ✓] [Reorder ✓] …        │
│ DETAIL DRAWER (on select): breakpoint, screenshot, offender list, DOM path,     │
│   "why it failed", suggested fix.                                               │
└─────────────────────────────────────────────────────────────────────────────────┘
```
- States per tile: `idle · queued · scanning(animated) · pass · fail`.
- Colours: pass=green, fail=red, warn=amber, scanning=indigo pulse.
- The scan-line + offender-highlight is the "scanning process" made visible.

### 4.4 Event/data contract (frozen here before coding)

- SSE `text/event-stream`, one JSON per `data:` line, schema in §4.2.
- Client scanner returns `{breakpoint, over:number, offenders:string[], zeroH:number, brokenImgs:string[]}` per breakpoint.
- Tile reducer merges client + server keyed by `(kind, site, breakpoint)`.

---

## 5. Data-model & persistence additions

- `content._style`, `content._vis` added to `contentValueSchema` (already permits `z.record`). No server change needed beyond confirming save/round-trip.
- Undo/redo: all overrides flow through the existing `change` action → covered by undo stack automatically.
- Export/publish: the runtime emits the utility classes in static mode → `pf-utilities.css` must be included in the export bundle (add to the export CSS concat).

---

## 6. State machines

- **Selection**: `none → selected(id)`; Esc → none; selecting a child stops propagation (existing).
- **Style control**: §1.4.
- **Test run**: `idle → running(streaming) → done(pass|fail)`; cancel → idle. Client scan: `idle → scanning → result`, re-runs on content change (debounced 600ms) and on device switch.

---

## 7. Test-case audit → 100% UI/UX coverage matrix

Built AFTER the features land; every row becomes a Playwright case in `scripts/test-pipeline.mjs` (or a `tests/` split). Target: every surface, control, and state.

### 7.1 Shell & navigation
- T-01 dashboard → Open Studio → open project → builder mounts
- T-02 top bar renders (brand, breadcrumb, saved, devices, undo/redo, preview/export/publish)
- T-03 device switch changes artboard width (×3) and pip updates
- T-04 undo/redo enable/disable with stack; undo reverts a change
- T-05 breadcrumb reflects selection; click ancestor selects it

### 7.2 Layers rail
- T-10 sections render collapsed with counts
- T-11 expand/collapse a section; nested element collapse
- T-12 selecting a layer selects on canvas + auto-expands its section
- T-13 hover a layer highlights the canvas element (and vice-versa)
- T-14 Insert tab renders palette (disabled) with the locked note

### 7.3 Canvas selection + toolbar
- T-20 hover highlight + name badge (plain label)
- T-21 click selects; click child selects child
- T-22 floating toolbar shows only capability-allowed actions per element type
- T-23 repeat: duplicate (respects max, disabled at max)
- T-24 repeat: delete (respects min, disabled at min)
- T-25 repeat: reorder up/down (bounds)
- T-26 hide-on-device writes `_vis`; element hidden at that breakpoint in preview
- T-27 reset-style clears overrides

### 7.4 Inspector — Style (editable)
- T-30..T-38 each control (align/size/weight/colour/space/radius/shadow/opacity/visibility): sets override → utility class applied → **layout still passes responsive gate** → reset restores design
- T-39 overridden ● indicator + Reset appear only when overridden
- T-40 colour picker offers ONLY theme palette (no free hex)
- T-41 locked specs remain read-only (font family, exact px)

### 7.5 Inspector — Content
- T-50 text edit persists + autosaves
- T-51 AI copy buttons call local Claude, return, apply
- T-52 image swap / alt text
- T-53 link href/target

### 7.6 Inspector — Settings
- T-60 semantic type picker (constrained by family)
- T-61 **retag never changes look** (size/color/margin/weight) — the core invariant, per element family
- T-62 SEO audit severity + click-to-flash
- T-63 responsive visibility toggles
- T-64 advanced id/class read-only

### 7.7 Testing layer itself (meta-tests)
- T-70 client scanner detects a deliberately-broken fixture (overflow) and flags offender
- T-71 device-switch pip goes scanning→result
- T-72 SSE run streams start→cases→end; dashboard tiles transition states
- T-73 Playwright result overrides a disagreeing client scan
- T-74 detail drawer shows offender + DOM path

### 7.8 Output sites (existing, keep)
- T-80 every project × {320,375,414,768,1024,1280,1440,1920}: no overflow / over-wide / broken img / empty section
- T-81 published bundle includes `pf-utilities.css`; overrides render identically to editor

### 7.9 Cross-cutting states
- T-90 empty selection state; T-91 saving/saved/error states; T-92 external-change notice; T-93 keyboard (Esc/undo/redo/duplicate/delete); T-94 dark theme contrast (a11y) on all panels.

**Coverage rule:** each interactive element in every panel must have ≥1 test asserting its effect + its reset/undo path. The audit isn't done until every T-row above has a passing Playwright case and a reviewer confirms no orphan control.

---

## 8. Build order (phases, each ends green before the next)

1. **P1 — Editable style foundation**: `_style`/`_vis` schema, `pf-utilities.css` generator, runtime class resolution, invariant preserved. Verify: retag+style gate green.
2. **P2 — Inspector Style controls** (align/size/weight/colour/space/opacity/visibility) with override/reset. Verify: T-30..T-41.
3. **P3 — Floating element toolbar** (repeat duplicate/reorder/delete/hide/reset). Verify: T-20..T-27.
4. **P4 — Client live scanner** (iframe + animated scan + offender highlight) + device pips. Verify: T-70..T-71.
5. **P5 — Backend Playwright SSE + dashboard** (stream, tiles, drawer). Verify: T-72..T-74.
6. **P6 — Test-case audit pass**: implement every remaining T-row; reviewer confirms 100% control coverage. Verify: full suite green.
7. **P7 — Export**: ship `pf-utilities.css` in bundles; verify T-80..T-81.

Each phase: `tsc` clean + relevant Playwright cases green + a screenshot for visual sign-off.

---

## 9. Decisions (LOCKED 2026-08-28)

1. **Guardrail model → HYBRID.** Marketers get **bounded** controls (theme palette + fixed scales). A **Builder/admin mode toggle** unlocks **free-form** (raw colour, raw px). Every control is authored once with a `mode` prop; bounded renders the token widget, free-form renders the raw widget. Overrides + Reset work identically in both.
2. **Reorder → array-direct.** Reorder the content array in place; `_order` dropped.
3. **Testing panel → OVERLAY + always-on pips.** Per-device status pips live in the top bar (client-scan, instant). A **Test ▶** button opens a full-screen dashboard that runs the authoritative Playwright suite with scan animation + drill-down.
4. **Playwright in-app → YES.** The Node server spawns the suite and streams SSE to the dashboard. CLI (`npm run test:ui`) stays as the headless/CI path.

---

## 10. Non-goals (this round)
Drag-to-reposition on canvas; nested section creation; multi-select; animation/interaction authoring; A/B variants. Noted for later.
