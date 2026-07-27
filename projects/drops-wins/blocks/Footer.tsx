import React from 'react';
import { PFHeading, PFRichText, PFLink, PFIcon } from '../../../src/runtime/components';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="dw-footer">
      <PFHeading field="footer.heading" level={2} className="dw-footer-heading" />
      <PFRichText field="footer.note" className="dw-footer-note" />
      <PFLink field="footer.link" className="dw-footer-link" />
      <div className="dw-footer-age">
        <PFIcon field="footer.ageIcon" className="dw-footer-age-icon" />
      </div>
    </footer>
  );
}
