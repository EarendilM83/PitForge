/* Plain-language vocabulary for the semantic tag editor — shared by the on-canvas toolbar and the
   inspector. Marketers see "Main title", not "h1"; each choice explains itself with a real-world
   analogy (Wix pattern). Choices are constrained per family as an implicit guardrail (Webflow). */

export const TAG_NAMES: Record<string, string> = {
  h1: 'Main title', h2: 'Section heading', h3: 'Sub-heading', h4: 'Small heading',
  h5: 'Tiny heading', h6: 'Tiniest heading', p: 'Paragraph', span: 'Plain text',
  strong: 'Bold text', em: 'Italic text', b: 'Bold text', i: 'Italic text',
  div: 'Container', section: 'Section', header: 'Header area', a: 'Link',
};

export const TAG_WHY: Record<string, string> = {
  h1: "The page's one big headline — like a newspaper's front-page title. Use it once per page.",
  h2: 'A major section title on the page.',
  h3: 'A smaller title, sitting under a section heading.',
  h4: 'A small heading.', h5: 'A very small heading.', h6: 'The smallest heading.',
  p: 'A normal paragraph of text.', span: 'Plain text with no special meaning.',
  strong: 'Important text (shown bold).', em: 'Emphasised text (shown italic).',
  b: 'Important text (shown bold).', i: 'Emphasised text (shown italic).',
  div: 'A plain box that groups things.', section: 'A distinct section of the page.',
  header: 'The top/header area of a section.', a: 'A clickable link.',
};

export type Family = 'text' | 'layout' | 'link';

export const FAMILIES: Record<Family, [string, string[]][]> = {
  text: [['Headings', ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']], ['Text', ['p', 'span', 'strong', 'em']]],
  layout: [['Layout', ['div', 'section', 'header']]],
  link: [['Link', ['a']]],
};

export const friendly = (t: string) => TAG_NAMES[t] || t;

/** The element's family, from its DEFAULT semantic tag — decides which tags it may become.
 *  This is the guardrail: a headline can be any heading or paragraph, but never a <div>. */
export function famForDefault(def: string | null | undefined): Family {
  if (!def) return 'text';
  if (/^h[1-6]$/.test(def) || ['p', 'span', 'strong', 'em', 'b', 'i'].includes(def)) return 'text';
  if (['div', 'section', 'header', 'nav', 'main', 'article', 'aside', 'footer'].includes(def)) return 'layout';
  if (['a', 'button'].includes(def)) return 'link';
  return 'text';
}

export const optionsFor = (f: Family) => FAMILIES[f] || FAMILIES.text;

export interface Issue {
  sev: 'bad' | 'warn';
  title: string;
  detail: string;
  els: HTMLElement[];
}

/** Non-blocking SEO/accessibility audit of a rendered page root (Webflow Audit-panel pattern). */
export function auditHeadings(root: Element): { issues: Issue[]; h1Count: number } {
  const h1s = Array.from(root.querySelectorAll('h1')) as HTMLElement[];
  const heads = Array.from(root.querySelectorAll('h1,h2,h3,h4,h5,h6')) as HTMLElement[];
  const levels = heads.map((h) => +h.tagName[1]);
  let gap: HTMLElement | null = null;
  for (let i = 1; i < levels.length; i++) if (levels[i] - levels[i - 1] > 1) { gap = heads[i]; break; }
  const issues: Issue[] = [];
  if (h1s.length === 0)
    issues.push({ sev: 'bad', title: 'No main title on the page.', detail: 'Every page needs exactly one — search engines rely on it.', els: [] });
  if (h1s.length > 1)
    issues.push({ sev: 'bad', title: `${h1s.length} main titles on the page.`, detail: 'A page should have just one. Click to see them.', els: h1s });
  if (gap)
    issues.push({ sev: 'warn', title: 'Headings skip a level.', detail: 'Confusing for screen readers. Click to see where.', els: [gap] });
  return { issues, h1Count: h1s.length };
}
