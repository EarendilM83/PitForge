import fs from 'node:fs';
import path from 'node:path';
import type { Project, Content, Field, ImageValue } from '../runtime/types';
import { deriveString } from './derive';
import { buildHead } from './head';
import { requestedTypes, SCHEMA_ALLOW_LIST } from './schema';
import { PROJECTS_DIR } from '../server/projects';

export interface CheckResult {
  id: string;
  level: 'pass' | 'warn' | 'fail';
  title: string;
  detail: string;
  fix: string;
}

export interface CheckInput {
  project: Project;
  content: Content;
  html: string; // rendered static body HTML (checks run against rendered output, §16.4)
  domain: string; // used for absolute-URL checks
  assetBytes?: number; // total bytes of referenced assets, for byte-budget
  imageBytes?: number;
}

function r(id: string, level: CheckResult['level'], title: string, detail: string, fix: string): CheckResult {
  return { id, level, title, detail, fix };
}
const pass = (id: string, title: string, detail = '') => r(id, 'pass', title, detail || 'OK', '');

function allImageValues(project: Project, content: Content): { key: string; value: ImageValue; field: Field }[] {
  const out: { key: string; value: ImageValue; field: Field }[] = [];
  for (const [key, field] of Object.entries(project.manifest.fields)) {
    if (field.type === 'image' || field.type === 'icon') {
      const v = content[key] as ImageValue | undefined;
      if (v) out.push({ key, value: v, field });
    }
    if (field.type === 'repeat' && field.item) {
      const items = (content[key] as Record<string, unknown>[] | undefined) ?? [];
      items.forEach((item, i) => {
        for (const [ik, ifield] of Object.entries(field.item!)) {
          if (ifield.type === 'image' || ifield.type === 'icon') {
            const v = item[ik] as ImageValue | undefined;
            if (v) out.push({ key: `${key}.${i}.${ik}`, value: v, field: ifield });
          }
        }
      });
    }
  }
  return out;
}

export function runChecks(input: CheckInput): CheckResult[] {
  const { project, content, html, domain } = input;
  const m = project.manifest;
  const results: CheckResult[] = [];

  // single-h1
  const h1s = html.match(/<h1[\s>]/gi) ?? [];
  results.push(
    h1s.length === 1
      ? pass('single-h1', 'Exactly one <h1>')
      : r('single-h1', 'fail', 'Exactly one <h1>', `Found ${h1s.length} <h1> elements.`, 'Keep one field with heading level 1; demote the rest.')
  );

  // heading-order
  const levels = [...html.matchAll(/<h([1-6])[\s>]/gi)].map((x) => Number(x[1]));
  let skipped = '';
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] > levels[i - 1] + 1) {
      skipped = `h${levels[i - 1]} → h${levels[i]}`;
      break;
    }
  }
  results.push(
    skipped
      ? r('heading-order', 'warn', 'Heading levels descend without skipping', `Skipped level: ${skipped}.`, 'Adjust heading levels so they descend one step at a time.')
      : pass('heading-order', 'Heading order')
  );

  // title-length / desc-length
  const title = deriveString(content, m, 'seo.title');
  results.push(
    title.length >= 1 && title.length <= 60
      ? pass('title-length', 'Title length', `${title.length} chars`)
      : r('title-length', 'warn', 'Title length', `Title is ${title.length} chars (1–60 recommended).`, 'Shorten the SEO title to 60 characters or fewer.')
  );
  const desc = deriveString(content, m, 'seo.description');
  results.push(
    desc.length >= 50 && desc.length <= 155
      ? pass('desc-length', 'Description length', `${desc.length} chars`)
      : r('desc-length', 'warn', 'Description length', `Description is ${desc.length} chars (50–155 recommended).`, 'Write a meta description between 50 and 155 characters.')
  );

  // slug-valid
  const slug = deriveString(content, m, 'seo.slug');
  results.push(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
      ? pass('slug-valid', 'Slug valid', slug)
      : r('slug-valid', 'fail', 'Slug valid', `Slug "${slug}" must be lowercase a-z0-9 with single dashes.`, 'Edit the slug: lowercase letters, numbers and dashes only, no leading/trailing dash.')
  );

  // alt-text
  const missingAlt = allImageValues(project, content).filter((x) => x.field.altRequired && !x.value.alt.trim());
  results.push(
    missingAlt.length
      ? r('alt-text', 'fail', 'Alt text', `Missing alt on: ${missingAlt.map((x) => x.key).join(', ')}.`, 'Fill the required alt text for each listed image.')
      : pass('alt-text', 'Alt text')
  );

  // img-dimensions
  const imgsNoDim = [...html.matchAll(/<img\b[^>]*>/gi)].map((x) => x[0]).filter((t) => !/\bwidth=/.test(t) || !/\bheight=/.test(t));
  results.push(
    imgsNoDim.length
      ? r('img-dimensions', 'fail', 'Image dimensions', `${imgsNoDim.length} <img> without width/height.`, 'Re-upload the image so dimensions are recorded, or add width/height to the field value.')
      : pass('img-dimensions', 'Image dimensions')
  );

  // absolute-urls
  const head = buildHead(project, content, domain);
  const relUrls = [...head.head.matchAll(/(?:href|content)="([^"]+)"/g)].map((x) => x[1]);
  const rel = relUrls.filter((u) => u.startsWith('/'));
  results.push(
    rel.length
      ? r('absolute-urls', 'fail', 'Absolute URLs', `Relative URLs in head: ${rel.join(', ')}.`, 'Set the export domain so canonical and OG URLs can be made absolute.')
      : pass('absolute-urls', 'Absolute URLs')
  );

  // schema-valid
  const { dropped } = requestedTypes(content);
  let schemaOk = true;
  let schemaDetail = '';
  try {
    if (head.jsonLd) JSON.parse(head.jsonLd.replace(/<\/?script[^>]*>/g, ''));
    const types = [...head.jsonLd.matchAll(/"@type":\s*"([^"]+)"/g)].map((x) => x[1]);
    const bad = types.filter((t) => !(SCHEMA_ALLOW_LIST as readonly string[]).includes(t) && !['Question', 'Answer', 'ListItem', 'Person'].includes(t));
    if (bad.length) {
      schemaOk = false;
      schemaDetail = `Types outside the allow-list: ${bad.join(', ')}.`;
    }
  } catch (e) {
    schemaOk = false;
    schemaDetail = `JSON-LD does not parse: ${(e as Error).message}`;
  }
  if (dropped.length) {
    results.push(r('schema-valid', 'warn', 'Schema valid', `Blocked types dropped: ${dropped.join(', ')}. Self-assigned ratings on affiliate pages draw manual actions.`, 'Remove blocked schema types from the project content.'));
  } else {
    results.push(schemaOk ? pass('schema-valid', 'Schema valid') : r('schema-valid', 'fail', 'Schema valid', schemaDetail, 'Fix the schema fields so the JSON-LD is valid and uses only allowed types.'));
  }

  // schema-matches: seo.schema.faq vs rendered FAQ items (repeat field with q/a item keys)
  const schemaFaq = (content['seo.schema.faq'] as unknown[] | undefined) ?? [];
  let renderedFaq = 0;
  for (const [key, field] of Object.entries(m.fields)) {
    if (field.type === 'repeat' && field.item && 'q' in field.item && 'a' in field.item) {
      renderedFaq += ((content[key] as unknown[] | undefined) ?? []).length;
    }
  }
  results.push(
    schemaFaq.length === renderedFaq
      ? pass('schema-matches', 'Schema matches page', `${schemaFaq.length} FAQ entries`)
      : r('schema-matches', 'warn', 'Schema matches page', `seo.schema.faq has ${schemaFaq.length} entries but the page renders ${renderedFaq}.`, 'Sync the schema FAQ entries with the FAQ block content.')
  );

  // link-rel: external links must carry a rel with nofollow/sponsored — an explicit
  // rel="follow" is honoured as a deliberate editorial opt-out (see DECISIONS.md).
  const anchors = [...html.matchAll(/<a\b[^>]*>/gi)].map((x) => x[0]);
  const badLinks: string[] = [];
  for (const a of anchors) {
    const href = /href="([^"]*)"/.exec(a)?.[1] ?? '';
    if (!/^(https?:)?\/\//.test(href) && !href.startsWith('/go/')) continue;
    const relAttr = /rel="([^"]*)"/.exec(a)?.[1] ?? '';
    const tokens = relAttr.split(/\s+/);
    if (tokens.includes('follow')) continue;
    if (!tokens.some((t) => t === 'nofollow' || t === 'sponsored')) badLinks.push(href);
  }
  results.push(
    badLinks.length
      ? r('link-rel', 'fail', 'Link rel', `External links without nofollow/sponsored: ${badLinks.join(', ')}.`, 'Add rel="nofollow sponsored" to affiliate/external links, or an explicit rel="follow".')
      : pass('link-rel', 'Link rel')
  );

  // no-hardcoded-content — parse each block's TSX (§10.5)
  const hardcoded: string[] = [];
  for (const blockPath of project.blockPaths) {
    const abs = path.resolve(process.cwd(), blockPath);
    if (!fs.existsSync(abs)) continue;
    const lines = fs.readFileSync(abs, 'utf8').split('\n');
    lines.forEach((line, i) => {
      const loc = `${blockPath}:${i + 1}`;
      // src=/href= string literals
      if (/(?:src|href)\s*=\s*["'`]/.test(line)) hardcoded.push(`${loc} — src/href string literal`);
      // JSX text children (content between > and < that is not whitespace/expression)
      const textChildren = line.match(/>([^<>{}\n]*[A-Za-z0-9À-ÿ][^<>{}\n]*)</g);
      if (textChildren) hardcoded.push(`${loc} — JSX text child ${textChildren.map((t) => JSON.stringify(t.slice(1, -1).trim())).join(', ')}`);
    });
  }
  results.push(
    hardcoded.length
      ? r('no-hardcoded-content', 'fail', 'No hardcoded content', hardcoded.join('\n'), 'Move the text/URL into content/default.json and bind it with a PF* component.')
      : pass('no-hardcoded-content', 'No hardcoded content')
  );

  // byte-budget
  const total = input.assetBytes ?? 0;
  const imgBytes = input.imageBytes ?? 0;
  const kb = (n: number) => `${Math.round(n / 1024)} KB`;
  results.push(
    total > 500 * 1024 || imgBytes > 300 * 1024
      ? r('byte-budget', 'warn', 'Byte budget', `Page weight ${kb(total)} (limit 500 KB), images ${kb(imgBytes)} (limit 300 KB).`, 'Compress or downsize images; remove unused assets.')
      : pass('byte-budget', 'Byte budget', `Page weight ${kb(total)}, images ${kb(imgBytes)}`)
  );

  // no-localhost
  const allOut = html + '\n' + head.head + '\n' + head.jsonLd;
  const localHits = allOut.match(/localhost|127\.0\.0\.1|file:\/\//g);
  results.push(
    localHits
      ? r('no-localhost', 'fail', 'No localhost references', `Found: ${[...new Set(localHits)].join(', ')}.`, 'Remove localhost/127.0.0.1/file:// URLs from content.')
      : pass('no-localhost', 'No localhost references')
  );

  // renders-without-js
  const h1Text = /<h1[^>]*>([^<]+)<\/h1>/i.exec(html)?.[1]?.trim() ?? '';
  results.push(
    h1Text && html.includes(h1Text)
      ? pass('renders-without-js', 'Renders without JS', `H1 present as literal text: "${h1Text.slice(0, 50)}"`)
      : r('renders-without-js', 'fail', 'Renders without JS', 'The h1 text is not present as literal text in the HTML.', 'Ensure the h1 field has content and renders statically.')
  );

  return results;
}

/** Total bytes of asset files referenced by the rendered HTML (for byte-budget). */
export function referencedAssetBytes(projectId: string, html: string): { total: number; images: number; files: string[] } {
  const dir = path.join(PROJECTS_DIR, projectId, 'assets');
  const srcs = new Set<string>();
  for (const m of html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)) srcs.add(m[1]);
  for (const m of html.matchAll(/srcset="([^"]+)"/gi)) {
    for (const cand of m[1].split(',')) {
      const u = cand.trim().split(/\s+/)[0];
      if (u?.startsWith('/assets/')) srcs.add(u);
    }
  }
  const files: string[] = [];
  for (const s of srcs) {
    const f = path.join(dir, s.replace('/assets/', ''));
    if (fs.existsSync(f)) files.push(f);
  }
  // Byte budget measures what a browser actually downloads: per image slug, the
  // single largest AVIF candidate (modern browsers pick AVIF), falling back to
  // the plain src. Non-image files (svg, fonts) count in full.
  const bySlug = new Map<string, string[]>();
  let otherBytes = 0;
  for (const f of files) {
    const base = path.basename(f);
    const m2 = /^(.+)-(\d+)\.(avif|webp|jpe?g|png)$/i.exec(base);
    if (m2) {
      const key = m2[1];
      bySlug.set(key, [...(bySlug.get(key) ?? []), f]);
    } else {
      otherBytes += fs.statSync(f).size;
    }
  }
  let images = 0;
  for (const group of bySlug.values()) {
    const avifs = group.filter((f) => f.endsWith('.avif'));
    const pick = (avifs.length ? avifs : group).sort(
      (a, b) => Number(/-(\d+)\./.exec(b)?.[1] ?? 0) - Number(/-(\d+)\./.exec(a)?.[1] ?? 0)
    )[0];
    images += fs.statSync(pick).size;
  }
  return { total: images + otherBytes, images, files };
}
