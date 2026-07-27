import React from 'react';
import type { StudioState, Action } from './state';
import type { Field } from '../runtime/types';

type Panel = 'content' | 'media' | 'outline';

/** Left rail (§8.1): Content, Media and Outline panels. */
export default function Rail({ state, dispatch }: { state: StudioState; dispatch: React.Dispatch<Action> }) {
  const [panel, setPanel] = React.useState<Panel>('outline');
  return (
    <aside className="studio-rail">
      <div className="studio-rail-tabs">
        {(['content', 'media', 'outline'] as const).map((p) => (
          <button key={p} className={panel === p ? 'active' : ''} onClick={() => setPanel(p)} title={p}>
            {p[0].toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>
      {panel === 'outline' && <OutlineTree state={state} dispatch={dispatch} />}
      {panel === 'content' && <ContentPanel state={state} dispatch={dispatch} />}
      {panel === 'media' && <MediaPanel state={state} />}
    </aside>
  );
}

function selectField(state: StudioState, dispatch: React.Dispatch<Action>, key: string) {
  dispatch({ type: 'select', field: key });
  document.querySelector(`[data-pf-field="${CSS.escape(key)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function OutlineTree({ state, dispatch }: { state: StudioState; dispatch: React.Dispatch<Action> }) {
  const project = state.project!;
  const byBlock = new Map<string, [string, Field][]>();
  for (const [key, field] of Object.entries(project.manifest.fields) as [string, Field][]) {
    if (field.block === '_seo') continue;
    const list = byBlock.get(field.block) ?? [];
    list.push([key, field]);
    byBlock.set(field.block, list);
  }
  return (
    <ul className="studio-outline">
      {project.config.blocks.map((block) => (
        <li key={block}>
          <span className="studio-outline-block">{block}</span>
          <ul>
            {(byBlock.get(block) ?? []).map(([key, f]) => (
              <li key={key}>
                <button className={state.selected === key ? 'active' : ''} onClick={() => selectField(state, dispatch, key)} title={key}>
                  {f.label}
                </button>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

function ContentPanel({ state, dispatch }: { state: StudioState; dispatch: React.Dispatch<Action> }) {
  const project = state.project!;
  const fields = Object.entries(project.manifest.fields).filter(([, f]) => f.block !== '_seo');
  return (
    <ul className="studio-outline">
      {fields.map(([key, f]) => {
        const v = state.content[key];
        const preview =
          typeof v === 'string' ? v : Array.isArray(v) ? `${v.length} items` : v && typeof v === 'object' && 'label' in v ? String(v.label) : '';
        return (
          <li key={key}>
            <button className={state.selected === key ? 'active' : ''} onClick={() => selectField(state, dispatch, key)} title={key}>
              <strong>{f.label}</strong>
              <span className="studio-content-preview">{preview.slice(0, 40)}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function MediaPanel({ state }: { state: StudioState }) {
  const [assets, setAssets] = React.useState<{ path: string; bytes: number }[]>([]);
  React.useEffect(() => {
    fetch(`/api/projects/${state.project!.id}/assets`)
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setAssets(d))
      .catch(() => {});
  }, [state.project]);
  const kb = (n: number) => (n > 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n} B`);
  return (
    <ul className="studio-outline studio-media-list">
      {assets.map((a) => (
        <li key={a.path} title={a.path}>
          <span className="studio-media-name">{a.path.replace('/assets/', '')}</span>
          <span className="studio-muted"> {kb(a.bytes)}</span>
        </li>
      ))}
      {!assets.length && <li className="studio-muted">No assets yet.</li>}
    </ul>
  );
}
