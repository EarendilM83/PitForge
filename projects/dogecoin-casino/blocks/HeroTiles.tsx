import React from 'react';
import { PFImage, PFHeading, PFText, PFButton, PFRepeat } from '../../../src/runtime/components';
import './HeroTiles.css';

// HeroTiles — game-category tiles (Figma node 7372:5522) plus the crypto/currency
// logo strip (Figma node 7372:4397) that sit below the hero headline.
export default function HeroTiles() {
  return (
    <section className="tiles" aria-label="Game categories">
      <div className="tiles-inner">
        <PFRepeat field="tiles.cards" className="tiles-grid">
          {(item, index) => (
            <article className={`tile tile--${index % 4}`}>
              <div className="tile-glow" aria-hidden />
              <div className="tile-art">
                <PFImage field={`${item}.image`} className="tile-img" sizes="148px" />
              </div>
              <div className="tile-body">
                <PFHeading field={`${item}.title`} level={2} className="tile-title" />
                <PFText field={`${item}.desc`} className="tile-desc" />
              </div>
              <PFButton field={`${item}.cta`} className="tile-cta" variant="alpha" />
            </article>
          )}
        </PFRepeat>

        <PFRepeat field="tiles.currencies" className="tiles-strip">
          {(item, index) => (
            <span className={`strip-logo-wrap strip-logo-wrap--${index}`}>
              <PFImage field={`${item}.logo`} className="strip-logo" sizes="56px" />
            </span>
          )}
        </PFRepeat>
      </div>
    </section>
  );
}
