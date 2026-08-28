import React from 'react';
import type { StudioState, Action } from './state';
import { friendly } from './tagVocab';

/* Left "Layers" panel — the page's structure as collapsible sections (Hero, Games, Footer…), each
   holding an indented, hover-linked element tree. Built from the live canvas DOM: data-pf-block
   marks sections, data-pf-el/label mark elements. Sections collapse so a 150-element footer is one
   row until opened; the section holding the current selection auto-expands. */

const PAGE = '.studio-page';

/** "SiteNav" → "Site Nav", "FeatureCasino" → "Feature Casino". */
const humanize = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ').replace(/^./, (c) => c.toUpperCase());

interface El { id: string; label: string; depth: number; ancestors: string[]; hasKids: boolean }
interface Group { block: string; label: string; els: El[] }

function scan(): Group[] {
  const page = document.querySelector(PAGE);
  if (!page) return [];
  const groups: Group[] = [];
  page.querySelectorAll('[data-pf-block]').forEach((blockEl) => {
    const block = blockEl.getAttribute('data-pf-block')!;
    const raw = Array.from(blockEl.querySelectorAll('[data-pf-el]')); // document order = pre-order
    const els: El[] = raw.map((el) => {
      const ancestors: string[] = [];
      for (let n = el.parentElement; n && blockEl.contains(n); n = n.parentElement)
        if (n.matches('[data-pf-el]')) ancestors.unshift(n.getAttribute('data-pf-el')!);
      return {
        id: el.getAttribute('data-pf-el')!,
        label: el.getAttribute('data-pf-label') || friendly(el.tagName.toLowerCase()),
        depth: ancestors.length,
        ancestors,
        hasKids: false,
      };
    });
    const parents = new Set(els.map((e) => e.ancestors[e.ancestors.length - 1]).filter(Boolean));
    els.forEach((e) => { e.hasKids = parents.has(e.id); });
    if (els.length) groups.push({ block, label: humanize(block), els });
  });
  return groups;
}

export default function BuilderLayers({ state, dispatch }: { state: StudioState; dispatch: React.Dispatch<Action> }) {
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [openBlocks, setOpenBlocks] = React.useState<Set<string>>(new Set());
  const [closedEls, setClosedEls] = React.useState<Set<string>>(new Set());

  React.useLayoutEffect(() => { setGroups(scan()); }, [state.content, state.project]);

  // Auto-open the section that contains the current selection.
  React.useEffect(() => {
    if (!state.selected) return;
    const g = groups.find((gr) => gr.els.some((e) => e.id === state.selected));
    if (g && !openBlocks.has(g.block)) setOpenBlocks((s) => new Set(s).add(g.block));
  }, [state.selected, groups]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleBlock = (b: string) => setOpenBlocks((s) => { const n = new Set(s); n.has(b) ? n.delete(b) : n.add(b); return n; });
  const toggleEl = (id: string) => setClosedEls((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const hover = (id: string, on: boolean) => document.querySelector(`${PAGE} [data-pf-el="${CSS.escape(id)}"]`)?.classList.toggle('pf-navhover', on);

  return (
    <div className="pro-rail-body builder-layers">
        {groups.length === 0 ? (
          <p className="builder-empty">Loading page…</p>
        ) : (
          <div className="builder-tree">
            {groups.map((g) => {
              const open = openBlocks.has(g.block);
              return (
                <div key={g.block} className="builder-group">
                  <button className={`builder-group-head ${open ? 'open' : ''}`} onClick={() => toggleBlock(g.block)}>
                    <span className="builder-group-caret">{open ? '▾' : '▸'}</span>
                    <span className="builder-group-name">{g.label}</span>
                    <span className="builder-group-count">{g.els.length}</span>
                  </button>
                  {open && g.els.map((e) => {
                    // hidden if any ancestor element is collapsed
                    if (e.ancestors.some((a) => closedEls.has(a))) return null;
                    const collapsed = closedEls.has(e.id);
                    return (
                      <div key={e.id} className="builder-node-row" style={{ paddingLeft: e.depth * 13 + 10 }}>
                        {e.hasKids ? (
                          <button className="builder-node-toggle" onClick={() => toggleEl(e.id)} title={collapsed ? 'Expand' : 'Collapse'}>
                            {collapsed ? '▸' : '▾'}
                          </button>
                        ) : (
                          <span className="builder-node-toggle dot">·</span>
                        )}
                        <button
                          data-layer-row={e.id}
                          className={`builder-node ${state.selected === e.id ? 'sel' : ''}`}
                          onClick={() => dispatch({ type: 'select', field: e.id })}
                          onMouseEnter={() => hover(e.id, true)}
                          onMouseLeave={() => hover(e.id, false)}
                          title={e.label}
                        >
                          <span className="builder-node-name">{e.label}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}
