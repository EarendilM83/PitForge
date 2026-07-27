import React from 'react';
import { PFHeading, PFText, PFRepeat } from '../../../src/runtime/components';
import './DailyTable.css';

export default function DailyTable() {
  return (
    <section className="dw-daily">
      <PFHeading field="daily.heading" level={2} className="dw-section-heading" />
      <PFText field="daily.intro" className="dw-daily-table-intro" />
      <PFRepeat field="daily.rows" className="dw-daily-table">
        {(row) => (
          <div className="dw-daily-table-row">
            <PFText field={`${row}.rank`} className="dw-daily-table-rank" />
            <PFText field={`${row}.prize`} className="dw-daily-table-prize" />
          </div>
        )}
      </PFRepeat>
      <PFText field="daily.scoring" className="dw-daily-table-scoring" />
    </section>
  );
}
