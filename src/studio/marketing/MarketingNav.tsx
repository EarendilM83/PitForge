import React from 'react';

export type MktSection = 'home' | 'guide' | 'setup';

/** Shared sticky top nav for the marketing/onboarding surfaces (Landing, Setup, Guide). */
export default function MarketingNav({
  active,
  onLight = false,
  onHome,
  onGuide,
  onSetup,
  onStudio,
}: {
  active: MktSection;
  onLight?: boolean;
  onHome: () => void;
  onGuide: () => void;
  onSetup: () => void;
  onStudio: () => void;
}) {
  return (
    <nav className={`pf-mnav ${onLight ? 'on-light' : ''}`}>
      <button className="pf-mnav-brand" onClick={onHome} style={{ border: 0, background: 'transparent', cursor: 'pointer' }}>
        <span className="pf-mnav-mark">◆</span> PitForge
      </button>
      <div className="pf-mnav-links">
        <button className={active === 'home' ? 'active' : ''} onClick={onHome}>Home</button>
        <button className={active === 'guide' ? 'active' : ''} onClick={onGuide}>User Guide</button>
        <button className={active === 'setup' ? 'active' : ''} onClick={onSetup}>Setup</button>
      </div>
      <button className="pf-mnav-cta" onClick={onStudio}>Open Studio →</button>
    </nav>
  );
}
