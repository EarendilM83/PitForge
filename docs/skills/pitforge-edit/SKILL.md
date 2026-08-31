---
name: pitforge-edit
description: >
  Use when editing an EXISTING PitForge project (a landing page already scaffolded under
  ./projects/<slug>/) — changing copy, images, colours, sizing, spacing, layout, adding/removing
  repeat items or editable fields, and producing a fresh export bundle for the human to deploy.
  Triggers: "change/edit/fix the <site> …", "make the hero bigger", "swap the CTA", "update the
  copy", "new export of <slug>", any request to modify a site that is NOT a fresh Figma import.
  For a brand-new project from a Figma URL, use figma-to-pitforge instead. Loads the companion
  skills (pitforge-responsive-fluid, pitforge-seo, pitforge-accessibility) for the actual edit.
---

# PitForge — edit an existing project

You are the edit engine for a live PitForge site. The marketer tells you in plain language what
they want changed; you make a **surgical, gated** change to the project folder and hand back a
deployable bundle. You never deploy, and you never touch PitForge itself.

## The hard boundary — read this first

- **You may edit ONLY `./projects/<slug>/**`.** That folder IS the site: blocks (`.tsx`/`.css`),
  `manifest.json`, `content/default.json`, `tokens.css`, `assets/`, `pitforge.json`.
- **You may NOT edit PitForge the engine** — `src/**` (runtime, studio, server), `scripts/**`,
  `.claude/**`, root config (`package.json`, `vite.config.ts`, `tsconfig.json`). Those are the
  owner's alone. The permission fence in `.claude/settings.json` blocks these; if a request needs
  an engine change (a runtime component doesn't do what's needed, a new field type, an export bug),
  **stop and say so** — don't work around it inside a project.
- **You do NOT deploy.** Your job ends at the export `.zip`. The owner uploads it to the GitLab repo
  that auto-deploys to Cloudflare Pages. No `git push`, no `wrangler`, no `glab`.

You may freely **read** anything (including `src/`) to understand the runtime components and field
schema — reading the engine is how you edit projects correctly. The fence is on writing only.

## The edit loop — run it every time

```
1. SCOPE     Identify the target project → projects/<slug>/. If ambiguous (demo / dogecoin-casino /
             drops-wins / …), ask which site. Confirm the slug before editing.
2. LOCATE    Read only what you need: manifest.json (the fields), content/default.json (the values),
             the relevant blocks/<Name>.tsx + blocks/<Name>.css, tokens.css. Don't scan the repo.
3. CLASSIFY  Decide which layer the change lives in (table below). Wrong layer = wrong edit.
4. EDIT      Make the smallest change that satisfies the request. Match the block's conventions
             (--u fluid units, class-based styling, zero-JS). Every changed line traces to the ask.
5. GATE 1    npm run verify -- --project <slug>     (responsive 320→2200; fails on any real break)
6. GATE 2    npm run typecheck                       (blocks are TSX; a type error breaks render/export)
7. GATE 3    Screenshot the live /preview/:id at ~490 and ~1920 and eyeball it against the request.
             Never declare done on a glance. Fix breaks with fluid/reflow rules, never fixed-px patches.
8. EXPORT    npm run export -- --project <slug> --domain <owner's domain>
             SEO's 16 checks run here; a `fail` refuses the export. Fix and re-run until it passes.
9. HANDOFF   State what changed + gate results + the .zip path. STOP. The owner deploys it.
```

Loop 5–7 until green before you export. Loop 8 until SEO passes. Then stop.

## CLASSIFY — which layer does the change live in?

| The request is about… | Edit here | Notes |
|---|---|---|
| Wording, a headline, button label, alt text, a link URL | `content/default.json` | Pure content. Safest. No structure touched. Respect the field's `maxLength`. |
| A different image / icon / video | `content/default.json` + drop file in `assets/` | Point the field's `src` at the new asset; keep width/height for the SEO `img-dimensions` check. |
| Add / remove a repeat item (a card, a row) | `content/default.json` | Only within the field's `min`/`max` from the manifest. Can't exceed it. |
| Colour, font size, spacing, radius, shadow, a per-block layout tweak | `blocks/<Name>.css` (block-local) or `tokens.css` (site-wide token) | Class-based — changing a value never needs a tag change. Site-wide brand change → token; one-off → block CSS. |
| Reorder / restructure within a block, change a wrapper tag | `blocks/<Name>.tsx` | Structural. Keep it one design section = one block. Don't merge or invent sections. |
| Make something newly editable by the marketer (promote hardcoded text to a field) | `manifest.json` + the block `.tsx` (`PFText`/`PFImage`/…) + `content/default.json` | Add the field to the manifest, bind a PF component to it, seed a default value. |
| SEO: title, meta, canonical, slug, heading level, JSON-LD | `content/default.json` (meta fields) / block heading tags | Apply **pitforge-seo**. One `<h1>`, sequential headings, or export refuses. |

If the change doesn't fit any row — it needs a new runtime component, a new field *type*, or an
engine behaviour — that's an **engine change = owner only**. Report it; don't fake it in a project.

## Companion skills — apply them for the actual edit

- **pitforge-responsive-fluid** — before writing ANY block/token CSS. The `--u` unit + `clamp()`
  fonts are why one edit looks right on every screen. Fix responsive breaks the fluid way.
- **pitforge-seo** — before touching headings/meta/links, and it gates every export. One `<h1>`,
  heading order, canonical/slug, `rel="nofollow sponsored"` on affiliate links.
- **pitforge-accessibility** — semantic tags, alt text, contrast, zero-JS interactivity.

## Gotchas (these bite)

- **The export is a frozen snapshot.** After any edit, the old `.zip` is stale — re-export. If the
  owner says "still not fixed" but `/preview` looks right, they're on a stale export or a cached tab.
- **`PFRepeat` wraps each item in an anonymous `<div>`** — style/`order` the wrapper (`.grid > *`),
  not the inner class.
- **Dev server + `import.meta.glob`**: a brand-new block file needs a dev-server restart to appear.
  Editing an existing block hot-reloads live in `/preview/:id`.
- **`box-sizing: border-box`** is already set in `tokens.css` — keep it; `width:100%` + padding
  overflows without it.
