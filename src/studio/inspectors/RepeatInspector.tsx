import React from 'react';
import type { Field } from '../../runtime/types';
import { getValue, type InspectorProps } from './TextInspector';

export default function RepeatInspector({ state, dispatch, fieldKey, field }: InspectorProps) {
  const items = ((getValue(state, fieldKey) ?? []) as Record<string, unknown>[]);
  const min = field.min ?? 0;
  const max = field.max ?? Infinity;
  const [open, setOpen] = React.useState<number | null>(null);

  const update = (next: Record<string, unknown>[]) => dispatch({ type: 'change', field: fieldKey, value: next });

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    update(next);
  };

  const addItem = () => {
    if (items.length >= max) return;
    const blank: Record<string, unknown> = {};
    for (const [k, f] of Object.entries(field.item ?? {})) {
      const ff = f as Field;
      blank[k] =
        ff.type === 'image' || ff.type === 'icon' ? { src: '', alt: '' } : ff.type === 'link' || ff.type === 'button' ? { label: '', href: '' } : '';
    }
    update([...items, blank]);
  };

  return (
    <div className="studio-field">
      <p className="studio-muted">
        {items.length} items{min ? ` · min ${min}` : ''}{max !== Infinity ? ` · max ${max}` : ''}
      </p>
      <ul className="studio-repeat-list">
        {items.map((item, i) => {
          const titleKey =
            Object.keys(field.item ?? {}).find((k) => typeof item[k] === 'string' && item[k]) ?? Object.keys(field.item ?? {})[0];
          const title = String(item[titleKey] ?? '') || `Item ${i + 1}`;
          return (
            <li key={i}>
              <div className="studio-repeat-row">
                <button className="studio-repeat-title" onClick={() => setOpen(open === i ? null : i)}>
                  {typeof item[titleKey] === 'object' ? `Item ${i + 1}` : title}
                </button>
                <button onClick={() => move(i, -1)} disabled={i === 0} title="Move up">↑</button>
                <button onClick={() => move(i, 1)} disabled={i === items.length - 1} title="Move down">↓</button>
                <button
                  onClick={() => update(items.filter((_, idx) => idx !== i))}
                  disabled={items.length <= min}
                  title={items.length <= min ? `Minimum ${min} items` : 'Remove'}
                >
                  ×
                </button>
              </div>
              {open === i && (
                <ul className="studio-repeat-fields">
                  {Object.entries(field.item ?? {}).map(([k]) => (
                    <li key={k}>
                      <button onClick={() => dispatch({ type: 'select', field: `${fieldKey}.${i}.${k}` })}>
                        <code>{fieldKey}.{i}.{k}</code>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      <button onClick={addItem} disabled={items.length >= max}>
        + Add item{items.length >= max ? ` (max ${max})` : ''}
      </button>
    </div>
  );
}
