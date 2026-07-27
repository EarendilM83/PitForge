import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { reducer, initialState, type StudioState } from './state';
import ProjectPicker from './ProjectPicker';
import Canvas from './Canvas';
import Inspector from './Inspector';
import SeoTab from './SeoTab';
import ExportDialog from './ExportDialog';
import { PFProvider } from '../runtime/context';
import { RenderPage, type BlockModule } from '../runtime/renderPage';
import type { ContentValue, Project } from '../runtime/types';

// Blocks are loaded by Vite as modules, not through the API (§7).
const blockModules = import.meta.glob('/projects/*/blocks/*.tsx', { eager: true }) as Record<string, BlockModule>;

export function blocksFor(projectId: string): Record<string, BlockModule> {
  const out: Record<string, BlockModule> = {};
  const prefix = `/projects/${projectId}/blocks/`;
  for (const [p, mod] of Object.entries(blockModules)) {
    if (p.startsWith(prefix)) out[p.slice(prefix.length, -4)] = mod;
  }
  return out;
}

export default function App() {
  const [state, dispatch] = React.useReducer(reducer, initialState);
  const [exportOpen, setExportOpen] = React.useState(false);
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Autosave, debounced 800ms (§7).
  React.useEffect(() => {
    if (!state.project || state.saveStatus !== 'saving') return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/projects/${state.project!.id}/content`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(state.content),
        });
        if (!r.ok) throw new Error((await r.json()).error || r.statusText);
        dispatch({ type: 'save-status', status: 'saved' });
      } catch (e) {
        console.error(e);
        dispatch({ type: 'save-status', status: 'error' });
      }
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state.content, state.project, state.saveStatus]);

  // Keyboard: Esc deselects, Cmd/Ctrl+Z undo, Shift+Cmd/Ctrl+Z redo (§8.2).
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const editing = (e.target as HTMLElement)?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement)?.tagName);
      if (e.key === 'Escape') dispatch({ type: 'select', field: null });
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        if (editing) return; // let native undo work inside text fields
        e.preventDefault();
        dispatch({ type: e.shiftKey ? 'redo' : 'undo' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!state.project) {
    return <ProjectPicker onOpen={(project: Project) => dispatch({ type: 'project-loaded', project })} />;
  }

  const pf = {
    mode: 'edit' as const,
    content: state.content,
    manifest: state.project.manifest,
    selected: state.selected,
    onSelect: (field: string) => dispatch({ type: 'select', field }),
    onChange: (field: string, value: ContentValue) => dispatch({ type: 'change', field, value }),
  };

  return (
    <div className="studio-shell">
      <header className="studio-topbar">
        <span className="studio-logo">PitForge</span>
        <span className="studio-project-name">{state.project.config.name}</span>
        <span className={`studio-save studio-save-${state.saveStatus}`}>
          {state.saveStatus === 'saving' ? 'Saving…' : state.saveStatus === 'saved' ? 'Saved' : 'Save error'}
        </span>
        <nav className="studio-tabs">
          {(['edit', 'preview', 'seo'] as const).map((t) => (
            <button key={t} className={state.tab === t ? 'active' : ''} onClick={() => dispatch({ type: 'tab', tab: t })}>
              {t === 'seo' ? 'SEO' : t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </nav>
        <button onClick={() => dispatch({ type: 'undo' })} disabled={!state.undoStack.length}>
          Undo
        </button>
        <button className="studio-download" onClick={() => setExportOpen(true)}>
          Download ZIP
        </button>
      </header>
      <div className="studio-body">
        {state.tab === 'edit' && (
          <PFProvider value={pf}>
            <div className="studio-edit-layout">
              <Canvas state={state} dispatch={dispatch} />
              <Inspector state={state} dispatch={dispatch} />
            </div>
          </PFProvider>
        )}
        {state.tab === 'preview' && (
          <PreviewTab state={state} />
        )}
        {state.tab === 'seo' && (
          <SeoTab state={state} dispatch={dispatch} />
        )}
      </div>
      {exportOpen && <ExportDialog projectId={state.project.id} onClose={() => setExportOpen(false)} />}
    </div>
  );
}

function PreviewTab({ state }: { state: StudioState }) {
  const pf = React.useMemo(
    () => ({
      mode: 'static' as const,
      content: state.content,
      manifest: state.project!.manifest,
      selected: null,
      onSelect: () => {},
      onChange: () => {},
    }),
    [state.content, state.project]
  );
  const html = React.useMemo(() => {
    return renderToStaticMarkup(
      <PFProvider value={pf}>
        <RenderPage config={state.project!.config} blocks={blocksFor(state.project!.id)} />
      </PFProvider>
    );
  }, [pf, state.project]);
  const srcDoc = `<!doctype html><html><head><meta charset="utf-8"><style>${state.project!.tokensCss}</style></head><body>${html}</body></html>`;
  return <iframe className="studio-preview" title="Preview" srcDoc={srcDoc} />;
}
