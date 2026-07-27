# STATUS

## Done and committed
- **Phase 1** — skeleton: Vite 5 + React 18 + Express 4 middleware mode on :4321, `/api/projects`, ProjectPicker. (commit 3a1b5da)
- **Phase 2** — types/loading: zod schemas, project loader, `PFProvider`, `RenderPage`, `import.meta.glob` block loading. (commit 3a1b5da)
- **Phase 3** — demo project: 5 blocks + CSS, tokens, manifest, content, sharp-generated images. (commit 386ccbc)
- **Phase 4** — edit mode: dual-mode components, outlines, selection, contentEditable editing, undo (50), autosave (800 ms), Esc/Cmd+Z. Code complete; **browser verification of click/type interactions still pending**.
- **Phase 5** — inspectors: text/heading/richtext, image, link, repeat (add/remove/reorder, min/max), video. Code complete; repeat interactions pending browser check.
- **Phase 6** — media pipeline: multer upload, sharp derivatives (4 widths × AVIF/WebP/orig), SVG sanitise, ratio/minWidth warnings. Verified via curl. (commit 7f21cfa)
- **Phase 7** — SEO: `src/seo/{fields,derive,head,schema}.ts`, SeoTab with keyword usage, meters, robots/hreflang/schema chips, SERP + social previews, checks list, Advanced drawer (live `/head`). Derivation sync via `seo._custom`. (commit 1bf22e1)
- **Phase 8** — all 15 checks, run against rendered output via `vite.ssrLoadModule`. `no-hardcoded-content` verified: caught `Jetzt spielen` at `projects/demo/blocks/Hero.tsx:13`. (commit 1bf22e1)
- **Phase 9** — export pipeline: CSS concat+minify+hash, referenced-assets-only copy, sitemap/robots/404/manifest, .htaccess/nginx/_redirects/README, prettified HTML, ZIP streamed + headless CLI. Verified: ZIP unzips, `python3 -m http.server` serves index/CSS/AVIF 200, no JS, no localhost, h1 literal. (commit 1bf22e1)

## In progress / remaining (Phase 10 polish)
- Browser-level verification of Edit tab interactions (click-select, contentEditable typing, undo) and Preview-tab fidelity — everything is code-complete and type-checks, but no headless browser was available this run.
- `chokidar` watch of project folder (§3 lists it; not wired — Studio re-fetches on load only).
- PFIcon inlines SVG at export — currently `<img>` in both modes.
- Font preload in head — skipped (demo has no fonts).
- Rail has Outline only; Content/Media rail panels not built (media replace lives in the image inspector).

## Phase 10 done
- Outline rail (blocks → fields, click selects + scrolls into view).
- README.md documents all commands, the API and the demo.
- Width switcher (360/768/1280/full) and Preview tab (static render in iframe) shipped earlier.

## Verified working
- `npm install`, `npx tsc --noEmit` clean, `npm run dev`, all 7 API endpoints.
- Checks endpoint: 14 pass + 1 deliberate `title-length` warn.
- `npm run export -- --project demo --domain https://example.com` → valid ZIP.
- `POST /api/projects/:id/export` streams ZIP; `/head` returns head/JSON-LD/robots/sitemap.
- Edit persistence: PUT content → reload from disk shows change → restored (Phase 4
  checkpoint verified at the storage layer; UI interaction layer pending browser test).
- Dev server stopped after verification; nothing left running.

## Key architectural note
Server-side rendering of blocks in dev MUST go through `src/server/ssr-entry.ts`
(loaded via `server.ssrLoadModule`) so blocks, `PFContext` and the renderer share
one Vite SSR module graph — otherwise useContext splits across two React copies
and the page renders empty. CLI uses tsx imports instead (single Node graph).
