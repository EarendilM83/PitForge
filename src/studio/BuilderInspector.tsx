import React from 'react';
import type { StudioState, Action } from './state';
import Inspector, { resolveField } from './Inspector';
import SeoPanel from './SeoPanel';
import { TAG_NAMES, TAG_WHY, friendly, famForDefault, optionsFor, auditHeadings, type Issue } from './tagVocab';
import type { StyleTokens, VisTokens } from '../runtime/pfUtilities';

/* Right inspector — Style (editable, bounded) · Content · Settings.
   Style controls write token overrides to content._style / content._vis (utility classes, never raw
   CSS), each with an override dot + reset. Builder mode unlocks free-form (raw size/colour → inline
   style). Locked-in-Figma dimensions stay read-only specs. The retag styling-invariant is untouched. */

const PAGE = '.studio-page';
type Tab = 'style' | 'content' | 'settings';
const SIZES = ['0', 'xs', 's', 'm', 'l'] as const;

interface Dom { tag: string; def: string | null; label: string; cls: string; node: HTMLElement }
function readDom(id: string | null): Dom | null {
  const page = document.querySelector(PAGE);
  const el = id && page ? (page.querySelector(`[data-pf-el="${CSS.escape(id)}"]`) as HTMLElement | null) : null;
  if (!el) return null;
  const cls = (el.getAttribute('class') || '').split(/\s+/).filter((c) => !c.startsWith('pf-'))[0] || '';
  return { tag: el.tagName.toLowerCase(), def: el.getAttribute('data-pf-default'), label: el.getAttribute('data-pf-label') || friendly(el.tagName.toLowerCase()), cls, node: el };
}
const px = (v: string) => (v && v !== '0px' ? v : '0');

function Seg({ opts, value, onPick }: { opts: [string, string][]; value?: string; onPick: (v: string) => void }) {
  return (
    <div className="pro-iseg">
      {opts.map(([v, lbl]) => <button key={v} className={value === v ? 'on' : ''} onClick={() => onPick(v)}>{lbl}</button>)}
    </div>
  );
}

export default function BuilderInspector({ state, dispatch, builderMode = false }: { state: StudioState; dispatch: React.Dispatch<Action>; builderMode?: boolean }) {
  const [tab, setTab] = React.useState<Tab>('content');
  const [dom, setDom] = React.useState<Dom | null>(null);
  const [specs, setSpecs] = React.useState<Record<string, string>>({});
  const [issues, setIssues] = React.useState<Issue[]>([]);
  const selId = state.selected;

  React.useLayoutEffect(() => {
    const page = document.querySelector(PAGE);
    setIssues(page ? auditHeadings(page).issues : []);
    const d = readDom(selId);
    setDom(d);
    if (d) {
      const cs = getComputedStyle(d.node);
      setSpecs({ font: cs.fontFamily.split(',')[0].replace(/["']/g, ''), size: px(cs.fontSize), weight: cs.fontWeight, line: cs.lineHeight === 'normal' ? 'normal' : px(cs.lineHeight), color: cs.color, align: cs.textAlign });
    }
  }, [selId, state.content, state.project]);

  // ---- override read/write ----
  const style: StyleTokens = ((state.content['_style'] as Record<string, StyleTokens>) || {})[selId!] || {};
  const vis: VisTokens = { desktop: true, tablet: true, mobile: true, ...(((state.content['_vis'] as Record<string, VisTokens>) || {})[selId!] || {}) };
  const overridden = Object.keys(style).length > 0 || vis.desktop === false || vis.tablet === false || vis.mobile === false;

  const setStyle = (patch: Partial<StyleTokens>) => {
    if (!selId) return;
    const map = { ...((state.content['_style'] as Record<string, StyleTokens>) || {}) };
    const next: StyleTokens = { ...(map[selId] || {}), ...patch };
    (Object.keys(next) as (keyof StyleTokens)[]).forEach((k) => next[k] == null && delete next[k]);
    if (Object.keys(next).length) map[selId] = next; else delete map[selId];
    dispatch({ type: 'change', field: '_style', value: map as never });
  };
  const setVis = (patch: Partial<VisTokens>) => {
    if (!selId) return;
    const map = { ...((state.content['_vis'] as Record<string, VisTokens>) || {}) };
    map[selId] = { ...vis, ...patch };
    dispatch({ type: 'change', field: '_vis', value: map as never });
  };
  const resetAll = () => {
    if (!selId) return;
    const sm = { ...((state.content['_style'] as Record<string, unknown>) || {}) }; delete sm[selId];
    const vm = { ...((state.content['_vis'] as Record<string, unknown>) || {}) }; delete vm[selId];
    dispatch({ type: 'change', field: '_style', value: sm as never });
    dispatch({ type: 'change', field: '_vis', value: vm as never });
  };
  const setCss = (patch: Record<string, string>) => {
    const css = { ...(style.css || {}), ...patch };
    (Object.keys(css)).forEach((k) => !css[k] && delete css[k]);
    setStyle({ css: Object.keys(css).length ? css : undefined });
  };

  const retag = (next: string) => {
    if (!dom?.def || !selId) return;
    const map = { ...((state.content['_tags'] as Record<string, string>) || {}) };
    if (next === dom.def) delete map[selId]; else map[selId] = next;
    dispatch({ type: 'change', field: '_tags', value: map });
  };
  const flash = (els: HTMLElement[]) => { els.forEach((e) => { e.classList.remove('pf-flash'); void e.offsetWidth; e.classList.add('pf-flash'); }); els[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' }); };

  const field = selId ? resolveField(state, selId) : undefined;
  const seoState = issues.some((i) => i.sev === 'bad') ? 'bad' : issues.length ? 'warn' : 'ok';
  const ico = dom ? (dom.tag.startsWith('h') ? dom.tag.toUpperCase() : dom.tag === 'a' ? '↗' : dom.def ? 'T' : '◈') : '◆';
  const dot = (on: boolean) => on ? <span className="pro-ovr" title="Overridden">●</span> : null;

  if (!selId || !dom) {
    return (
      <aside className="pro-insp">
        <div className="pro-insp-head"><div className="pro-insp-title"><span className="pro-insp-ico">◆</span>Page</div><div className="pro-insp-sub">nothing selected</div></div>
        <div className="pro-insp-body">
          <div className="pro-fs"><p className="pro-empty">Click any element on the canvas or in Layers to edit it.</p></div>
          <div className="pro-fs"><div className="pro-fs-title">Search-engine check</div><div className={`pro-audit ${seoState}`}><span className="b" />{seoState === 'ok' ? 'Looks good — one main title, headings in order.' : `${issues.length} to check`}</div></div>
          <div className="pro-fs"><SeoPanel state={state} dispatch={dispatch} /></div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="pro-insp">
      <div className="pro-insp-head">
        <div className="pro-insp-title"><span className="pro-insp-ico">{ico}</span>{dom.label}
          <button className="pro-insp-x" title="Deselect" onClick={() => dispatch({ type: 'select', field: null })}>✕</button></div>
        <div className="pro-insp-sub">{dom.tag}{dom.cls ? ` · .${dom.cls}` : ''}</div>
      </div>
      <div className="pro-insp-tabs">
        {(['style', 'content', 'settings'] as Tab[]).map((t) => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t[0].toUpperCase() + t.slice(1)}</button>)}
      </div>
      <div className="pro-insp-body">
        {tab === 'style' && (
          <>
            <div className={`pro-lockbar ${builderMode ? 'unlocked' : ''}`}>
              {builderMode ? '🔓 Builder mode — free-form editing unlocked.' : '🎛 Safe edits — bounded to your design system.'}
              {overridden && <button className="pro-reset-all" onClick={resetAll}>↺ Reset to design</button>}
            </div>

            <div className="pro-fs"><div className="pro-fs-title">Text {dot(!!style.align || !!style.weight)}</div>
              <div className="pro-field"><label>Alignment</label>
                <Seg opts={[['left', '⟸'], ['center', '≡'], ['right', '⟹'], ['justify', '⇔']]} value={style.align || specs.align} onPick={(v) => setStyle({ align: v === specs.align && !style.align ? undefined : (v as StyleTokens['align']) })} /></div>
              <div className="pro-field"><label>Weight</label>
                <select className="pro-input" value={style.weight || ''} onChange={(e) => setStyle({ weight: (e.target.value || undefined) as StyleTokens['weight'] })}>
                  <option value="">Design ({specs.weight})</option><option value="regular">Regular</option><option value="medium">Medium</option><option value="semibold">Semibold</option><option value="bold">Bold</option></select></div>
            </div>

            <div className="pro-fs"><div className="pro-fs-title">Spacing {dot(!!style.mt || !!style.mb)}</div>
              <div className="pro-field"><label>Space above</label><Seg opts={SIZES.map((s) => [s, s])} value={style.mt} onPick={(v) => setStyle({ mt: (style.mt === v ? undefined : v) as StyleTokens['mt'] })} /></div>
              <div className="pro-field"><label>Space below</label><Seg opts={SIZES.map((s) => [s, s])} value={style.mb} onPick={(v) => setStyle({ mb: (style.mb === v ? undefined : v) as StyleTokens['mb'] })} /></div>
            </div>

            <div className="pro-fs"><div className="pro-fs-title">Opacity {dot(style.opacity != null)}</div>
              <div className="pro-row"><input type="range" min="10" max="100" step="10" value={style.opacity ?? 100} className="pro-slider" onChange={(e) => setStyle({ opacity: +e.target.value === 100 ? undefined : +e.target.value })} />
                <span className="pro-spec-v mono">{style.opacity ?? 100}%</span></div>
            </div>

            <div className="pro-fs"><div className="pro-fs-title">Visible on {dot(vis.desktop === false || vis.tablet === false || vis.mobile === false)}</div>
              {(['desktop', 'tablet', 'mobile'] as const).map((d) => (
                <div key={d} className="pro-row pro-vis"><span>{d === 'desktop' ? '🖥' : d === 'tablet' ? '▭' : '▯'} {d[0].toUpperCase() + d.slice(1)}</span>
                  <button className={`pro-toggle ${vis[d] !== false ? 'on' : ''}`} onClick={() => setVis({ [d]: vis[d] === false ? true : false })} /></div>
              ))}
            </div>

            {builderMode ? (
              <div className="pro-fs"><div className="pro-fs-title">Free-form (Builder) {dot(!!style.css)}</div>
                <div className="pro-field"><label>Font size</label><input className="pro-input mono" placeholder={specs.size} value={style.css?.fontSize || ''} onChange={(e) => setCss({ fontSize: e.target.value })} /></div>
                <div className="pro-field"><label>Colour</label><input className="pro-input mono" placeholder={specs.color} value={style.css?.color || ''} onChange={(e) => setCss({ color: e.target.value })} /></div>
                <p className="pro-empty">Raw values — off-brand & responsive risk is on you. Bounded controls above are safer.</p>
              </div>
            ) : (
              <div className="pro-fs"><div className="pro-fs-title">Design specs 🔒</div>
                <SpecRow k="Font" v={specs.font} /><SpecRow k="Size" v={specs.size} /><SpecRow k="Line height" v={specs.line} />
                <div className="pro-row"><span className="pro-spec-k">Colour</span><span className="pro-swatch" style={{ background: specs.color }} /><span className="pro-spec-v mono">{specs.color}</span></div>
                <p className="pro-empty">Locked to the Figma design. Switch to Builder mode to override.</p>
              </div>
            )}
          </>
        )}

        {tab === 'content' && (field
          ? <div className="pro-fs"><Inspector state={state} dispatch={dispatch} hideHead hideDesignNote /></div>
          : <div className="pro-fs"><p className="pro-empty">This is a structural element — it has no editable content. Change its meaning under <b>Settings</b>.</p></div>)}

        {tab === 'settings' && (
          <>
            {dom.def ? (
              <div className="pro-fs"><div className="pro-fs-title">Semantic type</div>
                <select className="pf-tb-select pro-select" value={dom.tag} onChange={(e) => retag(e.target.value)}>
                  {optionsFor(famForDefault(dom.def)).map(([g, tags]) => <optgroup key={g} label={g}>{tags.map((t) => <option key={t} value={t}>{TAG_NAMES[t]}</option>)}</optgroup>)}
                </select>
                <div className="pro-why"><b>{TAG_NAMES[dom.tag]}:</b> {TAG_WHY[dom.tag] || ''}</div>
                <div className="pro-lockrow">✓ Changing this never changes how it looks.</div></div>
            ) : <div className="pro-fs"><div className="pro-fs-title">Element type</div><p className="pro-empty">This is a <b>{friendly(dom.tag)}</b>. Its type is fixed.</p></div>}
            <div className="pro-fs"><div className="pro-fs-title">Search-engine check</div>
              <div className={`pro-audit ${seoState}`}><span className="b" />{seoState === 'ok' ? 'Looks good — one main title, headings in order.' : `${issues.length} thing${issues.length > 1 ? 's' : ''} to check`}</div>
              {issues.map((it, i) => <button key={i} className={`pro-issue ${it.sev}`} onClick={() => flash(it.els)}><span className="sig">{it.sev === 'bad' ? '■' : '▲'}</span><span>{it.title}<small>{it.detail}</small></span></button>)}</div>
            <div className="pro-fs"><div className="pro-fs-title">Advanced</div>
              <div className="pro-field"><label>Element</label><input className="pro-input mono" readOnly value={selId} /></div>
              <div className="pro-field"><label>CSS class</label><input className="pro-input mono" readOnly value={dom.cls ? '.' + dom.cls : '—'} /></div></div>
          </>
        )}
      </div>
    </aside>
  );
}

function SpecRow({ k, v }: { k: string; v?: string }) {
  return <div className="pro-row pro-spec"><span className="pro-spec-k">{k}</span><span className="pro-spec-v mono">{v || '—'}</span></div>;
}
