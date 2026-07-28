import React from 'react';

export default function ExportDialog({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [domain, setDomain] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/projects/${projectId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });
      if (!r.ok) {
        const data = await r.json();
        throw new Error(data.error || 'Export failed');
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectId}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="studio-modal-backdrop" onClick={onClose}>
      <div className="studio-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Export site</h2>
        <label>
          Domain (for absolute URLs)
          <input type="text" placeholder="https://example.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
        </label>
        {error && <pre className="studio-error">{error}</pre>}
        <div className="studio-modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button className="studio-btn-primary" disabled={busy || !domain.trim()} onClick={run}>
            {busy ? 'Exporting…' : 'Download ZIP'}
          </button>
        </div>
      </div>
    </div>
  );
}
