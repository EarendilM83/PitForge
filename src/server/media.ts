import path from 'node:path';
import fs from 'node:fs';
import sharp from 'sharp';
import { PROJECTS_DIR } from './projects';

const WIDTHS = [400, 800, 1200, 1600];
const RASTER = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

export interface MediaResult {
  src: string;
  width: number;
  height: number;
  warning?: string;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'image';
}

function parseRatio(r: string): number | null {
  const m = /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.exec(r);
  return m ? Number(m[1]) / Number(m[2]) : null;
}

/** §11 pipeline. `file` is the uploaded buffer; never mutated, only derivatives are written. */
export async function processUpload(
  projectId: string,
  originalName: string,
  buffer: Buffer,
  opts: { ratio?: string; minWidth?: number }
): Promise<MediaResult> {
  const ext = path.extname(originalName).toLowerCase();
  const slug = slugify(originalName);
  const assetsDir = path.join(PROJECTS_DIR, projectId, 'assets');

  if (ext === '.svg') {
    // Sanitise: strip scripts, event handlers, external refs (§11.2).
    let svg = buffer.toString('utf8');
    svg = svg
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/\son\w+="[^"]*"/gi, '')
      .replace(/\son\w+='[^']*'/gi, '')
      .replace(/(href|xlink:href)="(https?:)?\/\/[^"]*"/gi, '$1=""');
    const dir = path.join(assetsDir, 'icons');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${slug}.svg`), svg);
    return { src: `/assets/icons/${slug}.svg`, width: 0, height: 0 };
  }

  if (!RASTER.has(ext)) {
    throw new Error(`Unsupported file type "${ext}". Accepted: jpg, png, webp, avif, svg.`);
  }

  // Strip EXIF by re-encoding from the decoded pixel data (sharp drops metadata by default).
  const image = sharp(buffer, { failOn: 'truncated' }).rotate();
  const meta = await image.metadata();
  const origW = meta.width ?? 0;
  const origH = meta.height ?? 0;
  if (!origW || !origH) throw new Error('Could not read image dimensions.');

  fs.mkdirSync(assetsDir, { recursive: true });
  const outExt = ext === '.jpeg' ? '.jpg' : ext;
  let largestSrc = '';
  for (const w of WIDTHS) {
    if (w > origW) continue; // never upscale (§11.3)
    const h = Math.round((origH * w) / origW);
    const resized = image.clone().resize(w, h);
    await resized.clone().avif({ quality: 50 }).toFile(path.join(assetsDir, `${slug}-${w}.avif`));
    await resized.clone().webp({ quality: 75 }).toFile(path.join(assetsDir, `${slug}-${w}.webp`));
    const keepFormat = resized.clone();
    if (outExt === '.jpg') await keepFormat.jpeg({ quality: 82 }).toFile(path.join(assetsDir, `${slug}-${w}.jpg`));
    else if (outExt === '.png') await keepFormat.png().toFile(path.join(assetsDir, `${slug}-${w}.png`));
    else if (outExt === '.webp') await keepFormat.webp({ quality: 82 }).toFile(path.join(assetsDir, `${slug}-${w}.webp`));
    else await keepFormat.avif({ quality: 50 }).toFile(path.join(assetsDir, `${slug}-${w}.avif`));
    largestSrc = `/assets/${slug}-${w}${outExt}`;
  }

  const warnings: string[] = [];
  if (opts.ratio) {
    const want = parseRatio(opts.ratio);
    const got = origW / origH;
    if (want && Math.abs(got - want) / want > 0.02) {
      const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
      const g = gcd(origW, origH);
      warnings.push(`Ratio mismatch: manifest expects ${opts.ratio}, upload is ${origW / g}:${origH / g}.`);
    }
  }
  if (opts.minWidth && origW < opts.minWidth) {
    warnings.push(`Image is ${origW}px wide, below the required minimum of ${opts.minWidth}px.`);
  }

  return { src: largestSrc, width: origW, height: origH, warning: warnings.join(' ') || undefined };
}
