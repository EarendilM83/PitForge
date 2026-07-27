import type { Content, Manifest, Field } from '../runtime/types';

// §10.1 — the SEO field set every project has, under the `seo.` prefix.
export const SEO_KEYS = [
  'seo.title',
  'seo.description',
  'seo.slug',
  'seo.canonical',
  'seo.robots',
  'seo.lang',
  'seo.hreflang',
  'seo.og.title',
  'seo.og.description',
  'seo.og.image',
  'seo.og.type',
  'seo.twitter.card',
  'seo.focusKeyword',
  'seo.secondaryKeywords',
  'seo.author',
  'seo.datePublished',
  'seo.dateModified',
  'seo.schema.types',
  'seo.schema.faq',
  'seo.breadcrumb',
] as const;

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface RobotsValue {
  index: boolean;
  follow: boolean;
  maxImagePreview: 'large' | 'standard' | 'none';
  noarchive: boolean;
}

export function robotsValue(content: Content): RobotsValue {
  const r = content['seo.robots'] as Partial<RobotsValue> | undefined;
  return { index: r?.index !== false, follow: r?.follow !== false, maxImagePreview: r?.maxImagePreview ?? 'large', noarchive: r?.noarchive === true };
}

export function robotsString(r: RobotsValue): string {
  const parts = [r.index ? 'index' : 'noindex', r.follow ? 'follow' : 'nofollow'];
  parts.push(`max-image-preview:${r.maxImagePreview}`);
  if (r.noarchive) parts.push('noarchive');
  return parts.join(', ');
}
