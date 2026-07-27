import React from 'react';
import { PFHeading, PFRepeat, PFImage, PFText } from '../../../src/runtime/components';
import './Games.css';

export default function Games() {
  return (
    <section className="dw-games">
      <PFHeading field="games.heading" level={2} className="dw-section-heading" />
      <PFRepeat field="games.items" className="dw-games-grid">
        {(item) => (
          <article className="dw-game-card">
            <PFImage field={`${item}.thumb`} className="dw-game-thumb" sizes="(max-width: 768px) 50vw, 180px" />
            <div className="dw-game-meta">
              <PFHeading field={`${item}.name`} level={3} className="dw-game-name" />
              <PFText field={`${item}.provider`} className="dw-game-provider" />
            </div>
          </article>
        )}
      </PFRepeat>
    </section>
  );
}
