import React from 'react';
import { PFProvider } from '../runtime/context';
import { RenderPage } from '../runtime/renderPage';
import { blocksFor } from './App';
import type { StudioState, Action } from './state';

export default function Canvas({
  state,
  dispatch,
  onSelect,
}: {
  state: StudioState;
  dispatch: React.Dispatch<Action>;
  onSelect?: (field: string) => void;
}) {
  const project = state.project!;
  const blocks = blocksFor(project.id);
  const width = state.canvasWidth === 'full' ? '100%' : `${state.canvasWidth}px`;
  const select = onSelect ?? ((field: string) => dispatch({ type: 'select', field }));

  return (
    <main className="studio-canvas-wrap">
      <div className={`studio-canvas ${state.outlinesVisible ? '' : 'studio-outlines-hidden'}`}>
        <div className="studio-page" style={{ maxWidth: width }}>
          <style>{project.tokensCss}</style>
          <PFProvider
            value={{
              mode: 'edit',
              content: state.content,
              manifest: project.manifest,
              selected: state.selected,
              onSelect: select,
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
