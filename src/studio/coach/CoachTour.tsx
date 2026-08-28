import React from 'react';
import Hummingbird from './Hummingbird';
import { sound } from './sound';
import './coach.css';

/* A non-modal coach tour: spotlights real spots in the Studio and narrates them
   through Zippy the hummingbird. Steps target live DOM elements by selector. */

interface Step { target?: string; title: string; text: string }

const STEPS: Step[] = [
  {
    title: 'Hi, I’m Zippy!',
    text: 'I’ll show you around in a few quick hops. This is your Sites workspace — where everything starts.',
  },
  {
    target: '.pf-dash-side nav',
    title: 'Your menu',
    text: 'Jump between Home, the guided Setup, the User Guide, and your Sites right here.',
  },
  {
    target: '.pf-dash-new',
    title: 'Start here',
    text: 'Click “New site” to turn a Figma design into a real, editable page. This is where the magic begins.',
  },
  {
    target: '.pf-dash-grid .pf-card:not(.pf-card-new)',
    title: 'Your sites live here',
    text: 'Each card is a landing page. Open one to edit its words and images, preview it, or export it.',
  },
  {
    target: '.pf-dash-help',
    title: 'Need me again?',
    text: 'That’s the tour! Tap “How it works” any time and I’ll come right back. Now go build something lovely.',
  },
];

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export default function CoachTour({ onClose }: { onClose: () => void }) {
  const [i, setI] = React.useState(0);
  const [rect, setRect] = React.useState<DOMRect | null>(null);
  const [tick, setTick] = React.useState(0);
  const [vp, setVp] = React.useState({ w: window.innerWidth, h: window.innerHeight });
  const [muted, setMuted] = React.useState(sound.muted);

  const step = STEPS[i];
  const last = i === STEPS.length - 1;
  const next = React.useCallback(() => {
    if (last) { sound.done(); onClose(); }
    else { sound.hop(); setI((n) => n + 1); }
  }, [last, onClose]);
  const back = React.useCallback(() => { sound.back(); setI((n) => Math.max(0, n - 1)); }, []);
  const toggleMute = () => { const m = !muted; sound.setMuted(m); setMuted(m); };

  // Zippy chirps hello when he arrives.
  React.useEffect(() => { sound.chirp(); }, []);

  // Measure the current target (after scrolling it into view).
  React.useLayoutEffect(() => {
    const el = step.target ? (document.querySelector(step.target) as HTMLElement | null) : null;
    if (!el) { setRect(null); return; }
    el.scrollIntoView({ block: 'center', inline: 'nearest' });
    let raf = requestAnimationFrame(() => { raf = requestAnimationFrame(() => setRect(el.getBoundingClientRect())); });
    return () => cancelAnimationFrame(raf);
  }, [i, tick, step.target]);

  // Keep positions fresh on resize / scroll.
  React.useEffect(() => {
    const on = () => { setVp({ w: window.innerWidth, h: window.innerHeight }); setTick((t) => t + 1); };
    window.addEventListener('resize', on);
    window.addEventListener('scroll', on, true);
    return () => { window.removeEventListener('resize', on); window.removeEventListener('scroll', on, true); };
  }, []);

  // Keyboard: Esc to leave, arrows to move.
  React.useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      else if (e.key === 'ArrowLeft') back();
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [next, back, onClose]);

  // Card placement relative to the target.
  const CW = 344, CH = 214, m = 16, gap = 22;
  let left: number, top: number, place: 'below' | 'above' | 'center';
  if (!rect) {
    left = (vp.w - CW) / 2; top = (vp.h - CH) / 2; place = 'center';
  } else {
    left = clamp(rect.left + rect.width / 2 - CW / 2, m, vp.w - CW - m);
    if (rect.bottom + gap + CH <= vp.h) { top = rect.bottom + gap; place = 'below'; }
    else if (rect.top - gap - CH >= 0) { top = rect.top - gap - CH; place = 'above'; }
    else { top = clamp((vp.h - CH) / 2, m, vp.h - CH - m); place = 'below'; }
  }

  return (
    <div className="coach" role="dialog" aria-label="Guided tour">
      <div className="coach-catch" onClick={next} />
      {rect ? (
        <div
          className="coach-spot"
          style={{ left: rect.left - 8, top: rect.top - 8, width: rect.width + 16, height: rect.height + 16 }}
        />
      ) : (
        <div className="coach-dim" />
      )}

      <div className={`coach-card place-${place}`} style={{ left, top, width: CW }}>
        <div className="coach-bird"><Hummingbird size={94} mood={last ? 'wave' : 'point'} /></div>
        <div className="coach-badge">Zippy</div>
        <h4 className="coach-title">{step.title}</h4>
        <p className="coach-text">{step.text}</p>
        <div className="coach-foot">
          <div className="coach-foot-l">
            <button className="coach-mute" onClick={toggleMute} aria-label={muted ? 'Turn sound on' : 'Turn sound off'} title={muted ? 'Sound off' : 'Sound on'}>
              {muted ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4Z" /><path d="m16 9 5 5M21 9l-5 5" /></svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4Z" /><path d="M16 9a4 4 0 0 1 0 6" /><path d="M18.5 7a7 7 0 0 1 0 10" /></svg>
              )}
            </button>
            <div className="coach-dots">
              {STEPS.map((_, k) => <span key={k} className={k === i ? 'on' : k < i ? 'done' : ''} />)}
            </div>
          </div>
          <div className="coach-btns">
            {i > 0 && <button className="coach-ghost" onClick={back}>Back</button>}
            <button className="coach-primary" onClick={next}>{last ? 'Got it!' : 'Next'}</button>
          </div>
        </div>
        <button className="coach-skip" onClick={onClose} aria-label="Skip tour">Skip tour</button>
      </div>
    </div>
  );
}
