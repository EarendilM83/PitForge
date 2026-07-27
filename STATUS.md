# STATUS

## Done and committed
- Phase 1 — skeleton: Vite 5 + React 18 + Express 4 middleware mode on :4321, `/api/projects`,
  ProjectPicker. Verified: `curl /api/projects` → `[{"id":"demo","name":"LuckyBet DE","blockCount":5}]`.
- Phase 2 — types/loading: zod schemas (`src/runtime/types.ts`), project loader with validation +
  type-appropriate empties (`src/server/projects.ts`), `PFProvider`, `RenderPage`,
  `import.meta.glob` block loading in `src/studio/App.tsx`.
- Phase 3 — demo project: five blocks (Hero/Bonus/Games/Faq/Footer) + CSS, tokens.css,
  manifest.json, content/default.json, sharp-generated placeholder images
  (`scripts/gen-demo-assets.mjs`).
- Phase 4 — edit mode (code complete): dual-mode components with `data-pf-field`, outlines,
  selection, contentEditable in-place editing (150 ms debounce), reducer with 50-step undo,
  800 ms autosave, Esc/Cmd+Z shortcuts.
- Phase 5 — inspectors (code complete): text/heading/richtext, image (upload+alt), link (rel
  chips), repeat (add/remove/reorder with min/max), video.

## In progress
- Phase 6 — media pipeline: server `media.ts` + `POST /api/projects/:id/media` NOT yet written.
  ImageInspector already calls the endpoint.

## Not started
- Phase 7 — SEO module (`src/seo/*` stubs only; SeoTab is a placeholder).
- Phase 8 — checks.
- Phase 9 — export pipeline (`src/server/export.ts`, `src/cli/export.ts` missing;
  ExportDialog UI exists and posts to the endpoint).
- Phase 10 — polish (width switcher and preview tab exist; outline tree, README pending).

## Works
- `npm install`, `npx tsc --noEmit` clean, `npm run dev` serves Studio + API + `/assets/*`.

## Known gaps / next
- `/api/projects/:id/media`, `/checks`, `/export`, `/head` endpoints missing (404).
- Static-mode rendering of preview not yet visually verified.
- Verify Phase 4 checkpoint (edit h1 → reload → persisted) in a browser next run.
