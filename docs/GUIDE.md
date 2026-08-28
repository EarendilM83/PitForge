# PitForge — the complete guide

PitForge turns **Figma designs into fast, SEO-clean landing pages** and lets you edit the content
yourself — **no code**. This guide walks the whole loop. (There's also a one-minute interactive
version: open the Studio and click **“? How it works”** on the Sites screen.)

---

## The mental model — two tools, one loop

| Tool | What it's for |
|---|---|
| **Claude Code** (an AI coding assistant) | Builds a site from your Figma file — reads the design, writes the page. You do this **once per site**. |
| **PitForge Studio** (this app, in your browser) | Where you **edit content, set SEO, preview, export, and publish** — visually. |

The loop: **Figma → build with Claude → edit in the Studio → publish.**

---

## Prerequisites (one-time setup)

1. **Node.js 20+** — [nodejs.org](https://nodejs.org).
2. **Claude Code** — Anthropic's AI coding tool ([docs](https://docs.claude.com/claude-code)).
3. **Figma desktop app** with the design bridge on:
   *Figma → Preferences → Enable Dev Mode MCP Server.* PitForge is already configured to talk to it
   (see `.mcp.json`) — you don't set anything up.
4. *(Optional)* an **Anthropic API key** if you want the in-app AI copy assistant (improve/shorten/
   translate text). Add it when the Studio prompts you.

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

> Claude follows built-in **skills** (in `.claude/skills/`) so it matches your design exactly, makes
> it work on **every screen size**, and keeps the SEO clean — without you asking.

**Prefer to try it empty first?** *New site → Start blank* gives you a one-section starter.

---

## 2. Edit the content

- **Click any text or image** on the page to edit it in the right-hand panel.
- **Lists** (game cards, FAQs, footer links) let you **add/remove items** — within the min/max the
  designer set.
- **The layout and styling are locked.** You change words and pictures, never the structure. That's
  what keeps every page on-brand. (To change layout/colours, edit the Figma and re-convert.)
- **AI copy assistant:** with a text element selected, use *Improve / Shorten / Punchier / Translate*
  to rework the wording.

---

## 3. Set the SEO

Open the **Page** tab (top-left of the editor):

- **Title** (~50–60 chars) and **meta description** (50–155 chars).
- Live **SEO checks** — green means good. PitForge **won't let you export with a real SEO problem**
  (e.g. a missing H1, an affiliate link without `rel="nofollow sponsored"`).
- Structured data, canonical URL, and the sitemap are handled for you at export.

---

## 4. Preview, export, deploy

- **Preview** opens your live page in a new tab (always up to date).
- **Export** downloads a **deploy-ready** static site: plain, fast HTML with **zero JavaScript**,
  optimized images (AVIF/WebP), and all the SEO files.
- Enter your **domain** when exporting:
  - a **root or sub-domain** (`https://promo.example.com`) → a Cloudflare **Pages** bundle;
  - a **sub-path** (`https://example.com/best-deal`) → a Cloudflare **Worker** bundle (paths are
    prefixed automatically).
- The export is verified to work on **every screen size** — phone, tablet, laptop, desktop.

Deploy the bundle to any static host (Cloudflare Pages, Netlify, Vercel, S3, nginx…). Upload the
folder's contents; `index.html` is at the top.

---

## Good to know

- **It works on every screen, not just two.** Designers usually draw only desktop (~1920) and mobile
  (~490). PitForge's fluid system fills in everything between, and a built-in gate proves it:
  `npm run verify -- --project <id>` renders 320→2200px and fails on any break.
- **Projects are folders** in `./projects/`. Each site is self-contained — copy or back it up freely.
- **Nothing leaves your machine** unless you deploy it. The Studio runs locally.
- **Reopen the tour** any time from **“? How it works”** on the Sites screen.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| "Claude doesn't have the `figma-to-pitforge` skill" | You're in the wrong folder — run Claude Code **from the PitForge repo** (the skills live in `.claude/skills/`). |
| Claude can't read the Figma | Enable *Dev Mode MCP Server* in the Figma **desktop** app, and keep that file open. |
| New site doesn't appear | Restart `npm run dev` (new blocks are picked up on boot). |
| Export blocked | An SEO check failed — open the **Page** tab and fix the red item. |
| Edited but the published page looks old | A published/exported page is a snapshot — **re-export** to update it. |
