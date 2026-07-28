import React from 'react';
import type { StudioState } from './state';
import type { Field } from '../runtime/types';

const BLOCK_ICONS = ['▦', '▣', '▤', '▥', '▧', '▨', '▩'];

/** Elementor "Elements" tab — the page's blocks as a widget/navigator tree. */
export default function ElementsPanel({ state, onSelect }: { state: StudioState; onSelect: (field: string | null) => void }) {
  const project = state.project!;
  const [openBlock, setOpenBlock] = React.useState<string | null>(project.config.blocks[0] ?? null);

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
  };

  return (
    <ul className="studio-el-elements">
      {project.config.blocks.map((block, i) => {
        const open = openBlock === block;
        return (
          <li key={block}>
            <button className={`studio-el-blockrow ${open ? 'open' : ''}`} onClick={() => setOpenBlock(open ? null : block)}>
              <span className="studio-el-blockicon">{BLOCK_ICONS[i % BLOCK_ICONS.length]}</span>
              {block}
              <span className="studio-el-chevron">{open ? '▾' : '▸'}</span>
            </button>
            <ul style={open ? undefined : { display: 'none' }}>
              {(byBlock.get(block) ?? []).map(([key, f]) => (
                <li key={key}>
                  <button className={`studio-el-fieldrow ${state.selected === key ? 'active' : ''}`} onClick={() => select(key)} title={key}>
                    {f.label}
                    <span className="studio-el-fieldtype">{f.type}</span>
                  </button>
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
