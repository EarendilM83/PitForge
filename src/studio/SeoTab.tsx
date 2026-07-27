import React from 'react';
import type { StudioState, Action } from './state';
import { deriveString, isCustom, customKeys, markCustom } from '../seo/derive';
import { slugify, robotsValue, type RobotsValue } from '../seo/fields';
import { SCHEMA_ALLOW_LIST } from '../seo/schema';
import type { CheckResult } from '../seo/checks';
import type { LinkValue } from '../runtime/types';

export default function SeoTab({ state, dispatch }: { state: StudioState; dispatch: React.Dispatch<Action> }) {
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
  const kw = String(c['seo.focusKeyword'] ?? '').toLowerCase();
  const h1 = String(c['hero.title'] ?? '').toLowerCase();
  const bodyText = JSON.stringify(c).toLowerCase();
  const kwCount = kw ? bodyText.split(kw).length - 1 : 0;
  const robots = robotsValue(c);
  const hreflang = (c['seo.hreflang'] as { lang: string; href: string }[] | undefined) ?? [];
  const schemaTypes = (c['seo.schema.types'] as string[] | undefined) ?? [];
  const author = (c['seo.author'] as { name?: string; url?: string; jobTitle?: string } | undefined) ?? {};
  const linkFields = Object.entries(m.fields).filter(([, f]) => f.type === 'link' || f.type === 'button');

  return (
    <div className="studio-seo studio-seo-cols">
      <div className="studio-seo-left">
        <h2>SEO</h2>
        <label>
          Focus keyword
          <input value={String(c['seo.focusKeyword'] ?? '')} onChange={(e) => set('seo.focusKeyword', e.target.value)} />
        </label>
        {kw && (
          <p className="studio-muted">
            usage: H1 {h1.includes(kw) ? '✓' : '✗'} · URL {slug.includes(slugify(kw)) ? '✓' : '✗'} · title{' '}
            {title.toLowerCase().includes(kw) ? '✓' : '✗'} · meta {desc.toLowerCase().includes(kw) ? '✓' : '✗'} · body ×{kwCount}
          </p>
        )}
        <SeoText label="SEO title" k="seo.title" max={60} state={state} set={set} dispatch={dispatch} />
        <SeoText label="Meta description" k="seo.description" max={155} state={state} set={set} dispatch={dispatch} area />
        <SeoText label="Slug" k="seo.slug" state={state} set={set} dispatch={dispatch} />
        <label>
          Canonical ("self" or absolute URL)
          <input value={String(c['seo.canonical'] ?? 'self')} onChange={(e) => set('seo.canonical', e.target.value)} />
        </label>
        <label>
          Language (BCP-47)
          <input value={String(c['seo.lang'] ?? project.config.lang)} onChange={(e) => set('seo.lang', e.target.value)} />
        </label>
        <p className="studio-muted">Robots</p>
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
              <option key={v} value={v}>max-image-preview:{v}</option>
            ))}
          </select>
        </div>
        <p className="studio-muted">Hreflang</p>
        {hreflang.map((h, i) => (
          <div key={i} className="studio-repeat-row">
            <input value={h.lang} onChange={(e) => set('seo.hreflang', hreflang.map((x, j) => (j === i ? { ...x, lang: e.target.value } : x)))} />
            <input value={h.href} onChange={(e) => set('seo.hreflang', hreflang.map((x, j) => (j === i ? { ...x, href: e.target.value } : x)))} />
            <button onClick={() => set('seo.hreflang', hreflang.filter((_, j) => j !== i))}>×</button>
          </div>
        ))}
        <button onClick={() => set('seo.hreflang', [...hreflang, { lang: '', href: '/' }])}>+ hreflang</button>
        <p className="studio-muted">Structured data types (Review, AggregateRating, Product, Offer are blocked)</p>
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
          Author URL
          <input value={author.url ?? ''} onChange={(e) => set('seo.author', { ...author, url: e.target.value })} />
        </label>
        <label>
          Author job title
          <input value={author.jobTitle ?? ''} onChange={(e) => set('seo.author', { ...author, jobTitle: e.target.value })} />
        </label>
        <p className="studio-muted">Links on the page (rel editable)</p>
        <ul className="studio-repeat-list">
          {linkFields.map(([key, f]) => {
            const v = (c[key] as LinkValue | undefined) ?? { label: '', href: '' };
            return (
              <li key={key} className="studio-repeat-row">
                <code>{key}</code>
                <span className="studio-muted">{v.href}</span>
                <input
                  style={{ width: 160 }}
                  value={v.rel ?? ''}
                  placeholder={f.defaultRel}
                  onChange={(e) => set(key, { ...v, rel: e.target.value })}
                />
              </li>
            );
          })}
        </ul>
      </div>
      <div className="studio-seo-right">
        <label>
          Domain (for previews)
          <input value={domain} onChange={(e) => setDomain(e.target.value)} />
        </label>
        <h3>Google preview</h3>
        <div className="studio-serp">
          <div className="studio-serp-url">{domain.replace(/\/+$/, '')}/{slug}</div>
          <div className="studio-serp-title">{title}</div>
          <div className="studio-serp-desc">{desc}</div>
        </div>
        <h3>Social card</h3>
        <div className="studio-social">
          <div className="studio-social-title">{String(c['seo.og.title'] ?? '') || title}</div>
          <div className="studio-social-desc">{String(c['seo.og.description'] ?? '') || desc}</div>
          <div className="studio-social-url">{domain.replace(/^https?:\/\//, '').replace(/\/+$/, '')}</div>
        </div>
        <h3>Checks</h3>
        <ul className="studio-checks">
          {checks.map((ch) => (
            <li key={ch.id} className={`studio-check studio-check-${ch.level}`}>
              <strong>{ch.level.toUpperCase()}</strong> {ch.title}
              {ch.level !== 'pass' && (
                <div className="studio-muted">
                  {ch.detail} <em>Fix: {ch.fix}</em>
                </div>
              )}
            </li>
          ))}
        </ul>
        <h3>
          <button onClick={() => setAdvancedOpen(!advancedOpen)}>{advancedOpen ? '▾' : '▸'} Advanced</button>
        </h3>
        {advancedOpen && head && (
          <div className="studio-advanced">
            {(['head', 'jsonLd', 'robotsTxt', 'sitemapXml'] as const).map((part) => (
              <details key={part}>
                <summary>
                  {part} <button onClick={(e) => { e.preventDefault(); navigator.clipboard.writeText(head[part]); }}>copy</button>
                </summary>
                <pre>{head[part]}</pre>
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SeoText({
  label,
  k,
  max,
  area,
  state,
  set,
  dispatch,
}: {
  label: string;
  k: string;
  max?: number;
  area?: boolean;
  state: StudioState;
  set: (k: string, v: unknown) => void;
  dispatch: React.Dispatch<Action>;
}) {
  const value = String(state.content[k] ?? '');
  const custom = isCustom(state.content, k);
  const source = state.project!.manifest.fields[k]?.derivedFrom;
  const len = value.length;
  return (
    <div className="studio-field">
      <label>
        {label} {max ? `(${len}/${max})` : ''}
        {area ? <textarea rows={3} value={value} onChange={(e) => set(k, e.target.value)} /> : <input value={value} onChange={(e) => set(k, e.target.value)} />}
      </label>
      {source && (
        <p className="studio-sync-note">
          {custom ? (
            <>
              <span className="studio-badge">custom</span>{' '}
              <button
                onClick={() => {
                  dispatch({ type: 'change', field: 'seo._custom', value: customKeys(state.content).filter((x) => x !== k) as never });
                  const src = state.content[source];
                  set(k, k === 'seo.slug' ? slugify(String(src ?? '')) : String(src ?? ''));
                  dispatch({ type: 'change', field: 'seo._custom', value: customKeys(state.content).filter((x) => x !== k) as never });
                }}
              >
                reset to synced
              </button>
            </>
          ) : (
            <span className="studio-badge studio-badge-sync">synced from {source}</span>
          )}
        </p>
      )}
    </div>
  );
}
