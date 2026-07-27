import type { Project, Content } from '../runtime/types';
import { deriveString } from './derive';
import { absolutize } from './head';

// §10.6 — permitted types. Review/AggregateRating/Product/Offer are blocked:
// self-assigned ratings on affiliate pages draw manual actions.
export const SCHEMA_ALLOW_LIST = ['Article', 'Person', 'FAQPage', 'BreadcrumbList', 'Organization', 'WebSite', 'WebPage'] as const;
export const SCHEMA_BLOCKED = ['Review', 'AggregateRating', 'Product', 'Offer'] as const;

export interface SchemaResult {
  objects: Record<string, unknown>[];
  dropped: string[]; // requested but blocked types
}

export function requestedTypes(content: Content): { allowed: string[]; dropped: string[] } {
  const req = (content['seo.schema.types'] as string[] | undefined) ?? [];
  const allowed = req.filter((t) => (SCHEMA_ALLOW_LIST as readonly string[]).includes(t));
  const dropped = req.filter((t) => !(SCHEMA_ALLOW_LIST as readonly string[]).includes(t));
  return { allowed, dropped };
}

/** Build JSON-LD from bound fields only, so it can never disagree with the page (§10.6). */
export function buildJsonLd(project: Project, content: Content, domain: string): Record<string, unknown>[] {
  const m = project.manifest;
  const { allowed } = requestedTypes(content);
  const slug = deriveString(content, m, 'seo.slug');
  const pageUrl = absolutize(`/${slug}`, domain);
  const title = deriveString(content, m, 'seo.title');
  const description = deriveString(content, m, 'seo.description');
  const out: Record<string, unknown>[] = [];

  for (const type of allowed) {
    switch (type) {
      case 'WebPage':
      case 'Article': {
        const author = content['seo.author'] as { name?: string; url?: string; jobTitle?: string } | undefined;
        out.push({
          '@context': 'https://schema.org',
          '@type': type,
          headline: title,
          description,
          url: pageUrl,
          inLanguage: deriveString(content, m, 'seo.lang') || project.config.lang,
          ...(content['seo.datePublished'] ? { datePublished: content['seo.datePublished'] } : {}),
          ...(content['seo.dateModified'] ? { dateModified: content['seo.dateModified'] } : {}),
          ...(author?.name ? { author: { '@type': 'Person', name: author.name, url: author.url, jobTitle: author.jobTitle } } : {}),
        });
        break;
      }
      case 'WebSite':
        out.push({ '@context': 'https://schema.org', '@type': 'WebSite', name: project.config.name, url: domain.replace(/\/+$/, '/') });
        break;
      case 'Organization': {
        const author = content['seo.author'] as { name?: string; url?: string } | undefined;
        out.push({ '@context': 'https://schema.org', '@type': 'Organization', name: author?.name || project.config.name, url: domain.replace(/\/+$/, '/') });
        break;
      }
      case 'Person': {
        const author = content['seo.author'] as { name?: string; url?: string; jobTitle?: string } | undefined;
        if (author?.name) out.push({ '@context': 'https://schema.org', '@type': 'Person', name: author.name, url: author.url, jobTitle: author.jobTitle });
        break;
      }
      case 'FAQPage': {
        const faq = (content['seo.schema.faq'] as { q: string; a: string }[] | undefined) ?? [];
        if (faq.length) {
          out.push({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faq.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          });
        }
        break;
      }
      case 'BreadcrumbList': {
        const crumbs = (content['seo.breadcrumb'] as { label: string; href: string }[] | undefined) ?? [];
        if (crumbs.length) {
          out.push({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: crumbs.map((c, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: c.label,
              item: absolutize(c.href, domain),
            })),
          });
        }
        break;
      }
    }
  }
  return out;
}
