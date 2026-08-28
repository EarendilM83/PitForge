# Connecting Claude Code to PitForge

This is how you let **Claude Code** make real edits to a PitForge site — copy, images, colours,
layout, exports — safely. Claude edits **projects only**; it can't touch PitForge itself, and it
never deploys.

## The model in one line

> Claude owns the **middle** (edit a project → pass the gates → produce an export bundle).
> The **owner** owns both ends: **PitForge engine changes** and **deploy**.

- **Claude's sandbox:** `./projects/<slug>/**` — the actual site (blocks, CSS, tokens, content, assets).
- **Off-limits to Claude:** `src/**`, `scripts/**`, `.claude/**`, root config — enforced by the
  permission fence in `.claude/settings.json` (committed, so every teammate inherits it).
- **Deploy is human:** Claude hands over a `.zip`. The owner uploads it to the GitLab repo that
  auto-deploys to Cloudflare Pages. Claude has no credentials and no `git push` / `wrangler` / `glab`.

---

## Tier 1 — Developer / owner setup (once per machine)

1. **Clone + install**
   ```
   git clone <pitforge-repo>
   cd PitForge
   npm install
   ```
2. **Install Claude Code** and sign in with the Claude subscription:
   ```
   npm i -g @anthropic-ai/claude-code
   claude   # sign in on first run
   ```
3. **The fence is already in the repo** — `.claude/settings.json` denies writes to the engine and
   any deploy command, and allows edits under `projects/**` plus the verify/export/typecheck/dev
   scripts. Nothing to configure; just keep it committed.
4. **Smoke test the boundary** (do this before trusting it):
   - Ask Claude: *"In the dogecoin-casino site, change the hero eyebrow to INSTANT PAYOUTS."*
     → it should edit `projects/dogecoin-casino/content/default.json` and pass verify.
   - Ask Claude: *"Edit src/runtime/components.tsx."*
     → it should be **blocked by the fence** and refuse. If it isn't, stop and fix the fence.
5. Optional — add a one-liner so marketers start everything at once. In `package.json` **you** can
   add a script (Claude can't edit package.json), e.g. `"studio": "vite"`, or just document
   `npm run dev`.

## Tier 2 — Marketer / daily use

1. **Start PitForge**
   ```
   npm run dev
   ```
   Open the Studio; keep the site's live `/preview/:id` tab open.
2. **Open Claude Code in the repo folder**
   ```
   claude
   ```
3. **Say what you want, name the site.** Plain language:
   - *"On the dogecoin site, make the headline bigger and change the CTA to 'Play now'."*
   - *"Swap the hero image on drops-wins for assets/new-hero.png and add a fourth tile."*
4. **Watch it land live** in `/preview/:id` (edits hot-reload). Claude runs the responsive + SEO
   gates itself and won't call it done until they're green.
5. **Get the export.** When you're happy, Claude runs the export and hands you a `.zip` path
   (SEO checks must pass or the export refuses).
6. **You deploy.** Upload the exported bundle to the GitLab repo folder → the pipeline ships it to
   Cloudflare Pages. This step is always yours.

---

## What Claude will and won't do

| Claude does | Claude refuses (owner-only) |
|---|---|
| Edit copy, images, repeat items in `content/default.json` | Change PitForge runtime/studio/server (`src/**`) |
| Edit block CSS / `tokens.css` for colours, sizing, layout | Add a new field *type* or fix an export/engine bug |
| Edit block `.tsx` structure, promote text to editable fields | Edit build config, scripts, or the skills |
| Run `verify`, `typecheck`, `export` | `git push`, `wrangler`, `glab`, or any deploy |
| Hand you a deployable `.zip` + a summary | Upload / deploy the bundle |

If a request truly needs an engine change, Claude will tell you instead of hacking around it inside
a project — that's the signal it's back on the owner's desk.
