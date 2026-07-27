import React from 'react';
import { PFText } from '../../../src/runtime/components';
import './Bonus.css';

export default function Bonus() {
  return (
    <section className="bonus" aria-label="Bonus-Fakten">
      <div className="bonus-grid">
        <div className="bonus-figure"><PFText field="bonus.amount" className="bonus-value" /></div>
        <div className="bonus-figure"><PFText field="bonus.wagering" className="bonus-value" /></div>
        <div className="bonus-figure"><PFText field="bonus.minDeposit" className="bonus-value" /></div>
        <div className="bonus-figure"><PFText field="bonus.payoutTime" className="bonus-value" /></div>
      </div>
    </section>
  );
}
