import React from 'react';
import type { StudioState, Action } from './state';
import Inspector, { resolveField } from './Inspector';
import { isCustom } from '../seo/derive';

/** Elementor's element-selected mode: back arrow, label, Content | Style | Advanced tabs. */
export default function ElementEdit({
  state,
  dispatch,
  onBack,
}: {
  state: StudioState;
  dispatch: React.Dispatch<Action>;
  onBack: () => void;
}) {
  const [tab, setTab] = React.useState<'content' | 'style' | 'advanced'>('content');
  const key = state.selected!;
  const field = resolveField(state, key);

  return (
    <>
      <div className="studio-el-head">
        <button className="studio-el-iconbtn" title="Back" onClick={onBack}>
          ←
        </button>
        <span className="studio-el-title">
          {field?.label ?? key}
          <code className="studio-el-key">{key}</code>
        </span>
      </div>
      <div className="studio-el-tabs">
        {(['content', 'style', 'advanced'] as const).map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <div className="studio-el-body">
        {tab === 'content' &&
          (field ? (
            <Inspector state={state} dispatch={dispatch} hideHead hideDesignNote />
          ) : (
            <p className="studio-el-note">This field is not declared in the manifest and cannot be edited.</p>
          ))}
        {tab === 'style' && (
          <p className="studio-el-note">
            Style is controlled by the design. Edit in Figma and re-convert the project to change layout, colour, spacing or
            typography.
          </p>
        )}
        {tab === 'advanced' && field && (
          <dl className="studio-el-meta">
            <dt>Block</dt>
            <dd>{field.block}</dd>
            <dt>Type</dt>
            <dd>{field.type}</dd>
            {field.maxLength !== undefined && (
              <>
                <dt>Max length</dt>
                <dd>{field.maxLength} characters</dd>
              </>
            )}
            {field.ratio && (
              <>
                <dt>Image ratio</dt>
                <dd>{field.ratio}</dd>
              </>
            )}
            {field.minWidth !== undefined && (
              <>
                <dt>Min width</dt>
                <dd>{field.minWidth}px</dd>
              </>
            )}
            {field.type === 'repeat' && (
              <>
                <dt>Items</dt>
                <dd>
                  min {field.min ?? 0} · max {field.max ?? '∞'}
                </dd>
              </>
            )}
            {field.external !== undefined && (
              <>
                <dt>External link</dt>
                <dd>{field.external ? `yes (default rel: ${field.defaultRel ?? '—'})` : 'no'}</dd>
              </>
            )}
            {field.derivedFrom && (
              <>
                <dt>Derived from</dt>
                <dd>
                  <code>{field.derivedFrom}</code> — {isCustom(state.content, key) ? 'custom value' : 'follows the source'}
                </dd>
              </>
            )}
          </dl>
        )}
      </div>
    </>
  );
}
