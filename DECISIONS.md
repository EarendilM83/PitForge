# DECISIONS

Running log of choices made where the spec left something open.

- **Repo state:** fresh start per RECONCILE.md — spec layout (§4) adopted verbatim.
- **TS runner for CLI/scripts:** `tsx` (devDependency) instead of ts-node — faster, zero config.
- **Dev asset URLs:** content stores `/assets/...` (the export URL shape). In dev, an Express
  middleware maps `/assets/*` to the first `projects/*/assets/` folder containing the file.
  One demo project → no ambiguity.
- **Field type:** the zod `fieldSchema` validates on load; the app consumes a hand-written,
  permissive `Field` interface so TS doesn't fight the discriminated union.
- **PFButton:** implemented as `PFLink` with a `btn-<variant>` class — same semantics, less code.
- **PFIcon:** ~~renders `<img>` in both modes~~ — **superseded** below: SVG now inlined in both modes.
- **Preview tab:** renders `renderToStaticMarkup` client-side into an iframe `srcDoc`
  (same static mode as export, §8.3) instead of a server round-trip.
- **Richtext storage:** tiny HTML subset string (`<b>`, `<i>`, `<a>`), rendered with
  `dangerouslySetInnerHTML`; inspector toolbar appends markup around the selection.
- **Saves:** whole-content PUT, atomic temp-file + rename (§7), debounced 800 ms.
- **SSR in dev:** block rendering for checks/export goes through `vite.ssrLoadModule`
  (`src/server/ssr-entry.ts`) so blocks and `PFContext` share one module graph;
  the CLI uses tsx imports (one Node graph). Two graphs = two React context
  instances = silently empty render.
- **`link-rel` check vs demo footer link:** §10.5 says every external link needs
  `nofollow`/`sponsored`, but §13 requires a footer link with `rel="follow"`.
  Resolution: an explicit `rel="follow"` token is honoured as a deliberate
  editorial opt-out; anything else external without nofollow/sponsored fails.
- **`byte-budget` measurement:** counts what a browser actually downloads — per
  image slug, the largest AVIF candidate (plus non-image assets in full) — not
  the sum of all 12 derivative files.
- **Multipart uploads:** `multer` added (spec's fixed stack lists no multipart
  parser; multer is the Express-standard choice).
- **srcset convention:** stored `src` points at `<slug>-<largest>.<ext>`;
  `srcsetFor` strips the width suffix and re-appends 400/800/1200/1600, filtered
  to ≤ the original width so no missing files are referenced.
- **Checks without a domain:** the `/checks` and `/head` endpoints use
  `?domain=`, falling back to `pitforge.json.domain`, then `https://www.example.com`.
- **PFIcon inlining:** static/export mode inlines sanitised SVG pre-loaded into
  `PFContext.iconSvg` by the server renderer (synchronous — `renderToStaticMarkup`
  cannot await); edit mode fetches the same file in the browser. Fallback is `<img>`.
- **External-change watch:** chokidar watches `projects/`; the Studio polls
  `/api/projects/:id/version` every 3 s and shows a Reload/Dismiss banner. Own
  saves reset the baseline so they never trigger the banner.
- **UI verification:** Playwright (devDependency) + `scripts/verify-ui.mjs`, which
  restores the demo content via the API after mutating it during tests.
- **Demo slug:** marked custom via `seo._custom: ["seo.slug"]` so the authored
  slug wins over derivation from the h1.
