import type { Project, Content } from '../runtime/types';
import { deriveString, ogString, ogImage } from './derive';
import { robotsValue, robotsString } from './fields';
import { buildJsonLd } from './schema';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Make a (possibly relative) URL absolute against the export domain. */
export function absolutize(url: string, domain: string): string {
  if (!url) return '';
  if (/^https?:\/\//.test(url)) return url;
  const base = domain.replace(/\/+$/, '');
  return base + (url.startsWith('/') ? url : '/' + url);
}

export interface HeadParts {
  head: string;
  jsonLd: string;
  robotsTxt: string;
  sitemapXml: string;
}

/** §10.4 — the emitted <head>, in the specified order. */
export function buildHead(project: Project, content: Content, domain: string, opts?: { cssHref?: string; priorityImageSrc?: string }): HeadParts {
  const m = project.manifest;
  const lang = deriveString(content, m, 'seo.lang') || project.config.lang || 'en';
  const title = deriveString(content, m, 'seo.title');
  const description = deriveString(content, m, 'seo.description');
  const slug = deriveString(content, m, 'seo.slug');
  const pageUrl = absolutize(`/${slug}`, domain);
  const canonicalRaw = String(content['seo.canonical'] ?? 'self');
  const canonical = canonicalRaw === 'self' || !canonicalRaw ? pageUrl : absolutize(canonicalRaw, domain);
  const robots = robotsString(robotsValue(content));
  const hreflang = (content['seo.hreflang'] as { lang: string; href: string }[] | undefined) ?? [];
  const ogImg = ogImage(content, m);
  const ogType = String(content['seo.og.type'] ?? 'website');
  const twitterCard = String(content['seo.twitter.card'] ?? 'summary_large_image');

  const tags: string[] = [];
  tags.push('<meta charset="utf-8">');
  tags.push('<meta name="viewport" content="width=device-width, initial-scale=1">');
  tags.push(`<title>${esc(title)}</title>`);
  tags.push(`<meta name="description" content="${esc(description)}">`);
  tags.push(`<link rel="canonical" href="${esc(canonical)}">`);
  tags.push(`<meta name="robots" content="${esc(robots)}">`);
  // hreflang: each entry + self-referencing + x-default (§10.4)
  const seen = new Set<string>();
  for (const h of hreflang) {
    if (!h.lang || seen.has(h.lang)) continue;
    seen.add(h.lang);
    tags.push(`<link rel="alternate" hreflang="${esc(h.lang)}" href="${esc(absolutize(h.href, domain))}">`);
  }
  if (!seen.has(lang)) tags.push(`<link rel="alternate" hreflang="${esc(lang)}" href="${esc(pageUrl)}">`);
  tags.push(`<link rel="alternate" hreflang="x-default" href="${esc(pageUrl)}">`);
  // Open Graph (absolute URLs)
  tags.push(`<meta property="og:title" content="${esc(ogString(content, m, 'seo.og.title'))}">`);
  tags.push(`<meta property="og:description" content="${esc(ogString(content, m, 'seo.og.description'))}">`);
  if (ogImg.src) tags.push(`<meta property="og:image" content="${esc(absolutize(ogImg.src, domain))}">`);
  tags.push(`<meta property="og:url" content="${esc(pageUrl)}">`);
  tags.push(`<meta property="og:type" content="${esc(ogType)}">`);
  tags.push(`<meta property="og:locale" content="${esc(lang.replace('-', '_'))}">`);
  // Twitter
  tags.push(`<meta name="twitter:card" content="${esc(twitterCard)}">`);
  tags.push(`<meta name="twitter:title" content="${esc(ogString(content, m, 'seo.og.title'))}">`);
  tags.push(`<meta name="twitter:description" content="${esc(ogString(content, m, 'seo.og.description'))}">`);
  if (ogImg.src) tags.push(`<meta name="twitter:image" content="${esc(absolutize(ogImg.src, domain))}">`);
  // Preloads: priority image + stylesheet
  const prioritySrc = opts?.priorityImageSrc;
  if (prioritySrc) tags.push(`<link rel="preload" as="image" href="${esc(prioritySrc)}" fetchpriority="high">`);
  if (opts?.cssHref) tags.push(`<link rel="stylesheet" href="${esc(opts.cssHref)}">`);

  const jsonLd = buildJsonLd(project, content, domain);
  const jsonLdStr = jsonLd.length
    ? `<script type="application/ld+json">${JSON.stringify(jsonLd.length === 1 ? jsonLd[0] : jsonLd, null, 2)}</script>`
    : '';

  const lastmod = String(content['seo.dateModified'] ?? '') || new Date().toISOString().slice(0, 10);
  const robotsTxt = `User-agent: *\n${robotsValue(content).index ? 'Allow: /' : 'Disallow: /'}\n\nSitemap: ${domain.replace(/\/+$/, '')}/sitemap.xml\n`;
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${esc(pageUrl)}</loc>\n    <lastmod>${esc(lastmod)}</lastmod>\n  </url>\n</urlset>\n`;

  return { head: tags.join('\n'), jsonLd: jsonLdStr, robotsTxt, sitemapXml };
}
