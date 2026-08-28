# PitForge

**Turn Figma designs into fast, SEO-clean landing pages — and edit them yourself, no code.**

PitForge is a locally-run CMS Studio. An AI coding assistant (Claude Code) builds a site from your
Figma file; you edit the words, images, and SEO visually in the Studio, then export a deploy-ready
static site that works on **every screen size**.

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
   bundled skills so it matches the design and works on every screen.
3. **Edit** — click any text/image in the Studio; set SEO on the Page tab.
4. **Ship** — Preview, then Export a deploy-ready static site (Cloudflare Pages or Worker).

---

## Why it's different

- **No code for the operator.** The whole edit → SEO → publish flow is visual.
- **Faithful to the design.** Bundled Claude skills (`.claude/skills/`) enforce a pixel-faithful,
  proportional build — no AI guesswork.
- **Works on every screen, not just two.** Designers draw ~1920 and ~490; PitForge's fluid system
  fills the gaps, and a gate proves it: `npm run verify -- --project <id>` (renders 320→2200px).
- **SEO-first.** 16 checks gate every export; canonical, structured data, sitemap handled for you.
- **Zero-JavaScript output.** Clean, fast, semantic HTML that loads instantly and ranks well.

---

## The skills (what makes the AI reliable)

`.claude/skills/` ships with the repo, so Claude behaves the same on every clone:

| Skill | Role |
|---|---|
| `figma-to-pitforge` | Figma → a faithful, responsive PitForge project |
| `pitforge-responsive-fluid` | the fluid system; the responsive gate |
| `pitforge-seo` | headings, canonical, structured data, the checks |
| `pitforge-accessibility` | semantic HTML, zero-JS accordions, focus/contrast |
| `pitforge-export-deploy` | Pages vs Worker export, sub-path deploys |

`CLAUDE.md` ties them together and applies them automatically whenever Figma work starts.

---

## For developers

- **Projects are folders** in `./projects/` (no database): `pitforge.json` (config + block order),
  `manifest.json` (field types, zod-validated), `content/default.json`, `tokens.css`, `blocks/*.tsx`,
  `assets/`. The shipped `demo` project exercises every field type.
- **Blocks are React components** rendered twice by the same tree — interactive in the Studio,
  static at export (`renderToStaticMarkup`) → zero-JS HTML.
- **The Studio** uses the Atlassian Design System (token-driven, in `src/studio/studio.css`).

```sh
npm run dev                                   # Studio
npm run verify -- --project <id>              # responsive gate (320→2200px)
npm run export -- --project <id> --domain https://example.com   # headless ZIP export
npm run typecheck
```

See [`docs/GUIDE.md`](docs/GUIDE.md) for the full walkthrough, `CLAUDE.md` for how the AI is guided,
and `STATUS.md` / `DECISIONS.md` for build state and design choices.

## License

[MIT](LICENSE).
