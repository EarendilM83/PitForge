import React from 'react';
import type { StudioState, Action } from './state';
import { friendly } from './tagVocab';

/* Canvas chrome for the builder: bidirectional hover-highlight (canvas <-> Layers panel), a
   breadcrumb bar pinned under the canvas for parent selection, and a single first-run coach mark.
   Tag editing itself lives in the right-hand Settings panel — nothing floats over the page. */

const PAGE = '.studio-page';

export default function CanvasTagLayer({
  state,
  dispatch,
  wrapRef,
}: {
  state: StudioState;
  dispatch: React.Dispatch<Action>;
  wrapRef: React.RefObject<HTMLElement>;
}) {
  const [coachOn, setCoachOn] = React.useState(false);

  // Bidirectional hover: hovering a canvas element highlights its row in the Layers panel.
  React.useEffect(() => {
    const page = wrapRef.current?.querySelector(PAGE);
    if (!page) return;
    const row = (id: string | null) => (id ? document.querySelector(`[data-layer-row="${CSS.escape(id)}"]`) : null);
    let last: string | null = null;
    const over = (e: Event) => {
      const el = (e.target as HTMLElement).closest('[data-pf-el]');
      const id = el?.getAttribute('data-pf-el') ?? null;
      if (id === last) return;
      row(last)?.classList.remove('hl');
      row(id)?.classList.add('hl');
      last = id;
    };
    const out = () => { row(last)?.classList.remove('hl'); last = null; };
    page.addEventListener('mouseover', over);
    page.addEventListener('mouseleave', out);
    return () => { page.removeEventListener('mouseover', over); page.removeEventListener('mouseleave', out); out(); };
  }, [wrapRef, state.content, state.project]);

  React.useEffect(() => {
    try { if (!localStorage.getItem('pf-tag-coach')) setCoachOn(true); } catch { /* ignore */ }
  }, []);
  const dismissCoach = () => { setCoachOn(false); try { localStorage.setItem('pf-tag-coach', '1'); } catch { /* ignore */ } };

  const select = (id: string) => { dismissCoach(); dispatch({ type: 'select', field: id }); };

  // ancestors of the selected element → plain-language breadcrumb
  const node = state.selected && wrapRef.current
    ? (wrapRef.current.querySelector(`${PAGE} [data-pf-el="${CSS.escape(state.selected)}"]`) as HTMLElement | null)
    : null;
  const crumbs: HTMLElement[] = [];
  if (node && wrapRef.current) {
    const page = wrapRef.current.querySelector(PAGE);
    for (let n: HTMLElement | null = node; n && n !== page; n = n.parentElement)
      if (n.matches('[data-pf-el]')) crumbs.unshift(n);
  }

  return (
    <>
      <div className="pf-crumbbar">
        <span className="pf-crumbbar-lead">You’re editing:</span>
        {crumbs.length === 0 ? (
          <span className="pf-crumbbar-empty">click an element to start</span>
        ) : (
          crumbs.map((n, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="pf-crumb-sep">›</span>}
              <button
                className={`pf-crumb ${n === node ? 'here' : ''}`}
                onClick={() => select(n.getAttribute('data-pf-el')!)}
                onMouseEnter={() => n.classList.add('pf-navhover')}
                onMouseLeave={() => n.classList.remove('pf-navhover')}
              >
                {n.getAttribute('data-pf-label') || friendly(n.tagName.toLowerCase())}
              </button>
            </React.Fragment>
          ))
        )}
      </div>

      {coachOn && (
        <div className="pf-coach">
          <span className="pf-coach-x" onClick={dismissCoach}>✕</span>
          Psst — <b>hover</b> anything on the page, then <b>click</b> to edit it on the right. No code, promise.
        </div>
      )}
    </>
  );
}
