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
- **PFIcon:** renders `<img>` in both modes for now; SVG inlining at export is a TODO.
- **Preview tab:** renders `renderToStaticMarkup` client-side into an iframe `srcDoc`
  (same static mode as export, §8.3) instead of a server round-trip.
- **Richtext storage:** tiny HTML subset string (`<b>`, `<i>`, `<a>`), rendered with
  `dangerouslySetInnerHTML`; inspector toolbar appends markup around the selection.
- **Saves:** whole-content PUT, atomic temp-file + rename (§7), debounced 800 ms.
