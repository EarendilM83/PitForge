import React from 'react';
import type { StudioState } from './state';
import TestPanel from './TestPanel';
import QAPipeline from './QAPipeline';

/* One testing surface. Two modes under a single button:
   • Quick scan — instant client-side thumbnails + overflow/broken-image flags + the editable
     test-case checklist (fast "did I break it" glance).
   • AI QA — the deep section × breakpoint pipeline: measured Expected·Current·Delta + design-aware
     Claude review (the real gate).
   Both are the same components, rendered embedded (no own overlay chrome). */

export default function TestingPanel({ state, onClose }: { state: StudioState; onClose: () => void }) {
  const [tab, setTab] = React.useState<'scan' | 'qa'>('qa'); // default to the real gate
  return (
    <div className="pf-test-overlay">
      <div className="pf-testing-top">
        <div className="pf-test-title">◆ Test &amp; QA <span className="pf-test-sub">{state.project!.id}</span></div>
        <div className="pf-testing-tabs">
          <button className={tab === 'scan' ? 'on' : ''} onClick={() => setTab('scan')}>⚡ Quick scan</button>
          <button className={tab === 'qa' ? 'on' : ''} onClick={() => setTab('qa')}>🔬 AI QA</button>
        </div>
        <button className="pf-test-x" onClick={onClose}>✕</button>
      </div>
      <div className="pf-testing-body">
        {tab === 'scan'
          ? <TestPanel state={state} onClose={onClose} embedded />
          : <QAPipeline state={state} onClose={onClose} embedded />}
      </div>
    </div>
  );
}
