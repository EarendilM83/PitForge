import React from 'react';
import Icon from './Icon';

/* A self-running "watch Claude build a site" sequence:
   ask -> build section by section -> gates run & self-correct -> export -> celebrate. Loops. */

type Chk = 'idle' | 'run' | 'ok' | 'warn';
type Phase = 'ask' | 'build' | 'test' | 'ship';
interface Frame {
  phase: Phase;
  status: string;
  blocks: number;
  checks: { responsive: Chk; h1: Chk; order: Chk; meta: Chk };
  exporting?: boolean;
  celebrate?: boolean;
  dur: number;
}
const I = { responsive: 'idle', h1: 'idle', order: 'idle', meta: 'idle' } as const;
const OK = { responsive: 'ok', h1: 'ok', order: 'ok', meta: 'ok' } as const;

const FRAMES: Frame[] = [
  { phase: 'ask', status: 'Reading your request…', blocks: 0, checks: { ...I }, dur: 2800 },
  { phase: 'build', status: 'Reading the Figma design', blocks: 1, checks: { ...I }, dur: 900 },
  { phase: 'build', status: 'Scaffolding the project', blocks: 1, checks: { ...I }, dur: 700 },
  { phase: 'build', status: 'Building the hero', blocks: 2, checks: { ...I }, dur: 820 },
  { phase: 'build', status: 'Building the game grid', blocks: 3, checks: { ...I }, dur: 820 },
  { phase: 'build', status: 'Building the FAQ', blocks: 4, checks: { ...I }, dur: 820 },
  { phase: 'build', status: 'Finishing the footer & CTA', blocks: 5, checks: { ...I }, dur: 820 },
  { phase: 'test', status: 'Responsive gate · 320 → 2200px', blocks: 5, checks: { responsive: 'run', h1: 'idle', order: 'idle', meta: 'idle' }, dur: 1050 },
  { phase: 'test', status: 'Checking the heading order…', blocks: 5, checks: { responsive: 'ok', h1: 'ok', order: 'warn', meta: 'idle' }, dur: 1050 },
  { phase: 'test', status: 'Adjusting: demoting a second H1', blocks: 5, checks: { responsive: 'ok', h1: 'ok', order: 'run', meta: 'idle' }, dur: 950 },
  { phase: 'test', status: 'SEO checks · 16 passing', blocks: 5, checks: { responsive: 'ok', h1: 'ok', order: 'ok', meta: 'run' }, dur: 950 },
  { phase: 'test', status: 'All gates passed', blocks: 5, checks: { ...OK }, dur: 850 },
  { phase: 'ship', status: 'Exporting the bundle…', blocks: 5, checks: { ...OK }, exporting: true, dur: 1050 },
  { phase: 'ship', status: 'Ready to deploy', blocks: 5, checks: { ...OK }, celebrate: true, dur: 3000 },
];

const PROMPT = 'Build a Dogecoin casino landing page — hero, game grid, FAQ.';
const STEPPER: { key: Phase; label: string }[] = [
  { key: 'ask', label: 'Describe' },
  { key: 'build', label: 'Build' },
  { key: 'test', label: 'Test' },
  { key: 'ship', label: 'Ship' },
];
const BLOCKS = ['hero', 'copy', 'games', 'faq', 'cta'];

function ChkRow({ label, state }: { label: string; state: Chk }) {
  return (
    <div className={`pf-demo-chk ${state}`}>
      <span className="ic">
        {state === 'ok' && <Icon name="check" size={13} stroke={2.6} />}
        {state === 'warn' && <Icon name="warn" size={13} stroke={2.2} />}
        {state === 'run' && <span className="spin" />}
        {state === 'idle' && <span className="idot" />}
      </span>
      {label}
    </div>
  );
}

export default function BuildDemo() {
  const [step, setStep] = React.useState(0);
  const [loop, setLoop] = React.useState(0);

  React.useEffect(() => {
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const run = () => {
      setStep(i);
      timer = setTimeout(() => {
        i = (i + 1) % FRAMES.length;
        if (i === 0) setLoop((l) => l + 1);
        run();
      }, FRAMES[i].dur);
    };
    run();
    return () => clearTimeout(timer);
  }, []);

  const f = FRAMES[step];
  const checksOn = f.phase === 'test' || f.phase === 'ship';
  const confetti = React.useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        left: (i * 2.75 + ((i * 37) % 11)) % 100,
        delay: ((i * 53) % 60) / 100,
        dur: 1.7 + ((i * 29) % 14) / 10,
        hue: ['#0c66e4', '#6554c0', '#22b8cf', '#22a06b', '#f5b638'][i % 5],
        rot: (i * 47) % 360,
      })),
    []
  );

  return (
    <div className={`pf-demo phase-${f.phase} ${f.celebrate ? 'celebrate' : ''}`}>
      {/* the ask */}
      <div className="pf-demo-ask">
        <span className="pf-demo-ask-badge"><Icon name="spark" size={14} /> You</span>
        <span className="pf-demo-ask-text" key={loop}>
          {PROMPT.split(' ').map((w, i) => (
            <span className="w" style={{ animationDelay: `${i * 90}ms` }} key={i}>{w}&nbsp;</span>
          ))}
          <span className="caret" />
        </span>
      </div>

      {/* browser preview */}
      <div className="pf-demo-window">
        <div className="pf-demo-bar"><i /><i /><i /><span className="url">localhost:4321/preview/dogecoin-casino</span></div>
        <div className="pf-demo-body">
          <div className={`pf-demo-blk hero ${f.blocks > 0 ? 'in' : ''}`}><span className="t" /><span className="s" /></div>
          <div className={`pf-demo-blk copy ${f.blocks > 1 ? 'in' : ''}`}><span /><span /></div>
          <div className={`pf-demo-blk games ${f.blocks > 2 ? 'in' : ''}`}><span /><span /><span /><span /></div>
          <div className={`pf-demo-blk faq ${f.blocks > 3 ? 'in' : ''}`}><span /><span /></div>
          <div className={`pf-demo-blk cta ${f.blocks > 4 ? 'in' : ''}`} />

          {/* gates overlay */}
          <div className={`pf-demo-checks ${checksOn ? 'show' : ''}`}>
            <div className="pf-demo-checks-h"><Icon name="shield" size={15} /> Quality gates</div>
            <ChkRow label="Responsive · 320 → 2200px" state={f.checks.responsive} />
            <ChkRow label="Exactly one H1" state={f.checks.h1} />
            <ChkRow label="Heading order" state={f.checks.order} />
            <ChkRow label="Meta &amp; schema" state={f.checks.meta} />
          </div>

          {/* celebration */}
          {f.celebrate && (
            <>
              <div className="pf-demo-confetti">
                {confetti.map((c, i) => (
                  <span key={i} style={{ left: `${c.left}%`, background: c.hue, animationDelay: `${c.delay}s`, animationDuration: `${c.dur}s`, ['--r' as string]: `${c.rot}deg` } as React.CSSProperties} />
                ))}
              </div>
              <div className="pf-demo-badge"><Icon name="check" size={18} stroke={2.6} /> Exported · ready to deploy</div>
            </>
          )}
        </div>
      </div>

      {/* console + stepper */}
      <div className="pf-demo-console">
        <span className="pf-demo-console-ic">
          {f.phase === 'ship' && !f.exporting ? <Icon name="rocket" size={15} /> : f.status === 'All gates passed' ? <Icon name="check" size={15} stroke={2.6} /> : <span className="spin dark" />}
        </span>
        <span className="pf-demo-console-t" key={f.status}>{f.status}</span>
        <div className="pf-demo-stepper">
          {STEPPER.map((s) => (
            <span key={s.key} className={`dot ${s.key === f.phase ? 'active' : ''} ${STEPPER.findIndex((x) => x.key === f.phase) > STEPPER.findIndex((x) => x.key === s.key) ? 'done' : ''}`} title={s.label} />
          ))}
        </div>
      </div>
    </div>
  );
}
