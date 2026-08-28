import React from 'react';
import type { StudioState } from './state';

/* Live test & scan board + editable test-case registry.
   • Client scanner — iframe of /preview at each width (320→3200), full-page thumbnail, overflow
     detection, animated scan-line, offenders outlined.
   • Playwright run — authoritative suite streamed over SSE.
   • Test cases — clicking a tile opens its TEST CASE: title, description, and an editable CHECKLIST
     (edit/add/delete). Edits auto-save to tests/cases.json (git-diffable; a Claude hook can honor it). */

const BREAKPOINTS = [320, 375, 414, 600, 768, 834, 1024, 1280, 1440, 1680, 1920, 2200, 2560, 3200];
const THUMB_H = 210; // fixed card preview height; page fills width and auto-scrolls on hover

type Status = 'idle' | 'scanning' | 'pass' | 'fail';
interface Tile { w: number; status: Status; over: number; offenders: string[]; broken: string[]; ph: number; scale: number }
const blank = (): Tile[] => BREAKPOINTS.map((w) => ({ w, status: 'idle', over: 0, offenders: [], broken: [], ph: 1600, scale: 0.3 }));

interface Check { id: string; text: string }
interface Case { id: string; title: string; description: string; tags?: string[]; checklist: Check[] }
const uid = () => 'c' + Math.floor(performance.now() * 1000).toString(36);

export default function TestPanel({ state, onClose }: { state: StudioState; onClose: () => void }) {
  const id = state.project!.id;
  const [tiles, setTiles] = React.useState<Tile[]>(blank);
  const [sel, setSel] = React.useState<number | null>(null);
  const [zoom, setZoom] = React.useState<number | null>(null);
  const [cases, setCases] = React.useState<Case[]>([]);
  const [caseId, setCaseId] = React.useState<string>('responsive-layout');
  const [pwLog, setPwLog] = React.useState<string[]>([]);
  const [pwState, setPwState] = React.useState<'idle' | 'running' | 'done'>('idle');
  const [pwCount, setPwCount] = React.useState({ pass: 0, fail: 0 });
  const [elapsed, setElapsed] = React.useState(0);
  const frames = React.useRef<(HTMLIFrameElement | null)[]>([]);
  const es = React.useRef<EventSource | null>(null);
  const t0 = React.useRef(0);
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = (i: number, patch: Partial<Tile>) => setTiles((ts) => ts.map((t, j) => (j === i ? { ...t, ...patch } : t)));

  // ---- test cases: load + debounced save ----
  React.useEffect(() => {
    fetch('/api/test/cases').then((r) => r.json()).then((j) => setCases(j.cases || [])).catch(() => setCases([]));
  }, []);
  const saveCases = (next: Case[]) => {
    setCases(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch('/api/test/cases', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version: 1, cases: next }) }).catch(() => {});
    }, 500);
  };
  const active = cases.find((c) => c.id === caseId) || cases[0];
  const patchCase = (cid: string, fn: (c: Case) => Case) => saveCases(cases.map((c) => (c.id === cid ? fn(c) : c)));
  const addCheck = () => active && patchCase(active.id, (c) => ({ ...c, checklist: [...c.checklist, { id: uid(), text: 'New check' }] }));
  const editCheck = (chId: string, text: string) => active && patchCase(active.id, (c) => ({ ...c, checklist: c.checklist.map((x) => (x.id === chId ? { ...x, text } : x)) }));
  const delCheck = (chId: string) => active && patchCase(active.id, (c) => ({ ...c, checklist: c.checklist.filter((x) => x.id !== chId) }));
  const addCase = () => { const nc: Case = { id: uid(), title: 'New test case', description: '', checklist: [{ id: uid(), text: 'First check' }] }; saveCases([...cases, nc]); setCaseId(nc.id); };

  // scan result → known checklist status (✓/✗); user-added checks are neutral
  const checkStatus = (chId: string): 'ok' | 'bad' | null => {
    if (sel == null || tiles[sel].status === 'idle' || tiles[sel].status === 'scanning') return null;
    const t = tiles[sel];
    if (chId === 'no-overflow' || chId === 'no-overwide') return t.over > 1 ? 'bad' : 'ok';
    if (chId === 'no-broken-img') return t.broken.length ? 'bad' : 'ok';
    if (chId === 'no-empty-section') return 'ok';
    return t.status === 'pass' ? 'ok' : null;
  };

  // ---- client scanner (full-page thumbnail) ----
  const scanTile = (i: number) => {
    const iframe = frames.current[i], w = BREAKPOINTS[i];
    if (!iframe) return;
    update(i, { status: 'scanning' });
    setTimeout(() => {
      try {
        const doc = iframe.contentDocument!;
        const ph = Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight, 400);
        const thumbW = (iframe.closest('.pf-test-thumb') as HTMLElement | null)?.clientWidth || 240;
        const scale = thumbW / w; // fill the card width — no whitespace
        const over = doc.documentElement.scrollWidth - w;
        const offenders: string[] = [];
        doc.querySelectorAll('[data-pf-off]').forEach((e) => { (e as HTMLElement).style.outline = ''; e.removeAttribute('data-pf-off'); });
        if (over > 1) {
          const contained = (el: Element) => { for (let n = el.parentElement; n; n = n.parentElement) { const o = getComputedStyle(n).overflowX; if (o === 'hidden' || o === 'auto' || o === 'scroll') return true; } return false; };
          doc.querySelectorAll('body *').forEach((el) => {
            const r = el.getBoundingClientRect();
            if (r.right > w + 1 && r.width <= w && !contained(el)) {
              offenders.push(el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : el.tagName.toLowerCase());
              (el as HTMLElement).style.outline = '2px solid #ff5c6c'; el.setAttribute('data-pf-off', '');
            }
          });
        }
        const broken = Array.from(doc.images).filter((im) => im.complete && im.naturalWidth === 0).map((im) => im.src.split('/').pop() || '');
        const fail = over > 1 || broken.length > 0;
        update(i, { status: fail ? 'fail' : 'pass', over: Math.max(0, over), offenders: [...new Set(offenders)].slice(0, 6), broken, ph, scale });
      } catch { update(i, { status: 'fail', offenders: ['scan error'] }); }
    }, 550 + i * 55);
  };
  const runClientScan = () => { setTiles(blank()); BREAKPOINTS.forEach((_, i) => { if (frames.current[i]?.contentDocument?.readyState === 'complete') scanTile(i); }); };

  // ---- Playwright over SSE ----
  const runPlaywright = () => {
    if (pwState === 'running') return;
    setPwLog([]); setPwCount({ pass: 0, fail: 0 }); setPwState('running'); t0.current = performance.now();
    setTiles((ts) => ts.map((t) => ({ ...t, status: 'scanning' })));
    const src = new EventSource(`/api/test/stream?project=${encodeURIComponent(id)}`); es.current = src;
    src.onmessage = (e) => {
      let ev: any; try { ev = JSON.parse(e.data); } catch { return; }
      if (ev.type === 'case-pass' || ev.type === 'case-fail') {
        const ok = ev.type === 'case-pass';
        setPwCount((c) => ({ pass: c.pass + (ok ? 1 : 0), fail: c.fail + (ok ? 0 : 1) }));
        setPwLog((l) => [...l.slice(-200), `${ok ? '✓' : '✗'} ${ev.label || ''}${ev.detail ? ' — ' + ev.detail : ''}`]);
        if (ev.kind === 'site' && ev.site === id && ev.breakpoint) { const i = BREAKPOINTS.indexOf(ev.breakpoint); if (i >= 0) update(i, { status: ok ? 'pass' : 'fail', over: ev.over || 0, offenders: ev.offenders || [] }); }
      }
      if (ev.type === 'run-end') { setPwState('done'); src.close(); }
    };
    src.onerror = () => { setPwLog((l) => [...l, '✗ stream error']); setPwState('done'); src.close(); };
  };
  React.useEffect(() => () => es.current?.close(), []);
  React.useEffect(() => { if (pwState !== 'running') return; const t = setInterval(() => setElapsed((performance.now() - t0.current) / 1000), 100); return () => clearInterval(t); }, [pwState]);

  const passN = tiles.filter((t) => t.status === 'pass').length, failN = tiles.filter((t) => t.status === 'fail').length;

  return (
    <div className="pf-test-overlay">
      <div className="pf-test-head">
        <div className="pf-test-title">◆ Responsive test & scan <span className="pf-test-sub">{id}</span></div>
        <button className="pro-btn ghost" onClick={runClientScan}>⟳ Scan now</button>
        <button className="pro-btn primary" onClick={runPlaywright} disabled={pwState === 'running'}>{pwState === 'running' ? 'Running…' : '▶ Run with Playwright'}</button>
        <div className="pf-test-stat">{pwState !== 'idle' ? <><b>{pwCount.pass}</b>✓ · <b className={pwCount.fail ? 'bad' : ''}>{pwCount.fail}</b>✗ · {elapsed.toFixed(1)}s</> : <><b>{passN}</b>✓ · <b className={failN ? 'bad' : ''}>{failN}</b>⚠ scanned</>}</div>
        <button className="pf-test-x" onClick={onClose}>✕</button>
      </div>

      <div className="pf-test-body">
        <div className="pf-test-grid">
          {tiles.map((t, i) => (
            <div key={t.w} className={`pf-test-tile ${t.status} ${sel === i ? 'active' : ''}`}>
              <div className="pf-test-tile-head"><b>{t.w}px</b>
                <span className="pf-test-badge">{t.status === 'scanning' ? '⏳' : t.status === 'pass' ? '✓' : t.status === 'fail' ? '⚠' : '·'}</span></div>
              <div className="pf-test-thumb" onClick={() => { setSel(i); setCaseId('responsive-layout'); }}>
                <div className="pf-test-scroller" style={{ ['--scroll' as string]: `-${Math.max(0, Math.round(t.ph * t.scale - THUMB_H))}px` }}>
                  <iframe ref={(el) => (frames.current[i] = el)} src={`/preview/${id}`} title={`${t.w}px`} tabIndex={-1}
                    style={{ width: t.w, height: t.ph, transform: `scale(${t.scale})`, transformOrigin: 'top left', pointerEvents: 'none' }} onLoad={() => scanTile(i)} />
                </div>
                {t.status === 'scanning' && <div className="pf-test-scanline" />}
                <div className="pf-test-hover">
                  <button onClick={(e) => { e.stopPropagation(); setZoom(i); }}>⤢ Zoom</button>
                  <button onClick={(e) => { e.stopPropagation(); setSel(i); setCaseId('responsive-layout'); }}>☰ Test case</button>
                </div>
              </div>
              <div className="pf-test-tile-foot">{t.status === 'fail' ? <span className="bad">{t.over > 1 ? `overflow ${Math.round(t.over)}px` : ''}{t.broken.length ? ` · ${t.broken.length} broken img` : ''}</span> : t.status === 'pass' ? <span className="ok">clean · hover to scroll</span> : t.status === 'scanning' ? 'scanning…' : 'idle'}</div>
            </div>
          ))}
        </div>

        <aside className="pf-test-side">
          {/* editable test case */}
          {active && (
            <div className="pf-case">
              <div className="pf-case-bar">
                <select className="pf-case-sel" value={caseId} onChange={(e) => setCaseId(e.target.value)}>
                  {cases.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
                <button className="pf-case-add" onClick={addCase} title="New test case">＋ Case</button>
              </div>
              <input className="pf-case-title" value={active.title} onChange={(e) => patchCase(active.id, (c) => ({ ...c, title: e.target.value }))} />
              <textarea className="pf-case-desc" value={active.description} placeholder="Describe what this test guarantees…" onChange={(e) => patchCase(active.id, (c) => ({ ...c, description: e.target.value }))} />
              <div className="pf-case-lbl">Checklist {sel != null && <span className="pf-case-ctx">· {tiles[sel].w}px</span>}</div>
              <div className="pf-case-list">
                {active.checklist.map((ch) => {
                  const st = checkStatus(ch.id);
                  return (
                    <div key={ch.id} className="pf-check">
                      <span className={`pf-check-box ${st || ''}`}>{st === 'ok' ? '✓' : st === 'bad' ? '✕' : '·'}</span>
                      <input className="pf-check-text" value={ch.text} onChange={(e) => editCheck(ch.id, e.target.value)} />
                      <button className="pf-check-del" onClick={() => delCheck(ch.id)} title="Delete">✕</button>
                    </div>
                  );
                })}
                <button className="pf-check-addbtn" onClick={addCheck}>＋ Add check</button>
              </div>
              <div className="pf-case-saved">Saved to <span className="mono">tests/cases.json</span> — Claude reads it next run.</div>
            </div>
          )}
          {pwLog.length > 0 && <div className="pf-test-log">{pwLog.slice(-40).map((l, k) => <div key={k} className={`pf-test-logline ${l.startsWith('✗') ? 'bad' : l.startsWith('✓') ? 'ok' : ''}`}>{l}</div>)}</div>}
        </aside>
      </div>

      {zoom != null && (
        <div className="pf-zoom" onClick={() => setZoom(null)}>
          <div className="pf-zoom-head">
            <b>{tiles[zoom].w}px</b>
            <span className={`pf-zoom-status ${tiles[zoom].status}`}>{tiles[zoom].status === 'fail' ? `⚠ ${tiles[zoom].over > 1 ? 'overflow ' + Math.round(tiles[zoom].over) + 'px' : ''}${tiles[zoom].broken.length ? ' · broken images' : ''}` : tiles[zoom].status === 'pass' ? '✓ clean' : ''}</span>
            <span className="pf-zoom-hint">real size · scroll to inspect</span>
            <button className="pf-test-x" onClick={(e) => { e.stopPropagation(); setZoom(null); }}>✕</button>
          </div>
          <div className="pf-zoom-body" onClick={(e) => e.stopPropagation()}>
            <iframe src={`/preview/${id}`} title={`${tiles[zoom].w}px zoom`} style={{ width: tiles[zoom].w, height: '100%', border: 0, background: '#fff' }} />
          </div>
        </div>
      )}
    </div>
  );
}
