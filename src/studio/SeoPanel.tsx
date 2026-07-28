import React from 'react';
import type { StudioState, Action } from './state';
import { deriveString, isCustom, customKeys, markCustom } from '../seo/derive';
import { slugify, robotsValue, type RobotsValue } from '../seo/fields';
import { SCHEMA_ALLOW_LIST } from '../seo/schema';
import type { CheckResult } from '../seo/checks';
import type { LinkValue } from '../runtime/types';

/** Plain-language headlines for each check — never the check ID (Yoast pattern). */
const CHECK_TITLES: Record<string, string> = {
  'single-h1': 'Single H1 heading',
  'heading-order': 'Heading structure',
  'title-length': 'SEO title length',
  'desc-length': 'Meta description length',
  'slug-valid': 'URL slug',
  'alt-text': 'Image alt text',
  'img-dimensions': 'Image dimensions',
  'absolute-urls': 'Absolute URLs',
  'schema-valid': 'Structured data validity',
  'schema-matches': 'Structured data matches page content',
  'link-rel': 'Outbound link attributes',
  'no-hardcoded-content': 'All content stays editable',
  'byte-budget': 'Page weight',
  'no-localhost': 'No development URLs',
  'renders-without-js': 'Works without JavaScript',
};

export default function SeoPanel({ state, dispatch }: { state: StudioState; dispatch: React.Dispatch<Action> }) {
  const project = state.project!;
  const m = project.manifest;
  const c = state.content;
  const [domain, setDomain] = React.useState(project.config.domain || 'https://www.example.com');
  const [checks, setChecks] = React.useState<CheckResult[]>([]);
  const [head, setHead] = React.useState<{ head: string; jsonLd: string; robotsTxt: string; sitemapXml: string } | null>(null);
  const [advancedOpen, setAdvancedOpen] = React.useState(false);

  const set = (key: string, value: unknown) => {
    dispatch({ type: 'change', field: key, value: value as never });
    if (m.fields[key]?.derivedFrom && !isCustom(c, key)) {
      dispatch({ type: 'change', field: 'seo._custom', value: markCustom(c, key) as never });
    }
  };

  // Live checks + head (debounced).
  React.useEffect(() => {
    const t = setTimeout(() => {
      fetch(`/api/projects/${project.id}/checks?domain=${encodeURIComponent(domain)}`)
        .then((r) => r.json())
        .then((d) => Array.isArray(d) && setChecks(d))
        .catch(() => {});
      if (advancedOpen) {
        fetch(`/api/projects/${project.id}/head?domain=${encodeURIComponent(domain)}`)
          .then((r) => r.json())
          .then(setHead)
          .catch(() => {});
      }
    }, 400);
    return () => clearTimeout(t);
  }, [c, domain, advancedOpen, project.id]);

  const title = deriveString(c, m, 'seo.title');
  const desc = deriveString(c, m, 'seo.description');
  const slug = deriveString(c, m, 'seo.slug');
  const kw = String(c['seo.focusKeyword'] ?? '').toLowerCase().trim();
  const h1 = Object.entries(m.fields).find(([, f]) => f.type === 'heading' && f.level === 1)?.[0];
  const h1Text = String(h1 ? c[h1] ?? '' : '').toLowerCase();
  const kwCount = kw ? JSON.stringify(c).toLowerCase().split(kw).length - 1 : 0;
  const robots = robotsValue(c);
  const hreflang = (c['seo.hreflang'] as { lang: string; href: string }[] | undefined) ?? [];
  const schemaTypes = (c['seo.schema.types'] as string[] | undefined) ?? [];
  const author = (c['seo.author'] as { name?: string; url?: string; jobTitle?: string } | undefined) ?? {};
  const linkFields = Object.entries(m.fields).filter(([, f]) => f.type === 'link' || f.type === 'button');
  const ogImg = (c['seo.og.image'] as { src?: string; alt?: string } | undefined) ?? {};
  const breadcrumbs = (c['seo.breadcrumb'] as { label: string; href: string }[] | undefined) ?? [];
  const schemaFaq = (c['seo.schema.faq'] as { q: string; a: string }[] | undefined) ?? [];

  const problems = checks.filter((x) => x.level === 'fail');
  const improvements = checks.filter((x) => x.level === 'warn');
  const good = checks.filter((x) => x.level === 'pass');

  return (
    <div className="studio-seo">
      {/* 1 — Focus keyphrase */}
      <Panel title="Focus keyword" sub="The search term this page should rank for. The analysis below reacts to it.">
          <input
            aria-label="Focus keyword"
            value={String(c['seo.focusKeyword'] ?? '')}
            onChange={(e) => set('seo.focusKeyword', e.target.value)}
            placeholder="e.g. casino bonus"
          />
          {kw && (
            <div className="studio-kw-stats">
              <span className={`studio-kw-stat ${h1Text.includes(kw) ? 'on' : ''}`}>H1 {h1Text.includes(kw) ? '✓' : '✗'}</span>
              <span className={`studio-kw-stat ${slug.includes(slugify(kw)) ? 'on' : ''}`}>URL {slug.includes(slugify(kw)) ? '✓' : '✗'}</span>
              <span className={`studio-kw-stat ${title.toLowerCase().includes(kw) ? 'on' : ''}`}>Title {title.toLowerCase().includes(kw) ? '✓' : '✗'}</span>
              <span className={`studio-kw-stat ${desc.toLowerCase().includes(kw) ? 'on' : ''}`}>Meta {desc.toLowerCase().includes(kw) ? '✓' : '✗'}</span>
              <span className={`studio-kw-stat ${kwCount > 2 ? 'on' : ''}`}>Body ×{kwCount}</span>
            </div>
          )}
        </Panel>

        {/* 2 — Google preview + snippet editor */}
        <Panel title="Google preview" sub="How this page will look in Google search results. Edit the snippet below the preview." defaultOpen>
          <div className="studio-serp">
            <div className="studio-serp-site">
              <span className="studio-serp-favicon">◎</span>
              <span>
                <div className="studio-serp-sitename">{project.config.name}</div>
                <div className="studio-serp-url">{domain.replace(/^https?:\/\//, '').replace(/\/+$/, '')} › {slug}</div>
              </span>
            </div>
            <div className="studio-serp-title">{title || 'Page title'}</div>
            <div className="studio-serp-desc">{desc || 'Add a meta description so searchers know what this page offers.'}</div>
          </div>
          <div className="studio-snippet-editor">
            <SnippetField label="SEO title" k="seo.title" max={60} state={state} set={set} dispatch={dispatch} />
            <SnippetField label="Slug" k="seo.slug" state={state} set={set} dispatch={dispatch} hint="The web address of this page. Short, lowercase, with dashes." />
            <SnippetField label="Meta description" k="seo.description" max={155} area state={state} set={set} dispatch={dispatch} hint="One or two sentences that make people click." />
            <label>
              Domain used for previews
              <input value={domain} onChange={(e) => setDomain(e.target.value)} />
            </label>
          </div>
        </Panel>

        {/* 3 — Analysis */}
        <Panel title="SEO analysis" sub="What’s working and what needs attention before this page ships." defaultOpen badge={<AnalysisBadge checks={checks} />}>
          <CheckGroup title="Problems" items={problems} tone="danger" defaultOpen />
          <CheckGroup title="Improvements" items={improvements} tone="warning" defaultOpen />
          <CheckGroup title="Good results" items={good} tone="success" />
        </Panel>

        {/* 4 — Social sharing */}
        <Panel title="Social sharing" sub="How the page looks when shared on social networks. Leave blank to reuse the Google snippet.">
          <div className="studio-social">
            <div className="studio-social-img">{ogImg.src ? <img src={ogImg.src} alt={ogImg.alt ?? ''} /> : 'No social image set'}</div>
            <div className="studio-social-body">
              <div className="studio-social-url">{domain.replace(/^https?:\/\//, '').replace(/\/+$/, '')}</div>
              <div className="studio-social-title">{String(c['seo.og.title'] ?? '') || title}</div>
              <div className="studio-social-desc">{String(c['seo.og.description'] ?? '') || desc}</div>
            </div>
          </div>
          <label>
            Social title <code>seo.og.title</code>
            <input value={String(c['seo.og.title'] ?? '')} onChange={(e) => set('seo.og.title', e.target.value)} />
          </label>
          <label>
            Social description <code>seo.og.description</code>
            <textarea rows={2} value={String(c['seo.og.description'] ?? '')} onChange={(e) => set('seo.og.description', e.target.value)} />
          </label>
          <label>
            Social image URL <code>seo.og.image</code>
            <input value={ogImg.src ?? ''} onChange={(e) => set('seo.og.image', { ...ogImg, src: e.target.value })} />
          </label>
          <label>
            Card type
            <select value={String(c['seo.twitter.card'] ?? 'summary_large_image')} onChange={(e) => set('seo.twitter.card', e.target.value)}>
              <option value="summary_large_image">Large image</option>
              <option value="summary">Small image</option>
            </select>
          </label>
          <label>
            Page type
            <select value={String(c['seo.og.type'] ?? 'website')} onChange={(e) => set('seo.og.type', e.target.value)}>
              <option value="website">Website</option>
              <option value="article">Article</option>
            </select>
          </label>
        </Panel>

        {/* 5 — Indexing & robots */}
        <Panel title="Indexing & robots" sub="Whether and how search engines may index this page.">
          <label>
            Canonical URL <code>seo.canonical</code>
            <input value={String(c['seo.canonical'] ?? 'self')} onChange={(e) => set('seo.canonical', e.target.value)} />
          </label>
          <p className="studio-muted">Use “self” unless this page duplicates another page’s content.</p>
          <label>
            Content language <code>seo.lang</code>
            <input value={String(c['seo.lang'] ?? project.config.lang)} onChange={(e) => set('seo.lang', e.target.value)} />
          </label>
          <p className="studio-muted" style={{ marginTop: 16 }}>Search engine instructions</p>
          <div className="studio-chips">
            {(['index', 'follow', 'noarchive'] as const).map((k) => (
              <button key={k} className={`chip ${robots[k] ? 'active' : ''}`} onClick={() => set('seo.robots', { ...robots, [k]: !robots[k] } satisfies RobotsValue)}>
                {k}
              </button>
            ))}
            <select
              value={robots.maxImagePreview}
              onChange={(e) => set('seo.robots', { ...robots, maxImagePreview: e.target.value as RobotsValue['maxImagePreview'] })}
              style={{ width: 'auto' }}
            >
              {['large', 'standard', 'none'].map((v) => (
                <option key={v} value={v}>image preview: {v}</option>
              ))}
            </select>
          </div>
          <p className="studio-muted" style={{ marginTop: 16 }}>Language alternates (hreflang)</p>
          {hreflang.map((h, i) => (
            <div key={i} className="studio-repeat-row">
              <input value={h.lang} placeholder="lang" onChange={(e) => set('seo.hreflang', hreflang.map((x, j) => (j === i ? { ...x, lang: e.target.value } : x)))} />
              <input value={h.href} placeholder="/" onChange={(e) => set('seo.hreflang', hreflang.map((x, j) => (j === i ? { ...x, href: e.target.value } : x)))} />
              <button className="studio-btn-danger" onClick={() => set('seo.hreflang', hreflang.filter((_, j) => j !== i))}>×</button>
            </div>
          ))}
          <button onClick={() => set('seo.hreflang', [...hreflang, { lang: '', href: '/' }])}>+ Add language</button>
          <label>
            Date published <code>seo.datePublished</code>
            <input value={String(c['seo.datePublished'] ?? '')} onChange={(e) => set('seo.datePublished', e.target.value)} placeholder="2026-01-15" />
          </label>
          <p className="studio-muted">Date modified is set automatically at export.</p>
        </Panel>

        {/* 6 — Structured data */}
        <Panel title="Structured data" sub="Machine-readable facts about this page that can unlock rich results in Google.">
          <p className="studio-muted">Content types (rating and product types are blocked — self-assigned ratings on affiliate pages draw manual penalties)</p>
          <div className="studio-chips">
            {SCHEMA_ALLOW_LIST.map((t) => (
              <button
                key={t}
                className={`chip ${schemaTypes.includes(t) ? 'active' : ''}`}
                onClick={() => set('seo.schema.types', schemaTypes.includes(t) ? schemaTypes.filter((x) => x !== t) : [...schemaTypes, t])}
              >
                {t}
              </button>
            ))}
          </div>
          <label>
            Author name
            <input value={author.name ?? ''} onChange={(e) => set('seo.author', { ...author, name: e.target.value })} />
          </label>
          <label>
            Author link
            <input value={author.url ?? ''} onChange={(e) => set('seo.author', { ...author, url: e.target.value })} />
          </label>
          <label>
            Author role
            <input value={author.jobTitle ?? ''} onChange={(e) => set('seo.author', { ...author, jobTitle: e.target.value })} />
          </label>
          <label>
            Secondary keywords (comma separated)
            <input
              value={((c['seo.secondaryKeywords'] as string[] | undefined) ?? []).join(', ')}
              onChange={(e) => set('seo.secondaryKeywords', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
            />
          </label>
          <p className="studio-muted" style={{ marginTop: 16 }}>Breadcrumb trail</p>
          {breadcrumbs.map((b, i) => (
            <div key={i} className="studio-repeat-row">
              <input value={b.label} placeholder="Label" onChange={(e) => set('seo.breadcrumb', breadcrumbs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
              <input value={b.href} placeholder="/" onChange={(e) => set('seo.breadcrumb', breadcrumbs.map((x, j) => (j === i ? { ...x, href: e.target.value } : x)))} />
              <button className="studio-btn-danger" onClick={() => set('seo.breadcrumb', breadcrumbs.filter((_, j) => j !== i))}>×</button>
            </div>
          ))}
          <button onClick={() => set('seo.breadcrumb', [...breadcrumbs, { label: '', href: '/' }])}>+ Add breadcrumb</button>
          <p className="studio-muted" style={{ marginTop: 16 }}>FAQ structured data (must match the FAQ on the page)</p>
          {schemaFaq.map((f, i) => (
            <div key={i} className="studio-schema-faq">
              <input value={f.q} placeholder="Question" onChange={(e) => set('seo.schema.faq', schemaFaq.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))} />
              <textarea rows={2} value={f.a} placeholder="Answer" onChange={(e) => set('seo.schema.faq', schemaFaq.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} />
              <button className="studio-btn-danger" onClick={() => set('seo.schema.faq', schemaFaq.filter((_, j) => j !== i))}>Remove</button>
            </div>
          ))}
          <button onClick={() => set('seo.schema.faq', [...schemaFaq, { q: '', a: '' }])}>+ Add FAQ entry</button>
        </Panel>

        {/* 7 — Links on this page */}
        <Panel title="Links on this page" sub="Affiliate and external links and their rel attributes. Affiliate links should carry “nofollow sponsored”.">
          <ul className="studio-repeat-list">
            {linkFields.map(([key, f]) => {
              const v = (c[key] as LinkValue | undefined) ?? { label: '', href: '' };
              return (
                <li key={key} className="studio-repeat-row">
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: 13 }}>{v.label || f.label}</strong>
                    <span className="studio-muted" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.href}</span>
                  </span>
                  <input
                    style={{ width: 180 }}
                    value={v.rel ?? ''}
                    placeholder={f.defaultRel}
                    aria-label={`rel for ${key}`}
                    onChange={(e) => set(key, { ...v, rel: e.target.value })}
                  />
                </li>
              );
            })}
          </ul>
        </Panel>

      {/* 8 — Advanced (modal overlay) */}
      <button className="studio-advanced-open" onClick={() => setAdvancedOpen(true)}>
        ▸ Advanced — exact output
      </button>
      {advancedOpen && (
        <div className="studio-modal-backdrop" onClick={() => setAdvancedOpen(false)}>
          <div className="studio-modal studio-advanced-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Advanced — exact output</h2>
            <p className="studio-muted">The literal HTML head, structured data, robots.txt and sitemap this page will ship with.</p>
            {head ? (
              <div className="studio-advanced">
                {(['head', 'jsonLd', 'robotsTxt', 'sitemapXml'] as const).map((part) => (
                  <details key={part}>
                    <summary>
                      {part}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          navigator.clipboard.writeText(head[part]);
                        }}
                      >
                        Copy
                      </button>
                    </summary>
                    <pre>{head[part]}</pre>
                  </details>
                ))}
              </div>
            ) : (
              <p className="studio-muted">Loading…</p>
            )}
            <div className="studio-modal-actions">
              <button onClick={() => setAdvancedOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CheckGroup({ title, items, tone, defaultOpen }: { title: string; items: CheckResult[]; tone: 'danger' | 'warning' | 'success'; defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen ?? false);
  if (!items.length && tone !== 'success') return null;
  return (
    <div className="studio-analysis-group">
      <button className="studio-analysis-header" onClick={() => setOpen(!open)}>
        <span>{open ? '▾' : '▸'}</span>
        {title}
        <span className={`studio-lozenge studio-lozenge-${tone}`}>{items.length}</span>
      </button>
      <ul className="studio-checks" style={open ? undefined : { display: 'none' }}>
        {items.map((ch) => (
          <li key={ch.id}>
            <details className={`studio-check studio-check-${ch.level}`}>
              <summary>{CHECK_TITLES[ch.id] ?? ch.title}</summary>
              <div className="studio-check-detail">
                {ch.detail}
                {ch.fix && <em>{ch.fix}</em>}
              </div>
            </details>
          </li>
        ))}
        {!items.length && <li className="studio-muted" style={{ padding: '4px 0' }}>Nothing here — nice work.</li>}
      </ul>
    </div>
  );
}

function SnippetField({
  label,
  k,
  max,
  area,
  hint,
  state,
  set,
  dispatch,
}: {
  label: string;
  k: string;
  max?: number;
  area?: boolean;
  hint?: string;
  state: StudioState;
  set: (k: string, v: unknown) => void;
  dispatch: React.Dispatch<Action>;
}) {
  const value = String(state.content[k] ?? '');
  const custom = isCustom(state.content, k);
  const source = state.project!.manifest.fields[k]?.derivedFrom;
  const len = value.length;
  const over = max !== undefined && len > max;
  return (
    <div className="studio-field">
      <label>
        {label} <code>{k}</code>
        {area ? <textarea rows={3} value={value} onChange={(e) => set(k, e.target.value)} /> : <input value={value} onChange={(e) => set(k, e.target.value)} />}
      </label>
      {max !== undefined && (
        <div className={`studio-meter ${over ? 'over' : ''}`}>
          <div className="studio-meter-bar" style={{ width: `${Math.min(100, (len / max) * 100)}%` }} />
          <span>{len}/{max}</span>
        </div>
      )}
      {hint && <p className="studio-muted" style={{ margin: '2px 0 0' }}>{hint}</p>}
      {source && (
        <p className="studio-sync-note">
          {custom ? (
            <>
              <span className="studio-badge">custom</span>
              <button
                className="studio-btn-link"
                onClick={() => {
                  dispatch({ type: 'change', field: 'seo._custom', value: customKeys(state.content).filter((x) => x !== k) as never });
                  const src = state.content[source];
                  set(k, k === 'seo.slug' ? slugify(String(src ?? '')) : String(src ?? ''));
                }}
              >
                Reset to follow the page content
              </button>
            </>
          ) : (
            <span className="studio-badge studio-badge-sync">follows the page content</span>
          )}
        </p>
      )}
    </div>
  );
}

/** Accordion panel — Yoast-in-sidebar pattern. Children stay in the DOM when collapsed. */
function Panel({
  title,
  sub,
  badge,
  defaultOpen,
  children,
}: {
  title: string;
  sub: string;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen ?? false);
  return (
    <section className={`studio-panel ${open ? 'open' : ''}`}>
      <button className="studio-panel-head" onClick={() => setOpen(!open)}>
        <span className="studio-panel-chevron">{open ? '▾' : '▸'}</span>
        <span className="studio-panel-title">{title}</span>
        {badge}
      </button>
      <div className="studio-panel-body" style={open ? undefined : { display: 'none' }}>
        <p className="studio-card-sub">{sub}</p>
        {children}
      </div>
    </section>
  );
}

function AnalysisBadge({ checks }: { checks: CheckResult[] }) {
  const fails = checks.filter((c) => c.level === 'fail').length;
  const warns = checks.filter((c) => c.level === 'warn').length;
  if (fails) return <span className="studio-lozenge studio-lozenge-danger">{fails} problem{fails > 1 ? 's' : ''}</span>;
  if (warns) return <span className="studio-lozenge studio-lozenge-warning">{warns} improvement{warns > 1 ? 's' : ''}</span>;
  return <span className="studio-lozenge studio-lozenge-success">All good</span>;
}
