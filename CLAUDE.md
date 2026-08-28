# PitForge — working in this repo

PitForge is a locally-run, SEO-first CMS Studio for one-page landing sites. You (Claude) are the
build engine: you turn a **Figma design into a PitForge project** via the Figma MCP; the marketer
then edits, publishes, and deploys from the Studio UI. Your job is to make that conversion
pixel-faithful, responsive, SEO-clean, and zero-JS — in one disciplined pass.

## Working principles (how to approach every change — always on)

Inspired by Andrej Karpathy's notes on where LLM coding goes wrong, rewritten for the
Figma → PitForge workflow:

- **Think before coding.** Don't assume a Figma value — pull it from `get_design_context`. If two
  readings are possible (a hard border vs a soft glow), say which you chose and why. If something is
  unclear, stop and name it instead of guessing.
- **Simplicity first.** Build only what the design shows. No speculative sections, fields, or
  "flexibility" nobody asked for. If a block is 200 lines and could be 50, rewrite it.
- **Surgical changes.** Every changed line traces to a Figma node or an explicit instruction. Don't
  "improve" adjacent blocks, refactor working code, or restyle what wasn't flagged.
- **Goal-driven execution.** Define "done" as a check you can actually run — "matches the node at 320
  and 1920", "SEO checks pass", "no horizontal overflow" — then loop until it's true. Never declare
  done on a glance.

## The skills — load them, don't wing it

This repo ships a skill set in `.claude/skills/`. **When any Figma MCP conversion or block work
starts, load and apply these — all of them, as one job:**

- **`figma-to-pitforge`** — the flagship. Figma → a new `./projects/<slug>/` project. Read it first.
- **`pitforge-responsive-fluid`** — the `--u` proportional unit + fluid `clamp()` fonts. Read before writing CSS.
- **`pitforge-seo`** — one `<h1>`, heading order, canonical/slug, meta, JSON-LD, favicon, the export checks.
- **`pitforge-accessibility`** — semantic HTML, alt text, zero-JS accordions/carousels, focus/contrast.
- **`pitforge-export-deploy`** — export shapes (Cloudflare Pages vs Worker), path prefixing, git deploy.

Rule of thumb: **a Figma URL in the prompt = load `figma-to-pitforge` before doing anything.** The
Studio's "New site → From Figma" dialog generates a prompt that names this skill by design.

## The workflow (linear, don't skip steps)

1. **Map** the Figma via MCP (`get_metadata`, `get_variable_defs`, `get_design_context` per section).
2. **Scaffold** `./projects/<slug>/` — `pitforge.json`, `manifest.json`, `content/default.json`,
   `tokens.css`, one `blocks/<Name>.tsx`+`.css` per design section, `assets/`.
3. **Build** each block with the PF runtime components (`PFText`, `PFHeading`, `PFImage`, `PFRepeat`, …)
   bound to manifest fields — never hardcode copy or image paths.
4. **Verify** — the build is not done until it passes both gates:
   - `npm run verify -- --project <slug>` — the responsive gate (renders 320→2200px, fails on any
     real break). Designers give only ~1920 + ~490; this proves the **undesigned** widths (768, 1024,
     1280, 1440) ship unbroken. Fix failures with fluid/reflow rules — never fixed-px patches.
   - The SEO checks (`pitforge-seo`) — any `fail` blocks export.
   Then screenshot a few widths side-by-side with the Figma to confirm fidelity.
5. Restart the dev server so `import.meta.glob` picks up new blocks → the site appears in the Studio.
6. The marketer edits content in the Studio; **export & deploy** per `pitforge-export-deploy`.

## Hard constraints (respect these)

- **Structure is locked; content is editable.** Marketers can change any text/image and add/remove
  repeat items within a field's `min`/`max` — but they cannot add or remove sections. So: put
  everything the design shows as fields; never add speculative sections or fields.
- **Zero-JS output.** Blocks render twice by the same tree (interactive in the Studio, static at
  export). Interactivity must be pure HTML/CSS (see the accordion/carousel patterns).
- **One block = one design section.** Never merge or invent sections.
- **Projects are folders**, no database. Everything about a site lives in `./projects/<slug>/`.

## Fast facts (details live in the skills)

- `box-sizing: border-box` reset in `tokens.css` is mandatory (else `width:100%`+padding overflows).
- `PFRepeat` wraps each item in an anonymous `<div>` — style/`order` the wrapper (`.grid > *`), not the inner class.
- Fonts use `clamp(min, calc(N*100vw/1920), N)` — `--u` freezes below 1366, so `calc(N*var(--u))` fonts don't shrink on phones.
- A published/exported bundle is frozen — re-export to update it; `/preview/:id` is always live.

## House style

- Match the surrounding block's conventions (naming, `--u` usage, comment density).
- Surgical changes: every changed line traces to a Figma node or an explicit instruction. Don't
  "improve" adjacent code or invent values from a screenshot — pull the spec from `get_design_context`.
- Verify visually before declaring done; state honestly what's approximated (a licensed font, a
  composited asset) rather than letting the user find it.
