import React from 'react';
import type { Project } from '../runtime/types';

interface ProjectSummary {
  id: string;
  name: string;
  blockCount: number;
}

export default function ProjectPicker({ onOpen }: { onOpen: (project: Project) => void }) {
  const [projects, setProjects] = React.useState<ProjectSummary[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

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

  return (
    <div className="studio-picker">
      <h1>PitForge Studio</h1>
      <p>Open a project from <code>./projects/</code></p>
      {error && <div className="studio-error">{error}</div>}
      {!projects && !error && <p>Loading…</p>}
      <ul>
        {projects?.map((p) => (
          <li key={p.id}>
            <button onClick={() => open(p.id)}>
              <strong>{p.name}</strong> <span className="studio-muted">({p.id} · {p.blockCount} blocks)</span>
            </button>
          </li>
        ))}
      </ul>
      {projects?.length === 0 && <p>No projects found in <code>./projects/</code>.</p>}
    </div>
  );
}
