/* Tiny procedural sound effects for Zippy — synthesized with the Web Audio API,
   so there are no audio files to ship. Quiet, cute, and mutable. */

let ctx: AudioContext | null = null;
let muted = false;
try { muted = localStorage.getItem('pf-coach-muted') === '1'; } catch { /* ignore */ }

function ac(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch { return null; }
}

interface Blip { freq: number; freq2?: number; type?: OscillatorType; t?: number; dur?: number; gain?: number; }
function blip({ freq, freq2, type = 'sine', t = 0, dur = 0.1, gain = 0.08 }: Blip) {
  const c = ac();
  if (!c) return;
  const now = c.currentTime + t;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, now);
  if (freq2) o.frequency.exponentialRampToValueAtTime(Math.max(1, freq2), now + dur);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(gain, now + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  o.connect(g).connect(c.destination);
  o.start(now);
  o.stop(now + dur + 0.03);
}

/** a short noise burst through a bandpass — a soft wing "flit". */
function flit() {
  const c = ac();
  if (!c) return;
  const now = c.currentTime;
  const len = Math.floor(c.sampleRate * 0.12);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = c.createBufferSource();
  s.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1700;
  bp.Q.value = 0.7;
  const g = c.createGain();
  g.gain.setValueAtTime(0.035, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
  s.connect(bp).connect(g).connect(c.destination);
  s.start(now);
}

export const sound = {
  get muted() { return muted; },
  setMuted(m: boolean) {
    muted = m;
    try { localStorage.setItem('pf-coach-muted', m ? '1' : '0'); } catch { /* ignore */ }
    if (!m) blip({ freq: 1600, freq2: 2200, type: 'triangle', dur: 0.06, gain: 0.05 }); // little "on" chirp
  },
  /** Zippy appears / says hi. */
  chirp() {
    if (muted) return;
    flit();
    blip({ freq: 1900, freq2: 2650, type: 'triangle', dur: 0.07, gain: 0.06 });
    blip({ freq: 2200, freq2: 3050, type: 'triangle', t: 0.09, dur: 0.06, gain: 0.05 });
  },
  /** hop forward to the next step. */
  hop() {
    if (muted) return;
    flit();
    blip({ freq: 760, freq2: 1120, type: 'sine', dur: 0.09, gain: 0.07 });
  },
  /** hop back. */
  back() {
    if (muted) return;
    blip({ freq: 720, freq2: 520, type: 'sine', dur: 0.09, gain: 0.06 });
  },
  /** happy finish. */
  done() {
    if (muted) return;
    [523, 659, 784, 1046].forEach((f, i) => blip({ freq: f, type: 'triangle', t: i * 0.1, dur: 0.2, gain: 0.07 }));
    blip({ freq: 2600, freq2: 3300, type: 'triangle', t: 0.42, dur: 0.14, gain: 0.045 });
  },
};
