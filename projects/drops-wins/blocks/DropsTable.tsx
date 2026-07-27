import React from 'react';
import { PFHeading, PFText, PFRepeat } from '../../../src/runtime/components';
import './DropsTable.css';

export default function DropsTable() {
  return (
    <section className="dw-drops">
      <PFHeading field="drops.heading" level={2} className="dw-section-heading" />
      <PFText field="drops.intro" className="dw-drops-table-intro" />
      <PFRepeat field="drops.rows" className="dw-drops-table">
        {(row) => (
          <div className="dw-drops-table-row">
            <PFText field={`${row}.quantity`} className="dw-drops-table-qty" />
            <PFText field={`${row}.prize`} className="dw-drops-table-prize" />
          </div>
        )}
      </PFRepeat>
    </section>
  );
}
