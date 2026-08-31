---
name: figma-to-pitforge
description: >
  Use whenever converting a Figma design into a new PitForge project (a landing page in
  ./projects/<slug>/). Triggers: "convert this Figma", "build this design in PitForge",
  "import from Figma", any figma.com URL + "make a site/page", or the handoff prompt the
  Studio's "New site → From Figma" dialog generates. Produces a PIXEL-FAITHFUL, proportionally
  RESPONSIVE, SEO-clean, zero-JS PitForge project via the Figma MCP. Loads and applies the
  companion skills (pitforge-responsive-fluid, pitforge-seo, pitforge-accessibility,
  pitforge-export-deploy) as part of the same job.
---

# Figma → PitForge project

Goal: a **new PitForge project** that is an exact, responsive clone of a Figma design,
produced in ONE disciplined pass — not ten rounds of "this doesn't match". This skill has two
halves: (A) **faithful clone** (get the pixels right) and (B) **PitForge scaffolding** (put them
in the folder shape the Studio + exporter expect).

## Before you touch anything — load the companion skills

This project ships a skill set. When Figma MCP work starts, you MUST also apply:

- **pitforge-responsive-fluid** — the `--u` proportional unit, fluid `clamp()` fonts, breakpoints, carousels, equal-height grids. Read it before writing CSS.
- **pitforge-seo** — one `<h1>`, heading order, canonical/slug for sub-path deploys, meta, JSON-LD, favicon.
- **pitforge-accessibility** — semantic tags, alt text, zero-JS accordions, contrast, focus.
- **pitforge-export-deploy** — how the project becomes a deployable bundle.

If a rule here and a companion skill overlap, they agree by design; the companion has the detail.

## Step 0 — Connect + map the design (Figma MCP)

- Extract `fileKey` and `nodeId` from the Figma URL (`/design/:fileKey/…?node-id=1-2` → nodeId `1:2`).
- `get_metadata` on the top desktop frame → the layer tree (node ids, names, sizes, positions). Note the **canvas width** (usually 1920) and **content width** (e.g. 1440), and each section's node id. Note the **mobile frame** node id if one exists.
- `get_variable_defs` on the frame → the design token system (colors, spacing, radii, type, fonts). Build `tokens.css` from THESE, named after them.
- `get_design_context` per section → exact spec (px, colors, gradients, borders, radii, fonts, letter-spacing) **+ asset download URLs**. Use values verbatim; never eyeball a screenshot.

## Step 1 — Scaffold the PitForge project

Create `./projects/<slug>/` with this exact shape (the Studio and exporter depend on it):

```
projects/<slug>/
├── pitforge.json          # { name, lang, blocks: ["SiteNav","Hero",...], domain, createdBy }
├── manifest.json          # { version, fields: { "field.path": {type,...}, ... } }  (zod-validated)
├── content/default.json   # { "field.path": value, ... }  every editable value
├── tokens.css             # :root{--u + design tokens}, body{...}, @font-face
├── blocks/<Name>.tsx      # one React component per design SECTION
├── blocks/<Name>.css      # its styles
└── assets/                # fonts (subset woff2), transparent images, icons/*.svg, favicon
```

**One block per design section.** Never add a section that isn't in the design; never merge two.
Register a block by adding its name to `pitforge.json`'s `blocks` array (order = render order). New
block files need a dev-server restart (`import.meta.glob` is evaluated at boot).

## Step 2 — Blocks use the PF runtime components (never raw content)

Import from `../../../src/runtime/components`. Each renders twice by the same tree: **interactive
in the Studio** and **static zero-JS at export**. Every editable value goes through a PF component
bound to a manifest field — never hardcode copy or image paths in JSX.

| Component | Manifest `type` | Use for |
|---|---|---|
| `PFText` | `text` | inline text (spans, paragraphs) |
| `PFHeading level={1..6}` | `heading` | a single semantic heading |
| `PFRichText` | `richtext` | multi-line / formatted copy |
| `PFImage sizes="…" ` | `image` | responsive `<picture>` (avif+webp, drops png) |
| `PFIcon` | `icon` | inline SVG (currentColor) |
| `PFLink` / `PFButton variant=` | `link` / `button` | anchors / buttons |
| `PFRepeat field={} >{(item,index)=>…}` | `repeat` (min/max, `item:{…}`) | lists (cards, links, FAQ) |
| `PFIconLink` / `PFImageLink` | pairs a `link` with an `icon`/`image` | clickable icons / badges |
| `PFVideo` | `video` | video |

Two-tone headline pattern (keeps one SEO `<h1>`/`<h2>`):
```tsx
<h1 className="hero-title">
  <PFText field="hero.titleTop" className="hero-title-top" />{' '}
  <PFText field="hero.titleAccent" className="hero-title-accent" />
</h1>
```

## Step 3 — Manifest + content

For every PF field in the blocks, declare it in `manifest.json` and give it a value in
`content/default.json`. Repeats declare `min`, `max`, and an `item` shape:
```json
"footer.columns": { "type": "repeat", "min": 1, "max": 6,
  "item": { "heading": {"type":"text"}, "links": {"type":"repeat","min":1,"max":12,
    "item": { "link": {"type":"link"} } } } }
```
Marketers can edit content and add/remove repeat items **within min/max** — but the structure is
locked (they can't add sections). Honor that: put everything the design shows as fields; don't add
speculative ones.

## Step 4 — Faithful clone rules (apply pitforge-responsive-fluid for the CSS system)

1. **Pull the spec, don't invent it.** Exact px/colors/gradients/radii/fonts from `get_design_context`. A soft glow is a gradient, not a hard border. Missing `font-family` still means "set the design's font".
2. **Proportional, not capped.** Every desktop dimension = `calc(<designPx> * var(--u))`. Fonts use fluid `clamp()` (see pitforge-responsive-fluid — `--u` freezes below 1366, so fonts need `clamp(min, calc(N*100vw/1920), N)`).
3. **Surgical.** When told to change one thing, change only that, to the design's value. Every changed line traces to a Figma node or an explicit instruction.
4. **Verify against the design at real viewports** (320 → 1920), node-by-node, above-the-fold — never trust "the full render looks fine".

## Step 5 — Assets (the traps that cost rounds)

- **Never** grab artwork with a plain `get_screenshot` of a node — it bakes the node's dark background in (a PNG can be `hasAlpha:yes` and still be an opaque square). Use the **asset URLs from `get_design_context`**, or `get_screenshot` with **`contentsOnly:true`**. Verify transparency by eye.
- SVG icons using `currentColor` render **black** as `<img>` — hardcode the color (`stroke="#fff"`) or inline them.
- Self-host fonts as **subset woff2**; never link Google Fonts (render-blocking). Preload the display weights.

## Gotcha checklist (every one of these cost a real "doesn't match" round)

- [ ] **`box-sizing: border-box` reset in tokens.css** (`*,*::before,*::after`). Without it, `width:100%`+padding overflows its parent — buttons bulge past cards. First thing to check when "an element sticks out": `getComputedStyle(el).boxSizing`.
- [ ] **PFRepeat wraps each item in an anonymous `<div>`.** That wrapper is the flex/grid item, not your `.card`/`.item`. Put widths, `order`, `scroll-snap-align` on `.grid > *` and use `:nth-child(n)` for reordering — NOT the inner class (its `order`/`width` won't affect layout).
- [ ] **Display headings need `text-box-trim: trim-both; text-box-edge: cap alphabetic`** (+ `-webkit-`). Skipping it adds ~13px of leading per heading → cards/sections render taller than the design ("too much space / button sits too low").
- [ ] **Buttons: check if the Figma frame is content-hug or fixed-width.** `size-full` / a `w-130`/`w-172` on the frame = a **fixed** width → `min-width: calc(N * var(--u))`. A content-hug auto-layout button = padding only, no width. Don't invent a min-width on a hug button (makes it oversized); don't drop it on a fixed one (makes it narrow). Add `align-self: flex-start` so a fixed button doesn't stretch to its column.
- [ ] **Capped clamps for desktop dims** (`clamp(min, Xvw, MAXpx)`) freeze at the 1920 value on smaller screens. Use `* var(--u)`.
- [ ] **`overflow:hidden` on a card** clips art meant to overhang the top edge. Clip the glow separately.
- [ ] **Equal-height cards in a grid:** `grid-auto-rows: 1fr` alone often isn't enough with PFRepeat wrappers — add `height: 100%` to the card.
- [ ] **Column fr ratios** from the design (e.g. `minmax(0,600fr) minmax(0,760fr)`), not `1fr 1fr`.
- [ ] **Two-tone heading** on two lines → `display:block` on the accent span, both inside one heading tag.

## Step 6 — Verify, then hand to the Studio

- Render at real viewports and screenshot **side-by-side with the Figma node** — compare, don't glance. Check the above-the-fold composition and a node-by-node pass.
- The dev Studio serves `/preview/:id` (auto-fresh, `no-store` + a versioned redirect). A **published/exported** bundle is a frozen snapshot — re-export to update it. If the user says "still not fixed" but your preview is right, they're on a stale export/tab.
- Run the SEO checks (`pitforge-seo`); every `fail` blocks export.

When the project folder is complete and the dev server has been restarted, the new site appears in
the Studio Sites list automatically. Editing, publishing and deploying are the Studio + the
**pitforge-export-deploy** skill.

## Step 7 — Stand up the project's test environment (don't skip)

A build isn't finished until the project can test itself. Immediately invoke the
**pitforge-qa-setup** skill and run its loop to completion (`node scripts/qa-setup.mjs --project
<slug> --status`, do the `nextAction`, repeat until `complete: true`). While you still have the Figma
node open, this is the cheapest moment to capture the design references it needs
(`projects/<slug>/design/<Block>.png`) — so QA's "expected" comes from the design, not a guess. The
marketer will never author tests; you leave the project self-sufficient.

## When the Figma file itself isn't build-ready (defensive mode)

- **Absolute positioning instead of Auto Layout** → magic `top/left` numbers, no layout intent. Don't reproduce coordinates; infer the intended flow (stack/row/grid) and rebuild with `--u`.
- **Code-spec vs visual disagree** (e.g. `border 1px` that reads as a soft glow) → trust the screenshot, note the discrepancy.
- **No mobile frame** → default to the `--u` system + fluid fonts; if breakpoint behavior is ambiguous, ask ONE question (scale-and-lock vs reflow) rather than guess.
- **Assets not export-ready** (baked bg, masked SVGs) → recover with `contentsOnly`; if you can't get it clean, flag it as approximated rather than shipping a dark square.
