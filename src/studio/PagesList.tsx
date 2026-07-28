import React from 'react';
import type { Project } from '../runtime/types';
import ExportDialog from './ExportDialog';
import NewSiteDialog from './NewSiteDialog';

interface ProjectSummary {
  id: string;
  name: string;
  blockCount: number;
  modified: number;
}

/** Home screen — WP-admin style shell (dark sidebar) around the Sites list. */
export default function PagesList({ onOpen }: { onOpen: (project: Project) => void }) {
  const [projects, setProjects] = React.useState<ProjectSummary[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [exportId, setExportId] = React.useState<string | null>(null);
  const [newOpen, setNewOpen] = React.useState(false);

  React.useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then(setProjects)
      .catch((e) => setError(String(e)));
  }, []);

  const open = async (id: string) => {
    const r = await fetch(`/api/projects/${id}`);
    const data = await r.json();
    if (!r.ok) {
      setError(data.error || 'Failed to load project');
      return;
    }
    onOpen(data as Project);
  };

  const fmtDate = (ts: number) =>
    new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="studio-shell">
      <aside className="studio-shell-nav">
        <div className="studio-shell-logo">PitForge</div>
        <button className="studio-shell-navitem active">Sites</button>
      </aside>
      <main className="studio-shell-main">
        <div className="studio-pages">
          <div className="studio-pages-head">
            <div>
              <h1>Sites</h1>
              <p className="studio-muted">Your landing sites. Open one to edit its content and SEO, or export it as a ready-to-upload ZIP.</p>
            </div>
            <button className="studio-btn-primary" onClick={() => setNewOpen(true)}>+ New site</button>
          </div>

          <ol className="studio-steps-strip">
            <li><strong>1. Create</strong><span>New site — from Figma or blank</span></li>
            <li><strong>2. Edit</strong><span>Click anything on the page to change it</span></li>
            <li><strong>3. SEO</strong><span>Page tab: Google preview + checks</span></li>
            <li><strong>4. Export</strong><span>Download a ZIP, upload anywhere</span></li>
          </ol>

          {error && <div className="studio-error">{error}</div>}
          {!projects && !error && <p className="studio-muted">Loading…</p>}

          {projects && projects.length > 0 && (
            <table className="studio-pages-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Blocks</th>
                  <th>Last modified</th>
                  <th aria-label="actions" />
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id} onClick={() => open(p.id)}>
                    <td>
                      <strong>{p.name}</strong>
                      <span className="studio-muted" style={{ display: 'block' }}>{p.id}</span>
                    </td>
                    <td>{p.blockCount}</td>
                    <td>{fmtDate(p.modified)}</td>
                    <td className="studio-pages-actions">
                      <button className="studio-btn-link" onClick={(e) => { e.stopPropagation(); open(p.id); }}>
                        Edit
                      </button>
                      <button className="studio-btn-link" onClick={(e) => { e.stopPropagation(); setExportId(p.id); }}>
                        Export
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {projects && projects.length === 0 && (
            <div className="studio-empty">
              <div className="studio-empty-icon">▦</div>
              <h2>No sites yet</h2>
              <p className="studio-muted">
                Create your first landing site — import a design from Figma, or start with a blank
                starter and edit it right away.
              </p>
              <button className="studio-btn-primary" onClick={() => setNewOpen(true)}>+ Create your first site</button>
            </div>
          )}
        </div>
      </main>
      {exportId && <ExportDialog projectId={exportId} onClose={() => setExportId(null)} />}
      {newOpen && <NewSiteDialog onClose={() => setNewOpen(false)} onCreated={() => window.location.reload()} />}
    </div>
  );
}
