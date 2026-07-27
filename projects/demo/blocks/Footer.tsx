import React from 'react';
import { PFHeading, PFRichText, PFLink, PFIcon } from '../../../src/runtime/components';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <PFHeading field="footer.heading" level={2} className="footer-heading" />
      <PFRichText field="footer.note" className="footer-note" />
      <PFLink field="footer.link" className="footer-link" />
      <div className="footer-age">
        <PFIcon field="footer.ageIcon" className="footer-age-icon" />
      </div>
    </footer>
  );
}
