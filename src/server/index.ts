import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { listProjects, loadProject, saveContent, PROJECTS_DIR } from './projects';
import { processUpload } from './media';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

export function createApiApp(): express.Express {
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

  return app;
}
