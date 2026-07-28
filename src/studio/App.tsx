import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { reducer, initialState, type StudioState } from './state';
import PagesList from './PagesList';
import Canvas from './Canvas';
import Sidebar from './Sidebar';
import ListView from './ListView';
import ExportDialog from './ExportDialog';
import { PFProvider } from '../runtime/context';
import { RenderPage, type BlockModule } from '../runtime/renderPage';
import type { ContentValue, Project } from '../runtime/types';

// Blocks are loaded by Vite as modules, not through the API (§7).
const blockModules = import.meta.glob('/projects/*/blocks/*.tsx', { eager: true }) as Record<string, BlockModule>;
// Raw block CSS for the Preview iframe (export reads the same files from disk, §9).
const blockCssRaw = import.meta.glob('/projects/*/blocks/*.css', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export function blocksFor(projectId: string): Record<string, BlockModule> {
  const out: Record<string, BlockModule> = {};
  const prefix = `/projects/${projectId}/blocks/`;
  for (const [p, mod] of Object.entries(blockModules)) {
    if (p.startsWith(prefix)) out[p.slice(prefix.length, -4)] = mod;
  }
  return out;
}

export function blockCssFor(projectId: string, blocks: string[]): string {
  const prefix = `/projects/${projectId}/blocks/`;
  return blocks.map((b) => blockCssRaw[`${prefix}${b}.css`] ?? '').join('\n');
}

export default function App() {
  const [state, dispatch] = React.useReducer(reducer, initialState);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [externalChange, setExternalChange] = React.useState(false);
  const [previewMode, setPreviewMode] = React.useState(false);
  const [listViewOpen, setListViewOpen] = React.useState(false);
  const [sidebarTab, setSidebarTab] = React.useState<'page' | 'field'>('page');
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const changeBaseline = React.useRef(0);

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
        changeBaseline.current = Date.now(); // our own save is not an external change
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

  // Poll for external edits to the project folder (chokidar on the server).
  React.useEffect(() => {
    if (!state.project) return;
    const id = state.project.id;
    const poll = async () => {
      try {
        const { ts } = await (await fetch(`/api/projects/${id}/version`)).json();
        if (!changeBaseline.current) {
          changeBaseline.current = Math.max(ts, 1);
          return;
        }
        if (ts > changeBaseline.current + 500) setExternalChange(true);
      } catch {}
    };
    poll();
    const t = setInterval(poll, 3000);
    return () => clearInterval(t);
  }, [state.project?.id]);

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
    return <PagesList onOpen={(project: Project) => dispatch({ type: 'project-loaded', project })} />;
  }

  // Selecting a field auto-switches the sidebar to the Field tab (Gutenberg pattern).
  const onSelect = (field: string | null) => {
    dispatch({ type: 'select', field });
    if (field) setSidebarTab('field');
  };

  const pf = {
    mode: 'edit' as const,
    content: state.content,
    manifest: state.project.manifest,
    selected: state.selected,
    onSelect,
    onChange: (field: string, value: ContentValue) => dispatch({ type: 'change', field, value }),
  };

  return (
    <div className="studio-shell">
      <header className="studio-topbar">
        <button className="studio-btn-link studio-back" title="Back to sites" onClick={() => window.location.reload()}>
          ←
        </button>
        <span className="studio-project-name">{state.project.config.name}</span>
        <span className={`studio-lozenge ${state.saveStatus === 'saving' ? 'studio-lozenge-warning' : state.saveStatus === 'saved' ? 'studio-lozenge-success' : 'studio-lozenge-danger'}`}>
          {state.saveStatus === 'saving' ? 'Saving…' : state.saveStatus === 'saved' ? 'Saved' : 'Save error'}
        </span>
        <button onClick={() => dispatch({ type: 'undo' })} disabled={!state.undoStack.length}>
          Undo
        </button>
        <span className="studio-topbar-spacer" />
        <button className={listViewOpen ? 'active' : ''} title="List view" onClick={() => setListViewOpen(!listViewOpen)}>
          ☰ List view
        </button>
        <button className={previewMode ? 'active' : ''} onClick={() => setPreviewMode(!previewMode)}>
          {previewMode ? 'Exit preview' : 'Preview'}
        </button>
        <button className="studio-btn-primary" onClick={() => setExportOpen(true)}>
          Export ZIP
        </button>
      </header>
      <div className="studio-body">
        <PFProvider value={pf}>
          <div className="studio-edit-layout">
            {listViewOpen && <ListView state={state} onSelect={onSelect} onClose={() => setListViewOpen(false)} />}
            {previewMode ? <PreviewCanvas state={state} /> : <Canvas state={state} dispatch={dispatch} onSelect={onSelect} />}
            <Sidebar state={state} dispatch={dispatch} tab={sidebarTab} onTab={setSidebarTab} />
          </div>
        </PFProvider>
      </div>
      {exportOpen && <ExportDialog projectId={state.project.id} onClose={() => setExportOpen(false)} />}
      {externalChange && (
        <div className="studio-notice">
          The project changed on disk outside the Studio.
          <button
            onClick={async () => {
              const r = await fetch(`/api/projects/${state.project!.id}`);
              const data = await r.json();
              changeBaseline.current = Date.now();
              setExternalChange(false);
              dispatch({ type: 'project-loaded', project: data });
            }}
          >
            Reload
          </button>
          <button onClick={() => setExternalChange(false)}>Dismiss</button>
        </div>
      )}
    </div>
  );
}

/** Preview mode: the honest static render in an iframe (§8.3) — a mode, not a tab. */
function PreviewCanvas({ state }: { state: StudioState }) {
  // Prefetch icon SVGs so the static render can inline them exactly like the export does.
  const [iconSvg, setIconSvg] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    const project = state.project!;
    const jobs: Promise<void>[] = [];
    const map: Record<string, string> = {};
    for (const [key, field] of Object.entries(project.manifest.fields)) {
      if (field.type !== 'icon') continue;
      const v = state.content[key] as { src?: string } | undefined;
      if (!v?.src?.endsWith('.svg')) continue;
      jobs.push(
        fetch(v.src)
          .then((r) => (r.ok ? r.text() : ''))
          .then((t) => {
            if (t) map[key] = t;
          })
          .catch(() => {})
      );
    }
    Promise.all(jobs).then(() => setIconSvg({ ...map }));
  }, [state.project, state.content]);

  const pf = React.useMemo(
    () => ({
      mode: 'static' as const,
      content: state.content,
      manifest: state.project!.manifest,
      selected: null,
      onSelect: () => {},
      onChange: () => {},
      iconSvg,
    }),
    [state.content, state.project, iconSvg]
  );
  const html = React.useMemo(() => {
    return renderToStaticMarkup(
      <PFProvider value={pf}>
        <RenderPage config={state.project!.config} blocks={blocksFor(state.project!.id)} />
      </PFProvider>
    );
  }, [pf, state.project]);
  const srcDoc = `<!doctype html><html><head><meta charset="utf-8"><style>${state.project!.tokensCss}\n${blockCssFor(state.project!.id, state.project!.config.blocks)}</style></head><body>${html}</body></html>`;
  return (
    <main className="studio-canvas-wrap">
      <div className="studio-canvas studio-preview-wrap">
        <iframe className="studio-preview" title="Preview" srcDoc={srcDoc} />
      </div>
    </main>
  );
}
