# PitForge

A locally-run, SEO-first CMS Studio for one-page landing sites. Open a project,
edit the page visually, set its SEO, and download a deploy-ready ZIP of static code.

## Commands

```sh
npm install          # install dependencies (Node 20+)
npm run dev          # start the Studio at http://localhost:4321
npm run export -- --project demo --domain https://example.com   # headless ZIP export
npm run typecheck    # tsc --noEmit
node scripts/gen-demo-assets.mjs   # regenerate the demo's placeholder images
```

## How it works

- **Projects are folders** in `./projects/` — no database. Each has `pitforge.json`
  (config + block order), `manifest.json` (field types/constraints, zod-validated),
  `content/default.json` (every editable value), `tokens.css`, `blocks/*.tsx` and `assets/`.
- **Blocks are React components** rendered twice by the same tree: interactive in the
  Studio (`edit` mode) and static at export (`renderToStaticMarkup`). What ships is
  clean semantic HTML with zero JavaScript.
- **The Studio** opens on a Sites list; each site opens in an Elementor-style editor:
  dark left panel (Elements navigator / Page SEO panels / Content-Style-Advanced when
  an element is selected), the page canvas beside it, device-width switching, preview
  mode, and Export ZIP producing the static site.
- **The export** (UI button or CLI) builds `<head>` with absolute URLs, minifies CSS,
  copies only referenced assets, writes sitemap/robots/404/manifest plus
  `.htaccess` / `nginx.conf.example` / `_redirects` / `README.md`, runs all 15 SEO
  checks (any `fail` aborts), and streams `<project>-<yyyymmdd-hhmm>.zip`.

## API (dev server, all under `/api`)

| Method | Path | Does |
|---|---|---|
| GET | `/api/projects` | list projects |
| GET | `/api/projects/:id` | config + manifest + content + tokens + block paths |
| PUT | `/api/projects/:id/content` | save content (atomic) |
| POST | `/api/projects/:id/media` | upload image → sharp pipeline (AVIF/WebP/original × 400/800/1200/1600) |
| GET | `/api/projects/:id/checks` | run all SEO checks |
| GET | `/api/projects/:id/head` | emitted head, JSON-LD, robots.txt, sitemap.xml |
| POST | `/api/projects/:id/export` | body `{ domain }` → streams ZIP |

## Demo project

`projects/demo` ("LuckyBet DE") exercises every field type: hero (priority image,
h1, CTA with `nofollow sponsored`), bonus figures, games repeater (min 2 / max 8),
FAQ repeater feeding `FAQPage` schema, footer (richtext, `rel="follow"` link, 18+
icon). It deliberately ships a 71-char SEO title so the `title-length` warning is
visible; every other check passes.

See `STATUS.md` for build state and `DECISIONS.md` for implementation choices.
