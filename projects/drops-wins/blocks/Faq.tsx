import React from 'react';
import { PFHeading, PFRepeat, PFText } from '../../../src/runtime/components';
import './Faq.css';

export default function Faq() {
  return (
    <section className="dw-faq">
      <PFHeading field="faq.heading" level={2} className="dw-section-heading" />
      <PFRepeat field="faq.items" className="dw-faq-list">
        {(item) => (
          <article className="dw-faq-item">
            <PFHeading field={`${item}.q`} level={3} className="dw-faq-q" />
            <PFText field={`${item}.a`} className="dw-faq-a" />
          </article>
        )}
      </PFRepeat>
    </section>
  );
}
