---
name: pitforge-responsive-fluid
description: >
  Use when writing or fixing any CSS in a PitForge block — the proportional/fluid system that
  makes one Figma canvas look identical on every HD+ screen and degrade cleanly to 320px.
  Triggers: writing block CSS, "it's not fluid", "too big on my screen", "buttons oversized",
  mobile layout, carousels, equal-height cards, breakpoints. Always active alongside
  figma-to-pitforge.
---

# PitForge — proportional & fluid CSS

The design is ONE canvas at a fixed width (usually 1920). It must scale as a single unit so every
HD+ screen looks *identical, just scaled*, then reflow sensibly below the HD floor.

## Two frames, a whole continuum (read this first)

Designers almost always deliver **only two frames: desktop (~1920) and mobile (~490)**. Nobody
designs tablet, small-laptop, or large-phone widths. **The deployed SPA must still be flawless at
every one of them.** Your job is to *derive* those in-between widths from the fluid system — never
to *invent* a bespoke tablet layout that matches nothing.

**This is a protected contract, not a suggestion:**
- **Between 1920 and ~1366:** the desktop design, scaled as one unit via `--u`. Don't touch layout.
- **Below ~1366 down to the mobile frame:** reflow *minimally* only where content would break —
  a grid drops columns (4→2→1), a two-column section stacks, a strip becomes a carousel. Reduce, stack,
  or scroll — **never redesign, never invent spacing/sizes the designer didn't give.**
- **At/toward ~490:** match the mobile frame.
- **Fonts** stay fluid the whole way (clamp — below).
- If a specific width breaks, the fix is a **fluid or reflow rule**, never a fixed-px patch or a
  one-off hack for that width. A fixed px "fix" is how the next width breaks.

## The `--u` unit (put this in tokens.css FIRST)

```css
:root {
  /* 1 = one pixel in the 1920 canvas. Scales ≤1920, LOCKS above (big monitors unchanged),
     FLOORS at 1366 (below that, media queries reflow — not this unit). */
  --u: calc(clamp(1366px, min(100vw, 1920px), 1920px) / 1920);
}
*, *::before, *::after { box-sizing: border-box; }   /* mandatory — see below */
```

Express **every desktop dimension** as `calc(<designPx> * var(--u))`: padding, gap, margin, width,
height, min-height, icon/image sizes, border insets, blur radii, shadow offsets. Shared tokens too:
`--space-4: calc(16 * var(--u))`, `--page-max: calc(1440 * var(--u))`, `--gutter: calc(60 * var(--u))`.

**Never** cap a desktop dimension with `clamp(min, Xvw, MAXpx)` — it freezes at the 1920 value on
smaller screens, so content overflows the fold. That is the #1 "it's not fluid" cause.

## Fonts must be fluid with `clamp()`, not `--u`

`--u` **freezes at the 1366 floor**, so `font-size: calc(N * var(--u))` stops shrinking below 1366 —
text stays huge on phones. Use a clamp that keeps scaling with the viewport and floors at a readable
size:
```css
font-size: clamp(<readableMin>px, calc(<designPx> * 100vw / 1920), <designPx>px);
```
Identical at 1920, keeps scaling below 1366, never smaller than the floor. Suggested floors:
64→30, 56→28, 48→26, 24→16, 20→15, 16→13, 14→12. **Hardcoded `px`/`rem` font-sizes are the bug** —
they never scale. Grep every block for `font-size:` and convert.

## `box-sizing: border-box` is not optional

Figma/Tailwind designs are authored border-box. Without the reset, any `width:100%` + padding
element renders **wider than its parent** and overflows (a full-width button bulges past its card).
When "an element sticks out", check `getComputedStyle(el).boxSizing` FIRST — if `content-box`, add
the reset instead of hacking the width.

## The PFRepeat wrapper trap

`PFRepeat` wraps **each item in an anonymous `<div>`**. That wrapper — not your `.card` — is the
flex/grid item. So:
- Card width / `flex-basis` / `min-width`, `scroll-snap-align`, and `order` go on **`.grid > *`**.
- Reorder with **`.grid > *:nth-child(n)`**, never `order` on the inner class (no effect).
- To equalize heights: wrapper stretches via `align-items: stretch`; give the inner card `height: 100%`.

## Breakpoints & reflow (typical landing page)

- **> 910px**: full desktop grid (e.g. 4-up tiles) via `--u`.
- **910 → 490px**: 2-up grid. Equal heights (`height:100%`), pin CTAs to card bottom
  (`justify-content:flex-start` + `margin-top:auto`) so wrapped text doesn't misalign buttons.
- **≤ 490px**: 1-up, OR a **carousel** if the design shows one.
- **≤ 600px**: trim section side padding to ~20px; the hero headline may need a smaller floor so a
  long word (e.g. "SPORTSBOOK") fits at 320px.

## Carousel (center-when-fits, scroll-when-overflow) — zero JS

```css
.strip {                       /* the flex track */
  display: flex; flex-wrap: nowrap; gap: …;
  width: fit-content; max-width: 100%; margin-inline: auto;  /* centers when it fits */
  overflow-x: auto; scroll-snap-type: x proximity;
  scrollbar-width: none;                                     /* + ::-webkit-scrollbar{display:none} */
}
.strip > * { flex: 0 0 auto; scroll-snap-align: center; }    /* target the PFRepeat wrapper */
```
For a full-card carousel: give `.grid > *` `width: 86%; min-width: 86%` (next card peeks) and add
top padding to the scroll container so art that overhangs each card isn't clipped by `overflow`.

## Verify — the gate is mandatory, not optional

A build is NOT done until it passes the responsive gate across the whole width ladder:

```sh
npm run verify -- --project <id>      # renders 320 → 2200px, fails on any real break
```

It checks every width for **page-level horizontal overflow, broken images, and collapsed sections**
(it correctly ignores carousels and clipped decorations — only genuine breaks fail). The two designed
ends (490, 1920) will usually pass on their own; the value is the **undesigned middle** (768, 1024,
1280, 1440) — the widths that ship broken when you only eyeball the two frames.

**When a width fails:** fix it with a fluid or reflow rule per the contract above — `minmax(0,1fr)` so
grid tracks can shrink, a column drop, a stack, a fluid `clamp()` font, `overflow-wrap`. **Do NOT**
patch it with a fixed px value or a width-specific hack; that just moves the break. Re-run until it's
`15/15 widths clean`. Then it ships on every screen, not just the two the designer drew.

Also screenshot a few widths side-by-side with the Figma to confirm fidelity (the gate proves it
doesn't *break*; the eye proves it *matches*).
