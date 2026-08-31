import React from 'react';
import { PFText, PFImage, PFRepeat, PFButton } from '../../../src/runtime/components';
import './FeatureEsport.css';

// FeatureEsport — Figma node 7372:4475 (desktop 1440×760) / 7240:2947 (mobile).
// Two-column: large 3D esports render on the left, copy + feature accordion on the right.
// Two-tone <h2>: white lead + gold "dogecoin" accent.
export default function FeatureEsport() {
  return (
    <section className="esport">
      <div className="esport-inner">
        <div className="esport-media">
          <PFImage
            field="esport.image"
            className="esport-image"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
        <div className="esport-content">
          <div className="esport-head">
            <span className="esport-eyebrow">
              <PFText field="esport.eyebrow" />
            </span>
            <h2 className="esport-title">
              <PFText field="esport.titleTop" className="esport-title-top" />{' '}
              <PFText field="esport.titleAccent" className="esport-title-accent" />
            </h2>
          </div>
          <PFRepeat field="esport.features" className="esport-features">
            {(item, index) => (
              <div className={index === 0 ? 'esport-feature esport-feature--open' : 'esport-feature'}>
                <div className="esport-feature-row">
                  <PFText field={`${item}.label`} className="esport-feature-label" />
                  <PFText field={`${item}.marker`} className="esport-feature-marker" />
                </div>
                <PFText field={`${item}.body`} className="esport-feature-body" />
              </div>
            )}
          </PFRepeat>
          <PFButton field="esport.cta" className="esport-cta" variant="primary" />
        </div>
      </div>
    </section>
  );
}
