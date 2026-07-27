import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { listProjects, loadProject, saveContent, PROJECTS_DIR } from './projects';
import { processUpload } from './media';
import { buildHead } from '../seo/head';
import { runChecks, referencedAssetBytes } from '../seo/checks';
import { exportProject } from './export';
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

  app.get('/api/projects', (_req, res) => {
    res.json(listProjects());
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

  return app;
}
