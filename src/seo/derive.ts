import type { Content, Manifest, ImageValue } from '../runtime/types';
import { slugify } from './fields';

/**
 * §10.2 — a field with `derivedFrom` tracks its source until the user edits it;
 * then its key lives in `seo._custom` and it is `custom` forever.
 */
export function customKeys(content: Content): string[] {
  return (content['seo._custom'] as string[] | undefined) ?? [];
}

export function isCustom(content: Content, key: string): boolean {
  return customKeys(content).includes(key);
}

/** Effective value of a (possibly derived) field. */
export function deriveValue(content: Content, manifest: Manifest, key: string): unknown {
  const field = manifest.fields[key];
  if (field?.derivedFrom && !isCustom(content, key)) {
    const src = content[field.derivedFrom];
    if (key === 'seo.slug') return slugify(String(src ?? ''));
    return src ?? content[key];
  }
  return content[key];
}

export function deriveString(content: Content, manifest: Manifest, key: string): string {
  return String(deriveValue(content, manifest, key) ?? '');
}

/** OG fields fall back to their base seo.* counterparts (§10.1). */
export function ogString(content: Content, manifest: Manifest, key: 'seo.og.title' | 'seo.og.description'): string {
  const v = String(content[key] ?? '');
  if (v) return v;
  return deriveString(content, manifest, key === 'seo.og.title' ? 'seo.title' : 'seo.description');
}

export function ogImage(content: Content, manifest: Manifest): ImageValue {
  const field = manifest.fields['seo.og.image'];
  if (field?.derivedFrom && !isCustom(content, 'seo.og.image')) {
    const src = content[field.derivedFrom] as ImageValue | undefined;
    if (src?.src) return src;
  }
  return (content['seo.og.image'] as ImageValue | undefined) ?? { src: '', alt: '' };
}

/** Mark a key custom when the user edits a derived field directly. Returns new custom list (or unchanged). */
export function markCustom(content: Content, key: string): string[] {
  const cur = customKeys(content);
  return cur.includes(key) ? cur : [...cur, key];
}
