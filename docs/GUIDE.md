# PitForge — the complete guide

PitForge turns **Figma designs into fast, SEO-clean landing pages** and lets you edit them yourself —
**no code**. This guide walks the whole loop. (There's also a one-minute interactive version: open
the Studio and click **“? How it works”** on the Sites screen.)

---

## The mental model — two tools, one loop

| Tool | What it's for |
|---|---|
| **Claude Code** (an AI coding assistant) | Builds a site from your Figma file — reads the design, writes the page. You do this **once per site**. |
| **PitForge Studio** (this app, in your browser) | Where you **edit content, style within limits, translate, set SEO, test, preview, export, and publish** — visually. |

The loop: **Figma → build with Claude → edit in the Studio → test → publish.**

---

## Prerequisites (one-time setup)

1. **Node.js 20+** — [nodejs.org](https://nodejs.org).
2. **Claude Code** — Anthropic's AI coding tool ([docs](https://docs.claude.com/claude-code)).
3. **Figma desktop app** with the design bridge on:
   *Figma → Preferences → Enable Dev Mode MCP Server.* PitForge is already configured to talk to it
   (see `.mcp.json`) — you don't set anything up.

Then:

```sh
git clone <this-repo>
cd pitforge
npm install
npm run dev        # opens the Studio at http://localhost:4321
```

---

## 1. Create a site from Figma

1. In the Studio, click **+ New site → From Figma**.
2. Paste your **Figma file link** (in Figma: *Share → Copy link*) and name the site.
3. Copy the generated instruction and paste it into **Claude Code**.
4. Claude reads the design and builds the project. When it finishes, the site **appears in your Sites
   list automatically** — open it and start editing.

> Claude follows built-in **skills** (in [`docs/skills/`](skills/)) so it matches your design exactly, keeps
> it **fluid at every width**, and keeps the SEO clean — without you asking.

**Prefer to try it empty first?** *New site → Start blank* gives you a one-section starter.

---

## 2. The editor at a glance

A dark, three-column builder:

- **Left — Layers.** The page's structure as collapsible sections; click any element to select it.
- **Centre — canvas.** Click on the page to select and edit. Hover to highlight.
- **Right — Settings.** Three tabs for the selected element: **Style · Content · Settings**.
- **Top bar.** Language switcher · device switcher (Desktop/Tablet/Mobile) · Marketer/Builder mode ·
  undo/redo · **🐦 Guide** (Zippy walks you through the editor any time) · **🔬 Test & QA** ·
  Preview · Export · Publish.

---

## 3. Edit the content

- **Click any text or image** on the canvas → the **Content** tab lets you edit it.
- **Lists** (game cards, FAQs, footer links) let you **add/remove items** — within the min/max the
  designer set.
- **Structure is locked.** You can't add or remove sections (those come from Figma); you change what's
  inside them. To change the layout itself, edit the Figma and re-convert.

---

## 4. Change what an element *is* (semantic tags)

On the **Settings** tab, "What kind of element is this?" lets you change an element's meaning in plain
language — **Main title, Section heading, Sub-heading, Paragraph, …** — constrained to sensible
choices. This changes the HTML tag (e.g. `h1`→`h2`) for search engines and screen readers **without
changing how it looks** (styling rides the element's class, never its tag). A live search-engine
check flags problems like a missing or duplicate main title.

---

## 5. Style within limits (Marketer vs Builder)

The **Style** tab gives safe, on-brand controls: **alignment, weight, spacing, opacity, and per-device
visibility**, chosen from a fixed scale — no raw colours or arbitrary pixel values, so a page can't go
off-brand or break its responsiveness. Every change shows a **● overridden** dot and a **↺ Reset to
design**.

Flip **🔒 Marketer → 🔧 Builder** in the top bar to **unlock free-form** editing (raw size/colour) for
power users. Everything else stays the same.

---

## 6. Translate the page (i18n)

**English is the source** (your first build). To add another language:

1. Open the **language switcher** in the top bar → **＋ Add language…** → enter a code (`de`, `es`, …).
2. With that language active, edit any text field — you're now entering the **translation for that key**.
   The English source shows as the placeholder.
3. **Untranslated keys fall back to English.** Editing a translation **never changes the source**.

Switch back to **English · source** any time; the original is untouched.

---

## 7. Check it on real devices

The top-bar device switcher:

- **Desktop** — the editable canvas.
- **Tablet / Mobile** — render the **exact published output** in a real iframe at that width, with
  correct media queries. What you see is **byte-identical to what ships** — the mobile layout stacks
  like the real site, not a desktop layout squeezed into a narrow box.

---

## 8. Set the SEO

- The selected element's **Settings** tab shows a live **search-engine check** (one main title,
  heading order, etc.).
- Page-level SEO (title, meta description) lives in the **Page settings** — green means good.
- PitForge **won't let you export with a real SEO problem**. Structured data, canonical URL and the
  sitemap are handled for you at export.

---

## 9. Test & scan (prove it works everywhere)

One button — **🔬 Test & QA** — opens the testing surface with two tabs:

**⚡ Quick scan.** A **live thumbnail per breakpoint**, 320→3200. **Hover** to auto-scroll the whole
page; **⤢ Zoom** to inspect at real size; **☰ Test case** to open its checklist. The client scan flags
overflow / over-wide / broken-image / empty-section issues (offenders outlined in the thumbnail);
**▶ Run with Playwright** runs the authoritative suite and streams it live. This is the fast "did I
break it" glance.

**🔬 AI QA — the QA simulation.** Click **▶ Run AI QA** and watch it work. It finds **every section**
(Header, Hero, …, Footer) and tests each at **every breakpoint** — a section × breakpoint matrix. Each
cell **measures** the section (overflow, height, images, text), **screenshots it**, and has your
**local Claude review the shot** like a QA engineer. Every check shows **Expected · Current · Delta**
(delta 0 to pass) — click a cell for its metrics, evidence and verdict. A **Page-wide** card adds
semantics/SEO, zero-JS, fonts and fluid scaling. It takes real time and saves **evidence screenshots**.
Deltas that aren't 0 point at exactly what to fix.

**Expected comes from the design, not a guess.** If a Figma reference exists for a section
(`projects/<id>/design/<Block>.png`), Claude reviews the build **against the design** — so an
intentional pattern (a carousel's peeking next card, a decorative image bleed) is **not** flagged as
a bug. When the design doesn't answer a question, Claude uses UI/UX best practice and gives an
**advisory recommendation** (💡) instead of a hard failure. Verdicts are **OK · 💡 Recommendation ·
Defect** — only defects fail.

**You don't set any of this up — the build does.** When Claude builds a site it also stands up that
site's **test environment**: per-project test cases and scenarios drawn from the design, Figma design
references for each section, a clean baseline run, and interactive coverage. This runs as a loop that
only stops when the project can fully test itself, so a marketer never authors a test. (Under the hood:
the `pitforge-qa-setup` skill + `node scripts/qa-setup.mjs --project <id> --status`, which reports a
coverage checklist and the single next action until `complete`.)

**The test-case library** (`tests/cases.json`) is editable in the Quick-scan tab — tick/edit a check,
add a check, or add a whole case; it saves to the file (tracked in git). The full deterministic
catalog is `tests/qa-catalog.md`.

Headless (dev server up):

```sh
npm run test:ui      # routes · screens · layout 320→3200 · SEO/a11y · assets/perf ·
                     # fluid · every editor interaction · editor↔preview parity
npm run gate         # typecheck + test:ui  (gate publish/export in CI)
npm run qa:run <id> -- --full     # the AI QA pipeline, headless
npm run qa:setup <id>             # the self-sufficiency loop: coverage + next action
```

---

## 10. Preview, export, deploy

- **Preview** opens your live page in a new tab (always up to date).
- **Export** downloads a **deploy-ready** static site: plain, fast HTML with **zero JavaScript**,
  optimized images (AVIF/WebP), the bounded-style utilities, and all the SEO files.
- Enter your **domain** when exporting:
  - a **root or sub-domain** (`https://promo.example.com`) → a Cloudflare **Pages** bundle;
  - a **sub-path** (`https://example.com/best-deal`) → a Cloudflare **Worker** bundle (paths prefixed).
- The export is verified to work on **every screen size** — phone, tablet, laptop, desktop, ultrawide.

Deploy the bundle to any static host (Cloudflare Pages, Netlify, Vercel, S3, nginx…). Upload the
folder's contents; `index.html` is at the top.

---

## Good to know

- **Fully fluid, every screen.** Designers usually draw only desktop (~1920) and mobile (~490).
  PitForge's fluid system fills everything between, and the suite proves it across 320→3200.
- **Projects are folders** in `./projects/`. Each site is self-contained — copy or back it up freely.
  Your own sites stay local; only the neutral `demo` is committed to the repo.
- **Nothing leaves your machine** unless you deploy it. The Studio runs locally.
- **Reopen the tour** any time from **“? How it works”** on the Sites screen.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| "Claude doesn't have the `figma-to-pitforge` skill" | You're in the wrong folder — run Claude Code **from the PitForge repo** (the skills live in `.claude/skills/`). |
| Claude can't read the Figma | Enable *Dev Mode MCP Server* in the Figma **desktop** app, and keep that file open. |
| New site doesn't appear | Restart `npm run dev` (new blocks are picked up on boot). |
| Mobile in the editor looks like squished desktop | Make sure you're on a real device tab (Tablet/Mobile) — it renders the true published output. |
| A translation didn't stick | Check the language switcher shows the right language; editing in **English · source** edits the original, not a translation. |
| Export blocked | An SEO check failed — open **Page settings** and fix the red item. |
| Edited but the published page looks old | A published/exported page is a snapshot — **re-export** to update it. |
