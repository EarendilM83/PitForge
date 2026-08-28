import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import multer from 'multer';
import { listProjects, loadProject, saveContent, PROJECTS_DIR } from './projects';
import { createProject } from './scaffold';
import { processUpload } from './media';
import { buildHead } from '../seo/head';
import { runChecks, referencedAssetBytes } from '../seo/checks';
import { exportProject } from './export';
import { PF_UTILITIES_CSS } from '../runtime/pfUtilities';
import type { RenderHtml } from './ssr-entry';
import chokidar from 'chokidar';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

// Watch project folders for external changes (§3). The Studio polls /version and
// offers a reload when the timestamp moves. Stupidly simple on purpose.
const changeTs = new Map<string, number>();
chokidar
  .watch(PROJECTS_DIR, { ignoreInitial: true, ignored: [/(^|[/\\])\../, /[/\\]dist[/\\]/] })
  .on('all', (_event, file) => {
    const rel = path.relative(PROJECTS_DIR, file);
    const id = rel.split(path.sep)[0];
    if (id) changeTs.set(id, Date.now());
  });

export function createApiApp(getRender: () => Promise<RenderHtml>): express.Express {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Dev-only: serve project asset files at /assets/* (the same URL shape the
  // export uses). The first project whose assets dir contains the file wins.
  app.get(/^\/assets\/(.+)$/, (req, res, next) => {
    const rel = (req.params as Record<string, string>)[0];
    if (rel.includes('..')) return next();
    for (const p of listProjects()) {
      const file = path.join(PROJECTS_DIR, p.id, 'assets', rel);
      if (fs.existsSync(file)) return res.sendFile(file);
    }
    next();
  });

  // Serve a published site live at /published/:id/... (its /assets resolve via the route above).
  app.get(/^\/published\/([^/]+)(?:\/(.*))?$/, (req, res, next) => {
    const params = req.params as Record<string, string>;
    const id = params[0];
    let rel = params[1] || 'index.html';
    if (rel === '' || rel.endsWith('/')) rel += 'index.html';
    if (rel.includes('..')) return next();
    const file = path.join(PROJECTS_DIR, id, 'published', rel);
    // Preview server: never let the browser serve a stale published page after a re-publish.
    res.set('Cache-Control', 'no-store');
    if (fs.existsSync(file)) return res.sendFile(file);
    next();
  });

  app.get('/api/projects', (_req, res) => {
    res.json(listProjects());
  });

  // Create a blank starter project (Studio "New site" → Blank).
  app.post('/api/projects', (req, res) => {
    try {
      const name = String(req.body?.name || '').trim();
      if (!name) return res.status(400).json({ error: 'A site name is required.' });
      res.status(201).json(createProject(name));
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  app.get('/api/projects/:id/version', (req, res) => {
    res.json({ ts: changeTs.get(req.params.id) ?? 0 });
  });

  // List files in assets/ with sizes, for the Media rail panel (§8.1).
  app.get('/api/projects/:id/assets', (req, res) => {
    const dir = path.join(PROJECTS_DIR, req.params.id, 'assets');
    const out: { path: string; bytes: number }[] = [];
    const walk = (d: string) => {
      if (!fs.existsSync(d)) return;
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const f = path.join(d, e.name);
        if (e.isDirectory()) walk(f);
        else out.push({ path: '/assets/' + path.relative(dir, f).split(path.sep).join('/'), bytes: fs.statSync(f).size });
      }
    };
    walk(dir);
    out.sort((a, b) => a.path.localeCompare(b.path));
    res.json(out);
  });

  app.get('/api/projects/:id', (req, res) => {
    try {
      res.json(loadProject(req.params.id));
    } catch (e) {
      res.status(404).json({ error: (e as Error).message });
    }
  });

  app.put('/api/projects/:id/content', (req, res) => {
    try {
      saveContent(req.params.id, req.body);
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  app.post('/api/projects/:id/media', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded (field name: file).' });
      const result = await processUpload(req.params.id, req.file.originalname, req.file.buffer, {
        ratio: req.body.ratio || undefined,
        minWidth: req.body.minWidth ? Number(req.body.minWidth) : undefined,
      });
      res.json(result);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  app.get('/api/projects/:id/checks', async (req, res) => {
    try {
      const project = loadProject(req.params.id);
      const domain = String(req.query.domain || project.config.domain || 'https://www.example.com');
      const html = await (await getRender())(project);
      if (req.query.debug) return res.type('text/plain').send(html);
      const { total, images } = referencedAssetBytes(project.id, html);
      res.json(runChecks({ project, content: project.content, html, domain, assetBytes: total, imageBytes: images }));
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  app.get('/api/projects/:id/head', (req, res) => {
    try {
      const project = loadProject(req.params.id);
      const domain = String(req.query.domain || project.config.domain || 'https://www.example.com');
      const parts = buildHead(project, project.content, domain, { cssHref: '/assets/styles.css' });
      res.json(parts);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // Standalone preview page at its own URL — the honest static render (same as export),
  // served live so the Studio's eye icon can open it in a new tab.
  app.get('/preview/:id', async (req, res) => {
    try {
      // Force a fresh fetch even from a stale browser cache: redirect the bare URL to a
      // content-versioned one the browser has never seen. Version = newest source mtime.
      const projDir = path.join(PROJECTS_DIR, req.params.id);
      let ver = 0;
      if (fs.existsSync(projDir)) {
        const files = [path.join(projDir, 'tokens.css')];
        for (const sub of ['blocks', 'content']) {
          const dir = path.join(projDir, sub);
          if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir)) files.push(path.join(dir, f));
        }
        for (const f of files) { try { ver = Math.max(ver, Math.floor(fs.statSync(f).mtimeMs)); } catch {} }
      }
      if (String(req.query.v || '') !== String(ver)) {
        return res.set('Cache-Control', 'no-store').redirect(302, `/preview/${req.params.id}?v=${ver}`);
      }
      const project = loadProject(req.params.id);
      const body = await (await getRender())(project);
      let css = project.tokensCss + '\n' + PF_UTILITIES_CSS + '\n';
      for (const name of project.config.blocks) {
        const p = path.join(PROJECTS_DIR, project.id, 'blocks', `${name}.css`);
        if (fs.existsSync(p)) css += fs.readFileSync(p, 'utf8') + '\n';
      }
      const origin = `${req.protocol}://${req.get('host')}`;
      let faviconHref = '';
      for (const fav of ['favicon.svg', 'favicon.ico']) {
        if (fs.existsSync(path.join(PROJECTS_DIR, project.id, 'assets', fav))) { faviconHref = `/assets/${fav}`; break; }
      }
      const head = buildHead(project, project.content, origin, { inlineCss: css, faviconHref });
      const lang = project.config.lang || 'en';
      res
        .set('Cache-Control', 'no-store') // live preview: never serve a browser-cached stale render
        .type('html')
        .send(`<!doctype html>\n<html lang="${lang}">\n<head>\n${head.head}\n${head.jsonLd}\n</head>\n<body>\n<main>\n${body}\n</main>\n</body>\n</html>`);
    } catch (e) {
      res.status(404).type('html').send(`<h1>Preview error</h1><pre>${(e as Error).message}</pre>`);
    }
  });

  app.post('/api/projects/:id/export', async (req, res) => {
    try {
      const result = await exportProject(req.params.id, String(req.body?.domain || ""), await getRender());
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${path.basename(result.zipPath!)}"`);
      fs.createReadStream(result.zipPath!).pipe(res);
    } catch (e) {
      const err = e as Error & { checks?: unknown };
      res.status(400).json({ error: err.message, checks: err.checks });
    }
  });

  // Editable test-case registry — the UI reads/writes tests/cases.json (human-diffable, git-tracked;
  // a Claude hook can read it to honor the checklist on the next run).
  app.get('/api/test/cases', (_req, res) => {
    try { res.json(JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tests', 'cases.json'), 'utf8'))); }
    catch { res.json({ version: 1, cases: [] }); }
  });
  app.put('/api/test/cases', (req, res) => {
    try {
      const p = path.join(process.cwd(), 'tests', 'cases.json');
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, JSON.stringify(req.body, null, 2) + '\n');
      res.json({ ok: true });
    } catch (e) { res.status(400).json({ error: (e as Error).message }); }
  });

  // Live responsive test stream — spawns the pipeline in --stream mode and forwards its NDJSON
  // events as SSE so the Studio's test board can show Playwright running in real time.
  app.get('/api/test/stream', (req, res) => {
    const project = String(req.query.project || '');
    res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    (res as unknown as { flushHeaders?: () => void }).flushHeaders?.();
    // Full end-to-end run for the current project: routes, screens, layouts (320→3200), editor.
    const args = ['scripts/test-pipeline.mjs', '--stream'];
    if (project) args.push('--project', project);
    const child = spawn('node', args, { cwd: process.cwd() });
    let buf = '';
    child.stdout.on('data', (d) => {
      buf += d.toString();
      const lines = buf.split('\n');
      buf = lines.pop() || '';
      for (const line of lines) if (line.trim()) res.write(`data: ${line}\n\n`);
    });
    child.stderr.on('data', () => {});
    child.on('close', () => { res.write('data: {"type":"run-end"}\n\n'); res.end(); });
    req.on('close', () => child.kill());
  });


  // One-click publish: build the optimized static site and serve it live at /published/:id/.
  app.post('/api/projects/:id/publish', async (req, res) => {
    try {
      // Use a real domain for canonical/OG (never localhost — the SEO gate rejects it).
      const domain = String(req.body?.domain || loadProject(req.params.id).config.domain || 'https://example.com');
      const outDir = path.join(PROJECTS_DIR, req.params.id, 'published');
      await exportProject(req.params.id, domain, await getRender(), outDir);
      res.json({ url: `/published/${req.params.id}/` });
    } catch (e) {
      const err = e as Error & { checks?: unknown };
      res.status(400).json({ error: err.message, checks: err.checks });
    }
  });

  return app;
}
