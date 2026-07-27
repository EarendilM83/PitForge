import React from 'react';
import { PFHeading, PFRepeat, PFText } from '../../../src/runtime/components';
import './Faq.css';

export default function Faq() {
  return (
    <section className="faq">
      <PFHeading field="faq.heading" level={2} className="faq-heading" />
      <PFRepeat field="faq.items" className="faq-list">
        {(item) => (
          <article className="faq-item">
            <PFHeading field={`${item}.q`} level={3} className="faq-q" />
            <PFText field={`${item}.a`} className="faq-a" />
          </article>
        )}
      </PFRepeat>
    </section>
  );
}
