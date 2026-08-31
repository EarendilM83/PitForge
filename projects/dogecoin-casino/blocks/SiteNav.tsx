import React from 'react';
import { PFIcon, PFButton } from '../../../src/runtime/components';
import './SiteNav.css';

// SiteNav — Figma node 7372:4417 (desktop navbar) / 7240:3141 (mobile header).
// Logo on the left, language selector + primary CTA on the right.
// On mobile the language selector is hidden, leaving logo + CTA.
export default function SiteNav() {
  return (
    <nav className="nav" aria-label="Primary">
      <div className="nav-inner">
        <a className="nav-logo-link" aria-label="FortuneJack home" href="/">
          <PFIcon field="nav.logo" className="nav-logo" />
        </a>
        <div className="nav-actions">
          <PFButton field="nav.cta" className="nav-cta" variant="primary" />
        </div>
      </div>
    </nav>
  );
}
