---
name: pitforge-seo
description: >
  Use when setting up or fixing SEO on a PitForge project — headings, canonical/slug, meta,
  structured data, favicon, sitemap/robots, and the 16 export checks. Triggers: "SEO", "canonical
  is wrong", "add schema/FAQ", "meta title", "headings", an SEO specialist's change request, or any
  time before exporting. Always active alongside figma-to-pitforge.
---

# PitForge — SEO

PitForge is SEO-first: the exporter runs 16 checks and **any `fail` aborts the export**. Get these
right as you build, not after.

## Headings — exactly one `<h1>`, clean order

- **One `<h1>`** per page = the full hero headline. For a two-tone headline keep BOTH lines in the
  single `<h1>` via inner spans (don't split the second line into a separate element):
  ```tsx
  <h1 className="hero-title">
    <PFText field="hero.titleTop" className="hero-title-top" />{' '}
    <PFText field="hero.titleAccent" className="hero-title-accent" />
  </h1>
  ```
- Section titles = `<h2>`. Sub-items inside a section (accordion questions, card titles) = `<h3>`.
- **No level skips** (h1→h3 without an h2). The `heading-order` check enforces this.
- Wrap `PFText` in the heading tag and add `margin: 0` when converting an inline field to `<h3>`.

## Canonical / slug — critical for sub-path deploys

A site deployed at a **sub-path** (`https://fortunejack.com/best-x-casino`) must have
`canonical`, `og:url`, and `sitemap` all equal to that sub-path URL — **not** doubled with the slug.
The head builder already handles this: when the export `domain` includes a path, `pageUrl` = the
domain root (trailing-slashed) and the slug is NOT appended. So:
- Set `seo.canonical` to `self` (or the exact absolute sub-path URL).
- Verify in the exported `index.html` that `<link rel="canonical">`, `og:url`, and `sitemap.xml <loc>`
  are the clean sub-path — no `/slug/slug` doubling.

## Meta

- `seo.title` ~50–60 chars (a `title-length` warning fires outside that; it's a warn, not a fail).
- `seo.description` 50–155 chars.
- Affiliate/external links need `rel="nofollow sponsored"` (the `link-rel` check **fails** without it).

## Structured data (JSON-LD)

- PitForge generates schema from `seo.schema.*` fields (Organization, WebSite, WebPage, FAQPage, …).
- For a **hand-authored** schema from an SEO specialist, put the exact JSON in **`seo.schema.raw`** —
  the head emits it verbatim (the `schema-valid` check then only requires valid JSON, trusting the
  author's type composition). This guarantees a byte-exact match.
- **FAQPage schema must correspond to a visible FAQ section** on the page. If you add the schema, add
  the visible FAQ block too (a zero-JS `<details>` accordion — see pitforge-accessibility). Don't ship
  FAQPage structured data with no visible Q&A.

## Favicon, sitemap, robots

- Put the real favicon at `assets/favicon.svg`; the head links it (path-prefixed for sub-path deploys).
- `sitemap.xml` and `robots.txt` are generated at export from the domain — check the `<loc>` is the
  clean canonical URL.

## The checks (run before every export)

`GET /api/projects/:id/checks` (or the export itself). Common ones: `single-h1`, `heading-order`,
`title-length`, `desc-length`, `link-rel`, `absolute-urls`, `schema-valid`, `schema-matches`,
`renders-without-js`, `no-localhost`, `img-dimensions`, `byte-budget`. **Fix every `fail`**; warns are
advisory. `renders-without-js` confirms the `<h1>` text is literally in the static HTML (it is —
PitForge renders zero-JS).
