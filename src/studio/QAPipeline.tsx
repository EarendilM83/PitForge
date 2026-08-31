import React from 'react';
import type { StudioState } from './state';

/* AI QA pipeline — a senior-QA simulation you watch run. It tests EVERY section (Header, Hero, …,
   Footer) at EVERY breakpoint: measure → screenshot the section → AI review. Results form a
   section × breakpoint matrix; every check reports EXPECTED · CURRENT · DELTA (0 to pass). Backed by
   /api/qa/stream → scripts/qa-run.mjs. */

interface Metric { id: string; label: string; expected: string; current: string; delta: number; pass: boolean; group?: string }
interface Ai { verdict: string; kind: 'ok' | 'defect' | 'recommendation' | 'skip'; notes: string; delta: number; pass: boolean; designUsed?: boolean }
interface Cell { name: string; metrics: Metric[]; evidence?: string; pass: boolean; ai?: Ai }

export default function QAPipeline({ state, onClose, embedded }: { state: StudioState; onClose: () => void; embedded?: boolean }) {
  const id = state.project!.id;
  const [plan, setPlan] = React.useState<{ breakpoints: number[]; sections: { idx: number; name: string }[]; total: number } | null>(null);
  const [globals, setGlobals] = React.useState<Metric[]>([]);
  const [gStage, setGStage] = React.useState('');
  const [curBp, setCurBp] = React.useState<number | null>(null);
  const [cells, setCells] = React.useState<Record<string, Cell>>({});
  const [status, setStatus] = React.useState<'idle' | 'running' | 'done'>('idle');
  const [totals, setTotals] = React.useState({ passed: 0, failed: 0, ms: 0 });
  const [elapsed, setElapsed] = React.useState(0);
  const [detail, setDetail] = React.useState<{ idx: number; bp: number } | null>(null);
  const es = React.useRef<EventSource | null>(null);
  const t0 = React.useRef(0);
  const key = (idx: number, bp: number) => `${idx}:${bp}`;

  const run = () => {
    if (status === 'running') return;
    setPlan(null); setGlobals([]); setGStage(''); setCurBp(null); setCells({}); setDetail(null);
    setTotals({ passed: 0, failed: 0, ms: 0 }); setStatus('running'); t0.current = performance.now();
    const src = new EventSource(`/api/qa/stream?project=${encodeURIComponent(id)}`); es.current = src;
    src.onmessage = (e) => {
      let ev: any; try { ev = JSON.parse(e.data); } catch { return; }
      if (ev.t === 'plan') setPlan({ breakpoints: ev.breakpoints, sections: ev.sections, total: ev.total });
      else if (ev.t === 'gstage') setGStage(ev.name);
      else if (ev.t === 'gmetric') setGlobals((gs) => [...gs.filter((m) => m.id !== ev.id), { id: ev.id, label: ev.label, expected: ev.expected, current: ev.current, delta: ev.delta, pass: ev.pass, group: ev.group }]);
      else if (ev.t === 'bpstage') setCurBp(ev.bp);
      else if (ev.t === 'section') setCells((c) => ({ ...c, [key(ev.idx, ev.bp)]: { name: ev.name, metrics: ev.metrics, evidence: ev.evidence, pass: ev.pass } }));
      else if (ev.t === 'section-ai') setCells((c) => { const k = key(ev.idx, ev.bp); const cur = c[k] || { name: '', metrics: [], pass: true }; return { ...c, [k]: { ...cur, ai: { verdict: ev.verdict, kind: ev.kind, notes: ev.notes, delta: ev.delta, pass: ev.pass, designUsed: ev.designUsed } } }; });
      else if (ev.t === 'done') { setTotals({ passed: ev.passed, failed: ev.failed, ms: ev.ms }); setStatus('done'); src.close(); }
      else if (ev.t === 'end') { setStatus((s) => (s === 'running' ? 'done' : s)); src.close(); }
    };
    src.onerror = () => { setStatus('done'); src.close(); };
  };
  React.useEffect(() => () => es.current?.close(), []);
  React.useEffect(() => { if (status !== 'running') return; const t = setInterval(() => setElapsed((performance.now() - t0.current) / 1000), 100); return () => clearInterval(t); }, [status]);

  const total = plan?.total || 0;
  const done = globals.length + Object.values(cells).reduce((n, c) => n + c.metrics.length + (c.ai ? 1 : 0), 0);
  const liveFail = globals.filter((m) => !m.pass).length + Object.values(cells).reduce((n, c) => n + c.metrics.filter((m) => !m.pass).length + (c.ai?.kind === 'defect' ? 1 : 0), 0);
  const liveRec = Object.values(cells).reduce((n, c) => n + (c.ai?.kind === 'recommendation' ? 1 : 0), 0);
  const dCell = detail ? cells[key(detail.idx, detail.bp)] : null;
  const dName = detail ? plan?.sections.find((s) => s.idx === detail.idx)?.name : '';

  return (
    <div className={embedded ? 'pf-test-embed' : 'pf-test-overlay'}>
      <div className="pf-test-head">
        {!embedded && <div className="pf-test-title">◆ AI QA — sections × breakpoints <span className="pf-test-sub">{id}</span></div>}
        <button className="pro-btn primary" onClick={run} disabled={status === 'running'}>{status === 'running' ? (curBp ? `Testing @ ${curBp}px…` : 'Running…') : status === 'done' ? '↻ Re-run' : '▶ Run AI QA'}</button>
        <div className="pf-test-stat">{status === 'idle' ? 'expected = design + UX judgment · current = built · delta 0 to pass'
          : <>{done}/{total} · <b className={liveFail ? 'bad' : ''}>{liveFail}</b> defects · <b className="rec">{liveRec}</b> 💡 · {(status === 'done' ? totals.ms / 1000 : elapsed).toFixed(1)}s</>}</div>
        {!embedded && <button className="pf-test-x" onClick={onClose}>✕</button>}
      </div>
      {plan && status !== 'idle' && <div className="qa-progress"><div className="qa-progress-bar" style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></div>}

      <div className="pf-test-body qa-body">
        {!plan && status === 'idle' && (
          <div className="qa-intro">
            <h3>Every section, every breakpoint — measured, screenshotted, AI-reviewed.</h3>
            <p>The pipeline finds each section (Header, Hero, …, Footer) and tests it at every width 320→3200:
              measure (overflow, height, images, text), <b>screenshot the section</b>, and have your local
              Claude review it. Each cell shows the result; click one to see <b>Expected · Current · Delta</b>
              and the evidence. This takes real time — it is not an instant label.</p>
            <button className="pro-btn primary" onClick={run}>▶ Run AI QA</button>
          </div>
        )}

        {globals.length > 0 && (
          <div className={`qa-bp ${gStage === 'Fluid' || status === 'done' ? (globals.some((m) => !m.pass) ? 'fail' : 'pass') : 'active'}`}>
            <div className="qa-bp-head"><b>Page-wide</b><div className="qa-stages"><span className="qa-stage done">✓ Semantics</span><span className="qa-stage done">✓ Code</span><span className="qa-stage done">✓ Fonts</span><span className={`qa-stage ${gStage === 'Fluid' || status === 'done' ? 'done' : 'run'}`}>{gStage === 'Fluid' || status === 'done' ? '✓' : '◐'} Fluid</span></div></div>
            <div className="qa-bp-body" style={{ gridTemplateColumns: '1fr' }}>
              <div className="qa-metrics">
                <div className="qa-metrics-hd"><span>Check</span><span>Expected</span><span>Current</span><span>Δ</span></div>
                {globals.map((m) => (
                  <div key={m.id} className={`qa-metric ${m.pass ? 'ok' : 'bad'}`}>
                    <span className="qa-m-label">{m.group && <span className="qa-grp">{m.group}</span>}{m.label}</span>
                    <span className="mono qa-m-exp">{m.expected}</span><span className="mono qa-m-cur">{m.current}</span>
                    <span className={`mono qa-m-delta ${m.delta === 0 ? 'zero' : 'nonzero'}`}>{m.delta}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {plan && (
          <div className="qa-matrix" style={{ gridTemplateColumns: `150px repeat(${plan.breakpoints.length}, 1fr)` }}>
            <div className="qa-mx-corner">Section ↓ / Width →</div>
            {plan.breakpoints.map((bp) => <div key={bp} className={`qa-mx-colh ${curBp === bp && status === 'running' ? 'active' : ''}`}>{bp}px</div>)}
            {plan.sections.map((sec) => (
              <React.Fragment key={sec.idx}>
                <div className="qa-mx-name">{sec.name}</div>
                {plan.breakpoints.map((bp) => {
                  const c = cells[key(sec.idx, bp)];
                  const fails = c ? c.metrics.filter((m) => !m.pass).length + (c.ai?.kind === 'defect' ? 1 : 0) : 0;
                  const rec = c?.ai?.kind === 'recommendation';
                  return (
                    <button key={bp} className={`qa-cell ${c ? (fails ? 'fail' : rec ? 'rec' : 'pass') : 'pending'}`} onClick={() => c && setDetail({ idx: sec.idx, bp })} disabled={!c} title={c ? `${sec.name} @ ${bp}px` : 'pending'}>
                      {c?.evidence ? <img src={c.evidence} alt="" loading="lazy" /> : <span className="qa-cell-wait">·</span>}
                      {c && (fails ? <span className="qa-cell-badge bad">✕{fails}</span> : rec ? <span className="qa-cell-badge rec">💡</span> : <span className="qa-cell-badge ok">✓</span>)}
                      {c?.ai && c.ai.kind !== 'skip' && <span className={`qa-cell-ai ${c.ai.kind}`}>{c.ai.kind === 'recommendation' ? '💡' : '🤖'}</span>}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {detail && dCell && (
        <div className="pf-zoom" onClick={() => setDetail(null)}>
          <div className="pf-zoom-head"><b>{dName} <span className="mono" style={{ color: '#6d7cff' }}>@ {detail.bp}px</span></b>
            <span className="pf-zoom-hint">section evidence · expected vs current vs delta</span>
            <button className="pf-test-x" onClick={(e) => { e.stopPropagation(); setDetail(null); }}>✕</button></div>
          <div className="qa-detail" onClick={(e) => e.stopPropagation()}>
            <div className="qa-detail-shot">{dCell.evidence && <img src={dCell.evidence} alt="evidence" />}</div>
            <div className="qa-detail-meta">
              <div className="qa-metrics">
                <div className="qa-metrics-hd"><span>Check</span><span>Expected</span><span>Current</span><span>Δ</span></div>
                {dCell.metrics.map((m) => (
                  <div key={m.id} className={`qa-metric ${m.pass ? 'ok' : 'bad'}`}>
                    <span className="qa-m-label">{m.group && <span className="qa-grp">{m.group}</span>}{m.label}</span>
                    <span className="mono qa-m-exp">{m.expected}</span><span className="mono qa-m-cur">{m.current}</span>
                    <span className={`mono qa-m-delta ${m.delta === 0 ? 'zero' : 'nonzero'}`}>{m.delta}</span>
                  </div>
                ))}
                {dCell.ai && (
                  <div className={`qa-metric ai ${dCell.ai.kind}`}>
                    <span className="qa-m-label">{dCell.ai.kind === 'recommendation' ? '💡 UX recommendation' : dCell.ai.kind === 'defect' ? '🤖 AI defect' : '🤖 AI review'}{' '}
                      <span className="qa-grp" title={dCell.ai.designUsed ? 'Compared to the Figma design source' : 'No Figma source for this section — UI/UX best-practice judgment'}>{dCell.ai.designUsed ? 'vs Figma' : 'UX best-practice'}</span></span>
                    <span className="qa-m-exp">{dCell.ai.designUsed ? 'design-faithful' : 'no UX issues'}</span>
                    <span className="qa-m-cur qa-ai-notes">{dCell.ai.notes || dCell.ai.verdict}</span>
                    <span className={`mono qa-m-delta ${dCell.ai.delta === 0 ? 'zero' : 'nonzero'}`}>{dCell.ai.delta}</span>
                  </div>
                )}
                {!dCell.ai && <p className="pro-empty" style={{ padding: '8px 4px' }}>AI review runs on a mobile + a desktop width; measurements run at every width. Add Figma refs at <code>projects/&lt;id&gt;/design/&lt;Block&gt;.png</code> to compare against the design.</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
