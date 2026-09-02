import React from 'react';

type Mode = 'choose' | 'figma' | 'blank';

/** "New site" dialog — the two ways a site enters PitForge. */
export default function NewSiteDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [mode, setMode] = React.useState<Mode>('choose');
  return (
    <div className="studio-modal-backdrop" onClick={onClose}>
      <div className="studio-modal" onClick={(e) => e.stopPropagation()}>
        <div className="studio-modal-head">
          <h2>{mode === 'choose' ? 'Create a new site' : mode === 'figma' ? 'Import from Figma' : 'Start blank'}</h2>
          <button className="studio-btn-link" onClick={onClose}>✕</button>
        </div>
        {mode === 'choose' && <Chooser onPick={setMode} />}
        {mode === 'figma' && <FigmaFlow onBack={() => setMode('choose')} />}
        {mode === 'blank' && <BlankFlow onBack={() => setMode('choose')} onCreated={onCreated} />}
      </div>
    </div>
  );
}

function Chooser({ onPick }: { onPick: (m: Mode) => void }) {
  return (
    <div className="studio-newsite-options">
      <button className="studio-newsite-card" onClick={() => onPick('figma')}>
        <span className="studio-newsite-card-title">From Figma</span>
        <span className="studio-muted">
          The normal path. Your AI coding tool converts a Figma file into a fully designed site —
          layout, colours and typography come straight from the design.
        </span>
        <span className="studio-newsite-card-cta">Show me how →</span>
      </button>
      <button className="studio-newsite-card" onClick={() => onPick('blank')}>
        <span className="studio-newsite-card-title">Start blank</span>
        <span className="studio-muted">
          A minimal one-section starter you can edit right away. Good for trying PitForge out —
          real projects should come from Figma.
        </span>
        <span className="studio-newsite-card-cta">Create a blank site →</span>
      </button>
    </div>
  );
}

/** Figma conversion runs in the user's AI coding tool (the figma-to-pitforge skill),
 *  not in the browser — this panel produces the exact handoff prompt. */
function FigmaFlow({ onBack }: { onBack: () => void }) {
  const [url, setUrl] = React.useState('');
  const [name, setName] = React.useState('');
  const [copied, setCopied] = React.useState(false);
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'my-site';
  const prompt =
    `Convert a Figma design into a PitForge project.\n` +
    `\n` +
    `Figma file: ${url || '<paste the Figma file URL here>'}\n` +
    `Project folder: ./projects/${slug}\n` +
    `\n` +
    `What PitForge is: a locally-run, SEO-first CMS Studio for one-page landing sites. Projects are plain folders under ./projects/ (no database) — each has pitforge.json (block order), manifest.json (editable field types), content/default.json (values), tokens.css (design tokens), and one blocks/<Name>.tsx per design section. Blocks render twice from the same tree: interactive in the Studio, and static zero-JS HTML at export.\n` +
    `\n` +
    `Your job: turn the Figma design into a PIXEL-FAITHFUL, proportionally RESPONSIVE, SEO-clean, zero-JS PitForge project in ONE disciplined pass — not ten rounds of "this doesn't match".\n` +
    `\n` +
    `How to do it — load the skills, don't wing it:\n` +
    `1. Load and apply the figma-to-pitforge skill first, plus its companions (pitforge-responsive-fluid, pitforge-seo, pitforge-accessibility, pitforge-export-deploy). They ship in this repo under docs/skills/.\n` +
    `2. Map the design with the Figma MCP: get_metadata (layer tree + section node ids + canvas/content width), get_variable_defs (build tokens.css from the design's own tokens), get_design_context per section (exact px/colors/gradients/fonts + asset download URLs). Use values verbatim — never eyeball a screenshot.\n` +
    `3. Scaffold ./projects/${slug}/ in that exact folder shape. One block per design SECTION — never merge, split, or invent sections.\n` +
    `4. Build each block with the PF runtime components (PFText, PFHeading, PFImage, PFRepeat, …) bound to manifest fields — never hardcode copy or image paths. Structure is locked; content is editable, so every text/image the design shows must become an editable field.\n` +
    `5. Make it fluid with the --u proportional unit: identical proportions at every desktop width, locked above the design width. Prove the undesigned widths (768–1440) ship unbroken — fix with fluid/reflow, never fixed-px patches.\n` +
    `6. Verify before declaring done: run \`npm run gate\` (typecheck + full UI suite, 320→3200), pass the SEO checks (any fail blocks export), then restart the dev server so import.meta.glob picks up the new blocks.\n` +
    `\n` +
    `When done, the site appears automatically in the PitForge Studio Sites list.`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <div>
      <ol className="studio-steps-list">
        <li>Copy the link to your Figma file (Share → Copy link).</li>
        <li>Paste it below and name the site.</li>
        <li>Copy the generated instruction into your AI coding tool (Claude Code) — it converts the design into a project folder.</li>
        <li>The new site shows up in the Sites list automatically. Open it and start editing.</li>
      </ol>
      <label className="studio-field">
        <span>Figma file URL</span>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.figma.com/design/…" />
      </label>
      <label className="studio-field">
        <span>Site name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. LuckyBet UK" />
      </label>
      <label className="studio-field">
        <span>Instruction for your AI tool</span>
        <textarea readOnly rows={14} value={prompt} onFocus={(e) => e.target.select()} />
      </label>
      <div className="studio-modal-actions">
        <button className="studio-btn-link" onClick={onBack}>← Back</button>
        <button className="studio-btn-primary" onClick={copy}>{copied ? 'Copied ✓' : 'Copy instruction'}</button>
      </div>
    </div>
  );
}

function BlankFlow({ onBack, onCreated }: { onBack: () => void; onCreated: () => void }) {
  const [name, setName] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || r.statusText);
      onCreated(); // full reload so Vite picks up the new block files
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };
  return (
    <div>
      <p className="studio-muted">
        Creates a starter site with one hero section (headline, subtitle, button). You can edit every word
        immediately; add more sections later via your AI tool.
      </p>
      <label className="studio-field">
        <span>Site name</span>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Spring Promo"
          onKeyDown={(e) => e.key === 'Enter' && name.trim() && !busy && create()} />
      </label>
      {error && <div className="studio-error">{error}</div>}
      <div className="studio-modal-actions">
        <button className="studio-btn-link" onClick={onBack}>← Back</button>
        <button className="studio-btn-primary" disabled={!name.trim() || busy} onClick={create}>
          {busy ? 'Creating…' : 'Create site'}
        </button>
      </div>
    </div>
  );
}
