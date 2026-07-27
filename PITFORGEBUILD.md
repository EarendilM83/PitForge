# PitForge — Build Specification

**Audience:** an autonomous coding agent. Build this in one pass.
**Outcome:** a locally-run web app. `npm install && npm run dev` opens a Studio at `http://localhost:4321` where a user opens a project, edits the page visually, sets its SEO, and downloads a deploy-ready ZIP of static code.

Read the whole document before writing code. Build in the phase order in §14. Do not ask for clarification on anything specified here — where something genuinely isn't specified, pick the simplest option, note it in `DECISIONS.md`, and keep going.

---

## 0. You are working in an existing repo — survey before you write

This repo already exists. **Do not scaffold over it and do not delete anything before you understand it.** Start here, before Phase 1.

### 0.1 Survey

Run these and read the output:

```bash
git log --oneline -20
git status
ls -la
find . -type f -not -path './node_modules/*' -not -path './.git/*' | head -100
cat package.json 2>/dev/null
cat README.md 2>/dev/null
```

Establish, in this order:

1. **Is it empty?** Only a README, a licence and a `.gitignore` → treat this as a fresh start. Keep those files, then go to Phase 1 and build everything else as specified.
2. **Is there existing code?** Then answer, in writing, before touching anything:
   - What stack is already chosen — package manager, framework, TypeScript or not, module system?
   - Is there an existing build or dev script that works? Run it.
   - Do any concepts in §5 (project format), §6 (runtime) or §10 (SEO) already exist under different names?
   - Is there anything that clearly must not be broken — a working component, a config, a CI workflow?

### 0.2 Reconcile

Write `RECONCILE.md` at the repo root before writing any feature code. Three lists:

- **Keep** — what exists and works, that the spec should adopt rather than replace. Name each file.
- **Adapt** — where the repo's existing naming or structure differs from this spec but means the same thing. **The repo's existing convention wins**; record the mapping (e.g. "spec says `src/runtime/`, repo already uses `src/core/` → use `src/core/`").
- **Conflict** — where the repo and the spec genuinely disagree in substance, not naming. For each: what the repo does, what the spec requires, which you chose, and why.

Three rules for reconciling:

- **The repo's existing stack wins over §3** if it already has working code in it — except for the dual-mode runtime in §6, which is architectural and non-negotiable. If the repo uses Next.js, Remix, Vite+React or plain React, adapt; all of them can render React to static markup.
- **The repo's naming wins over the spec's naming.** Never rename existing working files to match this document.
- **This spec wins on behaviour.** The field types, SEO field set, checks, export contents and acceptance criteria are requirements, not suggestions, regardless of how the repo is laid out.

If the repo already contains a partial PitForge implementation, treat this document as the target state and work out the diff — build what's missing, fix what's wrong against §15, leave what already passes alone.

### 0.3 Then proceed

Once `RECONCILE.md` is written, commit it and start at the first phase in §14 that isn't already satisfied. Skip phases whose checkpoint already passes; verify rather than assume.

Everywhere below, read paths from §4 as *intent*, not as literal instructions — the structure matters, the exact folder names do not.

---

## 1. What this is

PitForge turns a Figma design into a landing page whose every piece of content is editable by a non-technical person, then exports it as static code.

Three actors, three jobs:

| Actor | Does | Where |
|---|---|---|
| AI agent (Claude Code etc.) | Converts a Figma file into a PitForge project folder | Terminal, using the `figma-to-pitforge` skill |
| Copywriter | Edits text, images, icons, repeated items | Studio → **Edit** tab |
| SEO specialist | Sets title, meta, slug, canonical, robots, schema, link rel | Studio → **SEO** tab |

**You are building the Studio and the export pipeline.** The Figma conversion is done by an agent using a separate skill; your job starts from a project folder that already exists on disk.

### Non-goals — do not build

Hosting · deployment · analytics · rank tracking · keyword research · backlink data · user accounts · authentication · multi-tenancy · a database · cloud storage · collaborative editing · page templates library · A/B testing · a CMS for many sites. There is no server other than the local one. There is no network call to anything except optional font/image fetches during export.

---

## 2. Definition of done

All of these must be true:

1. `npm install` succeeds on a clean clone, Node 20+.
2. `npm run dev` starts the Studio on `http://localhost:4321` and prints the URL.
3. The Studio lists projects found in `./projects/` and opens one.
4. The demo project (§13) renders **pixel-identically** in Edit mode and in the exported HTML.
5. Clicking any text in Edit mode selects it, shows an inspector, and typing changes the page live.
6. Replacing an image writes optimised files to `assets/` and updates the page.
7. Adding and removing an item in a repeater works and respects `min`/`max`.
8. The SEO tab edits every field in §10.1 and shows live SERP + social previews.
9. All checks in §10.5 run and report pass/warn/fail with a named fix.
10. `Download ZIP` produces a ZIP that, when unzipped and served by any static file server, renders the page correctly with **no JavaScript**, no console errors, and no requests to localhost.
11. Edits persist to `content/default.json` and survive a Studio restart.
12. `npm run export -- --project demo --domain https://example.com` produces the same ZIP headlessly.
13. `README.md` documents all commands.

---

## 3. Stack

Fixed. Do not substitute.

- **Node 20+**, **TypeScript** everywhere, ESM.
- **React 18** — for both the Studio UI and the page blocks.
- **Vite 5** — Studio dev server and build.
- **Express 4** — local API on the same port via Vite middleware mode.
- **react-dom/server** `renderToStaticMarkup` — export renders blocks to static HTML.
- **sharp** — image processing.
- **archiver** — ZIP creation.
- **zod** — validate `manifest.json` and `content.json` on load.
- **chokidar** — watch the project folder for external changes.

No CSS framework. No component library. No state library — React context plus `useReducer` is sufficient. No router library; the Studio has three tabs, use local state.

**Why blocks are React:** the same component tree renders twice — interactive in the Studio, static at export. This is the central architectural idea. Do not introduce a second templating system.

---

## 4. Repo layout

```
pitforge/
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ README.md
├─ DECISIONS.md              # you write this as you go
├─ src/
│  ├─ runtime/               # PF components + renderer — shared by studio and export
│  │  ├─ components.tsx      # PFText, PFHeading, PFImage, …
│  │  ├─ context.tsx         # PFProvider: mode, content, manifest, onChange
│  │  ├─ types.ts            # Field, Manifest, Content, Project types + zod schemas
│  │  └─ renderPage.tsx      # composes blocks in order
│  ├─ studio/                # the local web app
│  │  ├─ main.tsx
│  │  ├─ App.tsx             # shell: topbar, tabs, rail
│  │  ├─ ProjectPicker.tsx
│  │  ├─ Canvas.tsx          # renders the page in edit mode + selection
│  │  ├─ Inspector.tsx       # right panel, switches on field type
│  │  ├─ inspectors/         # one file per field type
│  │  ├─ SeoTab.tsx
│  │  ├─ ExportDialog.tsx
│  │  ├─ state.ts            # reducer, undo stack, autosave
│  │  └─ studio.css
│  ├─ server/
│  │  ├─ index.ts            # express app, mounted by vite
│  │  ├─ projects.ts         # list/load/save projects
│  │  ├─ media.ts            # upload + sharp pipeline
│  │  └─ export.ts           # build + checks + zip
│  ├─ seo/
│  │  ├─ fields.ts           # the SEO field set + defaults
│  │  ├─ derive.ts           # derived values and sync state
│  │  ├─ head.ts             # emits <head>
│  │  ├─ schema.ts           # JSON-LD builders, allow-list
│  │  └─ checks.ts           # all checks in §10.5
│  └─ cli/
│     └─ export.ts           # headless export entry
└─ projects/
   └─ demo/                  # the sample project you must ship (§13)
```

---

## 5. Project format

A project is a folder. **The folder is the only source of truth — there is no database.**

```
projects/demo/
├─ pitforge.json        # project config
├─ tokens.css           # design tokens from Figma
├─ blocks/
│  ├─ Hero.tsx          # React component + co-located CSS import
│  ├─ Hero.css
│  ├─ Games.tsx
│  └─ Games.css
├─ content/
│  └─ default.json      # every editable value
├─ manifest.json        # field types, labels, constraints
└─ assets/              # images, icons, fonts
```

### 5.1 `pitforge.json`

```json
{
  "name": "LuckyBet DE",
  "lang": "de-DE",
  "blocks": ["Hero", "Bonus", "Games", "Faq", "Footer"],
  "domain": "",
  "createdBy": "figma-to-pitforge v1"
}
```

`blocks` is the render order. Never infer order from the filesystem.

### 5.2 `content/default.json`

Flat dotted keys. Values are primitives or the shapes below.

```json
{
  "hero.title": "LuckyBet Bonus: 100 % bis 500 €",
  "hero.subtitle": "Auszahlung in unter 24 Stunden geprüft.",
  "hero.banner": { "src": "/assets/hero.avif", "alt": "LuckyBet Startseite" },
  "hero.cta": { "label": "Bonus sichern", "href": "/go/luckybet", "rel": "nofollow sponsored" },
  "games.slides": [
    { "thumb": { "src": "/assets/g1.avif", "alt": "" }, "name": "Book of Ra", "desc": "" }
  ],
  "seo.title": "LuckyBet Bonus 2026: 100 % bis 500 € — Test",
  "seo.description": "…"
}
```

Value shapes:

| Type | Shape |
|---|---|
| text, heading, richtext | `string` |
| image, icon | `{ src, alt, width?, height? }` |
| link, button | `{ label, href, rel?, variant? }` |
| repeat | `array` of objects keyed by the item schema |
| video | `{ url, poster? }` |

### 5.3 `manifest.json`

```json
{
  "version": 1,
  "fields": {
    "hero.title": {
      "type": "heading", "label": "Hero headline", "block": "Hero",
      "level": 1, "maxLength": 70
    },
    "hero.banner": {
      "type": "image", "label": "Hero banner", "block": "Hero",
      "ratio": "8:3", "minWidth": 1440, "altRequired": true
    },
    "hero.cta": {
      "type": "link", "label": "Primary CTA", "block": "Hero",
      "external": true, "defaultRel": "nofollow sponsored"
    },
    "games.slides": {
      "type": "repeat", "label": "Game slides", "block": "Games",
      "min": 2, "max": 8,
      "item": {
        "thumb": { "type": "image", "label": "Thumbnail", "ratio": "1:1", "altRequired": true },
        "name":  { "type": "text",  "label": "Game name", "maxLength": 40 },
        "desc":  { "type": "text",  "label": "Description", "maxLength": 120 }
      }
    },
    "seo.title": {
      "type": "text", "label": "SEO title", "block": "_seo",
      "maxLength": 60, "derivedFrom": "hero.title"
    }
  }
}
```

Validate with zod on load. **On validation failure, show a readable error in the Studio naming the field — never crash.** A field present in `content` but missing from `manifest` renders but is not editable; log a warning. A field in `manifest` but missing from `content` gets a type-appropriate empty value.

---

## 6. The runtime — dual-mode components

`src/runtime/components.tsx`. Every component reads from context and behaves differently by mode.

```tsx
type Mode = 'edit' | 'static';

interface PFContext {
  mode: Mode;
  content: Content;
  manifest: Manifest;
  selected: string | null;
  onSelect(field: string): void;
  onChange(field: string, value: unknown): void;
}
```

### Behaviour by mode

**`static`** — render clean semantic HTML only. No wrappers, no `data-*` attributes, no event handlers, no extra elements. What ships must be indistinguishable from hand-written HTML.

**`edit`** — render the same HTML plus:
- `data-pf-field="<key>"` on the element
- class `pf-editable`, and `pf-selected` when selected
- click handler → `onSelect(field)` (stop propagation so the innermost field wins)
- text fields get `contentEditable` with `onInput` → `onChange` (debounced 150 ms)

Outlines and the pencil affordance are drawn by Studio CSS targeting `.pf-editable`, not by inline styles in the component.

### Components to implement

```tsx
<PFText     field="hero.subtitle" className="…" />
<PFHeading  field="hero.title" level={1} className="…" />
<PFRichText field="body.main" className="…" />        // bold, italic, links only
<PFImage    field="hero.banner" className="…" sizes="…" />
<PFIcon     field="feature.icon" className="…" />      // inline SVG, currentColor
<PFLink     field="hero.cta" className="…" />
<PFButton   field="hero.cta" className="…" variant="primary" />
<PFVideo    field="promo.video" className="…" />
<PFRepeat   field="games.slides" className="…">
  {(item, index) => <article>…</article>}
</PFRepeat>
```

`PFRepeat` passes an item key prefix (`games.slides.0`) so children address `` `${item}.name` ``. In edit mode it renders an add affordance after the last item when `count < max`, and a remove control on each item when `count > min`.

### `PFImage` output

Always emit a `<picture>` with AVIF, WebP and original fallback, `srcset` at 400/800/1200/1600, explicit `width`/`height`, `loading="lazy"` except when `manifest.priority === true`, and `fetchpriority="high"` on the priority image.

### `PFLink` / `PFButton`

If `manifest.external` is true, apply `rel` from content, defaulting to `manifest.defaultRel`. Always add `target="_blank"` and include `noopener` in rel for external links.

---

## 7. Server API

Express, mounted into the Vite dev server. All paths under `/api`. JSON except uploads. No auth.

| Method | Path | Does |
|---|---|---|
| `GET` | `/api/projects` | List folders in `./projects` with name + block count |
| `GET` | `/api/projects/:id` | Return `pitforge.json`, `manifest.json`, `content/default.json`, `tokens.css` as text, and the list of block source paths |
| `PUT` | `/api/projects/:id/content` | Write `content/default.json`. Body is the whole content object. Write atomically (temp file + rename) |
| `POST` | `/api/projects/:id/media` | Multipart upload → §11 pipeline → returns `{ src, width, height }` |
| `GET` | `/api/projects/:id/checks` | Run §10.5, return array of `{ id, level, title, detail, fix }` |
| `POST` | `/api/projects/:id/export` | Body `{ domain }`. Runs §12, streams a ZIP |
| `GET` | `/api/projects/:id/head` | Return the emitted `<head>`, JSON-LD, robots.txt and sitemap.xml as strings, for the Advanced drawer |

Blocks are loaded by Vite as modules (`import.meta.glob` over `projects/*/blocks/*.tsx`), not through the API.

Debounce content saves in the Studio at 800 ms. Show a "Saved"/"Saving…" indicator in the topbar.

---

## 8. Studio UI

Three tabs — **Edit**, **Preview**, **SEO** — plus a Download action. Build it plain and legible; this is a tool, not a marketing site.

### 8.1 Shell

- **Topbar:** project name · save indicator · tabs · `Undo` · `Download ZIP`.
- **Left rail (Edit tab only):** icon buttons — Content, Media, Outline. Outline lists all blocks and fields as a tree; clicking selects the field and scrolls to it.
- **Canvas:** the rendered page, centred, on a light grey background, at 100% width up to the design width. A width switcher (360 / 768 / 1280 / full) that changes the canvas width only.
- **Right inspector:** context for the selected field. Empty state: "Select anything on the page to edit it."

### 8.2 Edit mode interaction

- Every editable element shows a **persistent dashed outline** — not hover-only. A toggle in the rail hides outlines to view the page clean.
- Hover: outline solidifies, pencil badge appears top-right of the element.
- Click: selects; inspector opens; element gets a solid accent outline.
- Text and heading fields are edited **in place** via `contentEditable`; the inspector mirrors the value and adds length meter, limits, and type-specific extras.
- `Esc` deselects. `Cmd/Ctrl+Z` undoes. Undo stack: 50 content snapshots, in memory.
- Layout, colour, spacing and typography are **not editable anywhere**. The inspector shows a line stating they come from the design.

### 8.3 Preview tab

Renders the page in `static` mode inside an iframe, using the export renderer. This is the honest preview — if it looks different from Edit mode, the runtime has a bug.

### 8.4 Inspector by field type

| Type | Controls |
|---|---|
| `text` | textarea, character counter + meter vs `maxLength` |
| `heading` | textarea, counter, heading level (respecting §10.4 rules), "also fills" sync list |
| `richtext` | small toolbar: bold, italic, link, unlink. No headings, no colours |
| `image` | current preview, Replace (upload/library), **Alt text (required)**, ratio + min-width hint, file size, budget bar |
| `icon` | swap from `assets/icons`, current colour inherited note |
| `link` / `button` | Label, URL, `rel` chips (`nofollow`, `sponsored`, `ugc`, `noopener`), external toggle, variant if declared |
| `repeat` | reorderable item list with add/remove, count vs min/max, per-item expand to edit its fields |
| `video` | URL, poster image |

Every inspector shows the field key in monospace (e.g. `hero.title`) so a developer and a copywriter can talk about the same thing.

---

## 9. Styling and tokens

- `tokens.css` is loaded verbatim into both the Studio canvas and the export.
- Each block imports its own `.css`. In the Studio, Vite handles it. At export, read the CSS files for the blocks in `pitforge.json.blocks`, concatenate after `tokens.css`, minify, write as `assets/styles.<hash>.css`.
- **Scope Studio chrome CSS under `.studio-*` prefixes** so it can never leak into the canvas. The canvas renders the page in a plain container with only `tokens.css` + block CSS + the small `.pf-editable` overlay rules.

---

## 10. SEO module

This is a first-class feature, not a settings panel. Build it fully.

### 10.1 Fields

All of these exist for every project, live in `content/default.json` under the `seo.` prefix, and are declared in `manifest.json` with `block: "_seo"`.

```
seo.title                string, max 60, derivedFrom the h1 field
seo.description          string, max 155, derivedFrom the first text field
seo.slug                 string, slugified, derivedFrom the h1 field
seo.canonical            "self" | absolute URL
seo.robots               { index: bool, follow: bool, maxImagePreview: "large"|"standard"|"none", noarchive: bool }
seo.lang                 BCP-47, defaults from pitforge.json
seo.hreflang             [{ lang, href }]
seo.og.title             string, falls back to seo.title
seo.og.description       string, falls back to seo.description
seo.og.image             { src, alt }, derivedFrom the priority image
seo.og.type              "article" | "website"
seo.twitter.card         "summary_large_image" | "summary"
seo.focusKeyword         string
seo.secondaryKeywords    string[]
seo.author               { name, url, jobTitle }
seo.datePublished        ISO date
seo.dateModified         ISO date, set at export
seo.schema.types         string[] from the allow-list
seo.schema.faq           [{ q, a }]
seo.breadcrumb           [{ label, href }]
```

### 10.2 Derivation and sync

A field with `derivedFrom` stays in sync with its source until the user edits it, then it is `custom` forever. Track this in `content` as `seo._custom: string[]`.

The inspector shows `synced from Hero headline` or `custom`, with a "reset to synced" action. **Never overwrite a custom value.**

### 10.3 SEO tab layout

Two columns.

**Left — the fields:** focus keyword (with a usage report: appears in H1 / URL / title / meta / body ×N), title + meter, meta description + meter, slug, canonical, language, robots chips, hreflang rows, structured-data type chips, author, and a read-only list of every link on the page with its `rel` (editable inline).

**Right — the result:** Google SERP preview, social card preview, the checks list from §10.5, and an **Advanced** drawer showing the exact emitted `<head>`, JSON-LD, `robots.txt` and `sitemap.xml`, each copyable.

### 10.4 What gets emitted

`src/seo/head.ts` produces, in this order: charset, viewport, title, description, canonical (absolute), robots, hreflang links (including a self-referencing one and `x-default`), OG tags (absolute URLs), Twitter tags, preloads for the priority image and above-fold font, then JSON-LD.

Structural rules the app must enforce, because they cannot be fixed later by editing text:
- exactly one `<h1>`
- heading levels descend without skipping
- `<header> <nav> <main> <article> <footer>` landmarks present
- every non-decorative image has non-empty `alt`
- every image has explicit `width`/`height`
- external/affiliate links carry a `rel`

### 10.5 Checks

Each returns `{ id, level: 'pass'|'warn'|'fail', title, detail, fix }`. `fail` blocks export; `warn` does not.

| id | level on failure | Logic |
|---|---|---|
| `single-h1` | fail | exactly one rendered `<h1>` |
| `heading-order` | warn | no skipped levels |
| `title-length` | warn | 1–60 chars, non-empty |
| `desc-length` | warn | 50–155 chars, non-empty |
| `slug-valid` | fail | lowercase, `a-z0-9-`, no leading/trailing dash |
| `alt-text` | fail | every image field with `altRequired` has non-empty alt |
| `img-dimensions` | fail | every `<img>` has width and height |
| `absolute-urls` | fail | canonical, OG image, OG url are absolute after domain substitution |
| `schema-valid` | fail | JSON-LD parses; every `@type` is in the allow-list |
| `schema-matches` | warn | `seo.schema.faq` length equals rendered FAQ items |
| `link-rel` | fail | every external link has a `rel` containing `nofollow` or `sponsored` |
| `no-hardcoded-content` | fail | see below |
| `byte-budget` | warn | total page weight ≤ 500 KB, images ≤ 300 KB |
| `no-localhost` | fail | no `localhost`, `127.0.0.1` or `file://` in output |
| `renders-without-js` | fail | exported HTML contains the h1 text as literal text |

**`no-hardcoded-content`** is the most important check. Parse each block's TSX; flag any JSX text child that is not whitespace, and any `src=` or `href=` string literal, unless it is inside a `PF*` component's props. Report file and line. This is what guarantees the page stays editable.

### 10.6 Schema allow-list

Permitted: `Article`, `Person`, `FAQPage`, `BreadcrumbList`, `Organization`, `WebSite`, `WebPage`.

**Blocked, and not selectable in the UI:** `Review`, `AggregateRating`, `Product`, `Offer`. If a project's content requests them, drop them and surface a warning explaining that self-assigned ratings on affiliate pages draw manual actions.

Build JSON-LD from bound fields only, so it can never disagree with what is visible.

---

## 11. Media pipeline

On upload to `POST /api/projects/:id/media`:

1. Accept jpg, png, webp, avif, svg. Reject others with a readable error.
2. SVG: sanitise (strip `<script>`, event handlers, external refs), write as-is to `assets/icons/`.
3. Raster, via sharp:
   - strip EXIF
   - resize to widths 400, 800, 1200, 1600 (never upscale past the original)
   - encode each width to AVIF (q 50), WebP (q 75), and original format (q 82)
   - filename `<slug>-<width>.<ext>`, slug from the original filename
4. Return `{ src, width, height }` pointing at the largest original-format file; the `<picture>` element derives the rest by convention.
5. If the manifest declares `ratio` and the upload differs by more than 2%, accept it but warn in the inspector with both ratios named.
6. If `minWidth` is declared and the upload is narrower, warn.

Never mutate the original upload in place; always write derivatives.

---

## 12. Export pipeline

`POST /api/projects/:id/export` and `npm run export`. Same code path.

1. Load project; validate.
2. Require a `domain`. Reject with a clear error if absent — the domain is needed for absolute URLs.
3. Render the page: `renderToStaticMarkup(<PFProvider mode="static">…)`.
4. Build `<head>` (§10.4) with all URLs made absolute against `domain`.
5. Collect and minify CSS (§9) → `assets/styles.<hash>.css`.
6. Copy only the assets actually referenced. Do not ship unused files.
7. Generate `sitemap.xml` (with real `lastmod`), `robots.txt`, `404.html`, `site.webmanifest`.
8. Generate server config: `.htaccess`, `nginx.conf.example`, `_redirects` — each with gzip/brotli, long cache on fingerprinted assets, no-cache on HTML, and a 404 rule.
9. Generate `README.md`: four steps (unzip, upload contents to web root, point the domain, submit the sitemap) plus a pre-filled `rsync` line.
10. Run all checks (§10.5). **Any `fail` aborts the export** and returns the list. `warn` proceeds.
11. Prettify the HTML output — a human will read it.
12. ZIP and stream, named `<project>-<yyyymmdd-hhmm>.zip`.

Exported output must contain **zero JavaScript** unless a block genuinely needs it, and must make zero requests to PitForge.

```
luckybet-de/
├─ index.html
├─ 404.html
├─ assets/
│  ├─ styles.a91f.css
│  ├─ hero-1600.avif · hero-1600.webp · hero-1600.jpg · (and 400/800/1200)
│  └─ fonts/inter-subset.woff2
├─ sitemap.xml
├─ robots.txt
├─ site.webmanifest
├─ favicon.ico
├─ .htaccess
├─ nginx.conf.example
├─ _redirects
└─ README.md
```

---

## 13. The demo project — you must build this

Ship `projects/demo/` as a real, complete casino landing page. It is how you verify everything and how a first-time user sees the product work. It must exercise every field type.

- **Hero** — priority image, `h1`, subtitle, primary CTA with `rel="nofollow sponsored"`
- **Bonus** — four figures (amount, wagering, min deposit, payout time) as text fields
- **Games** — `PFRepeat`, 4 items, min 2 max 8, each with thumbnail + name + description
- **FAQ** — `PFRepeat`, 4 Q&A pairs, feeding `FAQPage` schema
- **Footer** — `h2`, rich text, an outbound link with `rel="follow"`, an 18+ mark

Include placeholder images generated locally with sharp (solid colour + label) — do not fetch anything from the internet. Tokens must be a plausible design system: brand colour, two greys, a type scale of five sizes, a 4px spacing scale, one radius.

The demo must pass every check except `title-length` on one field, deliberately left slightly long, so a new user sees what a warning looks like.

---

## 14. Build order

Commit at each checkpoint. Do not move on until the checkpoint passes.

**Phase 1 — skeleton.** Repo, TS config, Vite + Express in middleware mode, `/api/projects` listing, ProjectPicker rendering the list. *Checkpoint: `npm run dev` shows the demo folder name.*

**Phase 2 — types and loading.** Types + zod schemas, project loader, block loading via `import.meta.glob`, `PFProvider`, `renderPage`. *Checkpoint: the demo page renders in `static` mode in the browser, unstyled edits impossible.*

**Phase 3 — the demo project.** Build all five blocks, tokens, content, manifest, generated placeholder images. *Checkpoint: demo renders correctly and looks like a real landing page.*

**Phase 4 — edit mode.** Dual-mode components, selection, outlines, in-place text editing, content state + undo + autosave. *Checkpoint: edit the h1, reload, the change persisted.*

**Phase 5 — inspectors.** All field types from §8.4, including repeat add/remove/reorder. *Checkpoint: add a fifth game slide, remove it, reorder two.*

**Phase 6 — media.** Upload endpoint, sharp pipeline, replace flow, alt text enforcement. *Checkpoint: replace the hero image with a local PNG; AVIF/WebP derivatives appear in `assets/`.*

**Phase 7 — SEO.** Fields, derivation and sync, head emitter, JSON-LD builders, SERP and social previews, Advanced drawer. *Checkpoint: edit the SEO title, see it desync from the h1, see it in the previews and in the Advanced head output.*

**Phase 8 — checks.** All of §10.5 including the TSX parse for hardcoded content. *Checkpoint: temporarily hardcode a string in `Hero.tsx` and watch `no-hardcoded-content` fail with the file and line.*

**Phase 9 — export.** Full pipeline, config files, README, ZIP. *Checkpoint: unzip into a folder, run any static server, page renders correctly with JS disabled.*

**Phase 10 — polish.** Preview tab, width switcher, outline tree, keyboard shortcuts, empty and error states, headless CLI export, project README.

---

## 15. Acceptance checklist

Run this yourself before reporting done. Fix anything that fails.

**Runs**
- [ ] Clean clone → `npm install` → `npm run dev` works, no errors, no warnings
- [ ] Studio opens at the printed URL and lists the demo project
- [ ] Restarting the Studio preserves all edits

**Edit**
- [ ] Every editable element is outlined; the toggle hides outlines
- [ ] Clicking selects the innermost field, not its parent
- [ ] Typing in the page updates the inspector and vice versa
- [ ] Character limits shown and enforced
- [ ] Undo works across at least 20 steps
- [ ] Repeat: add respects `max`, remove respects `min`, reorder persists
- [ ] No control anywhere changes colour, font, spacing or layout

**Media**
- [ ] Upload produces AVIF + WebP + fallback at four widths
- [ ] Alt text required before the field is considered valid
- [ ] Ratio mismatch warns with both ratios named

**SEO**
- [ ] Every field in §10.1 is editable
- [ ] Derived fields show `synced`, desync on edit, and can be reset
- [ ] SERP and social previews reflect edits live
- [ ] Advanced drawer shows the real emitted head, JSON-LD, robots and sitemap
- [ ] `Review` and `Product` cannot be selected
- [ ] Link `rel` editable; affiliate links default to `nofollow sponsored`

**Checks and export**
- [ ] All 15 checks implemented and reporting
- [ ] A `fail` blocks export and names the fix
- [ ] `no-hardcoded-content` catches a deliberately hardcoded string with file and line
- [ ] Export ZIP unzips and serves correctly from any static server
- [ ] Exported page renders fully with JavaScript disabled
- [ ] No `localhost` or absolute dev URLs anywhere in the output
- [ ] Server config files present and correct
- [ ] Headless `npm run export` produces an identical ZIP

**Fidelity**
- [ ] Preview tab and exported HTML are visually identical to Edit mode
- [ ] Page renders correctly at 360 / 768 / 1280 px

---

## 16. Rules that override convenience

1. **Content never lives in code.** If you find yourself typing page text into a `.tsx` file, put it in `content/default.json` and bind it.
2. **The exported HTML is the product.** Anything that makes the Studio nicer at the cost of dirtier output is the wrong trade.
3. **The project folder is the database.** No hidden state, no cache that can disagree with the files on disk.
4. **A check that can be fooled is worse than no check.** Run checks against rendered output, not against editor state.
5. **Never block the user from editing.** Only export is gated. Editing is always permissive.
6. **Design is immutable in the Studio.** Changing the look means changing Figma and re-converting. Do not add an escape hatch.

---

## 17. Deliver

When done, report:

- the exact commands to run it
- what the demo project demonstrates
- every check implemented, and any not implemented, with the reason
- the contents of `DECISIONS.md`
- anything in this spec that turned out to be wrong or impossible, stated plainly

Do not report done until every box in §15 is ticked.
