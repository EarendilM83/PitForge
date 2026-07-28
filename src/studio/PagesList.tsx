import React from 'react';
import type { Project } from '../runtime/types';
import ExportDialog from './ExportDialog';

interface ProjectSummary {
  id: string;
  name: string;
  blockCount: number;
  modified: number;
}

/** Home screen — WordPress "Pages" style list of sites. */
export default function PagesList({ onOpen }: { onOpen: (project: Project) => void }) {
  const [projects, setProjects] = React.useState<ProjectSummary[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [exportId, setExportId] = React.useState<string | null>(null);

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
    <div className="studio-pages">
      <div className="studio-pages-head">
        <h1>Sites</h1>
        <p className="studio-muted">One landing site per row. Open a site to edit its content and SEO, or export it directly.</p>
      </div>
      {error && <div className="studio-error">{error}</div>}
      {!projects && !error && <p className="studio-muted">Loading…</p>}
      {projects && (
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
            {!projects.length && (
              <tr>
                <td colSpan={4} className="studio-muted">No projects found in <code>./projects/</code>.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
      {exportId && <ExportDialog projectId={exportId} onClose={() => setExportId(null)} />}
    </div>
  );
}
