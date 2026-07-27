import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import archiver from 'archiver';
import type { Project } from '../runtime/types';
import { loadProject, PROJECTS_DIR } from './projects';
import type { RenderHtml } from './ssr-entry';
import { buildHead, absolutize } from '../seo/head';
import { runChecks, referencedAssetBytes, type CheckResult } from '../seo/checks';
import type { ImageValue } from '../runtime/types';

export interface ExportResult {
  checks: CheckResult[];
  zipPath?: string;
  outDir?: string;
}

function minifyCss(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

/** Minimal HTML prettifier — good enough for a human to read the output (§12.11). */
export function prettifyHtml(html: string): string {
  const inline = new Set(['span', 'a', 'b', 'i', 'em', 'strong', 'title', 'img', 'meta', 'link', 'source']);
  let out = '';
  let indent = 0;
  const tokens = html.replace(/>\s+</g, '><').split(/(?=<)/);
  for (const tok of tokens) {
    if (!tok.trim()) continue;
    const tag = /^<\/?([a-zA-Z0-9]+)/.exec(tok)?.[1]?.toLowerCase() ?? '';
    const isClose = /^<\//.test(tok);
    const isSelfClose = /\/>$/.test(tok) || ['meta', 'link', 'img', 'source', 'br', 'input'].includes(tag);
    if (isClose) indent = Math.max(0, indent - 1);
    out += '  '.repeat(indent) + tok.trim() + '\n';
    if (!isClose && !isSelfClose && !inline.has(tag) && tok.startsWith('<')) indent++;
  }
  return out;
}

const HTACCESS = `# PitForge export — Apache config
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript image/svg+xml
</IfModule>
<IfModule mod_brotli.c>
  AddOutputFilterByType BROTLI_COMPRESS text/html text/css application/javascript image/svg+xml
</IfModule>
# Long cache on fingerprinted assets
<FilesMatch "\\.(css|js|avif|webp|jpg|jpeg|png|svg|woff2)$">
  Header set Cache-Control "public, max-age=31536000, immutable"
</FilesMatch>
# No-cache on HTML
<FilesMatch "\\.html$">
  Header set Cache-Control "no-cache"
</FilesMatch>
ErrorDocument 404 /404.html
`;

const NGINX = `# PitForge export — example nginx server block
server {
  listen 80;
  server_name example.com;
  root /var/www/site;
  index index.html;

  gzip on;
  gzip_types text/html text/css application/javascript image/svg+xml;
  brotli on;
  brotli_types text/html text/css application/javascript image/svg+xml;

  location ~* \\.(css|js|avif|webp|jpe?g|png|svg|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
  location ~* \\.html$ {
    add_header Cache-Control "no-cache";
  }
  error_page 404 /404.html;
  location / { try_files $uri $uri/ =404; }
}
`;

const REDIRECTS = `# PitForge export — Netlify-style rules
/assets/*  /assets/:splat  200
/*         /404.html       404
`;

function readme(project: Project, domain: string): string {
  return `# ${project.config.name} — static export

Deploy in four steps:

1. Unzip this archive.
2. Upload the contents of the unzipped folder to your web root (e.g. \`public_html/\`).
3. Point ${domain || 'your domain'} at the server (DNS A/CNAME record).
4. Submit ${domain.replace(/\/+$/, '')}/sitemap.xml in Google Search Console.

One-liner (rsync):

\`\`\`sh
rsync -avz --delete ./ user@your-server:/var/www/site/
\`\`\`
`;
}

function timestamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

/** §12 — the full export pipeline. Shared by the API endpoint and the CLI. */
export async function exportProject(
  projectId: string,
  domain: string,
  renderHtml: RenderHtml,
  destDir?: string
): Promise<ExportResult> {
  if (!domain || !/^https?:\/\/.+/.test(domain)) {
    throw new Error('A domain is required for export (e.g. https://example.com) — it is needed for absolute URLs.');
  }
  const project = loadProject(projectId);
  const content: Project['content'] = { ...project.content, 'seo.dateModified': new Date().toISOString().slice(0, 10) };

  const body = await renderHtml(project, content);
  const { total, images, files } = referencedAssetBytes(projectId, body);
  const checks = runChecks({ project, content, html: body, domain, assetBytes: total, imageBytes: images });
  const failures = checks.filter((c) => c.level === 'fail');
  if (failures.length) {
    const err = new Error('Export aborted: checks failed') as Error & { checks: CheckResult[] };
    err.checks = checks;
    throw err;
  }

  // CSS: tokens + block CSS, concatenated then minified (§9).
  const dir = path.join(PROJECTS_DIR, projectId);
  let css = project.tokensCss + '\n';
  for (const name of project.config.blocks) {
    const cssPath = path.join(dir, 'blocks', `${name}.css`);
    if (fs.existsSync(cssPath)) css += fs.readFileSync(cssPath, 'utf8') + '\n';
  }
  const minCss = minifyCss(css);
  const hash = crypto.createHash('sha1').update(minCss).digest('hex').slice(0, 4);
  const cssHref = `/assets/styles.${hash}.css`;

  // Priority image (§10.4 preload).
  let prioritySrc = '';
  for (const [key, field] of Object.entries(project.manifest.fields)) {
    if (field.type === 'image' && field.priority) {
      const v = content[key] as ImageValue | undefined;
      if (v?.src) prioritySrc = v.src;
    }
  }

  const head = buildHead(project, content, domain, { cssHref, priorityImageSrc: prioritySrc });
  const lang = content['seo.lang'] || project.config.lang || 'en';
  const htmlDoc = prettifyHtml(
    `<!doctype html>\n<html lang="${lang}">\n<head>\n${head.head}\n${head.jsonLd}\n</head>\n<body>\n<main>\n${body}\n</main>\n</body>\n</html>`
  );

  const name = `${projectId}-${timestamp()}`;
  const outDir = destDir ?? path.join(PROJECTS_DIR, projectId, 'dist', name);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(outDir, 'assets'), { recursive: true });

  fs.writeFileSync(path.join(outDir, 'index.html'), htmlDoc);
  fs.writeFileSync(path.join(outDir, '404.html'), prettifyHtml(`<!doctype html>\n<html lang="${lang}">\n<head>\n<meta charset="utf-8">\n<title>404</title>\n<link rel="stylesheet" href="${cssHref}">\n</head>\n<body>\n<main><h1>404</h1></main>\n</body>\n</html>`));
  fs.writeFileSync(path.join(outDir, 'assets', `styles.${hash}.css`), minCss);
  fs.writeFileSync(path.join(outDir, 'sitemap.xml'), head.sitemapXml);
  fs.writeFileSync(path.join(outDir, 'robots.txt'), head.robotsTxt);
  fs.writeFileSync(
    path.join(outDir, 'site.webmanifest'),
    JSON.stringify({ name: project.config.name, short_name: project.config.name, lang, start_url: absolutize('/', domain), display: 'browser' }, null, 2)
  );
  fs.writeFileSync(path.join(outDir, '.htaccess'), HTACCESS);
  fs.writeFileSync(path.join(outDir, 'nginx.conf.example'), NGINX);
  fs.writeFileSync(path.join(outDir, '_redirects'), REDIRECTS);
  fs.writeFileSync(path.join(outDir, 'README.md'), readme(project, domain));

  // Copy only referenced assets (§12.6).
  for (const f of files) {
    const rel = path.relative(path.join(dir, 'assets'), f);
    const dest = path.join(outDir, 'assets', rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(f, dest);
  }
  // favicon if present
  for (const fav of ['favicon.ico', 'favicon.svg']) {
    const f = path.join(dir, 'assets', fav);
    if (fs.existsSync(f)) fs.copyFileSync(f, path.join(outDir, fav));
  }

  // ZIP it.
  const zipPath = `${outDir}.zip`;
  await new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', () => resolve());
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(outDir, `${project.config.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`);
    archive.finalize();
  });

  return { checks, zipPath, outDir };
}
