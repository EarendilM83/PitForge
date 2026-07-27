import React from 'react';
import { PFHeading, PFText, PFImage, PFButton } from '../../../src/runtime/components';
import './Hero.css';

export default function Hero() {
  return (
    <header className="dw-hero">
      <PFImage field="hero.banner" className="dw-hero-banner" sizes="100vw" />
      <div className="dw-hero-overlay">
        <PFText field="hero.kicker" className="dw-hero-kicker" />
        <PFHeading field="hero.title" level={1} className="dw-hero-title" />
        <PFText field="hero.prizePool" className="dw-hero-pool" />
        <PFText field="hero.subtitle" className="dw-hero-subtitle" />
        <PFButton field="hero.cta" className="dw-hero-cta" variant="primary" />
      </div>
    </header>
  );
}
