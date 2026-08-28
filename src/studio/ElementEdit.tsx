import React from 'react';
import type { StudioState, Action } from './state';
import Inspector, { resolveField } from './Inspector';
import TagControls from './TagControls';
import { isCustom } from '../seo/derive';

/** Elementor's element-selected mode: back arrow, label, Content | Style | Advanced tabs. */
export default function ElementEdit({
  state,
  dispatch,
  onBack,
  simple = false,
}: {
  state: StudioState;
  dispatch: React.Dispatch<Action>;
  onBack: () => void;
  simple?: boolean;
}) {
  const [tab, setTab] = React.useState<'content' | 'style' | 'advanced'>('content');
  const key = state.selected!;
  const field = resolveField(state, key);
  // Structural elements (PFTag wrappers) have no manifest field — name them from the DOM label.
  const domLabel = !field
    ? document.querySelector(`[data-pf-el="${CSS.escape(key)}"]`)?.getAttribute('data-pf-label') ?? undefined
    : undefined;
  // Marketer mode: content only. Builder mode: Content | Style | Advanced.
  const tabs = simple ? (['content'] as const) : (['content', 'style', 'advanced'] as const);

  return (
    <>
      <div className="studio-el-head">
        <button className="studio-el-iconbtn" title="Back" onClick={onBack}>
          ←
        </button>
        <span className="studio-el-title">
          {field?.label ?? domLabel ?? key}
          {!simple && <code className="studio-el-key">{key}</code>}
        </span>
      </div>
      {!simple && (
        <div className="studio-el-tabs">
          {tabs.map((t) => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      )}
      <div className="studio-el-body">
        {tab === 'content' && (
          <>
            {field ? (
              <Inspector state={state} dispatch={dispatch} hideHead hideDesignNote />
            ) : (
              <p className="studio-el-note">
                This is a structural element. You can change what kind of element it is below.
              </p>
            )}
            <TagControls state={state} dispatch={dispatch} />
          </>
        )}
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
