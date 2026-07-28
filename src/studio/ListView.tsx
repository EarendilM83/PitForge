import React from 'react';
import type { StudioState } from './state';
import type { Field } from '../runtime/types';

/** Gutenberg-style "List view" — the page outline as a left overlay panel. */
export default function ListView({ state, onSelect, onClose }: { state: StudioState; onSelect: (field: string | null) => void; onClose: () => void }) {
  const project = state.project!;
  const byBlock = new Map<string, [string, Field][]>();
  for (const [key, field] of Object.entries(project.manifest.fields) as [string, Field][]) {
    if (field.block === '_seo') continue;
    const list = byBlock.get(field.block) ?? [];
    list.push([key, field]);
    byBlock.set(field.block, list);
  }

  const select = (key: string) => {
    onSelect(key);
    document.querySelector(`[data-pf-field="${CSS.escape(key)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    onClose();
  };

  return (
    <div className="studio-listview">
      <div className="studio-listview-head">
        <strong>List view</strong>
        <button className="studio-btn-link" onClick={onClose} title="Close">×</button>
      </div>
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
    </div>
  );
}
