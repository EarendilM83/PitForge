import React from 'react';
import MarketingNav from './MarketingNav';
import Icon from './Icon';
import BuildDemo from './BuildDemo';
import './marketing.css';

/** Reveal-on-scroll: adds `.in` once as elements enter view. Landing renders once
    (counters are isolated children), so classList mutations are never clobbered. */
function useReveal(rootRef: React.RefObject<HTMLElement>) {
  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }),
      { threshold: 0.2, root }
    );
    root.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [rootRef]);
}

/** Count-up number; isolated so its ticks don't re-render the whole Landing. */
function Counter({ to, suffix = '', dur = 1400 }: { to: number; suffix?: string; dur?: number }) {
  const [n, setN] = React.useState(0);
  const ref = React.useRef<HTMLElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const io = new IntersectionObserver((es) => {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        setN(Math.round(to * eased));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to, dur]);
  return <b ref={ref as React.RefObject<HTMLElement>}>{n.toLocaleString()}{suffix}</b>;
}

const USE_CASES = [
  { icon: 'target', title: 'Affiliate & promo', body: 'Casino, sportsbook and bonus pages with tracked CTAs, built to convert.' },
  { icon: 'rocket', title: 'Product launches', body: 'One-page launches — hero, features, FAQ, one clear call to action.' },
  { icon: 'megaphone', title: 'Campaign microsites', body: 'Seasonal or regional pages you spin up, edit, and retire fast.' },
  { icon: 'search', title: 'SEO one-pagers', body: 'Fast, zero-JS pages built to rank — correct headings, meta, and schema.' },
];

const FLOW = [
  { icon: 'pen', h: 'Design', p: 'Start from a Figma file', who: 'who-you', label: 'You' },
  { icon: 'spark', h: 'Claude builds', p: 'Design becomes a project', who: 'who-claude', label: 'Claude' },
  { icon: 'shield', h: 'Gates', p: 'Responsive + SEO pass', who: 'who-claude', label: 'Claude' },
  { icon: 'cursor', h: 'Edit', p: 'Click any text or image', who: 'who-you', label: 'You' },
  { icon: 'box', h: 'Export', p: 'One gated bundle', who: 'who-you', label: 'You' },
  { icon: 'globe', h: 'Deploy', p: 'Owner ships it live', who: 'who-owner', label: 'Owner' },
];

export default function Landing({
  onGetStarted,
  onGuide,
  onStudio,
}: {
  onGetStarted: () => void;
  onGuide: () => void;
  onStudio: () => void;
}) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  useReveal(rootRef);
  const v = (i: number) => ({ ['--i']: i } as React.CSSProperties);

  return (
    <div className="pf-mkt" ref={rootRef}>
      <MarketingNav active="home" onHome={() => {}} onGuide={onGuide} onSetup={onGetStarted} onStudio={onStudio} />

      {/* HERO */}
      <header className="pf-lp-hero">
        <div className="pf-lp-mesh" />
        <div className="pf-lp-dots" />
        <div className="pf-lp-hero-grid">
          <div>
            <span className="pf-lp-eyebrow pf-in" style={v(0)}><span className="dot" /> Local · SEO-first · Zero-JS</span>
            <h1 className="pf-in" style={v(1)}>
              Turn designs into <span className="pf-lp-grad">landing pages that ship</span>
            </h1>
            <p className="sub pf-in" style={v(2)}>
              A design becomes a real, fast, SEO-clean single-page site. Claude Code builds and edits it;
              you preview, export, and deploy. No database, no framework to learn.
            </p>
            <div className="pf-lp-cta-row pf-in" style={v(3)}>
              <button className="pf-btn-xl pf-btn-primary-xl" onClick={onGetStarted}>Get started <Icon name="arrow" size={18} /></button>
              <button className="pf-btn-xl pf-btn-ghost-xl" onClick={onGuide}>Read the user guide</button>
            </div>
            <div className="pf-lp-trust pf-in" style={v(4)}><Icon name="check" size={16} /> Set up in ~15 minutes · uses your own Claude subscription</div>
          </div>

          {/* the living build sequence */}
          <BuildDemo />
        </div>
      </header>

      {/* STATS */}
      <div className="pf-lp-stats">
        <div className="pf-lp-stats-in">
          <div className="pf-lp-stat"><Counter to={16} /><span>SEO checks enforced at export</span></div>
          <div className="pf-lp-stat"><Counter to={100} suffix="%" /><span>static — zero JavaScript shipped</span></div>
          <div className="pf-lp-stat"><Counter to={2200} suffix="px" /><span>responsive, proven down to 320</span></div>
          <div className="pf-lp-stat"><Counter to={0} /><span>databases — every site is a folder</span></div>
        </div>
      </div>

      {/* USE CASES */}
      <section className="pf-lp-sec">
        <div className="pf-mkt-inner">
          <div className="pf-lp-kick pf-reveal" data-reveal>Use cases</div>
          <h2 className="pf-lp-h2 pf-reveal" data-reveal>What you can build</h2>
          <p className="pf-lp-lead pf-reveal" data-reveal>One-page sites built for speed and search — from affiliate promos to product launches.</p>
          <div className="pf-lp-cards">
            {USE_CASES.map((c, i) => (
              <div className="pf-lp-card pf-reveal scale" data-reveal style={v(i)} key={c.title}>
                <div className="pf-lp-card-i"><Icon name={c.icon} size={24} /></div>
                <h4>{c.title}</h4>
                <p>{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="pf-lp-sec alt">
        <div className="pf-mkt-inner">
          <div className="pf-lp-kick pf-reveal" data-reveal>How it works</div>
          <h2 className="pf-lp-h2 pf-reveal" data-reveal>One design in, one live site out</h2>
          <p className="pf-lp-lead pf-reveal" data-reveal>Claude owns the build, you own the edits, the owner owns the deploy.</p>
          <div className="pf-lp-flow" data-reveal>
            <span className="pf-lp-flow-line" />
            {FLOW.map((f) => (
              <div className="pf-lp-node" key={f.h}>
                <div className="num"><Icon name={f.icon} size={24} /></div>
                <h5>{f.h}</h5>
                <p>{f.p}</p>
                <span className={`who ${f.who}`}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="pf-lp-sec">
        <div className="pf-mkt-inner">
          <div className="pf-lp-feat pf-reveal" data-reveal>
            <div className="pf-lp-feat-txt">
              <span className="tag"><Icon name="spark" size={16} /> Claude Code</span>
              <h3>Build & edit in plain language</h3>
              <p>Convert a Figma design or restructure a page just by asking. Claude edits your sites — never PitForge itself — and never deploys.</p>
              <ul className="pf-lp-feat-list">
                <li><Icon name="check" size={16} /> Structural changes, new sections, new fields</li>
                <li><Icon name="check" size={16} /> The safety fence is enforced, not hoped for</li>
              </ul>
            </div>
            <div className="pf-lp-feat-art">
              <div className="pf-demo-claude">
                <div className="p">Make the hero headline bigger and change the CTA to <b>“Play now”</b></div>
                <div className="a">Updated hero.title and hero.cta · gates passed</div>
              </div>
            </div>
          </div>

          <div className="pf-lp-feat pf-reveal" data-reveal>
            <div className="pf-lp-feat-txt">
              <span className="tag"><Icon name="search" size={16} /> SEO gate</span>
              <h3>You cannot ship a broken page</h3>
              <p>Sixteen checks run at export — one H1, heading order, meta, structured data, image sizes. Any failure blocks the export until it’s clean.</p>
              <ul className="pf-lp-feat-list">
                <li><Icon name="check" size={16} /> Live Google preview as you edit</li>
                <li><Icon name="check" size={16} /> Canonical, slug, and schema handled for you</li>
              </ul>
            </div>
            <div className="pf-lp-feat-art">
              <div className="pf-demo-seo">
                <div className="r"><i><Icon name="check" size={13} stroke={2.4} /></i> Exactly one H1</div>
                <div className="r"><i><Icon name="check" size={13} stroke={2.4} /></i> Heading order valid</div>
                <div className="r"><i><Icon name="check" size={13} stroke={2.4} /></i> Meta & schema present</div>
              </div>
            </div>
          </div>

          <div className="pf-lp-feat pf-reveal" data-reveal>
            <div className="pf-lp-feat-txt">
              <span className="tag"><Icon name="devices" size={16} /> Fluid responsive</span>
              <h3>One design, every screen</h3>
              <p>Proportional units and fluid type keep a page identical from a 320px phone to an ultra-wide monitor — the gate proves the widths designers never drew.</p>
              <ul className="pf-lp-feat-list">
                <li><Icon name="check" size={16} /> Rendered and checked 320 → 2200px</li>
                <li><Icon name="check" size={16} /> No fixed-px patches, no broken breakpoints</li>
              </ul>
            </div>
            <div className="pf-lp-feat-art">
              <div className="pf-demo-resp"><div className="hd" /><div className="bd"><span /><span /><span /></div></div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA BAND */}
      <section className="pf-lp-band pf-reveal" data-reveal>
        <h2>Ready to build your first page?</h2>
        <p>Follow the guided setup — install, connect Claude Code, and create your first site.</p>
        <button className="pf-btn-xl" onClick={onGetStarted}>Get started <Icon name="arrow" size={18} /></button>
      </section>

      {/* FOOTER */}
      <footer className="pf-lp-foot">
        <div className="row">
          <button onClick={onGuide}>User Guide</button>
          <button onClick={onGetStarted}>Setup</button>
          <button onClick={onStudio}>Open Studio</button>
        </div>
        <div>PitForge · Local SEO-first CMS Studio for one-page sites that load fast and rank.</div>
      </footer>
    </div>
  );
}
