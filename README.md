# PitForge

**Turn Figma designs into fast, SEO-clean landing pages — and edit them yourself, no code.**

PitForge is a locally-run CMS Studio. An AI coding assistant (Claude Code) builds a site from your
Figma file; you edit the words, images, styling-within-limits, and translations visually in a
design-tool-grade editor, then export a deploy-ready static site that works on **every screen from
320px to 3200px**.

> New here? After `npm run dev`, open the Studio and click **“? How it works”** for a one-minute
> interactive tour — or read the full [**Guide**](docs/GUIDE.md).

---

## Quickstart

**You'll need:** Node.js 20+, [Claude Code](https://docs.claude.com/claude-code), and the Figma
desktop app with *Preferences → Enable Dev Mode MCP Server* turned on.

```sh
git clone <this-repo>
cd pitforge
npm install
npm run dev            # Studio at http://localhost:4321
```

Then, in the Studio: **+ New site → From Figma → paste your Figma link → copy the instruction into
Claude Code.** Claude builds the site and it appears in your Sites list. Open it, edit, and publish.

---

## The loop

1. **Design** in Figma (desktop + mobile frames).
2. **Build** — paste your Figma link; Claude Code converts it into a PitForge project, guided by the
   bundled skills so it matches the design and stays fluid at every width.
3. **Edit** — in the pro editor: content, safe styling, semantic tags, translations, SEO.
4. **Test** — the live **Test & scan** dashboard proves the site holds up 320→3200 and passes an
   end-to-end suite; run it in CI with `npm run test:ui`.
5. **Ship** — Preview, then Export a deploy-ready static site (Cloudflare Pages or Worker).

---

## The pro editor — what you can do

A dark, three-column builder: **Layers · canvas · Settings**, with a top bar for devices, language,
undo/redo, and publish.

- **Content** — click any text or image on the canvas to edit it inline.
- **Semantic tags** — change what an element *means* (Main title → Section heading, etc.) in plain
  language. The look never changes; only the HTML meaning does (great for SEO/accessibility).
- **Bounded style** — **Marketer mode** offers safe, on-brand controls (alignment, weight, spacing,
  opacity, per-device visibility) from a fixed scale — no raw hex or arbitrary px. **Builder mode**
  unlocks free-form editing. Every override has a one-click **Reset to design**.
- **Translations (i18n)** — English is the source; add a language and translate **per key**.
  Untranslated keys fall back to English. Editing a translation never touches the source.
- **Device = publish** — **Desktop** is the editable canvas; **Tablet/Mobile** render the *exact*
  published output in a real iframe at that width, so what you see is byte-identical to what ships
  (correct media queries — no desktop-squished preview).
- **Structure is locked.** You can't add/remove sections (those come from Figma); you can add/remove
  repeat items within the min/max a designer set.

---

## Test & scan — proof it works everywhere

One button — **🔬 Test & QA** — opens both, as tabs:

**⚡ Quick scan** — the fast dashboard: a **live thumbnail per breakpoint** (320→3200; hover to
auto-scroll, **⤢ Zoom** to real size, **☰ Test case** for its checklist), a **client scan** that
outlines overflow / over-wide / broken-image / empty-section offenders in the thumbnail, and **▶ Run
with Playwright** to stream the authoritative end-to-end suite live.

**🔬 AI QA** — the **AI QA pipeline**, a senior-QA simulation you watch run. It discovers every
**section** (Header, Hero, …, Footer) and tests each one at **every breakpoint** — a section ×
breakpoint matrix. For each cell it **measures** (overflow, height, images, text), **screenshots that
section**, and has your **local Claude review the screenshot**. Every check reports
**Expected · Current · Delta** (delta 0 to pass); click any cell for its metrics + evidence + verdict.

**Expected = the design source + UX judgment.** If a Figma reference exists for a section
(`projects/<id>/design/<Block>.png`), Claude compares the build **against the design** — so an
intentional pattern (a carousel's peeking card, a decorative bleed) is **not** flagged as a bug. When
the design doesn't answer, Claude falls back to UI/UX best practice and writes an **advisory
recommendation** ("the design doesn't specify this, but the button's padding looks tight — consider…")
rather than a hard failure. Verdicts are **OK · 💡 Recommendation · Defect**; only defects fail.
A **Page-wide** card adds semantics/SEO, zero-JS, fonts and fluid scaling. It takes real time and
produces evidence — screenshots land in `tests/.qa-evidence/`.

**Self-sufficient per project — set up by the build, not the marketer.** When Claude builds a site it
runs the [`pitforge-qa-setup`](docs/skills/pitforge-qa-setup) **loop** (`node scripts/qa-setup.mjs
--project <id> --status`): it discovers every section, writes per-project test cases/scenarios from the
design, captures Figma design references, runs the AI QA baseline, triages defects, covers interactive
elements, and ends with a completeness critic. It's iterative and resumable — it stops only when an
objective coverage checklist is fully green, so the project can test itself.

**Editable test-case library** in [`tests/cases.json`](tests/cases.json) + the full deterministic
catalog in [`tests/qa-catalog.md`](tests/qa-catalog.md) (13 suites, ~90 checks). Edit a checklist or
add a case in the Quick-scan tab; it saves to the file (git-diffable) so the next run — and any agent —
inherits it. The [`pitforge-qa`](docs/skills/pitforge-qa) skill and [`AGENTS.md`](AGENTS.md) force
any model (Claude, Codex, …) to run the catalog before "done". Compatible with
[qa-skills](https://github.com/petrkindlmann/qa-skills) (`npx skills add petrkindlmann/qa-skills`).

Run the whole thing headlessly (dev server must be up):

```sh
npm run test:ui        # routes · screens · layout 320→3200 · SEO/a11y · assets/perf ·
                       # fluid type & spacing · every editor interaction · editor↔preview parity
npm run test:sites     # sites only     npm run test:editor  # editor only
npm run gate           # typecheck + test:ui  (use to gate publish/export in CI)
```

---

## Why it's different

- **No code for the operator.** Edit → style-safely → translate → SEO → publish, all visual.
- **Faithful to the design.** Bundled Claude skills ([`docs/skills/`](docs/skills/)) enforce a
  pixel-faithful, proportional build. Style edits are bounded to the design system.
- **Fully fluid — every screen, not just two.** Designers draw ~1920 and ~490; PitForge's fluid `--u`
  unit + `clamp()` type fill the gaps, and the suite proves it across the full 320→3200 ladder.
- **SEO-first.** Heading/canonical/structured-data checks gate every export.
- **Zero-JavaScript output.** Clean, fast, semantic HTML that loads instantly and ranks well.

---

## The skills (what makes the AI reliable)

[`docs/skills/`](docs/skills/) ships with the repo (Claude loads them via the `.claude/skills`
symlink), so Claude behaves the same on every clone:

| Skill | Role |
|---|---|
| `figma-to-pitforge` | Figma → a faithful, responsive PitForge project |
| `pitforge-qa-setup` | after a build, the loop that makes a project's testing self-sufficient |
| `pitforge-responsive-fluid` | the fluid system; the responsive gate |
| `pitforge-seo` | headings, canonical, structured data, the checks |
| `pitforge-accessibility` | semantic HTML, zero-JS accordions, focus/contrast |
| `pitforge-export-deploy` | Pages vs Worker export, sub-path deploys |

`CLAUDE.md` ties them together and applies them automatically whenever Figma work starts.

---

## For developers

- **Projects are folders** in `./projects/` (no database): `pitforge.json` (config + block order),
  `manifest.json` (field types, zod-validated), `content/default.json`, `tokens.css`, `blocks/*.tsx`,
  `assets/`. The shipped `demo` project exercises every field type. (Your own sites stay local — only
  the demo is committed.)
- **Content overrides** ride the same `content` file: `_tags` (semantic tag), `_style`/`_vis`
  (bounded style + visibility), `_t`/`_langs` (translations) — so publish, undo/redo and the export
  bundle all honor them, and styling never depends on the HTML tag.
- **Blocks are React components** rendered twice by the same tree — interactive in the Studio, static
  at export (`renderToStaticMarkup`) → zero-JS HTML.
- **The Studio** uses a dark pro theme scoped over the Atlassian token system (`src/studio/studio.css`).

```sh
npm run dev                                   # Studio at :4321
npm run test:ui                               # full E2E suite (320→3200) — dev server must be up
npm run verify -- --project <id>              # standalone responsive gate
npm run export -- --project <id> --domain https://example.com   # headless ZIP export
npm run typecheck
```

See [`docs/GUIDE.md`](docs/GUIDE.md) for the full walkthrough and `CLAUDE.md` for how the AI is guided.

## License

[MIT](LICENSE).
