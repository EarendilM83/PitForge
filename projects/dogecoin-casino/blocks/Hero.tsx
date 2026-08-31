import React from 'react';
import { PFText, PFButton, PFImage, PFTag } from '../../../src/runtime/components';
import './Hero.css';

// Hero — Figma node 7372:4422 (desktop) / 7240:2947 (mobile).
// Two-tone H1 (white line + gold line) kept as a single <h1> for SEO.
export default function Hero() {
  return (
    <header className="hero">
      <div className="hero-glow hero-glow--gold" aria-hidden />
      <div className="hero-glow hero-glow--purple" aria-hidden />
      <div className="hero-inner">
        <span className="hero-coin">
          <PFImage field="hero.coin" className="hero-coin-img" sizes="48px" />
        </span>
        <span className="hero-eyebrow">
          <PFText field="hero.eyebrow" />
        </span>
        {/* Full headline in ONE heading for SEO (both lines); two-tone via inner spans.
            PFTag makes the heading's semantic tag editable in the Studio — styling stays on the class. */}
        <PFTag el="hero.title" as="h1" label="Headline" className="hero-title">
          <PFText field="hero.titleTop" className="hero-title-top" />{' '}
          <PFText field="hero.titleAccent" className="hero-title-accent" />
        </PFTag>
        <PFText field="hero.subtitle" className="hero-subtitle" />
        <PFButton field="hero.cta" className="hero-cta" variant="primary" />
      </div>
    </header>
  );
}
