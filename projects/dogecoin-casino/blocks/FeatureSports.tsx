import React from 'react';
import { PFText, PFImage, PFButton, PFRepeat } from '../../../src/runtime/components';
import './FeatureSports.css';

// FeatureSports — Figma node 7372:4460 (desktop) / 7240:3533 (mobile).
// Two-column: copy left (badge, two-tone H2 white+gold, accordion feature rows
// with ×/+ markers, CTA), 3D image right.
// Collapses to a single column under ~768px with the image below the copy.
export default function FeatureSports() {
  return (
    <section className="fsports">
      <div className="fsports-inner">
        <div className="fsports-copy">
          <div className="fsports-head">
            <span className="fsports-badge">
              <PFText field="sports.badge" />
            </span>
            <h2 className="fsports-title">
              <PFText field="sports.titleTop" className="fsports-title-top" />{' '}
              <PFText field="sports.titleAccent" className="fsports-title-accent" />
            </h2>
          </div>

          <PFRepeat field="sports.items" className="fsports-items">
            {(item, index) => (
              <div className={index === 0 ? 'fsports-item fsports-item--open' : 'fsports-item'}>
                <div className="fsports-item-head">
                  <h3 className="fsports-item-title"><PFText field={`${item}.title`} /></h3>
                </div>
                <PFText field={`${item}.body`} className="fsports-item-body" />
              </div>
            )}
          </PFRepeat>

          <PFButton field="sports.cta" className="fsports-cta" variant="primary" />
        </div>

        <div className="fsports-media">
          <PFImage
            field="sports.image"
            className="fsports-image"
            sizes="(max-width: 768px) 92vw, 44vw"
          />
        </div>
      </div>
    </section>
  );
}
