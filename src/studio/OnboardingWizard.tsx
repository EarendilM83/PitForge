import React from 'react';

/**
 * Onboarding Wizard — a friendly, plain-language walkthrough of the whole PitForge flow.
 * Auto-opens on first run; re-openable any time via the "How it works" button (for reminders).
 * Written for people who don't code: no jargon, one idea per step.
 */

type Step = {
  icon: string;
  title: string;
  body: React.ReactNode;
  tip?: React.ReactNode;
};

const STEPS: Step[] = [
  {
    icon: '👋',
    title: 'Welcome to PitForge',
    body: (
      <>
        PitForge turns your <strong>Figma designs</strong> into real, fast landing pages — and lets you
        edit the words, images, and SEO yourself. <strong>No code, ever.</strong>
        <br />
        <br />
        This quick tour takes about a minute. You can reopen it any time from{' '}
        <em>“How it works”</em> on the Sites screen.
      </>
    ),
  },
  {
    icon: '🧩',
    title: 'Two tools, working together',
    body: (
      <>
        <strong>1. Claude Code</strong> builds the site from your Figma file — it reads the design and
        writes the page for you.
        <br />
        <strong>2. This Studio</strong> is where you edit content and SEO, then preview, export, and
        publish.
      </>
    ),
    tip: 'You only ever build a site once, in Claude. Everything after that happens right here — visually.',
  },
  {
    icon: '🔗',
    title: 'Connect Figma (one-time)',
    body: (
      <>
        In the <strong>Figma desktop app</strong>, turn on the design bridge:
        <br />
        <em>Figma → Preferences → Enable Dev Mode MCP Server.</em>
        <br />
        <br />
        PitForge is already set up to talk to it — you don’t configure anything.
      </>
    ),
    tip: 'Do this once. Claude will then be able to read any Figma file you share.',
  },
  {
    icon: '✨',
    title: 'Create your first site',
    body: (
      <>
        Click <strong>“+ New site → From Figma”</strong>, paste your Figma link, and copy the
        instruction it gives you. Paste that into <strong>Claude Code</strong> and let it work.
        <br />
        <br />
        When it’s done, your new site <strong>appears here automatically</strong>.
      </>
    ),
    tip: 'Claude follows built-in skills to match your design exactly and make it work on every screen size.',
  },
  {
    icon: '✏️',
    title: 'Edit content — just click it',
    body: (
      <>
        Open a site and <strong>click any text or image</strong> on the page to change it. Lists (like
        game cards or FAQs) let you add or remove items within set limits.
        <br />
        <br />
        The <strong>design and layout are locked</strong> — you change the content, never the structure.
        That keeps every page on-brand.
      </>
    ),
    tip: 'Stuck on wording? The built-in AI assistant can improve, shorten, or translate any text.',
  },
  {
    icon: '🔍',
    title: 'Set your SEO',
    body: (
      <>
        Open the <strong>Page</strong> tab to set the title and description, and watch the{' '}
        <strong>live SEO checks</strong>. Green means you’re good; PitForge won’t let you export with a
        real SEO problem.
      </>
    ),
  },
  {
    icon: '🚀',
    title: 'Preview, export, publish',
    body: (
      <>
        <strong>Preview</strong> opens your live page in a new tab. <strong>Export</strong> downloads a
        ready-to-deploy site.
        <br />
        <br />
        PitForge verifies your page works on <strong>every screen size</strong> — phone, tablet, laptop,
        desktop — not just the two the designer drew.
      </>
    ),
    tip: 'The exported site is plain, fast HTML with zero JavaScript. It loads instantly and ranks well.',
  },
  {
    icon: '🎉',
    title: 'You’re ready',
    body: (
      <>
        That’s the whole loop: <strong>Figma → build with Claude → edit here → publish.</strong>
        <br />
        <br />
        Reopen this tour any time from <em>“How it works”</em>. Now go make something great.
      </>
    ),
  },
];

const SEEN_KEY = 'pf-onboarded-v1';

export function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return true;
  }
}

export default function OnboardingWizard({ onClose }: { onClose: () => void }) {
  const [i, setI] = React.useState(0);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  const finish = () => {
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {}
    onClose();
  };

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
      if (e.key === 'ArrowRight' && !last) setI((n) => n + 1);
      if (e.key === 'ArrowLeft' && i > 0) setI((n) => n - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [i, last]);

  return (
    <div className="pf-wiz-backdrop" onClick={finish}>
      <div className="pf-wiz" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="How PitForge works">
        <div className="pf-wiz-rail" aria-hidden="true">
          <div className="pf-wiz-rail-mark">◆ PitForge</div>
          <ol className="pf-wiz-steps">
            {STEPS.map((s, n) => (
              <li key={n} className={n === i ? 'active' : n < i ? 'done' : ''}>
                <span className="pf-wiz-step-dot">{n < i ? '✓' : n + 1}</span>
                <span className="pf-wiz-step-label">{s.title}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="pf-wiz-main">
          <button className="pf-wiz-close" onClick={finish} aria-label="Close tour">
            ✕
          </button>
          <div className="pf-wiz-icon">{step.icon}</div>
          <div className="pf-wiz-count">
            Step {i + 1} of {STEPS.length}
          </div>
          <h2 className="pf-wiz-title">{step.title}</h2>
          <p className="pf-wiz-body">{step.body}</p>
          {step.tip && (
            <div className="pf-wiz-tip">
              <span className="pf-wiz-tip-i">💡</span>
              <span>{step.tip}</span>
            </div>
          )}

          <div className="pf-wiz-foot">
            <button className="pf-wiz-skip" onClick={finish}>
              {last ? '' : 'Skip tour'}
            </button>
            <div className="pf-wiz-nav">
              {i > 0 && (
                <button className="pf-wiz-btn pf-wiz-btn-ghost" onClick={() => setI(i - 1)}>
                  Back
                </button>
              )}
              {last ? (
                <button className="pf-wiz-btn pf-wiz-btn-primary" onClick={finish}>
                  Start building
                </button>
              ) : (
                <button className="pf-wiz-btn pf-wiz-btn-primary" onClick={() => setI(i + 1)}>
                  Next
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
