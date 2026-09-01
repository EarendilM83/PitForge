const SAFE_TAGS = new Set(['a', 'strong', 'b', 'em', 'i', 'br']);

/** Sanitise the deliberately tiny rich-text subset supported by PitForge. */
export function sanitizeRichText(input: string): string {
  return input
    .replace(/<(script|style|iframe|object|embed|svg|math)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?([a-z][\w:-]*)([^>]*)>/gi, (whole, rawTag: string, rawAttrs: string) => {
      const tag = rawTag.toLowerCase();
      if (!SAFE_TAGS.has(tag)) return '';
      if (whole.startsWith('</')) return tag === 'br' ? '' : `</${tag}>`;
      if (tag === 'br') return '<br>';
      if (tag !== 'a') return `<${tag}>`;
      const href = /\bhref\s*=\s*(["'])(.*?)\1/i.exec(rawAttrs)?.[2] ?? '';
      const title = /\btitle\s*=\s*(["'])(.*?)\1/i.exec(rawAttrs)?.[2] ?? '';
      const safeHref = /^(?:https?:|mailto:|tel:|\/|#)/i.test(href.trim()) ? href.trim() : '';
      const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<a${safeHref ? ` href="${esc(safeHref)}"` : ''}${title ? ` title="${esc(title)}"` : ''} rel="noopener">`;
    });
}

const IMPORTED_TAGS = new Set([
  'header', 'nav', 'main', 'section', 'article', 'aside', 'footer', 'div', 'span',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'a', 'strong', 'b', 'em', 'i', 'small', 'mark', 'blockquote', 'figure', 'figcaption',
  'picture', 'source', 'img', 'video', 'br', 'hr', 'details', 'summary', 'table',
  'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'time', 'address', 'code', 'pre',
]);

const VOID_TAGS = new Set(['img', 'source', 'br', 'hr']);
const SAFE_URL = /^(?:https?:|mailto:|tel:|\/|#|\.\/|\.\.\/)/i;

/** Sanitise imported static markup. Scripts, forms, embeds, inline styles and event handlers are dropped. */
export function sanitizeImportedHtml(input: string): string {
  const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return input
    .replace(/<(script|style|iframe|object|embed|form|svg|math)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?([a-z][\w:-]*)([^>]*)>/gi, (whole, rawTag: string, rawAttrs: string) => {
      const tag = rawTag.toLowerCase();
      if (!IMPORTED_TAGS.has(tag)) return '';
      if (whole.startsWith('</')) return VOID_TAGS.has(tag) ? '' : `</${tag}>`;
      const attrs: string[] = [];
      for (const match of rawAttrs.matchAll(/\s+([a-zA-Z][\w:-]*)\s*=\s*(["'])(.*?)\2/g)) {
        const name = match[1].toLowerCase();
        const value = match[3].trim();
        if (name.startsWith('on') || name === 'style' || name === 'srcdoc') continue;
        if (['href', 'src', 'srcset', 'poster'].includes(name)) {
          const urls = name === 'srcset' ? value.split(',').map((p) => p.trim().split(/\s+/)[0]) : [value];
          if (urls.some((u) => !SAFE_URL.test(u) && !u.startsWith('data:image/'))) continue;
        } else if (!['class', 'id', 'alt', 'title', 'width', 'height', 'loading', 'sizes', 'type', 'open', 'datetime', 'role', 'colspan', 'rowspan'].includes(name) && !name.startsWith('aria-') && !name.startsWith('data-')) continue;
        attrs.push(`${name}="${esc(value)}"`);
      }
      if (tag === 'a' && !attrs.some((a) => a.startsWith('rel='))) attrs.push('rel="noopener"');
      return `<${tag}${attrs.length ? ' ' + attrs.join(' ') : ''}>`;
    });
}
