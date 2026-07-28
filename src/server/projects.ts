import fs from 'node:fs';
import path from 'node:path';
import { projectConfigSchema, manifestSchema, contentSchema, emptyValueFor, type Project, type Field } from '../runtime/types';

export const PROJECTS_DIR = path.resolve(process.cwd(), 'projects');

export function listProjects(): { id: string; name: string; blockCount: number; modified: number }[] {
  if (!fs.existsSync(PROJECTS_DIR)) return [];
  return fs
    .readdirSync(PROJECTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(PROJECTS_DIR, d.name, 'pitforge.json')))
    .map((d) => {
      const dir = path.join(PROJECTS_DIR, d.name);
      const contentFile = path.join(dir, 'content', 'default.json');
      const modified = fs.existsSync(contentFile) ? fs.statSync(contentFile).mtimeMs : fs.statSync(dir).mtimeMs;
      try {
        const cfg = projectConfigSchema.parse(JSON.parse(fs.readFileSync(path.join(dir, 'pitforge.json'), 'utf8')));
        return { id: d.name, name: cfg.name, blockCount: cfg.blocks.length, modified };
      } catch {
        return { id: d.name, name: d.name, blockCount: 0, modified };
      }
    });
}

export function loadProject(id: string): Project {
  if (!/^[\w-]+$/.test(id)) throw new Error(`Invalid project id: ${id}`);
  const dir = path.join(PROJECTS_DIR, id);
  if (!fs.existsSync(dir)) throw new Error(`Project not found: ${id}`);

  const readJson = (p: string) => JSON.parse(fs.readFileSync(p, 'utf8'));

  let config;
  try {
    config = projectConfigSchema.parse(readJson(path.join(dir, 'pitforge.json')));
  } catch (e) {
    throw new Error(`pitforge.json invalid: ${(e as Error).message}`);
  }

  let manifest;
  try {
    manifest = manifestSchema.parse(readJson(path.join(dir, 'manifest.json'))) as unknown as Project['manifest'];
  } catch (e) {
    const err = e as { issues?: { path: (string | number)[]; message: string }[] };
    const detail = err.issues?.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') || (e as Error).message;
    throw new Error(`manifest.json invalid — ${detail}`);
  }

  let content;
  try {
    content = contentSchema.parse(readJson(path.join(dir, 'content', 'default.json')));
  } catch (e) {
    const err = e as { issues?: { path: (string | number)[]; message: string }[] };
    const detail = err.issues?.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') || (e as Error).message;
    throw new Error(`content/default.json invalid — ${detail}`);
  }

  // Fill manifest fields missing from content with type-appropriate empties;
  // warn about content keys not declared in the manifest (§5.3).
  for (const [key, field] of Object.entries(manifest.fields)) {
    if (!(key in content)) content[key] = emptyValueFor(field as Field);
  }
  for (const key of Object.keys(content)) {
    if (!manifest.fields[key] && !key.startsWith('seo.')) {
      console.warn(`[pitforge] content key "${key}" is not in the manifest; it will render but is not editable`);
    }
  }

  const tokensCss = fs.existsSync(path.join(dir, 'tokens.css')) ? fs.readFileSync(path.join(dir, 'tokens.css'), 'utf8') : '';
  const blockPaths = config.blocks
    .map((b) => path.join(dir, 'blocks', `${b}.tsx`))
    .filter((p) => fs.existsSync(p))
    .map((p) => path.relative(process.cwd(), p));

  return { id, config, manifest, content, tokensCss, blockPaths };
}

export function saveContent(id: string, content: unknown): void {
  if (!/^[\w-]+$/.test(id)) throw new Error(`Invalid project id: ${id}`);
  const dir = path.join(PROJECTS_DIR, id);
  const parsed = contentSchema.parse(content);
  const target = path.join(dir, 'content', 'default.json');
  const tmp = target + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(parsed, null, 2) + '\n');
  fs.renameSync(tmp, target); // atomic (§7)
}
