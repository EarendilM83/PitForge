import React from 'react';
import { PFText, PFImage, PFButton, PFRepeat } from '../../../src/runtime/components';
import './FeatureCasino.css';

// FeatureCasino — Figma node 7372:4429 (desktop) / 7372:5413 (mobile).
// Text-left / image-right feature section; stacks to one column under 768px.
// Two-tone <h2> (white line + gold line). First panel open (dark card + × marker),
// following panels collapsed (no background, subtitle title + + marker).
export default function FeatureCasino() {
  return (
    <section className="fc">
      <div className="fc-inner">
        <div className="fc-copy">
          <span className="fc-eyebrow">
            <PFText field="casino.eyebrow" />
          </span>
          <h2 className="fc-title">
            <PFText field="casino.titleTop" className="fc-title-top" />{' '}
            <PFText field="casino.titleAccent" className="fc-title-accent" />
          </h2>
          <PFRepeat field="casino.panels" className="fc-panels">
            {(item, index) => (
              <div className={index === 0 ? 'fc-panel fc-panel--open' : 'fc-panel'}>
                <div className="fc-panel-row">
                  <h3 className="fc-panel-heading"><PFText field={`${item}.heading`} /></h3>
                </div>
                <PFText field={`${item}.body`} className="fc-panel-body" />
              </div>
            )}
          </PFRepeat>
          <PFButton field="casino.cta" className="fc-cta" variant="primary" />
        </div>
        <div className="fc-media">
          <PFImage
            field="casino.image"
            className="fc-image"
            sizes="(max-width: 768px) 100vw, 45vw"
          />
        </div>
      </div>
    </section>
  );
}
