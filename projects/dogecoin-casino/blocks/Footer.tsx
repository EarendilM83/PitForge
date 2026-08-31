import React from 'react';
import { PFText, PFRichText, PFImage, PFIcon, PFLink, PFIconLink, PFImageLink, PFRepeat } from '../../../src/runtime/components';
import './Footer.css';

// Footer — Figma node 7372:4533.
// Link columns + community/social + crypto payment icons + awards + legal text + 18+ brand mark.
export default function Footer() {
  return (
    <footer className="ft">
      <div className="ft-inner">
        <div className="ft-top">
          <PFRepeat field="footer.columns" className="ft-columns">
            {(col, index) => (
              <div className="ft-col">
                {/* zero-JS accordion: on mobile the checkbox toggles the link list open;
                    on desktop CSS forces the list visible and hides the toggle. */}
                <input type="checkbox" id={`ft-col-${index}`} className="ft-col-toggle" aria-hidden="true" tabIndex={-1} />
                <label htmlFor={`ft-col-${index}`} className="ft-col-heading">
                  <PFText field={`${col}.heading`} />
                  <span className="ft-col-plus" aria-hidden="true" />
                </label>
                <PFRepeat field={`${col}.links`} className="ft-col-links">
                  {(link) => <PFLink field={`${link}.link`} className="ft-col-link" />}
                </PFRepeat>
              </div>
            )}
          </PFRepeat>
          <div className="ft-community">
            <PFText field="footer.communityHeading" className="ft-col-heading" />
            <PFRepeat field="footer.socials" className="ft-social">
              {(item) => <PFIconLink linkField={`${item}.link`} iconField={`${item}.icon`} className="ft-social-link" iconClassName="ft-social-icon" />}
            </PFRepeat>
            <div className="ft-support">
              <PFIcon field="footer.supportIcon" className="ft-support-icon" />
              <PFLink field="footer.support" className="ft-support-label" />
            </div>
          </div>
        </div>

        <div className="ft-pay-wrap">
          <PFRepeat field="footer.payments" className="ft-pay">
            {(pay) => <PFIconLink linkField={`${pay}.link`} iconField={`${pay}.icon`} className="ft-pay-link" iconClassName="ft-pay-icon" />}
          </PFRepeat>
        </div>

        <div className="ft-legal">
          <PFRepeat field="footer.awards" className="ft-awards">
            {(item) => <PFImageLink linkField={`${item}.link`} imageField={`${item}.logo`} className="ft-award-link" imgClassName="ft-award" sizes="72px" />}
          </PFRepeat>
          <PFText field="footer.copyright" className="ft-copyright" />
          <PFRichText field="footer.legal" className="ft-legal-text" />
          <PFImage field="footer.brandMark" className="ft-brand-mark" sizes="218px" />
        </div>
      </div>
    </footer>
  );
}
