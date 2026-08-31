---
name: pitforge-export-deploy
description: >
  Use when exporting a PitForge project to a deployable bundle and shipping it — root/sub-domain
  (Cloudflare Pages) vs sub-path (Cloudflare Worker), path prefixing, and the git-based deploy flow.
  Triggers: "export", "deploy", "put it live", "Cloudflare", "push to the repo", canonical/asset
  paths in production. Always active alongside figma-to-pitforge.
---

# PitForge — export & deploy

## Before you export — pass the responsive gate

Never ship a build that hasn't passed `npm run verify -- --project <id>` (see
pitforge-responsive-fluid). A designer's two frames (1920 + ~490) tell you nothing about 768/1024/1440;
the gate proves those undesigned widths ship unbroken. `15/15 widths clean` is the ship bar.

## Export

- **Studio → Export** (enter the production domain) or the CLI:
  `npm run export -- --project <id> --domain https://example.com`.
- The exporter: builds `<head>` (absolute URLs, canonical, JSON-LD, preloaded subset fonts, inlined
  critical CSS), copies **only referenced assets**, emits **AVIF + WebP** (drops the PNG fallback —
  WebP is universal), writes `sitemap.xml`/`robots.txt`/`404.html`/`site.webmanifest`, runs all SEO
  checks (**any `fail` aborts**), and zips a **flat** bundle (index.html at the root — no wrapper folder).

## Two export shapes — decided by the domain

- **Root or sub-domain** (`https://x.com` or `https://promo.x.com`) → **Cloudflare Pages** bundle:
  flat static files + `_headers` (immutable asset cache + security headers incl. CSP) + `_redirects`.
- **Sub-path** (`https://x.com/best-y-casino`) → **Cloudflare Worker** bundle:
  `worker.js` (serves assets + sets headers), `wrangler.toml` (route `x.com/best-y-casino*`), and the
  site under `public/best-y-casino/`. **Every internal path is prefixed** with the sub-path — including
  each URL inside a `srcset` (the easy one to miss) and the favicon. Verify: no un-prefixed `/assets/`
  remains, and canonical/og/sitemap = the clean sub-path (no `/slug/slug` doubling — see pitforge-seo).

## Branded 404

The exporter writes a self-contained, on-brand `404.html` (inlines the project tokens) — `noindex`,
"back to home". Don't ship the bare `<h1>404</h1>`.

## Preview vs published (the stale-render trap)

- `/preview/:id` is live (sends `no-store` + a content-versioned redirect) — always current.
- A **published/exported** bundle is a **frozen snapshot** — it does NOT update when you edit a block;
  you must re-export. If the user says "still not fixed" but the preview is right, they're viewing a
  stale export or a browser-cached tab. Re-export and hard-reload.

## Git-based deploy (the seo-pages monorepo pattern)

Many teams deploy these bundles from a monorepo where **each site is a top-level folder** matching the
export shape: `worker.js`, `wrangler.toml`, `.gitlab-ci.yml` (job name = folder name), and
`public/<route>/…`. Pushing to `main` triggers CI (`wrangler deploy`).

- To ship an update: export → replace the folder's `public/<route>/` + configs → commit → push (or MR).
- **Match the existing folder structure exactly** — don't restructure. The CSS is content-hashed
  (`styles.<hash>.css`), so a style change shows as a delete+add of that file; that's expected, not a
  structural change.
- If `main` is **protected**, a direct push is rejected server-side (Developer role); push a branch and
  open a Merge Request for a Maintainer to merge — that's not something to work around.
- A domain-with-path deploy needs the domain to be a Cloudflare zone on the account, and a recent
  Wrangler (`npx wrangler@latest deploy`).
