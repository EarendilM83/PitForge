import React from 'react';
import { PFText, PFRepeat } from '../../../src/runtime/components';
import './Faq.css';

// FAQ — SEO section (matches the FAQPage JSON-LD). Zero-JS <details> accordion;
// question is an <h3> for the heading hierarchy, first item open by default.
export default function Faq() {
  return (
    <section className="faq" aria-labelledby="faq-heading">
      <div className="faq-inner">
        <h2 id="faq-heading" className="faq-heading">
          <PFText field="faq.heading" />
        </h2>
        <PFRepeat field="faq.items" className="faq-list">
          {(item, index) => (
            <details className="faq-item" open={index === 0}>
              <summary className="faq-q">
                <h3 className="faq-q-text">
                  <PFText field={`${item}.q`} />
                </h3>
                <span className="faq-icon" aria-hidden="true" />
              </summary>
              <div className="faq-a">
                <PFText field={`${item}.a`} />
              </div>
            </details>
          )}
        </PFRepeat>
      </div>
    </section>
  );
}
