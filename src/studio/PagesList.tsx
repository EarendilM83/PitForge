import React from 'react';
import type { Project } from '../runtime/types';
import ExportDialog from './ExportDialog';
import NewSiteDialog from './NewSiteDialog';
import OnboardingWizard from './OnboardingWizard';
import DocsCenter from './DocsCenter';
import Landing from './marketing/Landing';
import Setup from './marketing/Setup';
import MarketingNav from './marketing/MarketingNav';
import CoachTour from './coach/CoachTour';

interface ProjectSummary {
  id: string;
  name: string;
  blockCount: number;
  modified: number;
}

type Section = 'home' | 'setup' | 'guide' | 'sites';

/** The Studio shell (no project open): animated Landing + guided Setup + User Guide + Sites dashboard. */
export default function PagesList({ onOpen }: { onOpen: (project: Project) => void }) {
  const [section, setSection] = React.useState<Section>('home');
  const [projects, setProjects] = React.useState<ProjectSummary[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [exportId, setExportId] = React.useState<string | null>(null);
  const [newOpen, setNewOpen] = React.useState(false);
  const [wizOpen, setWizOpen] = React.useState(false);
  const [tourOpen, setTourOpen] = React.useState(false);

  React.useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then(setProjects)
      .catch((e) => setError(String(e)));
  }, []);

  // First time the marketer reaches the Sites workspace, let Zippy show them around.
  React.useEffect(() => {
    if (section !== 'sites') return;
    try {
      if (!localStorage.getItem('pf-tour-seen')) {
        localStorage.setItem('pf-tour-seen', '1');
        const t = setTimeout(() => setTourOpen(true), 600);
        return () => clearTimeout(t);
      }
    } catch { /* ignore */ }
  }, [section]);

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

  const goCreateSite = () => {
    setSection('sites');
    setNewOpen(true);
  };

  const dialogs = (
    <>
      {exportId && <ExportDialog projectId={exportId} onClose={() => setExportId(null)} />}
      {newOpen && <NewSiteDialog onClose={() => setNewOpen(false)} onCreated={() => window.location.reload()} />}
      {wizOpen && <OnboardingWizard onClose={() => setWizOpen(false)} />}
    </>
  );

  // Full-bleed marketing surfaces (no app rail).
  if (section === 'home') {
    return (
      <>
        <Landing onGetStarted={() => setSection('setup')} onGuide={() => setSection('guide')} onStudio={() => setSection('sites')} />
        {dialogs}
      </>
    );
  }
  if (section === 'setup') {
    return (
      <>
        <Setup onCreateSite={goCreateSite} onHome={() => setSection('home')} onGuide={() => setSection('guide')} onStudio={() => setSection('sites')} />
        {dialogs}
      </>
    );
  }
  if (section === 'guide') {
    return (
      <>
        <div className="pf-mkt pf-guide">
          <MarketingNav active="guide" onHome={() => setSection('home')} onGuide={() => {}} onSetup={() => setSection('setup')} onStudio={() => setSection('sites')} />
          <DocsCenter />
        </div>
        {dialogs}
      </>
    );
  }

  // The Sites dashboard keeps the left app rail.
  const navItem = (id: Section, label: string) => (
    <button className={`pf-dash-nav ${section === id ? 'active' : ''}`} onClick={() => setSection(id)}>
      {label}
    </button>
  );

  return (
    <>
      <div className="pf-dash">
        <aside className="pf-dash-side">
          <button className="pf-dash-brand" onClick={() => setSection('home')} title="Back to home" style={{ border: 0, background: 'transparent', cursor: 'pointer' }}>
            <span className="pf-dash-mark">◆</span> PitForge
          </button>
          <nav>
            {navItem('home', 'Home')}
            {navItem('setup', 'Setup')}
            {navItem('guide', 'User Guide')}
            {navItem('sites', 'Sites')}
          </nav>
          <div className="pf-dash-side-foot">Local Studio</div>
        </aside>

        {section === 'sites' && (
          <main className="pf-dash-main">
            <header className="pf-dash-head">
              <div>
                <h1>Sites</h1>
                <p>Build, edit and publish landing pages — no code required.</p>
              </div>
              <div style={{ display: 'flex', gap: 'var(--ads-space-2)', alignItems: 'center' }}>
                <button className="pf-dash-help" onClick={() => setTourOpen(true)}>
                  ? How it works
                </button>
                <button className="pf-dash-new" onClick={() => setNewOpen(true)}>
                  + New site
                </button>
              </div>
            </header>

            {error && <div className="pf-dash-err">{error}</div>}

            {!projects && !error && (
              <div className="pf-dash-grid">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="pf-skel" />
                ))}
              </div>
            )}

            {projects && (
              <div className="pf-dash-grid">
                {projects.map((p) => (
                  <article className="pf-card" key={p.id}>
                    <button className="pf-card-cover" onClick={() => open(p.id)} aria-label={`Open ${p.name}`}>
                      <iframe className="pf-card-thumb" src={`/preview/${p.id}`} scrolling="no" tabIndex={-1} title="" loading="lazy" />
                      <span className="pf-card-open">Open editor →</span>
                    </button>
                    <div className="pf-card-body">
                      <div className="pf-card-titles">
                        <h3>{p.name}</h3>
                        <span className="pf-card-slug">/{p.id}</span>
                      </div>
                      <span className="pf-card-meta">
                        {p.blockCount} sections · updated {fmtDate(p.modified)}
                      </span>
                    </div>
                    <div className="pf-card-actions">
                      <button className="pf-btn pf-btn-primary" onClick={() => open(p.id)}>
                        Edit
                      </button>
                      <a className="pf-btn" href={`/preview/${p.id}`} target="_blank" rel="noopener">
                        Preview
                      </a>
                      <button className="pf-btn" onClick={() => setExportId(p.id)}>
                        Export
                      </button>
                    </div>
                  </article>
                ))}

                <button className="pf-card pf-card-new" onClick={() => setNewOpen(true)}>
                  <span className="pf-card-new-plus">+</span>
                  <span>New site</span>
                  <span className="pf-card-new-sub">Import from Figma or start blank</span>
                </button>
              </div>
            )}
          </main>
        )}
      </div>
      {tourOpen && <CoachTour onClose={() => setTourOpen(false)} />}
      {dialogs}
    </>
  );
}
