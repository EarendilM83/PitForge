import React from 'react';
import type { StudioState, Action } from '../state';
import type { Field } from '../../runtime/types';

export interface InspectorProps {
  state: StudioState;
  dispatch: React.Dispatch<Action>;
  fieldKey: string;
  field: Field;
}

/** Get the base (English source) value for a (possibly nested) key. */
export function getValue(state: StudioState, key: string): unknown {
  if (key in state.content) return state.content[key];
  const parts = key.split('.');
  for (let i = parts.length; i > 0; i--) {
    const prefix = parts.slice(0, i).join('.');
    const v = state.content[prefix];
    if (Array.isArray(v)) {
      let cur: unknown = v[Number(parts[i])];
      for (let j = i + 1; j < parts.length; j++) cur = (cur as Record<string, unknown>)?.[parts[j]];
      return cur;
    }
  }
  return state.content[key];
}

/** Translation for the active language, if any (content._t[lang][key]). */
function getTranslation(state: StudioState, key: string): string | undefined {
  const t = (state.content['_t'] as Record<string, Record<string, unknown>> | undefined)?.[state.activeLang];
  return t && key in t ? String(t[key] ?? '') : undefined;
}

export default function TextInspector({ state, dispatch, fieldKey, field }: InspectorProps) {
  const source = String(getValue(state, fieldKey) ?? '');
  const translating = state.activeLang !== 'en';
  // When translating, the box shows this language's value; the English source is the placeholder.
  const value = translating ? getTranslation(state, fieldKey) ?? '' : source;
  const max = field.maxLength;
  const len = value.length;
  const pct = max ? Math.min(100, (len / max) * 100) : 0;
  const over = max !== undefined && len > max;

  return (
    <div className="studio-field">
      {translating && (
        <div className="studio-i18n-hint">
          Translating to <b>{state.activeLang.toUpperCase()}</b> — leave blank to use English.
          {source && <div className="studio-i18n-src">🇬🇧 {source}</div>}
        </div>
      )}
      {field.type === 'richtext' && (
        <div className="studio-richtext-bar">
          <button onClick={() => wrap('b')}>B</button>
          <button onClick={() => wrap('i')}>I</button>
          <button onClick={() => wrap('a')}>Link</button>
        </div>
      )}
      <textarea
        rows={field.type === 'heading' ? 2 : 4}
        value={value}
        placeholder={translating ? source : undefined}
        onChange={(e) => dispatch({ type: 'change', field: fieldKey, value: e.target.value })}
      />
      {max !== undefined && (
        <div className={`studio-meter ${over ? 'over' : ''}`}>
          <div className="studio-meter-bar" style={{ width: `${pct}%` }} />
          <span>
            {len}/{max}
          </span>
        </div>
      )}
      {field.derivedFrom && (
        <DerivedNote state={state} dispatch={dispatch} fieldKey={fieldKey} source={field.derivedFrom} />
      )}
    </div>
  );

  function wrap(tag: string) {
    const sel = window.getSelection()?.toString() || '';
    const html = tag === 'a' ? `<a href="">${sel}</a>` : `<${tag}>${sel}</${tag}>`;
    dispatch({ type: 'change', field: fieldKey, value: value + html });
  }
}

function DerivedNote({ state, dispatch, fieldKey, source }: { state: StudioState; dispatch: React.Dispatch<Action>; fieldKey: string; source: string }) {
  const custom = (state.content['seo._custom'] as string[] | undefined) ?? [];
  const isCustom = custom.includes(fieldKey);
  const sourceLabel = (state.project!.manifest.fields[source] as Field | undefined)?.label || source;
  return (
    <p className="studio-sync-note">
      {isCustom ? (
        <>
          <span className="studio-badge">custom</span>{' '}
          <button
            onClick={() => {
              dispatch({ type: 'change', field: 'seo._custom', value: custom.filter((k) => k !== fieldKey) });
              dispatch({ type: 'change', field: fieldKey, value: String(getValue(state, source) ?? '') });
            }}
          >
            reset to synced
          </button>
        </>
      ) : (
        <span className="studio-badge studio-badge-sync">synced from {sourceLabel}</span>
      )}
    </p>
  );
}
