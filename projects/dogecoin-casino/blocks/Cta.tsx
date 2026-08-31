import React from 'react';
import { PFText, PFButton } from '../../../src/runtime/components';
import './Cta.css';

// Cta — Figma node 7372:4534.
// Centered call-to-action banner: two-line heading (white + gold) over a primary button.
export default function Cta() {
  return (
    <section className="cta">
      <div className="cta-inner">
        <h2 className="cta-title">
          <PFText field="cta.titleTop" className="cta-title-top" />
          <PFText field="cta.titleAccent" className="cta-title-accent" />
        </h2>
        <PFButton field="cta.button" className="cta-button" variant="primary" />
      </div>
    </section>
  );
}
