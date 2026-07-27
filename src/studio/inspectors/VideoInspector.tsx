import React from 'react';
import type { VideoValue } from '../../runtime/types';
import { getValue, type InspectorProps } from './TextInspector';

export default function VideoInspector({ state, dispatch, fieldKey }: InspectorProps) {
  const value = (getValue(state, fieldKey) ?? { url: '' }) as VideoValue;
  const set = (patch: Partial<VideoValue>) => dispatch({ type: 'change', field: fieldKey, value: { ...value, ...patch } });
  return (
    <div className="studio-field">
      <label>
        Video URL
        <input type="text" value={value.url} onChange={(e) => set({ url: e.target.value })} />
      </label>
      <label>
        Poster image URL
        <input type="text" value={value.poster ?? ''} onChange={(e) => set({ poster: e.target.value })} />
      </label>
    </div>
  );
}
