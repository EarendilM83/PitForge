// Scaffolds a blank project: a single Hero block (h1 + subtitle + CTA), tokens,
// manifest with the full §10.1 SEO field set, and starter content. New blocks are
// picked up by Vite's import.meta.glob on the next full reload (DECISIONS.md).
import fs from 'node:fs';
import path from 'node:path';
import { PROJECTS_DIR } from './projects';

const SEO_FIELDS: Record<string, unknown> = {
  'seo.title': { type: 'text', label: 'SEO title', block: '_seo', maxLength: 60, derivedFrom: 'hero.title' },
  'seo.description': { type: 'text', label: 'Meta description', block: '_seo', maxLength: 155, derivedFrom: 'hero.subtitle' },
  'seo.slug': { type: 'text', label: 'Slug', block: '_seo', derivedFrom: 'hero.title' },
  'seo.canonical': { type: 'text', label: 'Canonical', block: '_seo' },
  'seo.robots': { type: 'text', label: 'Robots', block: '_seo' },
  'seo.lang': { type: 'text', label: 'Language', block: '_seo' },
  'seo.hreflang': { type: 'text', label: 'Hreflang', block: '_seo' },
  'seo.og.title': { type: 'text', label: 'OG title', block: '_seo', maxLength: 60 },
  'seo.og.description': { type: 'text', label: 'OG description', block: '_seo', maxLength: 155 },
  'seo.og.image': { type: 'image', label: 'OG image', block: '_seo' },
  'seo.og.type': { type: 'text', label: 'OG type', block: '_seo' },
  'seo.twitter.card': { type: 'text', label: 'Twitter card', block: '_seo' },
  'seo.focusKeyword': { type: 'text', label: 'Focus keyword', block: '_seo' },
  'seo.secondaryKeywords': { type: 'text', label: 'Secondary keywords', block: '_seo' },
  'seo.author': { type: 'text', label: 'Author', block: '_seo' },
  'seo.datePublished': { type: 'text', label: 'Date published', block: '_seo' },
  'seo.dateModified': { type: 'text', label: 'Date modified', block: '_seo' },
  'seo.schema.types': { type: 'text', label: 'Schema types', block: '_seo' },
  'seo.schema.faq': { type: 'text', label: 'Schema FAQ', block: '_seo' },
  'seo.breadcrumb': { type: 'text', label: 'Breadcrumb', block: '_seo' },
};

const HERO_TSX = `import { PFHeading, PFText, PFButton } from '../../../src/runtime/components';
import './Hero.css';

export default function Hero() {
  return (
    <header className="hero">
      <div className="hero-inner">
        <PFHeading field="hero.title" level={1} className="hero-title" />
        <PFText field="hero.subtitle" className="hero-subtitle" />
        <PFButton field="hero.cta" className="hero-cta" variant="primary" />
      </div>
    </header>
  );
}
`;

const HERO_CSS = `.hero { background: var(--brand); color: #fff; padding: calc(var(--space-4) * 4) var(--space-4); }
.hero-inner { max-width: 720px; margin: 0 auto; text-align: center; }
.hero-title { font-size: var(--text-xl); margin: 0 0 var(--space-3); }
.hero-subtitle { font-size: var(--text-lg); opacity: 0.85; margin: 0 0 var(--space-4); }
.hero-cta { display: inline-block; background: #fff; color: var(--brand); font-weight: 700;
  padding: var(--space-2) var(--space-4); border-radius: var(--radius); text-decoration: none; }
`;

const TOKENS_CSS = `:root {
  --brand: #0c66e4;
  --grey-900: #172b4d;
  --grey-500: #626f86;
  --text-xl: 2.5rem;
  --text-lg: 1.25rem;
  --text-md: 1rem;
  --text-sm: 0.875rem;
  --text-xs: 0.75rem;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 16px;
  --space-4: 24px;
  --radius: 8px;
}
body { margin: 0; font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; color: var(--grey-900); }
`;

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function createProject(name: string): { id: string } {
  const id = slugify(name);
  if (!id) throw new Error('Name produces an empty slug — use letters or numbers.');
  const dir = path.join(PROJECTS_DIR, id);
  if (fs.existsSync(dir)) throw new Error(`A project named "${id}" already exists.`);

  fs.mkdirSync(path.join(dir, 'blocks'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'content'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'assets'), { recursive: true });

  const write = (rel: string, data: string) => fs.writeFileSync(path.join(dir, rel), data);
  write('pitforge.json', JSON.stringify({ name, lang: 'en', blocks: ['Hero'], domain: '', createdBy: 'studio' }, null, 2) + '\n');
  write('tokens.css', TOKENS_CSS);
  write('blocks/Hero.tsx', HERO_TSX);
  write('blocks/Hero.css', HERO_CSS);
  write(
    'manifest.json',
    JSON.stringify(
      {
        version: 1,
        fields: {
          'hero.title': { type: 'heading', label: 'Hero headline', block: 'Hero', level: 1, maxLength: 70 },
          'hero.subtitle': { type: 'text', label: 'Hero subtitle', block: 'Hero', maxLength: 155 },
          'hero.cta': { type: 'link', label: 'Primary CTA', block: 'Hero', external: true, defaultRel: 'nofollow sponsored' },
          ...SEO_FIELDS,
        },
      },
      null,
      2
    ) + '\n'
  );
  write(
    'content/default.json',
    JSON.stringify(
      {
        'hero.title': `${name} — your headline here`,
        'hero.subtitle': 'One sentence that tells visitors why they should care.',
        'hero.cta': { label: 'Get started', href: 'https://example.com', rel: 'nofollow sponsored' },
      },
      null,
      2
    ) + '\n'
  );
  return { id };
}
