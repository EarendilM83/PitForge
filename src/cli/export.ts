// Headless export: npm run export -- --project demo --domain https://example.com
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { exportProject } from '../server/export';
import { PROJECTS_DIR } from '../server/projects';
import { renderStaticHtml, type BlockLoader } from '../server/render';
import type { RenderHtml } from '../server/ssr-entry';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const project = arg('project');
const domain = arg('domain');

if (!project || !domain) {
  console.error('Usage: npm run export -- --project <id> --domain <https://example.com>');
  process.exit(1);
}

// tsx resolves TSX imports directly, so blocks load like any other module.
const loadBlock: BlockLoader = (projectId, blockName) =>
  import(pathToFileURL(path.join(PROJECTS_DIR, projectId, 'blocks', `${blockName}.tsx`)).href);
const renderHtml: RenderHtml = (proj, content) => renderStaticHtml(proj, loadBlock, content);

try {
  const result = await exportProject(project, domain, renderHtml);
  const warns = result.checks.filter((c) => c.level === 'warn');
  for (const w of warns) console.warn(`warn [${w.id}] ${w.detail}`);
  console.log(`Export complete: ${result.zipPath}`);
} catch (e) {
  const err = e as Error & { checks?: { id: string; level: string; detail: string; fix: string }[] };
  console.error(`Export failed: ${err.message}`);
  for (const c of err.checks?.filter((x) => x.level === 'fail') ?? []) {
    console.error(`  fail [${c.id}] ${c.detail}\n    fix: ${c.fix}`);
  }
  process.exit(1);
}
