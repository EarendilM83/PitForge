import React from 'react';
import type { LinkValue } from '../../runtime/types';
import { getValue, type InspectorProps } from './TextInspector';

const REL_CHOICES = ['nofollow', 'sponsored', 'ugc', 'noopener'];

export default function LinkInspector({ state, dispatch, fieldKey, field }: InspectorProps) {
  const value = (getValue(state, fieldKey) ?? { label: '', href: '' }) as LinkValue;
  const set = (patch: Partial<LinkValue>) => dispatch({ type: 'change', field: fieldKey, value: { ...value, ...patch } });
  const relSet = new Set((value.rel || '').split(/\s+/).filter(Boolean));
  const external = field.type === 'link' || field.type === 'button' ? field.external : false;

  return (
    <div className="studio-field">
      <label>
        Label
        <input type="text" value={value.label} onChange={(e) => set({ label: e.target.value })} />
      </label>
      <label>
        URL
        <input type="text" value={value.href} onChange={(e) => set({ href: e.target.value })} />
      </label>
      <div className="studio-chips">
        {REL_CHOICES.map((r) => (
          <button
            key={r}
            className={relSet.has(r) ? 'chip active' : 'chip'}
            onClick={() => {
              if (relSet.has(r)) relSet.delete(r);
              else relSet.add(r);
              set({ rel: [...relSet].join(' ') });
            }}
          >
            {r}
          </button>
        ))}
      </div>
      {external && <p className="studio-muted">External link: opens in a new tab; <code>noopener</code> is always added.</p>}
      {field.type === 'button' && field.variant && <p className="studio-muted">Variant: {field.variant}</p>}
    </div>
  );
}
