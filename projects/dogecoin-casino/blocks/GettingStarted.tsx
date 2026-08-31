import React from 'react';
import { PFHeading, PFText, PFIcon, PFRepeat } from '../../../src/runtime/components';
import './GettingStarted.css';

// GettingStarted — Figma nodes 7372:4491 (header) + 7372:4495 (steps grid).
// Six accent-tinted step cards in a responsive grid that collapses to one column under 768px.
export default function GettingStarted() {
  return (
    <section className="gs">
      <div className="gs-inner">
        <div className="gs-head">
          <span className="gs-badge">
            <PFText field="steps.badge" />
          </span>
          <h2 className="gs-title">
            <PFText field="steps.titleTop" className="gs-title-top" />{' '}
            <PFText field="steps.titleAccent" className="gs-title-accent" />
          </h2>
          <PFText field="steps.intro" className="gs-intro" />
        </div>
        <PFRepeat field="steps.cards" className="gs-grid">
          {(item, index) => (
            <div className={`gs-card gs-card--${index}`}>
              <div className="gs-card-glow" aria-hidden />
              <div className="gs-card-icon">
                <PFIcon field={`${item}.icon`} className="gs-icon" />
              </div>
              <PFHeading level={3} field={`${item}.title`} className="gs-card-title" />
              <PFText field={`${item}.body`} className="gs-card-body" />
            </div>
          )}
        </PFRepeat>
      </div>
    </section>
  );
}
