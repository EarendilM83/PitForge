import React from 'react';
import { PFProvider } from '../runtime/context';
import { RenderPage } from '../runtime/renderPage';
import { blocksFor } from './App';
import type { StudioState, Action } from './state';

export default function Canvas({ state, dispatch }: { state: StudioState; dispatch: React.Dispatch<Action> }) {
  const project = state.project!;
  const blocks = blocksFor(project.id);
  const width = state.canvasWidth === 'full' ? '100%' : `${state.canvasWidth}px`;

  return (
    <main className="studio-canvas-wrap">
      <div className="studio-canvas-toolbar">
        <button
          className={state.outlinesVisible ? 'active' : ''}
          title="Toggle edit outlines"
          onClick={() => dispatch({ type: 'toggle-outlines' })}
        >
          Outlines
        </button>
        <span className="studio-width-switcher">
          {([360, 768, 1280, 'full'] as const).map((w) => (
            <button
              key={String(w)}
              className={state.canvasWidth === w ? 'active' : ''}
              onClick={() => dispatch({ type: 'canvas-width', width: w })}
            >
              {w === 'full' ? 'Full' : w}
            </button>
          ))}
        </span>
      </div>
      <div className={`studio-canvas ${state.outlinesVisible ? '' : 'studio-outlines-hidden'}`}>
        <div className="studio-page" style={{ maxWidth: width }}>
          <style>{project.tokensCss}</style>
          <PFProvider
            value={{
              mode: 'edit',
              content: state.content,
              manifest: project.manifest,
              selected: state.selected,
              onSelect: (field) => dispatch({ type: 'select', field }),
              onChange: (field, value) => dispatch({ type: 'change', field, value }),
            }}
          >
            <RenderPage config={project.config} blocks={blocks} />
          </PFProvider>
        </div>
      </div>
    </main>
  );
}
