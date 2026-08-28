import React from 'react';
import type { StudioState, Action } from './state';
import { friendly, auditHeadings, type Issue } from './tagVocab';

/* Inspector companion to the on-canvas tag layer. Shows the parts INSIDE the selected element
   (click to jump in, hover to highlight on canvas) and a live, non-blocking SEO audit that flashes
   the offending element when clicked (Webflow Audit-panel pattern). The tag picker + breadcrumb
   live on the canvas (CanvasTagLayer), so this panel stays uncluttered. */

const PAGE = '.studio-page';

interface Kid { id: string; label: string; tag: string; }

export default function TagControls({ state, dispatch }: { state: StudioState; dispatch: React.Dispatch<Action> }) {
  const [kids, setKids] = React.useState<Kid[]>([]);
  const [issues, setIssues] = React.useState<Issue[]>([]);
  const [h1Count, setH1Count] = React.useState(1);

  React.useLayoutEffect(() => {
    const page = document.querySelector(PAGE);
    if (!page) return;
    const a = auditHeadings(page);
    setIssues(a.issues);
    setH1Count(a.h1Count);

    const sel = state.selected ? page.querySelector(`[data-pf-el="${CSS.escape(state.selected)}"]`) : null;
    if (!sel) { setKids([]); return; }
    const list: Kid[] = [];
    sel.querySelectorAll('[data-pf-el]').forEach((c) => {
      if (c.parentElement?.closest('[data-pf-el]') === sel)
        list.push({ id: c.getAttribute('data-pf-el')!, label: c.getAttribute('data-pf-label') || friendly(c.tagName.toLowerCase()), tag: c.tagName.toLowerCase() });
    });
    setKids(list);
  }, [state.selected, state.content, state.project]);

  const hover = (id: string, on: boolean) => {
    const el = document.querySelector(`${PAGE} [data-pf-el="${CSS.escape(id)}"]`);
    el?.classList.toggle('pf-navhover', on);
  };
  const flash = (els: HTMLElement[]) => {
    els.forEach((e) => { e.classList.remove('pf-flash'); void e.offsetWidth; e.classList.add('pf-flash'); });
    els[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const seoState = issues.some((i) => i.sev === 'bad') ? 'bad' : issues.length ? 'warn' : 'ok';

  return (
    <div className="studio-tag">
      {kids.length > 0 && (
        <div className="studio-tag-sec">
          <div className="studio-tag-lbl">Parts inside this element</div>
          <div className="studio-tag-kids">
            {kids.map((k) => (
              <button
                key={k.id}
                className="studio-tag-kid"
                onClick={() => dispatch({ type: 'select', field: k.id })}
                onMouseEnter={() => hover(k.id, true)}
                onMouseLeave={() => hover(k.id, false)}
              >
                <span className="studio-tag-kidname">{k.label}</span>
                <span className="studio-tag-kidtag">{friendly(k.tag)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="studio-tag-sec">
        <div className="studio-tag-lbl">Search-engine check</div>
        <div className={`studio-tag-audit ${seoState}`}>
          <span className="badge" />
          {seoState === 'ok'
            ? 'Looks good — one main title, headings in order.'
            : `${issues.length} thing${issues.length > 1 ? 's' : ''} to check`}
        </div>
        {issues.map((it, i) => (
          <button key={i} className={`studio-tag-issue ${it.sev}`} onClick={() => flash(it.els)}>
            <span className="sig">{it.sev === 'bad' ? '■' : '▲'}</span>
            <span>{it.title}<small>{it.detail}</small></span>
          </button>
        ))}
      </div>
    </div>
  );
}
