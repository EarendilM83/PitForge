import React from 'react';
import Icon from './marketing/Icon';

/* ------------------------------------------------------------------ *
 * Content for the in-Studio User Guide. Declarative pages + a few
 * presentational helpers. No emojis — line icons only.
 * ------------------------------------------------------------------ */

export function Lead({ children }: { children: React.ReactNode }) {
  return <p className="pf-doc-lead">{children}</p>;
}
export function Note({ kind = 'info', title, children }: { kind?: 'info' | 'gate' | 'warn'; title?: string; children: React.ReactNode }) {
  const icon = kind === 'gate' ? 'shield' : kind === 'warn' ? 'warn' : 'info';
  return (
    <div className={`pf-doc-note ${kind}`}>
      <span className="pf-doc-note-i"><Icon name={icon} size={17} /></span>
      <div>{title && <b className="pf-doc-note-t">{title}</b>}{children}</div>
    </div>
  );
}
export function Cmd({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLPreElement>(null);
  const [ok, setOk] = React.useState(false);
  const copy = () => {
    const t = ref.current?.textContent || '';
    navigator.clipboard?.writeText(t.trim());
    setOk(true);
    setTimeout(() => setOk(false), 1400);
  };
  return (
    <div className="pf-doc-cmdwrap">
      <pre className="pf-doc-cmd" ref={ref}>{children}</pre>
      <button className={`pf-doc-copy ${ok ? 'ok' : ''}`} onClick={copy} aria-label="Copy">
        <Icon name={ok ? 'check' : 'box'} size={13} stroke={2.2} /> {ok ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
export function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="pf-doc-steps">
      {items.map((it, i) => (<li key={i}><span className="n">{i + 1}</span><span>{it}</span></li>))}
    </ol>
  );
}
export function Cards({ items }: { items: { icon: string; title: string; body: string }[] }) {
  return (
    <div className="pf-doc-cards">
      {items.map((c) => (
        <div className="pf-doc-card" key={c.title}>
          <span className="pf-doc-card-i"><Icon name={c.icon} size={20} /></span>
          <h4>{c.title}</h4><p>{c.body}</p>
        </div>
      ))}
    </div>
  );
}
function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <table className="pf-doc-table">
      <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{j === 0 ? <code>{c}</code> : c}</td>)}</tr>)}</tbody>
    </table>
  );
}
const Code = ({ children }: { children: React.ReactNode }) => <code className="pf-doc-code">{children}</code>;

export interface DocPage { id: string; title: string; blurb: string; body: React.ReactNode }
export interface DocGroup { group: string; icon: string; pages: DocPage[] }

export const DOC_GROUPS: DocGroup[] = [
  {
    group: 'Getting started',
    icon: 'compass',
    pages: [
      {
        id: 'welcome',
        title: 'Welcome to PitForge',
        blurb: 'What PitForge is, who it is for, and how the pieces fit.',
        body: (
          <>
            <Lead>PitForge is a locally-run, SEO-first CMS Studio for one-page landing sites. It turns a design into a fast, zero-JavaScript static site that a marketer can edit and ship — no database, no framework to learn.</Lead>
            <p>Every site is a folder. There is no server-side app to host and no CMS backend to maintain — you build, edit, export, and deploy a self-contained bundle of static files.</p>
            <h2>The two tools</h2>
            <Cards items={[
              { icon: 'spark', title: 'Claude Code — the builder', body: 'Converts a Figma design into a project and makes structural or design changes on request. Runs the quality gates before anything is “done”.' },
              { icon: 'cursor', title: 'PitForge Studio — the editor', body: 'Where you see the page, click to change any text or image, set the SEO, preview every screen size, and export a deployable bundle.' },
            ]} />
            <h2>Who does what</h2>
            <p>Claude builds and restructures; marketers edit content and SEO in the Studio; the site owner deploys. That division keeps a marketer from ever breaking a layout, and keeps Claude fenced to your sites — never PitForge itself.</p>
            <Note kind="info" title="New here? ">Follow <b>Getting started</b> in order, then skim <b>Core concepts</b> — those five pages explain everything the rest of the guide builds on.</Note>
          </>
        ),
      },
      {
        id: 'install',
        title: 'Install & run',
        blurb: 'What to install once, and how to start PitForge each day.',
        body: (
          <>
            <Lead>PitForge runs on your own computer. You install a few things once; after that, starting it takes a single command.</Lead>
            <Note kind="info" title="Want it hand-held? ">The <b>Setup</b> tab walks every step in plain language — how to open the Terminal, what each command does, and how to connect Figma. This page is the short reference.</Note>
            <h2>Install once</h2>
            <Steps items={[
              <><b>Node.js 20+</b> — the engine PitForge runs on. Download the <b>LTS</b> build from nodejs.org and run the installer.</>,
              <><b>Claude Code</b> — the assistant that builds your sites. Install it, then sign in with your Claude subscription.</>,
              <><b>Figma desktop app</b> — so Claude can read your designs (see the next page).</>,
            ]} />
            <Cmd><span className="c"># install Claude Code, then sign in</span>{'\n'}npm install -g @anthropic-ai/claude-code{'\n'}claude</Cmd>
            <h2>Get PitForge’s parts</h2>
            <p>Open the Terminal in the PitForge folder and run this once:</p>
            <Cmd>npm install</Cmd>
            <h2>Start it each day</h2>
            <p>From the same folder, start the Studio and open the address it prints:</p>
            <Cmd>npm run dev   <span className="c"># Studio at localhost:4321</span></Cmd>
            <Note kind="warn" title="New sections need a restart. ">A brand-new block file appears after you restart the dev server. Editing existing content updates live.</Note>
          </>
        ),
      },
      {
        id: 'figma',
        title: 'Connect Figma',
        blurb: 'Let Claude read your designs through Figma’s MCP connector.',
        body: (
          <>
            <Lead>Claude builds from your real Figma design, so it needs a live connection to Figma. That connection is called an <b>MCP server</b> — think of it as a secure bridge between Claude and Figma.</Lead>
            <Note kind="info" title="You don’t need to understand MCP. ">MCP (Model Context Protocol) simply lets Claude read from other apps. Here, it reads your Figma file. Turn it on once and forget it.</Note>
            <h2>Turn on Figma’s connector</h2>
            <Steps items={[
              <>Install and open the <b>Figma desktop app</b> (not the website) and sign in.</>,
              <>Open the menu at the top-left → <b>Preferences</b>.</>,
              <>Tick <b>“Enable Dev Mode MCP Server.”</b> Figma confirms it’s running.</>,
            ]} />
            <h2>Claude is already pointed at it</h2>
            <p>PitForge ships a small config file that tells Claude where Figma’s connector lives — so there’s nothing to type. The first time you build, Claude may ask to connect; say yes.</p>
            <Cmd><span className="c"># in Claude, confirm the connection exists</span>{'\n'}/mcp</Cmd>
            <p>You should see <Code>figma</Code> listed and connected.</p>
            <Note kind="warn" title="Keep Figma open. ">The connector only works while the Figma desktop app is running — leave it open while Claude builds.</Note>
          </>
        ),
      },
      {
        id: 'first-site',
        title: 'Create your first site',
        blurb: 'From a Figma design (or blank) to a working project.',
        body: (
          <>
            <Lead>Every site starts on the Sites screen. Click <b>New site</b> and choose how to begin.</Lead>
            <h2>Import from Figma (recommended)</h2>
            <p>Paste your Figma design link. Claude reads the real design — exact colours, spacing, and fonts — instead of guessing from a screenshot, so the result matches on the first pass. The dialog generates a ready-to-run prompt; paste it into Claude Code.</p>
            <Steps items={[
              <>Choose <b>Import from Figma</b> and paste the design URL.</>,
              <>Name the site and set a URL slug, e.g. <Code>/summer-bonus</Code>.</>,
              <>Copy the generated prompt into Claude Code and let it build.</>,
            ]} />
            <h2>Start blank</h2>
            <p>Prefer to describe the page in words? Start blank and tell Claude what sections you want. You can import a design for a specific section later.</p>
          </>
        ),
      },
    ],
  },
  {
    group: 'Core concepts',
    icon: 'layers',
    pages: [
      {
        id: 'projects',
        title: 'Projects are folders',
        blurb: 'The anatomy of a site under ./projects/<slug>/.',
        body: (
          <>
            <Lead>There is no database. Everything about a site lives in one folder, which makes sites easy to version, copy, and reason about.</Lead>
            <Table head={['File / folder', 'What it holds']} rows={[
              ['pitforge.json', 'Site config and the ordered list of blocks that make the page.'],
              ['manifest.json', 'The field schema — every editable field, its type and rules.'],
              ['content/default.json', 'The actual content values for those fields.'],
              ['blocks/<Name>.tsx + .css', 'One design section each — markup + styles.'],
              ['tokens.css', 'Design tokens (colours, spacing, type) for the whole site.'],
              ['assets/', 'Images, icons, and other static files.'],
            ]} />
            <Note kind="info">Because a site is just files, Claude edits it directly and the Studio reads it live — the two stay in sync through the folder.</Note>
          </>
        ),
      },
      {
        id: 'blocks',
        title: 'Blocks & sections',
        blurb: 'One block equals one design section.',
        body: (
          <>
            <Lead>A page is a stack of blocks. Each block is one design section — a hero, a feature grid, an FAQ, a footer — authored as a small React component using PitForge runtime components.</Lead>
            <p>The rule is strict: <b>one block = one section</b>. Blocks are never merged or invented. The order of blocks on the page comes from <Code>pitforge.json</Code>.</p>
            <p>Inside a block, structure (the tags and layout) is fixed markup; the editable pieces are <b>fields</b> bound to runtime components like <Code>PFText</Code>, <Code>PFImage</Code>, and <Code>PFRepeat</Code>. Copy and images are never hard-coded — they always come from the content file.</p>
          </>
        ),
      },
      {
        id: 'fields',
        title: 'Fields & the manifest',
        blurb: 'How editable pieces are declared.',
        body: (
          <>
            <Lead>The <Code>manifest.json</Code> declares every editable field on the site: its type, label, which block it belongs to, and any rules.</Lead>
            <Cmd>{`"hero.title": {
  "type": "text",
  "label": "Headline",
  "block": "Hero",
  "maxLength": 40
}`}</Cmd>
            <p>Fields are grouped by block in the Elements panel. A field’s <Code>type</Code> decides which inspector a marketer sees; rules like <Code>maxLength</Code> or a repeat’s <Code>min</Code>/<Code>max</Code> are enforced in the UI. See <b>Reference → Field types</b> for the full list.</p>
            <Note kind="info" title="Adding a field is a structural change. ">Marketers can’t add fields — ask Claude. It updates the manifest, binds a runtime component in the block, and seeds a default value.</Note>
          </>
        ),
      },
      {
        id: 'content-model',
        title: 'The content model',
        blurb: 'Where the words and images actually live.',
        body: (
          <>
            <Lead>Content values live in <Code>content/default.json</Code>, keyed by field. Editing in the Studio writes here; export reads the same file.</Lead>
            <Table head={['Field type', 'Value shape']} rows={[
              ['text / heading', '"a string"'],
              ['image / icon', '{ src, alt, width, height }'],
              ['link / button', '{ label, href, rel }'],
              ['repeat', '[ { …item fields }, … ]'],
            ]} />
            <p>Because content is plain JSON, it diffs cleanly in version control and is trivial for Claude to edit precisely.</p>
          </>
        ),
      },
      {
        id: 'structure',
        title: 'Structure vs content',
        blurb: 'The line between what marketers and Claude change.',
        body: (
          <>
            <Lead>PitForge draws a clean line: <b>structure is locked, content is editable.</b></Lead>
            <ul>
              <li><b>Marketers</b> change any text or image, and add or remove repeatable items within their allowed range.</li>
              <li><b>Marketers cannot</b> add or remove whole sections — that keeps a page from silently breaking.</li>
              <li><b>Claude</b> handles structural change: new sections, reordering, new editable fields.</li>
            </ul>
            <Note kind="info">Want a new section or a new editable field? Ask Claude — it is a one-line request, and it keeps the manifest, block, and content in step.</Note>
          </>
        ),
      },
    ],
  },
  {
    group: 'The editor',
    icon: 'cursor',
    pages: [
      {
        id: 'editor-tour',
        title: 'The editor at a glance',
        blurb: 'How the editing screen is laid out.',
        body: (
          <>
            <Lead>Click <b>Edit</b> on any site to open the editor. It has four parts — learn these once and the rest is easy.</Lead>
            <Cards items={[
              { icon: 'layers', title: 'Layers (left)', body: 'The page structure — every section and the elements inside it, as a tidy tree.' },
              { icon: 'cursor', title: 'Canvas (centre)', body: 'Your live page. Click anything to select and edit it; hover to highlight.' },
              { icon: 'wrench', title: 'Inspector (right)', body: 'Edit the selected element across three tabs: Style, Content, and Settings.' },
              { icon: 'gauge', title: 'Toolbar (top)', body: 'Device sizes, undo/redo, Test, Preview, Export, and Publish.' },
            ]} />
            <p>Top-left shows the site name and your place in the page; the top bar also shows a live <b>Saving… / Saved</b> indicator — every change autosaves.</p>
            <Note kind="info" title="Structure comes from your design. ">You edit what’s there — you don’t add or remove whole sections in the editor. Need a new section? Ask Claude (see “Working with Claude Code”).</Note>
          </>
        ),
      },
      {
        id: 'select-edit',
        title: 'Selecting what to edit',
        blurb: 'Two ways to pick an element: the canvas or the Layers tree.',
        body: (
          <>
            <Lead>Everything you edit starts by selecting an element. There are two ways in, and they stay in sync.</Lead>
            <h2>On the canvas</h2>
            <p>Hover the page to highlight an element, then click to select it. The Inspector on the right updates to match. Press <b>Escape</b> to deselect.</p>
            <h2>In the Layers tree</h2>
            <p>The left panel lists the page by section (Hero, Games, Footer…). Expand a section to see its elements; click one to select it. Hovering a layer highlights it on the canvas, and vice-versa.</p>
            <h2>The breadcrumb</h2>
            <p>Below the canvas, a breadcrumb shows where the selected element sits — e.g. <Code>Hero › Heading › Main title</Code>. Click any step to jump up to a parent.</p>
          </>
        ),
      },
      {
        id: 'inspector',
        title: 'The Inspector',
        blurb: 'Style, Content, and Settings — three tabs for the selected element.',
        body: (
          <>
            <Lead>When something is selected, the right panel shows three tabs. Most of your day is spent in <b>Content</b>.</Lead>
            <Table head={['Tab', 'What it does']} rows={[
              ['Style', 'How it looks — alignment, weight, spacing, opacity, and which devices it shows on.'],
              ['Content', 'The actual words, images, and links. This is where you type and upload.'],
              ['Settings', 'The element’s meaning for SEO (its “type”), a live search-engine check, and its ID/class.'],
            ]} />
            <Note kind="info">The header of the panel shows the element’s name and its tag (for example <Code>h1</Code>), so you always know what you’ve selected.</Note>
          </>
        ),
      },
      {
        id: 'content-edit',
        title: 'Editing content',
        blurb: 'Text, images, links, and video — the Content tab.',
        body: (
          <>
            <Lead>The <b>Content</b> tab changes shape to fit whatever you selected. Edits appear instantly and autosave.</Lead>
            <h2>Text, headings & rich text</h2>
            <ul>
              <li>Type in the box. If there’s a length limit, a little meter shows <Code>used / max</Code> and turns red if you go over.</li>
              <li>Rich-text fields add <b>B</b>, <b>I</b>, and <b>Link</b> buttons to format a selection.</li>
            </ul>
            <h2>Images & icons</h2>
            <ul>
              <li><b>Replace image</b> opens a file picker (JPG, PNG, WebP, AVIF, SVG). The size targets are shown for you (ratio, minimum width).</li>
              <li>Fill in <b>alt text</b> — a short description. Some images require it and will warn until you do.</li>
            </ul>
            <h2>Links & buttons</h2>
            <ul>
              <li>Set the <b>Label</b> (the visible text) and the <b>URL</b>.</li>
              <li>Toggle <b>rel</b> chips — <Code>nofollow</Code>, <Code>sponsored</Code>, <Code>ugc</Code>, <Code>noopener</Code> — for affiliate or external links.</li>
            </ul>
            <h2>Video</h2>
            <p>Paste the <b>video URL</b> and, optionally, a <b>poster image</b> to show before it plays.</p>
          </>
        ),
      },
      {
        id: 'repeat',
        title: 'Lists & repeatable items',
        blurb: 'Add, remove, and reorder cards and rows.',
        body: (
          <>
            <Lead>Some fields are lists — a grid of game tiles, a set of FAQ rows. Select one and the Content tab shows every item.</Lead>
            <ul>
              <li><b>Reorder</b> with the up/down arrows on each item.</li>
              <li><b>Remove</b> with the × (disabled once you hit the minimum).</li>
              <li><b>Add item</b> appends a fresh, blank one (disabled at the maximum).</li>
              <li><b>Expand</b> an item to edit its own fields.</li>
            </ul>
            <p>The header shows the limits — for example <Code>4 items · min 4 · max 8</Code>. Need the range changed, or a new field on every card? Ask Claude.</p>
          </>
        ),
      },
      {
        id: 'style',
        title: 'Styling safely',
        blurb: 'The Style tab, and Marketer vs Builder mode.',
        body: (
          <>
            <Lead>The <b>Style</b> tab lets you adjust the look within the bounds of your design system — so a page stays on-brand and unbroken.</Lead>
            <ul>
              <li><b>Text</b> — alignment and weight (Regular → Bold).</li>
              <li><b>Spacing</b> — space above and below, in fixed steps.</li>
              <li><b>Opacity</b> — 10–100%.</li>
              <li><b>Visible on</b> — hide an element on Desktop, Tablet, or Mobile.</li>
            </ul>
            <p>A dot next to a section means you’ve overridden the design there; <b>Reset to design</b> clears your overrides. Font, exact size, and colour are shown but locked (marked with a lock).</p>
            <h2>Marketer mode vs Builder mode</h2>
            <p>The toggle in the toolbar switches between them:</p>
            <Table head={['Mode', 'What you get']} rows={[
              ['Marketer (default)', 'Safe, bounded edits tied to the design system. Nothing off-brand, nothing broken.'],
              ['Builder', 'Unlocks free-form font size and colour. Powerful, but the off-brand and responsive risk is yours.'],
            ]} />
          </>
        ),
      },
      {
        id: 'semantic',
        title: 'Semantic types (SEO-safe)',
        blurb: 'Change an element’s meaning without changing its look.',
        body: (
          <>
            <Lead>In the <b>Settings</b> tab, “Semantic type” sets what an element <i>means</i> to Google and screen readers — a main title, a section heading, a paragraph — <b>without ever changing how it looks.</b></Lead>
            <p>The choices are in plain language: <b>Main title</b> (one per page), <b>Section heading</b>, <b>Sub-heading</b>, <b>Paragraph</b>, <b>Plain text</b>, and so on. You can only pick sensible options for that element, so you can’t accidentally break the page’s structure.</p>
            <Note kind="gate">A live search-engine check right below warns if there’s more than one main title or if headings skip a level. Getting this right is what lets the page pass export.</Note>
          </>
        ),
      },
      {
        id: 'devices',
        title: 'Devices & preview',
        blurb: 'Check the page at phone, tablet, and desktop sizes.',
        body: (
          <>
            <Lead>The toolbar’s device buttons switch the canvas between widths so you can check every screen.</Lead>
            <Table head={['Device', 'Width']} rows={[
              ['Desktop', 'Full, responsive width.'],
              ['Tablet', 'A real 768px frame — the true tablet layout.'],
              ['Mobile', 'A real 390px frame — the true phone layout.'],
            ]} />
            <p>Tablet and Mobile render the exact page that ships, at that real width, so what you see is what visitors get.</p>
            <h2>Preview</h2>
            <p><b>Preview</b> opens the full, final page — the same zero-JS output as export — with a <b>Back to editor</b> button to return. Use it for a last look before publishing.</p>
          </>
        ),
      },
      {
        id: 'history',
        title: 'Undo, autosave & languages',
        blurb: 'Safety nets and multi-language editing.',
        body: (
          <>
            <Lead>You can experiment freely — nothing is lost.</Lead>
            <ul>
              <li><b>Autosave</b> — every change saves on its own; the top bar shows <Code>Saving…</Code> then <Code>Saved</Code>.</li>
              <li><b>Undo / Redo</b> — the toolbar arrows, or <Code>Cmd/Ctrl+Z</Code> and <Code>Shift+Cmd/Ctrl+Z</Code> (up to 50 steps).</li>
              <li><b>Edited elsewhere?</b> If the site changes on disk (e.g. Claude edited it), a notice offers to reload.</li>
            </ul>
            <h2>Languages</h2>
            <p>The language menu switches between English (the source) and any languages you add. When you edit in another language you’re writing a translation; leave a field blank to fall back to English.</p>
          </>
        ),
      },
    ],
  },
  {
    group: 'SEO',
    icon: 'search',
    pages: [
      {
        id: 'seo',
        title: 'The SEO panel',
        blurb: 'Everything that controls how your page ranks and shares.',
        body: (
          <>
            <Lead>The SEO panel is where you tune how the page appears in search and on social — with live previews so there are no surprises. It’s organised into simple sections.</Lead>
            <Table head={['Section', 'What you set']} rows={[
              ['Focus keyword', 'The term this page should rank for. PitForge checks it against your title, URL, headings, and body.'],
              ['Google preview', 'The search title (≤60 chars), the URL slug, and the meta description (≤155) — shown as a live Google result.'],
              ['SEO analysis', 'Live checks split into Problems (must fix), Improvements (nice to have), and Passing.'],
              ['Social sharing', 'The title, description, and image used on social cards, plus the card style.'],
              ['Indexing & robots', 'Canonical URL, page language, index/follow directives, and hreflang alternates.'],
              ['Structured data', 'Schema types, author, breadcrumbs, and FAQ rich snippets.'],
              ['Links on this page', 'Every link and button, so you can set the right rel on affiliate links.'],
            ]} />
            <Note kind="info" title="Prefer to just write? ">Title and description can auto-follow your page content — you only touch these when you want something custom.</Note>
          </>
        ),
      },
      {
        id: 'checks',
        title: 'The export checks',
        blurb: 'The gate that guards every export.',
        body: (
          <>
            <Lead>Sixteen checks run automatically at export. Any <b>fail</b> blocks the export until it’s fixed — you cannot ship a page that would hurt your ranking.</Lead>
            <Table head={['Check', 'Enforces']} rows={[
              ['single-h1', 'Exactly one main heading on the page.'],
              ['heading-order', 'Headings never skip a level (h2 → h4 is a fail).'],
              ['title / description length', 'Titles and meta descriptions within sensible bounds.'],
              ['slug-valid', 'Lowercase letters, numbers, and dashes only.'],
              ['link-rel', 'Affiliate / external links carry the right rel.'],
              ['img-dimensions', 'Every image declares width and height.'],
              ['schema-valid', 'Structured data parses and matches a visible block.'],
              ['renders-without-js', 'The page is fully static — zero JavaScript.'],
            ]} />
            <Note kind="gate">Warnings (e.g. a long title) don’t block export; failures do. Fix a failure and re-run.</Note>
          </>
        ),
      },
    ],
  },
  {
    group: 'Design & responsive',
    icon: 'devices',
    pages: [
      {
        id: 'fluid',
        title: 'The fluid system',
        blurb: 'Why one design looks right on every screen.',
        body: (
          <>
            <Lead>PitForge pages scale proportionally. A single design reads correctly from a 320px phone to an ultra-wide monitor, without a wall of breakpoints.</Lead>
            <p>Sizes use a proportional unit and fluid font <Code>clamp()</Code>s, so the layout breathes with the viewport instead of snapping. Designers usually give only two widths (~1920 and ~490); the system fills in everything between.</p>
          </>
        ),
      },
      {
        id: 'responsive',
        title: 'The responsive gate',
        blurb: 'Proof that undesigned widths ship unbroken.',
        body: (
          <>
            <Lead>The responsive gate renders a site from 320 to 2200px and fails on any real break — so the widths a designer never drew (768, 1024, 1280, 1440) are proven, not assumed.</Lead>
            <Cmd>npm run verify -- --project &lt;slug&gt;</Cmd>
            <Note kind="warn" title="Fix breaks the fluid way. ">Repair a responsive failure with fluid or reflow rules — never a fixed-px patch for a single screen size.</Note>
          </>
        ),
      },
      {
        id: 'a11y',
        title: 'Accessibility',
        blurb: 'Usable pages that also rank better.',
        body: (
          <>
            <Lead>Accessible pages are better for everyone — and search engines reward them.</Lead>
            <ul>
              <li>Real headings in order — one main title, then sections (set via the element-type control).</li>
              <li>Meaningful alt text on every image.</li>
              <li>Interactive pieces — accordions, carousels — work with pure HTML and CSS, no JavaScript.</li>
              <li>Strong text/background contrast and clearly focusable controls.</li>
            </ul>
          </>
        ),
      },
      {
        id: 'testing',
        title: 'Testing your page',
        blurb: 'The Test panel — see every screen width at once.',
        body: (
          <>
            <Lead>The <b>Test</b> button in the editor toolbar opens a panel that renders your page at a whole wall of widths at once — so you catch a broken layout before anyone else does.</Lead>
            <ul>
              <li><b>Scan now</b> renders every breakpoint (320 up to 3200px) as a thumbnail and flags horizontal overflow or broken images.</li>
              <li><b>Run with Playwright</b> runs the authoritative browser test suite and streams pass/fail results live.</li>
              <li><b>Zoom</b> any tile to inspect that exact width full-size.</li>
            </ul>
            <p>You can also keep a checklist of things each page must guarantee; it’s saved with the site so Claude can honour it on the next build. If a width looks wrong, ask Claude to fix it the fluid way.</p>
          </>
        ),
      },
    ],
  },
  {
    group: 'Ship it',
    icon: 'rocket',
    pages: [
      {
        id: 'preview',
        title: 'Preview',
        blurb: 'See the real page at every width.',
        body: (
          <>
            <Lead>Preview shows the actual rendered page — the same zero-JS HTML that ships — at phone, tablet, and desktop widths.</Lead>
            <p>The preview is always live and reflects your latest edits. If a width looks off, ask Claude to fix it the fluid way.</p>
            <Note kind="warn">An exported bundle is a frozen snapshot. If the preview looks right but an export doesn’t, you’re viewing a stale export — re-export.</Note>
          </>
        ),
      },
      {
        id: 'export',
        title: 'Export',
        blurb: 'Package a deployable, gated bundle.',
        body: (
          <>
            <Lead>Click <b>Export</b>, enter the live domain, and download a ZIP. The SEO checks run one last time; a failure blocks the export.</Lead>
            <p>The bundle is a complete, self-contained static site — HTML, CSS, hashed assets, favicon, sitemap, and robots. Claude can also export from the terminal for the same gated result:</p>
            <Cmd>npm run export -- --project &lt;slug&gt; --domain https://yoursite.com</Cmd>
          </>
        ),
      },
      {
        id: 'deploy',
        title: 'Deploy',
        blurb: 'From a bundle to a live page.',
        body: (
          <>
            <Lead>The last step is deliberately human. The export bundle goes to the site owner, who ships it.</Lead>
            <Steps items={[
              <>Hand the exported ZIP to the site owner.</>,
              <>They upload it to the deploy repository for that site.</>,
              <>The pipeline publishes it — for example to Cloudflare Pages — instantly.</>,
            ]} />
            <Note kind="gate">Claude never deploys and holds no credentials — it stops at the bundle. The owner owns the deploy.</Note>
          </>
        ),
      },
    ],
  },
  {
    group: 'Working with Claude Code',
    icon: 'spark',
    pages: [
      {
        id: 'ask',
        title: 'How to ask',
        blurb: 'Get good results in plain language.',
        body: (
          <>
            <Lead>Name the site and describe the outcome. Claude locates the right layer, edits surgically, and re-checks the gates.</Lead>
            <Cmd>On the summer-bonus site, make the hero headline bigger{'\n'}and change the CTA to “Play now”.</Cmd>
            <p>You don’t need to know whether that’s a content edit or a CSS change — Claude decides. For anything structural (a new section, a new field), just say so.</p>
          </>
        ),
      },
      {
        id: 'fence',
        title: 'The safety fence',
        blurb: 'What Claude can and cannot touch.',
        body: (
          <>
            <Lead>Claude edits your sites — the files under a project folder — and nothing else. It cannot change PitForge itself, and it never deploys. The boundary is enforced by a permission fence, not merely requested.</Lead>
            <Table head={['Claude may', 'Claude may not']} rows={[
              ['Edit content, images, blocks, CSS, manifest', 'Change PitForge’s own code'],
              ['Run verify, typecheck, export', 'git push, deploy, or use credentials'],
              ['Add sections and fields to a site', 'Edit build config or the skills'],
            ]} />
            <Note kind="info">If a request needs a change to PitForge itself, Claude stops and says so — instead of hacking around it inside your site.</Note>
          </>
        ),
      },
      {
        id: 'recipes',
        title: 'Common requests',
        blurb: 'A starter set of things to ask for.',
        body: (
          <>
            <Lead>A few requests that map cleanly to the right layer:</Lead>
            <ul>
              <li><b>Content</b> — “Change the bonus amount to €750 across the page.”</li>
              <li><b>Design</b> — “Make the buttons rounder and the hero background darker.”</li>
              <li><b>Structure</b> — “Add an FAQ section with five questions.”</li>
              <li><b>New field</b> — “Let me edit the small print under the CTA.”</li>
              <li><b>Fix</b> — “The cards overlap at 1024px — fix it fluidly.”</li>
            </ul>
          </>
        ),
      },
    ],
  },
  {
    group: 'Reference',
    icon: 'book',
    pages: [
      {
        id: 'field-types',
        title: 'Field types',
        blurb: 'Every field type and what it edits.',
        body: (
          <>
            <Table head={['Type', 'Edits', 'Notes']} rows={[
              ['text', 'A short string', 'Optional maxLength'],
              ['heading', 'A heading string', 'Carries a level for the outline'],
              ['richtext', 'Formatted copy', 'A small set of inline styles'],
              ['image', 'A picture', 'src, alt, width, height'],
              ['icon', 'An inline SVG icon', 'From the site’s icon set'],
              ['link', 'A hyperlink', 'label, href, rel'],
              ['button', 'A call to action', 'Link plus a variant'],
              ['repeat', 'A list of items', 'min / max, item schema'],
              ['video', 'A video', 'url and poster'],
            ]} />
          </>
        ),
      },
      {
        id: 'cli',
        title: 'CLI & scripts',
        blurb: 'The commands behind the buttons.',
        body: (
          <>
            <Table head={['Command', 'Does']} rows={[
              ['npm run dev', 'Start the Studio at localhost:4321.'],
              ['npm run verify -- --project <slug>', 'Responsive gate, 320 → 2200px.'],
              ['npm run export -- --project <slug> --domain <url>', 'Build a gated, deployable bundle.'],
              ['npm run typecheck', 'Type-check the project.'],
            ]} />
            <Note kind="info">The Studio’s Preview and Export buttons run the same pipeline as these commands.</Note>
          </>
        ),
      },
      {
        id: 'troubleshooting',
        title: 'Troubleshooting',
        blurb: 'Common snags and quick fixes.',
        body: (
          <>
            <dl className="pf-doc-gloss">
              <dt>A new site or block doesn’t appear</dt><dd>Restart the dev server — new block files are picked up on restart.</dd>
              <dt>“Still not fixed” but the preview looks right</dt><dd>You’re viewing a stale export or a cached tab. Re-export and hard-reload.</dd>
              <dt>Export is blocked</dt><dd>An SEO check failed. Read the failure, fix it (often a heading or a missing image size), and re-run.</dd>
              <dt>Claude refuses an edit</dt><dd>The request needs a change to PitForge itself — that’s the owner’s job, by design.</dd>
            </dl>
          </>
        ),
      },
      {
        id: 'glossary',
        title: 'Glossary',
        blurb: 'The words PitForge uses.',
        body: (
          <>
            <dl className="pf-doc-gloss">
              <dt>Site</dt><dd>One landing page. Lives entirely in its own folder — no database.</dd>
              <dt>Block / section</dt><dd>One design section of the page. One block equals one section.</dd>
              <dt>Field</dt><dd>An editable piece — a headline, image, or button. What you click to change.</dd>
              <dt>Manifest</dt><dd>The schema declaring every field, its type, and its rules.</dd>
              <dt>Repeatable</dt><dd>A field holding a list — cards or rows you add to or remove from.</dd>
              <dt>Gate</dt><dd>An automatic check (responsive or SEO) that must pass before a page is done or exported.</dd>
              <dt>Export bundle</dt><dd>The self-contained ZIP of static files you deploy. A frozen snapshot.</dd>
            </dl>
          </>
        ),
      },
    ],
  },
];
