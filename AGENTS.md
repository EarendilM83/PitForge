# AGENTS.md — instructions for any AI agent working in this repo

PitForge turns Figma designs into fast, SEO-clean, fully-fluid landing pages. If you're an AI agent
(Claude Code, Codex, Cursor, Gemini CLI, …) building or editing a site here, follow these.

## Build

- Convert a Figma design into `./projects/<slug>/` following the skills in `.claude/skills/`
  (`figma-to-pitforge`, `pitforge-responsive-fluid`, `pitforge-seo`, `pitforge-accessibility`,
  `pitforge-export-deploy`). Match the design; make it fluid at every width; keep output zero-JS.

## Quality gate — MANDATORY before "done", publish, or export

You may not report a PitForge site complete until it passes the **QA catalog** end-to-end.

1. **Automation:** dev server up (`npm run dev`), then `npm run test:ui` — must be GREEN.
   (routes · screens · layout 320→3200 · SEO/a11y · assets/perf · fluid type & spacing · every editor
   interaction · editor↔preview parity). Also `npm run gate` = `typecheck && test:ui` for CI.
2. **Visual + interaction:** run **every** check in [`tests/qa-catalog.md`](tests/qa-catalog.md) — a
   deterministic, senior-QA catalog of ~90 checks across 13 suites (typography, colour/contrast,
   spacing/box-model, flex/grid, responsive per breakpoint, images, interactive elements with mouse
   AND keyboard, motion, semantics/SEO, performance, editor↔preview parity, design fidelity,
   cross-browser). Test **every visual detail at every breakpoint 320→3200**, not just the two the
   designer drew.
3. **Close the loop:** any failure or unverifiable check → add/adjust a case in
   [`tests/cases.json`](tests/cases.json) (persists to disk; the ▶ Test dashboard edits the same file).

### Discipline (deterministic QA)

- Every expected result is checkable without guessing — an exact value, a named element's computed
  state, a pixel bound, a ratio, or a count. "Works / looks fine" is not a valid result.
- One assertion per step. Screenshots are evidence, not results.
- Graduate a manual check to automation whenever it becomes cheap and deterministic.

### Use the qa-skills standard

This catalog is compatible with [qa-skills](https://github.com/petrkindlmann/qa-skills)
(`npx skills add petrkindlmann/qa-skills`). Pull in `playwright-automation`, `visual-testing`,
`accessibility-testing`, and `exploratory-testing` to extend coverage (visual-regression baselines,
cross-browser matrices, a11y audits).

Claude-specific: the same protocol ships as the `pitforge-qa` skill in `.claude/skills/pitforge-qa/`.
