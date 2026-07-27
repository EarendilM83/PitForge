import React from 'react';
import { PFHeading, PFText, PFImage, PFButton } from '../../../src/runtime/components';
import './Hero.css';

export default function Hero() {
  return (
    <header className="hero">
      <PFImage field="hero.banner" className="hero-banner" sizes="100vw" />
      <div className="hero-overlay">
        <PFHeading field="hero.title" level={1} className="hero-title" />
        <PFText field="hero.subtitle" className="hero-subtitle" />
        <PFButton field="hero.cta" className="hero-cta" variant="primary" />
      </div>
    </header>
  );
}
