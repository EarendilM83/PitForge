import React from 'react';
import type { StudioState, Action } from './state';

export default function SeoTab({ state, dispatch }: { state: StudioState; dispatch: React.Dispatch<Action> }) {
  return (
    <div className="studio-seo">
      <p className="studio-muted">SEO tab — built in Phase 7.</p>
    </div>
  );
}
