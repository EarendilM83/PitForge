import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { reducer, initialState, type StudioState, type Action } from './state';
import PagesList from './PagesList';
import Canvas from './Canvas';
import BuilderLeftRail from './BuilderLeftRail';
import BuilderInspector from './BuilderInspector';
import TestPanel from './TestPanel';
import QAPipeline from './QAPipeline';
import ExportDialog from './ExportDialog';
import { PFProvider } from '../runtime/context';
import { RenderPage, type BlockModule } from '../runtime/renderPage';
import { PF_UTILITIES_CSS } from '../runtime/pfUtilities';
import { projectLangs, type ContentValue, type Project } from '../runtime/types';

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
  const [publishing, setPublishing] = React.useState(false);
  const [builderMode, setBuilderMode] = React.useState(false); // Marketer (bounded) vs Builder (free-form)
  const [testOpen, setTestOpen] = React.useState(false);
  const [qaOpen, setQaOpen] = React.useState(false);
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

  const onSelect = (field: string | null) => dispatch({ type: 'select', field });

  const pf = {
    mode: 'edit' as const,
    content: state.content,
    manifest: state.project.manifest,
    selected: state.selected,
    onSelect,
    onChange: (field: string, value: ContentValue) => dispatch({ type: 'change', field, value }),
  };

  // One-click publish: build the live site and open it in a new tab.
  const publish = async () => {
    if (!state.project || publishing) return;
    setPublishing(true);
    try {
      const r = await fetch(`/api/projects/${state.project.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const j = await r.json();
      if (j.url) window.open(j.url, '_blank', 'noopener');
      else alert(`Publish failed: ${j.error || 'unknown error'}`);
    } catch {
      alert('Publish failed — is the server running?');
    } finally {
      setPublishing(false);
    }
  };

  if (previewMode) {
    return (
      <div className="studio-el studio-el-preview">
        <PFProvider value={pf}>
          <main className="studio-el-main">
            <PreviewCanvas state={state} />
            <button className="studio-el-exit-preview" onClick={() => setPreviewMode(false)}>← Back to editor</button>
          </main>
        </PFProvider>
      </div>
    );
  }

  const selectedLabel = state.selected
    ? document.querySelector(`.studio-page [data-pf-el="${CSS.escape(state.selected)}"]`)?.getAttribute('data-pf-label') ?? null
    : null;
  const devices: [string, string, number | 'full'][] = [['🖥', 'Desktop', 'full'], ['▭', 'Tablet', 768], ['▯', 'Mobile', 390]];

  return (
    <div className="studio-el builder pro">
      <header className="pro-topbar">
        <button className="pro-brand" title="Back to sites" onClick={() => window.location.reload()}>
          <span className="pro-mark">◆</span> PitForge
        </button>
        <span className="pro-tb-div" />
        <div className="pro-crumb"><b>{state.project.config.name}</b><span className="sep">/</span>Home
          {selectedLabel && <><span className="sep">/</span><span className="cur">{selectedLabel}</span></>}
        </div>
        <span className={`pro-saved ${state.saveStatus}`}>{state.saveStatus === 'saving' ? 'Saving…' : state.saveStatus === 'error' ? 'Save error' : 'Saved'}</span>

        <select
          className={`pro-lang ${state.activeLang !== 'en' ? 'on' : ''}`}
          title="Language — English is the source; other languages translate per key"
          value={state.activeLang}
          onChange={(e) => {
            if (e.target.value === '__add') {
              const code = window.prompt('New language code (e.g. de, es, fr, ka):')?.trim().toLowerCase();
              if (code && !projectLangs(state.content).includes(code)) {
                const cur = (state.content['_langs'] as string[] | undefined) ?? [];
                dispatch({ type: 'change', field: '_langs', value: [...cur, code] });
                dispatch({ type: 'set-lang', lang: code });
              }
            } else dispatch({ type: 'set-lang', lang: e.target.value });
          }}
        >
          {projectLangs(state.content).map((l) => <option key={l} value={l}>{l === 'en' ? '🌐 English · source' : `🌐 ${l.toUpperCase()}`}</option>)}
          <option value="__add">＋ Add language…</option>
        </select>

        <div className="pro-tb-center">
          <div className="pro-seg">
            {devices.map(([ico, label, w]) => (
              <button key={label} className={state.canvasWidth === w ? 'on' : ''} onClick={() => dispatch({ type: 'canvas-width', width: w })}>{ico} {label}</button>
            ))}
          </div>
        </div>

        <div className="pro-tb-right">
          <button className={`pro-mode ${builderMode ? 'on' : ''}`} title={builderMode ? 'Builder mode — free-form editing unlocked. Click for Marketer (safe) mode.' : 'Marketer mode — safe, bounded edits. Click to unlock Builder mode.'} onClick={() => setBuilderMode((m) => !m)}>
            {builderMode ? '🔧 Builder' : '🔒 Marketer'}
          </button>
          <span className="pro-tb-div" />
          <button className="pro-icobtn" title="Undo" onClick={() => dispatch({ type: 'undo' })} disabled={!state.undoStack.length}>↩</button>
          <button className="pro-icobtn" title="Redo" onClick={() => dispatch({ type: 'redo' })} disabled={!state.redoStack.length}>↪</button>
          <span className="pro-tb-div" />
          <button className="pro-btn ghost" onClick={() => setQaOpen(true)} title="AI QA pipeline — measured, staged, with evidence">🔬 QA</button>
          <button className="pro-btn ghost" onClick={() => setTestOpen(true)} title="Run the responsive test & scan">▶ Test</button>
          <button className="pro-btn ghost" onClick={() => setPreviewMode(true)}>Preview</button>
          <button className="pro-btn ghost" onClick={() => setExportOpen(true)}>Export</button>
          <button className="pro-btn primary" onClick={publish} disabled={publishing}>{publishing ? 'Publishing…' : 'Publish →'}</button>
        </div>
      </header>

      <BuilderLeftRail state={state} dispatch={dispatch} />

      <main className="studio-el-main">
        {state.canvasWidth === 'full' ? (
          <PFProvider value={pf}>
            <Canvas state={state} dispatch={dispatch} onSelect={onSelect} />
          </PFProvider>
        ) : (
          <DeviceFrame state={state} width={state.canvasWidth} />
        )}
      </main>

      <BuilderInspector state={state} dispatch={dispatch} builderMode={builderMode} />

      {testOpen && <TestPanel state={state} onClose={() => setTestOpen(false)} />}
      {qaOpen && <QAPipeline state={state} onClose={() => setQaOpen(false)} />}
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


/** Device preview — the EXACT static render (what publishes) inside an iframe sized to the device,
 *  so media queries fire at the real width. This is why the editor === preview at Tablet/Mobile:
 *  it is literally the same render, not the inline canvas squished into a narrow box. */
function DeviceFrame({ state, width }: { state: StudioState; width: number }) {
  const project = state.project!;
  const html = React.useMemo(
    () =>
      renderToStaticMarkup(
        <PFProvider value={{ mode: 'static', content: state.content, manifest: project.manifest, selected: null, lang: state.activeLang, onSelect: () => {}, onChange: () => {} }}>
          <RenderPage config={project.config} blocks={blocksFor(project.id)} />
        </PFProvider>
      ),
    [state.content, state.activeLang, project]
  );
  const srcDoc = `<!doctype html><html lang="${state.activeLang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${project.tokensCss}\n${PF_UTILITIES_CSS}\n${blockCssFor(project.id, project.config.blocks)}</style></head><body>${html}</body></html>`;
  return (
    <div className="pf-device-wrap">
      <iframe className="pf-device-frame" style={{ width }} srcDoc={srcDoc} title={`Device preview ${width}px`} />
      <div className="pf-device-note">📱 {width}px — exact preview with real media queries (identical to publish). Switch to Desktop to edit.</div>
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
  return <iframe className="studio-preview" title="Preview" srcDoc={srcDoc} />;
}
