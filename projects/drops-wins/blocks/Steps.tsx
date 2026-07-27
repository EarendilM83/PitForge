import React from 'react';
import { PFHeading, PFRepeat, PFIcon, PFText } from '../../../src/runtime/components';
import './Steps.css';

export default function Steps() {
  return (
    <section className="dw-steps">
      <PFHeading field="steps.heading" level={2} className="dw-section-heading" />
      <PFRepeat field="steps.items" className="dw-steps-grid">
        {(item) => (
          <article className="dw-step-card">
            <PFIcon field={`${item}.icon`} className="dw-step-icon" />
            <PFHeading field={`${item}.title`} level={3} className="dw-step-title" />
            <PFText field={`${item}.text`} className="dw-step-text" />
          </article>
        )}
      </PFRepeat>
    </section>
  );
}
