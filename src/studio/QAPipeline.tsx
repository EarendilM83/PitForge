import React from 'react';
import type { StudioState } from './state';

/* AI QA pipeline — a senior-QA simulation you watch run. For each breakpoint it streams real stages
   (navigate → measure → screenshot → AI review); every check shows EXPECTED · CURRENT · DELTA (0 to
   pass), with the screenshot as evidence and a Claude visual verdict. Not a label check: it takes
   real time and produces evidence. Backed by /api/qa/stream → scripts/qa-run.mjs. */

const STAGES = ['navigate', 'measure', 'evidence', 'ai'] as const;
const STAGE_LABEL: Record<string, string> = { navigate: 'Navigate', measure: 'Measure', evidence: 'Screenshot', ai: 'AI review' };

interface Metric { id: string; label: string; expected: string; current: string; delta: number; pass: boolean; group?: string }
interface Ai { verdict: string; notes: string; ms: number; pass: boolean; delta: number }
interface Bp { stage: string; done: boolean; metrics: Metric[]; evidence?: string; ai?: Ai }

export default function QAPipeline({ state, onClose }: { state: StudioState; onClose: () => void }) {
  const id = state.project!.id;
  const [plan, setPlan] = React.useState<{ breakpoints: number[]; total: number } | null>(null);
  const [bps, setBps] = React.useState<Record<number, Bp>>({});
  const [globals, setGlobals] = React.useState<Metric[]>([]);
  const [gStage, setGStage] = React.useState('');
  const [status, setStatus] = React.useState<'idle' | 'running' | 'done'>('idle');
  const [totals, setTotals] = React.useState({ passed: 0, failed: 0, ms: 0 });
  const [elapsed, setElapsed] = React.useState(0);
  const [zoom, setZoom] = React.useState<string | null>(null);
  const es = React.useRef<EventSource | null>(null);
  const t0 = React.useRef(0);

  const patchBp = (bp: number, fn: (b: Bp) => Bp) => setBps((s) => ({ ...s, [bp]: fn(s[bp] || { stage: '', done: false, metrics: [] }) }));

  const run = () => {
    if (status === 'running') return;
    setBps({}); setPlan(null); setGlobals([]); setGStage(''); setTotals({ passed: 0, failed: 0, ms: 0 }); setStatus('running'); t0.current = performance.now();
    const src = new EventSource(`/api/qa/stream?project=${encodeURIComponent(id)}`); es.current = src;
    src.onmessage = (e) => {
      let ev: any; try { ev = JSON.parse(e.data); } catch { return; }
      if (ev.t === 'plan') { setPlan({ breakpoints: ev.breakpoints, total: ev.total }); const init: Record<number, Bp> = {}; ev.breakpoints.forEach((b: number) => (init[b] = { stage: '', done: false, metrics: [] })); setBps(init); }
      else if (ev.t === 'gstage') setGStage(ev.name);
      else if (ev.t === 'gmetric') setGlobals((gs) => [...gs.filter((m) => m.id !== ev.id), { id: ev.id, label: ev.label, expected: ev.expected, current: ev.current, delta: ev.delta, pass: ev.pass, group: ev.group }]);
      else if (ev.t === 'stage') patchBp(ev.bp, (b) => ({ ...b, stage: ev.name }));
      else if (ev.t === 'metric') patchBp(ev.bp, (b) => ({ ...b, metrics: [...b.metrics.filter((m) => m.id !== ev.id), { id: ev.id, label: ev.label, expected: ev.expected, current: ev.current, delta: ev.delta, pass: ev.pass, group: ev.group }] }));
      else if (ev.t === 'evidence') patchBp(ev.bp, (b) => ({ ...b, evidence: ev.url }));
      else if (ev.t === 'ai') patchBp(ev.bp, (b) => ({ ...b, done: true, ai: { verdict: ev.verdict, notes: ev.notes, ms: ev.ms, pass: ev.pass, delta: ev.delta } }));
      else if (ev.t === 'done') { setTotals({ passed: ev.passed, failed: ev.failed, ms: ev.ms }); setStatus('done'); src.close(); }
      else if (ev.t === 'end') { setStatus((s) => (s === 'running' ? 'done' : s)); src.close(); }
    };
    src.onerror = () => { setStatus('done'); src.close(); };
  };
  React.useEffect(() => () => es.current?.close(), []);
  React.useEffect(() => { if (status !== 'running') return; const t = setInterval(() => setElapsed((performance.now() - t0.current) / 1000), 100); return () => clearInterval(t); }, [status]);

  const bpList = plan?.breakpoints || [];
  const totalChecks = plan?.total || 0;
  const doneChecks = globals.length + Object.values(bps).reduce((n, b) => n + b.metrics.length + (b.ai ? 1 : 0), 0);
  const liveFail = globals.filter((m) => !m.pass).length + Object.values(bps).reduce((n, b) => n + b.metrics.filter((m) => !m.pass).length + (b.ai && !b.ai.pass && b.ai.verdict !== 'SKIP' ? 1 : 0), 0);

  return (
    <div className="pf-test-overlay">
      <div className="pf-test-head">
        <div className="pf-test-title">◆ AI QA pipeline <span className="pf-test-sub">{id}</span></div>
        <button className="pro-btn primary" onClick={run} disabled={status === 'running'}>{status === 'running' ? 'Running…' : status === 'done' ? '↻ Re-run' : '▶ Run AI QA'}</button>
        <div className="pf-test-stat">
          {status === 'idle' ? 'measures current vs expected · delta 0 to pass'
            : <>{doneChecks}/{totalChecks} checks · <b className={liveFail ? 'bad' : ''}>{liveFail}</b> Δ≠0 · {(status === 'done' ? totals.ms / 1000 : elapsed).toFixed(1)}s</>}
        </div>
        <button className="pf-test-x" onClick={onClose}>✕</button>
      </div>

      {plan && status !== 'idle' && (
        <div className="qa-progress"><div className="qa-progress-bar" style={{ width: `${totalChecks ? (doneChecks / totalChecks) * 100 : 0}%` }} /></div>
      )}

      <div className="pf-test-body qa-body">
        {!plan && status === 'idle' && (
          <div className="qa-intro">
            <h3>Senior-QA simulation — measured, staged, evidenced.</h3>
            <p>For every breakpoint the pipeline runs <b>Navigate → Measure → Screenshot → AI review</b>.
              Each check reports <b>Expected · Current · Delta</b> (delta must be 0). The AI stage sends the
              real screenshot to Claude, which inspects it like a QA engineer. This takes real time — it
              is not an instant label.</p>
            <button className="pro-btn primary" onClick={run}>▶ Run AI QA</button>
          </div>
        )}

        {(globals.length > 0 || (status === 'running' && gStage)) && (
          <div className={`qa-bp ${gStage === 'fluid' || status === 'done' ? (globals.some((m) => !m.pass) ? 'fail' : 'pass') : 'active'}`}>
            <div className="qa-bp-head">
              <b>Page-wide</b>
              <div className="qa-stages"><span className="qa-stage done">✓ Semantics</span><span className="qa-stage done">✓ Code</span><span className="qa-stage done">✓ Fonts</span><span className={`qa-stage ${gStage === 'fluid' || status === 'done' ? 'done' : 'run'}`}>{status === 'done' || gStage === 'fluid' ? '✓' : '◐'} Fluid</span></div>
              <span className="pf-test-sub">semantics · SEO · code · fonts · fluid</span>
            </div>
            <div className="qa-bp-body" style={{ gridTemplateColumns: '1fr' }}>
              <div className="qa-metrics">
                <div className="qa-metrics-hd"><span>Check</span><span>Expected</span><span>Current</span><span>Δ</span></div>
                {globals.map((m) => (
                  <div key={m.id} className={`qa-metric ${m.pass ? 'ok' : 'bad'}`}>
                    <span className="qa-m-label">{m.group ? <span className="qa-grp">{m.group}</span> : null}{m.label}</span>
                    <span className="mono qa-m-exp">{m.expected}</span>
                    <span className="mono qa-m-cur">{m.current}</span>
                    <span className={`mono qa-m-delta ${m.delta === 0 ? 'zero' : 'nonzero'}`}>{m.delta}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {bpList.map((bp) => {
          const b = bps[bp] || { stage: '', done: false, metrics: [] };
          const active = status === 'running' && b.stage && !b.done;
          const failed = b.metrics.some((m) => !m.pass) || (b.ai && !b.ai.pass && b.ai.verdict !== 'SKIP');
          return (
            <div key={bp} className={`qa-bp ${b.done ? (failed ? 'fail' : 'pass') : active ? 'active' : ''}`}>
              <div className="qa-bp-head">
                <b className="mono">{bp}px</b>
                <div className="qa-stages">
                  {STAGES.map((st) => {
                    const reached = STAGES.indexOf(st as any) < STAGES.indexOf(b.stage as any) || b.done || (st === b.stage);
                    const passed = STAGES.indexOf(st as any) < STAGES.indexOf(b.stage as any) || b.done;
                    return <span key={st} className={`qa-stage ${passed ? 'done' : st === b.stage && active ? 'run' : reached ? 'run' : ''}`}>{passed ? '✓' : st === b.stage && active ? '◐' : '·'} {STAGE_LABEL[st]}</span>;
                  })}
                </div>
                <span className={`qa-verdict ${b.ai ? (b.ai.verdict === 'PASS' ? 'ok' : b.ai.verdict === 'SKIP' ? 'skip' : 'bad') : ''}`}>{b.ai ? b.ai.verdict : ''}</span>
              </div>

              <div className="qa-bp-body">
                <div className="qa-metrics">
                  <div className="qa-metrics-hd"><span>Check</span><span>Expected</span><span>Current</span><span>Δ</span></div>
                  {b.metrics.map((m) => (
                    <div key={m.id} className={`qa-metric ${m.pass ? 'ok' : 'bad'}`}>
                      <span className="qa-m-label">{m.group ? <span className="qa-grp">{m.group}</span> : null}{m.label}</span>
                      <span className="mono qa-m-exp">{m.expected}</span>
                      <span className="mono qa-m-cur">{m.current}</span>
                      <span className={`mono qa-m-delta ${m.delta === 0 ? 'zero' : 'nonzero'}`}>{m.delta}</span>
                    </div>
                  ))}
                  {b.ai && (
                    <div className={`qa-metric ai ${b.ai.pass ? 'ok' : b.ai.verdict === 'SKIP' ? 'skip' : 'bad'}`}>
                      <span className="qa-m-label">🤖 AI visual review</span>
                      <span className="qa-m-exp">no defects</span>
                      <span className="qa-m-cur qa-ai-notes">{b.ai.notes || b.ai.verdict}</span>
                      <span className={`mono qa-m-delta ${b.ai.delta === 0 ? 'zero' : 'nonzero'}`}>{b.ai.delta}</span>
                    </div>
                  )}
                </div>
                <button className="qa-evidence" onClick={() => b.evidence && setZoom(b.evidence)} disabled={!b.evidence} title="Evidence — click to enlarge">
                  {b.evidence ? <img src={b.evidence} alt={`${bp}px evidence`} /> : <span className="qa-evidence-wait">{b.stage === 'evidence' || (b.stage === 'ai') ? 'capturing…' : 'evidence'}</span>}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {zoom && (
        <div className="pf-zoom" onClick={() => setZoom(null)}>
          <div className="pf-zoom-head"><b>Evidence</b><span className="pf-zoom-hint">click outside to close</span><button className="pf-test-x" onClick={(e) => { e.stopPropagation(); setZoom(null); }}>✕</button></div>
          <div className="pf-zoom-body" onClick={(e) => e.stopPropagation()}><img src={zoom} alt="evidence" style={{ maxWidth: '100%' }} /></div>
        </div>
      )}
    </div>
  );
}
