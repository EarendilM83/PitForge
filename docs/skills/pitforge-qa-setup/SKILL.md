---
name: pitforge-qa-setup
description: >-
  Stands up a SELF-SUFFICIENT test environment for a PitForge project, once — right after the
  Figma→PitForge build finishes (or when a project has no QA setup yet). Runs as an ITERATIVE LOOP,
  not a single pass: it discovers every section, writes per-project test cases/scenarios from the
  design source, captures Figma design references, runs the AI QA baseline, triages defects, covers
  interactive elements, and finishes with a completeness-critic pass. It does NOT stop until an
  objective coverage checklist is fully green. A marketer never has to think about testing — this
  makes each new project test itself.
  Use when: a new project was just built, "set up testing for <project>", "make QA self-sufficient",
  "the project has no test cases yet", onboarding an existing project into QA.
  Not for: running the existing suite on an already-set-up project (that's pitforge-qa / the QA
  pipeline). Related: pitforge-qa (the gate that runs AFTER setup), figma-to-pitforge (the build).
---

# PitForge — QA setup loop

Goal: turn a freshly-built project into one whose **testing is self-sufficient** — every section has
design-sourced test cases, design references, a clean baseline run, interactive coverage, and no
gaps. New users from marketing will never author tests; this skill (run by any AI) does it, **once,
per project**, as a resumable loop.

## The one rule

**Do not declare done until the engine says `complete: true`.** "Enough" is not a feeling — it is the
coverage checklist below, all green. Work **one action at a time**; each action mutates files under
`projects/<id>/qa/`, so the loop is resumable across iterations and context resets (any agent —
Claude, Codex — can pick it up from `--status`).

## The loop

Every iteration is exactly this:

```sh
node scripts/qa-setup.mjs --project <id> --status     # → coverage, checklist, nextAction, complete
```

Read `nextAction`. **Do that one thing.** Re-run `--status`. Repeat. Stop only when `complete: true`.

The engine is the source of truth for progress; you are the source of judgment for each action.

## Coverage checklist (what "self-sufficient" means)

The engine tracks 9 criteria. In order:

1. **sections** — discovered from `pitforge.json` blocks.
2. **scaffold** — `qa/cases.json` + `qa/setup-state.json` exist → `--init`.
3. **perSectionCases** — every section has a case in `qa/cases.json`.
4. **designRefs** — every section has `projects/<id>/design/<Block>.png` (and `-mobile.png` where the
   design has a mobile frame), or is marked no-design.
5. **scenariosResolved** — every scenario has been checked against the design (no `status: "todo"`).
6. **ranBaseline** — `qa/last-run.json` exists (an AI QA run has produced evidence).
7. **defectsClear** — the baseline run has zero open defects.
8. **interactive** — every interactive element has click + keyboard scenarios.
9. **critic** — a completeness pass found no remaining gap.

## How to do each action

**scaffold** — `node scripts/qa-setup.mjs --project <id> --init`. Creates a per-section case skeleton
(layout, type, spacing, assets, content) and the ledger.

**perSectionCases** — if the build added/renamed sections after init, add the missing cases to
`qa/cases.json` (same shape as the scaffolded ones).

**designRefs** — this is what makes *expected = the design, not a guess*. For each section, pull the
matching frame from Figma via the Figma MCP (`get_screenshot` on the section node) and save it to
`projects/<id>/design/<Block>.png` (desktop) and `<Block>-mobile.png` (mobile frame, if one exists).
Block names match `pitforge.json` (e.g. `Hero.png`, `HeroTiles-mobile.png`). The QA pipeline then
compares the build **against these** and stops flagging intentional patterns. If a section genuinely
has no design source, run `--mark noDesign:<Block>` (its cases fall back to UX best-practice judgment).

**scenariosResolved** — open the design ref and the built section side by side (the AI QA pipeline, or
`claude -p <design.png> <built.png>`). For each scenario in `qa/cases.json`: if the build matches the
design, set `status: "pass"`; if not, set `status: "fail"` and add a `defect` note describing the delta
(current vs expected-from-design). Where the design doesn't answer, apply UI/UX best practice and write
a `recommendation` note instead of failing. Never leave `todo`.

**ranBaseline** — with the dev server up: `node scripts/qa-run.mjs --project <id> --full`. This writes
`qa/last-run.json` (per-section × breakpoint verdicts, defects, recommendations) — the loop reads it.

**defectsClear** — fix each defect in `qa/last-run.json` (fluid/reflow fixes, never fixed-px patches —
see `pitforge-responsive-fluid`), then re-run `qa-run`. Iterate until defects = 0. Recommendations are
advisory and do **not** block completion; log the ones worth acting on in the case notes.

**interactive** — list every interactive element (accordion, carousel, form, nav menu, link). For each,
add click **and** keyboard scenarios to that section's case `interactive` array, verify them (zero-JS
patterns must work without script), then `--mark interactive`.

**critic** — final pass: ask "what modality / breakpoint / state is NOT yet covered?" (hover, focus,
empty/long content, RTL if relevant, the undesigned widths 768–1440). Add any gap as a scenario and
resolve it. When a pass finds nothing new, `--mark critic`.

## Done

When `--status` returns `complete: true`, the project's `qa/` holds design-sourced cases, references,
a clean baseline, interactive coverage, and a critic sign-off. Report the final `coverage` (9/9) and a
one-line summary of what was set up. From here, `pitforge-qa` (the ▶ Run gate) keeps it green on every
future edit — the marketer just edits and ships.
