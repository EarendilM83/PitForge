import React from 'react';
import type { StudioState, Action } from './state';
import Inspector from './Inspector';
import SeoPanel from './SeoPanel';

/** Right sidebar — Gutenberg's Post/Block pattern: "Page" (SEO) and "Field" (inspector). */
export default function Sidebar({
  state,
  dispatch,
  tab,
  onTab,
}: {
  state: StudioState;
  dispatch: React.Dispatch<Action>;
  tab: 'page' | 'field';
  onTab: (t: 'page' | 'field') => void;
}) {
  return (
    <aside className="studio-sidebar">
      <div className="studio-sidebar-tabs">
        {(['page', 'field'] as const).map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => onTab(t)}>
            {t === 'page' ? 'Page' : 'Field'}
          </button>
        ))}
      </div>
      <div className="studio-sidebar-body">
        {tab === 'page' ? (
          <SeoPanel state={state} dispatch={dispatch} />
        ) : (
          <Inspector state={state} dispatch={dispatch} />
        )}
      </div>
    </aside>
  );
}
