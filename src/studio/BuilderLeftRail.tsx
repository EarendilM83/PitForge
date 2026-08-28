import React from 'react';
import type { StudioState, Action } from './state';
import BuilderLayers from './BuilderLayers';

/* Left rail — Layers (the section-grouped navigator) and an Insert palette. Insert is presentational
   for now: PitForge's structure is locked (sections come from Figma), so adding arbitrary elements
   isn't wired — the palette shows the vision and the disabled state makes that honest. */

const PALETTE: [string, string, string][][] = [
  [['Text', '◈', 'Heading'], ['Text', '¶', 'Paragraph'], ['Text', '▭', 'Button'], ['Text', '↗', 'Link']],
  [['Media', '🖼', 'Image'], ['Media', '▶', 'Video'], ['Media', '◍', 'Icon'], ['Media', '▦', 'Gallery']],
  [['Layout', '▭', 'Container'], ['Layout', '▤', 'Grid'], ['Layout', '≡', 'Stack'], ['Layout', '✦', 'Section']],
];

export default function BuilderLeftRail({ state, dispatch }: { state: StudioState; dispatch: React.Dispatch<Action> }) {
  const [tab, setTab] = React.useState<'layers' | 'insert'>('layers');
  return (
    <div className="pro-rail">
      <div className="pro-rail-tabs">
        <button className={tab === 'layers' ? 'on' : ''} onClick={() => setTab('layers')}>Layers</button>
        <button className={tab === 'insert' ? 'on' : ''} onClick={() => setTab('insert')}>Insert</button>
      </div>
      {tab === 'layers' ? (
        <BuilderLayers state={state} dispatch={dispatch} />
      ) : (
        <div className="pro-rail-body">
          <div className="pro-soon-banner"><span className="pro-soon-pill">Coming soon</span>
            Drag-and-drop insert is on the way. Today, sections come from your Figma design.</div>
          {['Text', 'Media', 'Layout'].map((group, gi) => (
            <div key={group}>
              <div className="pro-sec-label">{group}</div>
              <div className="pro-palette">
                {PALETTE[gi].map(([, ico, lab]) => (
                  <button key={lab} className="pro-pcard" disabled title="Coming soon — sections come from your Figma design">
                    <span className="pro-soon-tag">Soon</span>
                    <span className="ico">{ico}</span><span className="lab">{lab}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          <p className="pro-empty" style={{ marginTop: 14 }}>Re-import from Figma to add or change sections.</p>
        </div>
      )}
    </div>
  );
}
