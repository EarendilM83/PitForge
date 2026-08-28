import React from 'react';
import { PFProvider } from '../runtime/context';
import { RenderPage } from '../runtime/renderPage';
import { blocksFor } from './App';
import CanvasTagLayer from './CanvasTagLayer';
import { PF_UTILITIES_CSS } from '../runtime/pfUtilities';
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
  const wrapRef = React.useRef<HTMLElement>(null);

  return (
    <main className="studio-canvas-wrap" ref={wrapRef}>
      <div className={`studio-canvas ${state.outlinesVisible ? '' : 'studio-outlines-hidden'}`}>
        <div className="studio-page" style={{ maxWidth: width }}>
          {/* Scope the page's `body` rules (background, colour, font) to the artboard so the
              page renders on its own dark background here — not the Studio's workspace. */}
          <style>{project.tokensCss.replace(/(^|})\s*body\s*\{/g, '$1 .studio-page{')}</style>
          {/* Bounded style-override utilities — same set the export bundles ship. */}
          <style>{PF_UTILITIES_CSS}</style>
          <PFProvider
            value={{
              mode: 'edit',
              content: state.content,
              manifest: project.manifest,
              selected: state.selected,
              lang: state.activeLang,
              onSelect: select,
              onChange: (field, value) => dispatch({ type: 'change', field, value }),
            }}
          >
            <RenderPage config={project.config} blocks={blocks} />
          </PFProvider>
        </div>
      </div>
      <CanvasTagLayer state={state} dispatch={dispatch} wrapRef={wrapRef} />
    </main>
  );
}
