import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { PROJECTS_DIR, loadProject } from './projects';
import { slugify } from './scaffold';
import { sanitizeImportedHtml } from '../runtime/sanitize';

const MAX_ZIP = 50 * 1024 * 1024;
const MAX_UNPACKED = 200 * 1024 * 1024;
const MAX_FILES = 5000;

export interface ImportResult {
  id: string;
  name: string;
  mode: ImportMode;
  blocks: number;
  source: string;
  sourceFiles: number;
  importedAssets: number;
  seo: { title: string; description: string; canonical: string; lang: string; h1: number };
  warnings: string[];
}

interface ZipEntry { name: string; data: Buffer; }
export type ImportMode = 'preserve' | 'sections';
export interface ImportOptions { mode?: ImportMode; source?: string; preferBuiltOutput?: boolean; }

function safeRel(raw: string): string {
  const name = raw.replace(/\\/g, '/').replace(/^\.\//, '');
  if (!name || name.startsWith('/') || /^[a-z]:/i.test(name) || name.split('/').includes('..') || name.includes('\0')) {
    throw new Error(`Unsafe ZIP path: ${raw}`);
  }
  return path.posix.normalize(name);
}

function unzip(buffer: Buffer): ZipEntry[] {
  if (buffer.length > MAX_ZIP) throw new Error(`ZIP exceeds ${MAX_ZIP / 1024 / 1024} MB.`);
  let eocd = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Invalid ZIP: end-of-central-directory record not found.');
  const count = buffer.readUInt16LE(eocd + 10);
  if (count > MAX_FILES) throw new Error(`ZIP contains too many files (${count}; max ${MAX_FILES}).`);
  let off = buffer.readUInt32LE(eocd + 16);
  let total = 0;
  const out: ZipEntry[] = [];
  for (let i = 0; i < count; i++) {
    if (buffer.readUInt32LE(off) !== 0x02014b50) throw new Error('Invalid ZIP central directory.');
    const flags = buffer.readUInt16LE(off + 8);
    const method = buffer.readUInt16LE(off + 10);
    const compressed = buffer.readUInt32LE(off + 20);
    const size = buffer.readUInt32LE(off + 24);
    const nameLen = buffer.readUInt16LE(off + 28);
    const extraLen = buffer.readUInt16LE(off + 30);
    const commentLen = buffer.readUInt16LE(off + 32);
    const localOff = buffer.readUInt32LE(off + 42);
    const name = safeRel(buffer.subarray(off + 46, off + 46 + nameLen).toString('utf8'));
    off += 46 + nameLen + extraLen + commentLen;
    if (name.endsWith('/')) continue;
    if (flags & 1) throw new Error(`Encrypted ZIP entries are not supported: ${name}`);
    if (![0, 8].includes(method)) throw new Error(`Unsupported ZIP compression method ${method}: ${name}`);
    total += size;
    if (total > MAX_UNPACKED) throw new Error(`Unpacked ZIP exceeds ${MAX_UNPACKED / 1024 / 1024} MB.`);
    if (buffer.readUInt32LE(localOff) !== 0x04034b50) throw new Error(`Invalid ZIP local header: ${name}`);
    const localName = buffer.readUInt16LE(localOff + 26);
    const localExtra = buffer.readUInt16LE(localOff + 28);
    const start = localOff + 30 + localName + localExtra;
    const packed = buffer.subarray(start, start + compressed);
    const data = method === 0 ? Buffer.from(packed) : zlib.inflateRawSync(packed, { maxOutputLength: MAX_UNPACKED });
    if (data.length !== size) throw new Error(`ZIP size mismatch: ${name}`);
    out.push({ name, data });
  }
  return out;
}

const text = (html: string, re: RegExp) => (re.exec(html)?.[1] ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const attr = (html: string, tag: string, key: string, value: string, wanted: string) => {
  const tags = html.match(new RegExp(`<${tag}\\b[^>]*>`, 'gi')) ?? [];
  const found = tags.find((t) => new RegExp(`\\b${key}=["']${value}["']`, 'i').test(t));
  return found ? new RegExp(`\\b${wanted}=["']([^"']*)["']`, 'i').exec(found)?.[1] ?? '' : '';
};
const escJson = (v: unknown) => JSON.stringify(v, null, 2) + '\n';

function rewriteUrl(value: string, baseDir: string, names: Set<string>): string {
  if (!value || /^(?:[a-z]+:|\/|#|data:)/i.test(value)) return value;
  const [raw, suffix = ''] = value.split(/(?=[?#])/);
  const resolved = path.posix.normalize(path.posix.join(baseDir, raw));
  return names.has(resolved) ? `/assets/imported/${resolved}${suffix}` : value;
}

function rewriteHtml(html: string, htmlFile: string, names: Set<string>): string {
  const base = path.posix.dirname(htmlFile);
  return html
    .replace(/<(script|style|iframe|object|embed|form)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/\s(src|href|poster)=(['"])(.*?)\2/gi, (_m, key, q, value) => ` ${key}=${q}${rewriteUrl(value, base, names)}${q}`)
    .replace(/\ssrcset=(['"])(.*?)\1/gi, (_m, q, value) => ` srcset=${q}${value.split(',').map((part: string) => { const p = part.trim().split(/\s+/); p[0] = rewriteUrl(p[0], base, names); return p.join(' '); }).join(', ')}${q}`);
}

function rewriteCss(css: string, cssFile: string, names: Set<string>): string {
  const base = path.posix.dirname(cssFile);
  return css
    .replace(/@import[^;]+;/gi, '')
    .replace(/expression\s*\([^)]*\)/gi, '')
    .replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (_m, _q, value) => `url("${rewriteUrl(value, base, names)}")`);
}

function blockTsx(block: string, field: string) { return `import React from 'react';
import { usePF } from '../../../src/runtime/context';
import { localizedValue } from '../../../src/runtime/types';
import { sanitizeImportedHtml } from '../../../src/runtime/sanitize';
import './${block}.css';

export default function ${block}() {
  const pf = usePF();
  const html = sanitizeImportedHtml(String(localizedValue(pf.content, '${field}', pf.lang) ?? ''));
  return <div className="imported-page" data-pf-field={pf.mode === 'edit' ? '${field}' : undefined}
    onClick={pf.mode === 'edit' ? (e) => { e.stopPropagation(); pf.onSelect('${field}'); } : undefined}
    dangerouslySetInnerHTML={{ __html: html }} />;
}
`; }

function readDirectory(root: string): ZipEntry[] {
  const resolvedRoot = path.resolve(root);
  const entries: ZipEntry[] = [];
  let total = 0;
  const walk = (dir: string) => {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      if (item.isSymbolicLink() || ['.git', 'node_modules', '.next', '.env'].includes(item.name)) continue;
      const abs = path.join(dir, item.name);
      if (item.isDirectory()) { walk(abs); continue; }
      if (!item.isFile()) continue;
      const rel = safeRel(path.relative(resolvedRoot, abs));
      const data = fs.readFileSync(abs);
      total += data.length;
      if (entries.length >= MAX_FILES) throw new Error(`Repository contains more than ${MAX_FILES} files.`);
      if (total > MAX_UNPACKED) throw new Error(`Repository files exceed ${MAX_UNPACKED / 1024 / 1024} MB.`);
      entries.push({ name: rel, data });
    }
  };
  walk(resolvedRoot);
  return entries;
}

function splitBlocks(html: string, mode: ImportMode): { block: string; field: string; html: string }[] {
  if (mode !== 'sections') return [{ block: 'ImportedPage', field: 'imported.html', html }];
  const matches = [...html.matchAll(/<(header|section|footer)\b[^>]*>[\s\S]*?<\/\1\s*>/gi)].map((m) => ({ tag: m[1].toLowerCase(), html: m[0] }));
  if (matches.length < 2) return [{ block: 'ImportedPage', field: 'imported.html', html }];
  let section = 0, header = 0, footer = 0;
  return matches.map((m) => {
    const n = m.tag === 'header' ? ++header : m.tag === 'footer' ? ++footer : ++section;
    const label = m.tag === 'header' ? 'Header' : m.tag === 'footer' ? 'Footer' : 'Section';
    const block = `Imported${label}${n > 1 || label === 'Section' ? n : ''}`;
    return { block, field: `imported.${m.tag}${n}.html`, html: m.html };
  });
}

function writeQaScaffold(root: string, project: string, blocks: string[]) {
  const qa = path.join(root, 'qa');
  fs.mkdirSync(qa, { recursive: true });
  const cases = blocks.map((block) => ({
    id: `sec-${block.toLowerCase()}`, section: block.replace(/([a-z0-9])([A-Z])/g, '$1 $2'), block,
    title: `${block} — imported responsive baseline`,
    description: 'Verify the imported source against deterministic responsive and UX checks.',
    scenarios: [
      { id: 'layout', text: 'No unintended overflow at 320 / 768 / 1440', covers: ['layout', 'overflow'], status: 'todo' },
      { id: 'type', text: 'Text is readable and not clipped', covers: ['fonts', 'fluidity'], status: 'todo' },
      { id: 'assets', text: 'Local images load without distortion', covers: ['assets', 'images'], status: 'todo' },
      { id: 'content', text: 'Imported content and SEO match the source', covers: ['content', 'seo'], status: 'todo' },
    ], interactive: [],
  }));
  fs.writeFileSync(path.join(qa, 'cases.json'), escJson({ project, source: 'imported static source + UX best-practice', cases }));
  fs.writeFileSync(path.join(qa, 'setup-state.json'), escJson({ iteration: 1, interactive: false, critic: false, noDesign: blocks, notes: ['QA scaffold created automatically by the importer.'] }));
}

export function importStaticDirectory(directory: string, requestedName?: string, options: ImportOptions = {}): ImportResult {
  return importStaticEntries(readDirectory(directory), requestedName, options);
}

export function importStaticZip(buffer: Buffer, requestedName?: string, options: ImportOptions = {}): ImportResult {
  return importStaticEntries(unzip(buffer), requestedName, options);
}

function importStaticEntries(entries: ZipEntry[], requestedName?: string, options: ImportOptions = {}): ImportResult {
  const mode = options.mode ?? 'preserve';
  const names = new Set(entries.map((e) => e.name));
  const htmlCandidates = entries.filter((e) => /(^|\/)index\.html?$/i.test(e.name));
  const built = htmlCandidates.filter((e) => /^(?:dist|build|out|public)\/index\.html?$/i.test(e.name));
  const htmlEntry = (options.preferBuiltOutput && built.length ? built : htmlCandidates).sort((a, b) => a.name.length - b.name.length)[0]
    ?? entries.filter((e) => /\.html?$/i.test(e.name)).sort((a, b) => a.name.length - b.name.length)[0];
  if (!htmlEntry) throw new Error('No index.html or HTML page was found in the ZIP.');
  const rawHtml = htmlEntry.data.toString('utf8');
  const title = text(rawHtml, /<title[^>]*>([\s\S]*?)<\/title>/i) || requestedName || 'Imported site';
  const name = (requestedName || title).trim();
  const id = slugify(name);
  if (!id) throw new Error('Site name must contain letters or numbers.');
  const finalDir = path.join(PROJECTS_DIR, id);
  if (fs.existsSync(finalDir)) throw new Error(`Project "${id}" already exists.`);
  const tmpDir = path.join(PROJECTS_DIR, `.import-${id}-${process.pid}-${Date.now()}`);
  const body = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(rawHtml)?.[1] ?? rawHtml;
  const rewritten = rewriteHtml(body, htmlEntry.name, names);
  const safeHtml = sanitizeImportedHtml(rewritten);
  const importedBlocks = splitBlocks(safeHtml, mode);
  const description = attr(rawHtml, 'meta', 'name', 'description', 'content');
  const canonical = attr(rawHtml, 'link', 'rel', 'canonical', 'href');
  const lang = /<html\b[^>]*\blang=["']([^"']+)/i.exec(rawHtml)?.[1] || 'en';
  const ogTitle = attr(rawHtml, 'meta', 'property', 'og:title', 'content') || title;
  const ogDescription = attr(rawHtml, 'meta', 'property', 'og:description', 'content') || description;
  const ogImageRaw = attr(rawHtml, 'meta', 'property', 'og:image', 'content');
  const cssEntries = entries.filter((e) => /\.css$/i.test(e.name));
  const importedCss = cssEntries.map((e) => `/* ${e.name} */\n${rewriteCss(e.data.toString('utf8'), e.name, names)}`).join('\n');
  const warnings: string[] = [];
  if (!description) warnings.push('No meta description found.');
  if (!canonical) warnings.push('No canonical URL found.');
  if (/<script\b/i.test(rawHtml)) warnings.push('Client-side scripts were removed; interactive JavaScript is not imported.');
  if (mode === 'sections' && importedBlocks.length === 1) warnings.push('No repeated top-level header/section/footer structure was found; imported as one editable page block.');
  try {
    fs.mkdirSync(path.join(tmpDir, 'blocks'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'content'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'assets', 'imported'), { recursive: true });
    let assetCount = 0;
    for (const entry of entries) {
      if (entry === htmlEntry || /\.(?:html?|css|js|mjs|cjs|map)$/i.test(entry.name) || /(^|\/)\.(?:env|git)/i.test(entry.name)) continue;
      const target = path.join(tmpDir, 'assets', 'imported', ...entry.name.split('/'));
      const root = path.join(tmpDir, 'assets', 'imported') + path.sep;
      if (!path.resolve(target).startsWith(path.resolve(root))) throw new Error(`Unsafe asset path: ${entry.name}`);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, entry.data);
      assetCount++;
    }
    const domain = canonical ? (() => { try { return new URL(canonical).origin; } catch { return ''; } })() : '';
    const importedFields = Object.fromEntries(importedBlocks.map((b) => [b.field, { type: 'richtext', label: `${b.block} HTML`, block: b.block }]));
    fs.writeFileSync(path.join(tmpDir, 'pitforge.json'), escJson({ name, lang, blocks: importedBlocks.map((b) => b.block), domain, createdBy: options.source || 'zip-import' }));
    fs.writeFileSync(path.join(tmpDir, 'manifest.json'), escJson({ version: 1, fields: {
      ...importedFields,
      'seo.title': { type: 'text', label: 'SEO title', block: '_seo', maxLength: 60 },
      'seo.description': { type: 'text', label: 'Meta description', block: '_seo', maxLength: 155 },
      'seo.slug': { type: 'text', label: 'Slug', block: '_seo' },
      'seo.canonical': { type: 'text', label: 'Canonical', block: '_seo' },
      'seo.robots': { type: 'text', label: 'Robots', block: '_seo' },
      'seo.lang': { type: 'text', label: 'Language', block: '_seo' },
      'seo.og.title': { type: 'text', label: 'OG title', block: '_seo', maxLength: 60 },
      'seo.og.description': { type: 'text', label: 'OG description', block: '_seo', maxLength: 155 },
      'seo.og.image': { type: 'image', label: 'OG image', block: '_seo' },
      'seo.og.type': { type: 'text', label: 'OG type', block: '_seo' },
      'seo.twitter.card': { type: 'text', label: 'Twitter card', block: '_seo' },
    } }));
    const importedContent = Object.fromEntries(importedBlocks.map((b) => [b.field, b.html]));
    fs.writeFileSync(path.join(tmpDir, 'content', 'default.json'), escJson({
      ...importedContent, 'seo.title': title, 'seo.description': description,
      'seo.slug': (() => { try { return new URL(canonical).pathname.replace(/^\/+|\/+$/g, ''); } catch { return id; } })(),
      'seo.canonical': canonical || 'self', 'seo.robots': attr(rawHtml, 'meta', 'name', 'robots', 'content') || 'index,follow',
      'seo.lang': lang, 'seo.og.title': ogTitle, 'seo.og.description': ogDescription,
      'seo.og.image': { src: rewriteUrl(ogImageRaw, path.posix.dirname(htmlEntry.name), names), alt: ogTitle },
      'seo.og.type': attr(rawHtml, 'meta', 'property', 'og:type', 'content') || 'website',
      'seo.twitter.card': attr(rawHtml, 'meta', 'name', 'twitter:card', 'content') || 'summary_large_image',
    }));
    fs.writeFileSync(path.join(tmpDir, 'tokens.css'), ':root { color-scheme: light dark; }\n* { box-sizing: border-box; }\nbody { margin: 0; }\n');
    importedBlocks.forEach((b, index) => {
      fs.writeFileSync(path.join(tmpDir, 'blocks', `${b.block}.tsx`), blockTsx(b.block, b.field));
      fs.writeFileSync(path.join(tmpDir, 'blocks', `${b.block}.css`), index === 0 ? `.imported-page { min-height: 1px; }\n${importedCss}\n` : '');
    });
    fs.writeFileSync(path.join(tmpDir, 'import-report.json'), escJson({ source: options.source || 'zip', mode, html: htmlEntry.name, files: entries.length, assets: assetCount, warnings }));
    writeQaScaffold(tmpDir, id, importedBlocks.map((b) => b.block));
    fs.renameSync(tmpDir, finalDir);
    loadProject(id); // schema validation after atomic promotion; rollback on failure below
    return { id, name, mode, blocks: importedBlocks.length, source: options.source || 'zip', sourceFiles: entries.length, importedAssets: assetCount, seo: { title, description, canonical, lang, h1: (safeHtml.match(/<h1\b/gi) ?? []).length }, warnings };
  } catch (error) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    if (fs.existsSync(finalDir)) fs.rmSync(finalDir, { recursive: true, force: true });
    throw error;
  }
}
