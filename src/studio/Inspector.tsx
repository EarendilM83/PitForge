import React from 'react';
import type { StudioState, Action } from './state';
import type { Field } from '../runtime/types';
import TextInspector from './inspectors/TextInspector';
import ImageInspector from './inspectors/ImageInspector';
import LinkInspector from './inspectors/LinkInspector';
import RepeatInspector from './inspectors/RepeatInspector';
import VideoInspector from './inspectors/VideoInspector';

/** Resolve a possibly-nested key like "games.slides.0.thumb" to its manifest field. */
export function resolveField(state: StudioState, key: string): Field | undefined {
  const fields = state.project!.manifest.fields;
  if (fields[key]) return fields[key] as Field;
  const parts = key.split('.');
  // walk down: strip numeric segments
  const norm = parts.filter((p) => !/^\d+$/.test(p)).join('.');
  if (fields[norm]) return fields[norm] as Field;
  // repeat item field: find nearest repeat prefix
  for (let i = parts.length; i > 0; i--) {
    const prefix = parts.slice(0, i).join('.');
    const f = fields[prefix] as Field | undefined;
    if (f?.type === 'repeat' && f.item) {
      const itemKey = parts.slice(i).filter((p) => !/^\d+$/.test(p)).join('.');
      return f.item[itemKey] as Field | undefined;
    }
  }
  return undefined;
}

export default function Inspector({ state, dispatch }: { state: StudioState; dispatch: React.Dispatch<Action> }) {
  const key = state.selected;
  if (!key) {
    return (
      <aside className="studio-inspector">
        <p className="studio-muted">Select anything on the page to edit it.</p>
      </aside>
    );
  }
  const field = resolveField(state, key);
  if (!field) {
    return (
      <aside className="studio-inspector">
        <code>{key}</code>
        <p className="studio-muted">This field is not declared in the manifest and cannot be edited.</p>
      </aside>
    );
  }

  const common = { state, dispatch, fieldKey: key, field };
  return (
    <aside className="studio-inspector">
      <div className="studio-inspector-head">
        <strong>{field.label}</strong>
        <code>{key}</code>
      </div>
      {(field.type === 'text' || field.type === 'heading' || field.type === 'richtext') && <TextInspector {...common} />}
      {(field.type === 'image' || field.type === 'icon') && <ImageInspector {...common} />}
      {(field.type === 'link' || field.type === 'button') && <LinkInspector {...common} />}
      {field.type === 'repeat' && <RepeatInspector {...common} />}
      {field.type === 'video' && <VideoInspector {...common} />}
      <p className="studio-muted studio-design-note">Layout, colour, spacing and typography come from the design and are not editable.</p>
    </aside>
  );
}
