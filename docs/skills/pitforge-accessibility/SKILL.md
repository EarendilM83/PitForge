---
name: pitforge-accessibility
description: >
  Use when building or reviewing PitForge blocks for accessibility — semantic HTML, headings, alt
  text, keyboard/focus, contrast, and zero-JS interactive patterns (accordions, carousels).
  Triggers: building any block, "accessibility/a11y", accordions, forms, icon buttons. Always active
  alongside figma-to-pitforge.
---

# PitForge — accessibility

The export is **static, zero-JS** — so interactivity must be built from HTML/CSS that works without
scripts, and semantics carry the meaning.

## Semantics & landmarks

- One `<header>` (nav/hero), `<main>` wraps the page body, `<footer>` for the footer, `<section>`
  for content sections. Give sections an accessible name (`aria-labelledby` → the section's heading id).
- Headings: one `<h1>`, ordered `<h2>`/`<h3>`, no skips (see pitforge-seo).
- Links are `<a>`, buttons/CTAs are `<a>`/`<button>` — never a clickable `<div>`.

## Images & icons

- Every `PFImage` needs a meaningful `alt` (empty `alt=""` only for purely decorative art).
- Decorative glows/patterns: `aria-hidden="true"`.
- Icon-only links (social, payment): the `<a>` gets an `aria-label` (PFIconLink does this from the
  link label) so it's not an empty link.

## Zero-JS interactive patterns

**Accordion — `<details>`/`<summary>`** (semantic, keyboard-accessible, no JS):
```tsx
<details className="faq-item" open={index === 0}>
  <summary className="faq-q"><h3 className="faq-q-text"><PFText field={`${item}.q`} /></h3>
    <span className="faq-icon" aria-hidden="true" /></summary>
  <div className="faq-a"><PFText field={`${item}.a`} /></div>
</details>
```
Hide the native marker (`summary{list-style:none}` + `::-webkit-details-marker{display:none}`), draw a
`+`/`−` from two bars toggled by `[open]`.

**Accordion needing collapsed-by-default-on-mobile-only** (e.g. footer link columns): the
checkbox-hack — a visually-hidden `<input type="checkbox">` + `<label>` heading + sibling content;
desktop CSS forces the content visible and hides the toggle, mobile collapses it. Keep the toggle
focusable-but-hidden, and the label a real `<label htmlFor>`.

**Carousel**: native `overflow-x: auto` scroll (keyboard/trackpad/touch all work) — no JS. Don't hide
focus outlines on the links inside.

## Contrast & focus

- Body text on the dark bg must hit WCAG AA (subtitle greys are borderline — verify).
- Never remove focus outlines globally. If you restyle focus, keep a visible `:focus-visible` state.
- Interactive targets ≥ 40px on mobile.

## Verify

- Tab through the page: every link/button/accordion reachable and operable by keyboard.
- Headings form a valid outline (matches the `heading-order` check).
- No empty links, no images missing `alt`.
