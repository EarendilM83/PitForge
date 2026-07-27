import React from 'react';
import type { StudioState, Action } from './state';
import type { Field } from '../runtime/types';

/** Left rail: outline tree of blocks → fields; clicking selects and scrolls (§8.1). */
export default function Outline({ state, dispatch }: { state: StudioState; dispatch: React.Dispatch<Action> }) {
  const project = state.project!;
  const byBlock = new Map<string, [string, Field][]>();
  for (const [key, field] of Object.entries(project.manifest.fields) as [string, Field][]) {
    if (field.block === '_seo') continue;
    const list = byBlock.get(field.block) ?? [];
    list.push([key, field]);
    byBlock.set(field.block, list);
  }

  const select = (key: string) => {
    dispatch({ type: 'select', field: key });
    document.querySelector(`[data-pf-field="${CSS.escape(key)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <aside className="studio-rail">
      <p className="studio-rail-title">Outline</p>
      <ul className="studio-outline">
        {project.config.blocks.map((block) => (
          <li key={block}>
            <span className="studio-outline-block">{block}</span>
            <ul>
              {(byBlock.get(block) ?? []).map(([key, f]) => (
                <li key={key}>
                  <button className={state.selected === key ? 'active' : ''} onClick={() => select(key)} title={key}>
                    {f.label}
                  </button>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </aside>
  );
}
