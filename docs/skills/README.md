# PitForge skills

These are the operational **Agent Skills** that make the AI reliable — the same behaviour on every
clone. They are the source of truth; Claude Code loads them through `.claude/skills`, which is a
**symlink to this folder** (`.claude/skills → ../docs/skills`). Edit them here.

| Skill | When it runs | What it does |
|---|---|---|
| [`figma-to-pitforge`](figma-to-pitforge/SKILL.md) | a Figma URL / "build this site" | Figma → a faithful, responsive, zero-JS PitForge project in `./projects/<slug>/`. |
| [`pitforge-responsive-fluid`](pitforge-responsive-fluid/SKILL.md) | before writing any CSS | the `--u` proportional unit + fluid `clamp()` fonts; the responsive gate 320→3200. |
| [`pitforge-seo`](pitforge-seo/SKILL.md) | building / before export | one `<h1>`, heading order, canonical/slug, meta, JSON-LD, favicon — the export checks. |
| [`pitforge-accessibility`](pitforge-accessibility/SKILL.md) | building blocks | semantic HTML, alt text, zero-JS accordions/carousels, focus & contrast. |
| [`pitforge-edit`](pitforge-edit/SKILL.md) | editing an existing site | safe content/style/tag/i18n edits without breaking structure or the design system. |
| [`pitforge-qa-setup`](pitforge-qa-setup/SKILL.md) | **right after a build** | the iterative loop that makes a project's testing **self-sufficient** (per-project cases, design refs, baseline, interactive, critic) — stops only when a coverage checklist is fully green. |
| [`pitforge-qa`](pitforge-qa/SKILL.md) | before "done" / publish / export | the QA gate — full visual + end-to-end pass against the catalog, every breakpoint. |
| [`pitforge-export-deploy`](pitforge-export-deploy/SKILL.md) | shipping | export shapes (Cloudflare Pages vs Worker), path prefixing, deploy. |

The loop across them: **build (`figma-to-pitforge` + fluid/seo/a11y) → set up testing
(`pitforge-qa-setup`) → gate (`pitforge-qa`) → ship (`pitforge-export-deploy`)**. `../../CLAUDE.md`
ties them together and applies them automatically whenever Figma work starts.
