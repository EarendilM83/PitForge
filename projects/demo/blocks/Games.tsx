import React from 'react';
import { PFHeading, PFRepeat, PFImage, PFText } from '../../../src/runtime/components';
import './Games.css';

export default function Games() {
  return (
    <section className="games">
      <PFHeading field="games.heading" level={2} className="games-heading" />
      <PFRepeat field="games.slides" className="games-grid">
        {(item) => (
          <article className="game-card">
            <PFImage field={`${item}.thumb`} className="game-thumb" sizes="(max-width: 768px) 50vw, 240px" />
            <PFHeading field={`${item}.name`} level={3} className="game-name" />
            <PFText field={`${item}.desc`} className="game-desc" />
          </article>
        )}
      </PFRepeat>
    </section>
  );
}
