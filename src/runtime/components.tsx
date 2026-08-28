import React, { useRef, useCallback, ReactNode } from 'react';
import { usePF } from './context';
import { getField, resolveValue, localizedValue, type ContentValue, type ImageValue, type LinkValue, type VideoValue } from './types';
import { resolveOverrides, type StyleTokens, type VisTokens } from './pfUtilities';

// ---------- shared edit-mode helpers ----------

interface EditableProps {
  field: string;
  text?: boolean; // contentEditable text field
  label?: string; // human name shown in the semantic-tag navigator
  tag?: string; // default semantic tag; presence marks the element as retaggable
}

/** The element's current semantic tag, honouring the marketer's override in content._tags. */
export function resolveTag(pf: ReturnType<typeof usePF>, elId: string, def: string): string {
  const map = pf.content['_tags'] as Record<string, string> | undefined;
  return (map && map[elId]) || def;
}

/** The element's style/visibility overrides → utility classes + optional free-form inline style. */
export function elOverrides(pf: ReturnType<typeof usePF>, elId: string) {
  const style = (pf.content['_style'] as Record<string, StyleTokens> | undefined)?.[elId];
  const vis = (pf.content['_vis'] as Record<string, VisTokens> | undefined)?.[elId];
  return resolveOverrides(style, vis);
}

/** Plain-language fallback name for a field key with no manifest label — so the Layers panel never
 *  shows "tiles.cards.0.image". Turns a repeat-item path into e.g. "Card 1 · Image". */
function humanizeField(field: string): string {
  const cap = (s: string) => s.replace(/[-_]/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
  const parts = field.split('.');
  let idx = -1;
  for (let i = parts.length - 1; i >= 0; i--) if (/^\d+$/.test(parts[i])) { idx = i; break; }
  if (idx >= 0) {
    const coll = (parts[idx - 1] || 'item').replace(/s$/, '');
    const rest = parts.slice(idx + 1).map(cap).join(' ');
    return `${cap(coll)} ${Number(parts[idx]) + 1}${rest ? ' · ' + rest : ''}`;
  }
  return cap(parts[parts.length - 1]);
}

function useEditable({ field, text, label, tag }: EditableProps) {
  const pf = usePF();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selected = pf.selected === field;
  if (pf.mode !== 'edit') return { editProps: {} as Record<string, unknown>, selected, pf };
  // data-pf-el/label/default let the Studio's tag navigator discover this element, name it
  // for marketers, and know which tag to reset to. data-pf-default only on retaggable elements.
  const name = label ?? getField(pf.manifest, field)?.label ?? humanizeField(field);
  const editProps: Record<string, unknown> = {
    'data-pf-field': field,
    'data-pf-el': field,
    'data-pf-label': name,
    ...(tag ? { 'data-pf-default': tag } : {}),
    className: undefined, // merged by caller
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      pf.onSelect(field);
    },
  };
  if (text) {
    editProps.contentEditable = true;
    editProps.suppressContentEditableWarning = true;
    editProps.onInput = (e: React.FormEvent<HTMLElement>) => {
      const value = (e.target as HTMLElement).innerText;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => pf.onChange(field, value), 150);
    };
    editProps.onBlur = (e: React.FocusEvent<HTMLElement>) => {
      if (timer.current) clearTimeout(timer.current);
      pf.onChange(field, (e.target as HTMLElement).innerText);
    };
  }
  return { editProps, selected, pf };
}

function cls(base: string | undefined, extra: (string | false | undefined)[]) {
  return [base, ...extra.filter(Boolean)].join(' ').trim() || undefined;
}

// ---------- components (§6) ----------

export function PFText({ field, className }: { field: string; className?: string }) {
  const { editProps, selected, pf } = useEditable({ field, text: true, tag: 'span' });
  const value = String(localizedValue(pf.content, field, pf.lang) ?? '');
  const Tag = resolveTag(pf, field, 'span') as 'span';
  const ov = elOverrides(pf, field);
  if (pf.mode === 'static') return <Tag className={cls(className, ov.classes)} style={ov.style}>{value}</Tag>;
  return (
    <Tag {...editProps} className={cls(className, ['pf-editable', selected && 'pf-selected', ...ov.classes])} style={ov.style}>
      {value}
    </Tag>
  );
}

export function PFHeading({ field, level = 2, className }: { field: string; level?: 1 | 2 | 3 | 4 | 5 | 6; className?: string }) {
  const def = `h${level}`;
  const { editProps, selected, pf } = useEditable({ field, text: true, tag: def });
  const value = String(localizedValue(pf.content, field, pf.lang) ?? '');
  const Tag = resolveTag(pf, field, def) as 'h1';
  const ov = elOverrides(pf, field);
  if (pf.mode === 'static') return <Tag className={cls(className, ov.classes)} style={ov.style}>{value}</Tag>;
  return (
    <Tag {...editProps} className={cls(className, ['pf-editable', selected && 'pf-selected', ...ov.classes])} style={ov.style}>
      {value}
    </Tag>
  );
}

/** A structural semantic wrapper whose tag the marketer can change (e.g. the two-tone <h1>
 *  around several PFText spans). `el` is a stable id (not a content field), `as` the default
 *  tag, `label` the human name shown in the navigator. Styling rides `className`, never the tag. */
export function PFTag({
  el,
  as,
  label,
  className,
  children,
}: {
  el: string;
  as: string;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const { editProps, selected, pf } = useEditable({ field: el, text: false, label, tag: as });
  const Tag = resolveTag(pf, el, as) as 'div';
  const ov = elOverrides(pf, el);
  if (pf.mode === 'static') return <Tag className={cls(className, ov.classes)} style={ov.style}>{children}</Tag>;
  return (
    <Tag {...editProps} className={cls(className, ['pf-editable', selected && 'pf-selected', ...ov.classes])} style={ov.style}>
      {children}
    </Tag>
  );
}

/** Minimal richtext: bold, italic, links only. Stored as a tiny HTML subset. */
export function PFRichText({ field, className }: { field: string; className?: string }) {
  const { editProps, selected, pf } = useEditable({ field, text: true });
  const html = String(localizedValue(pf.content, field, pf.lang) ?? '');
  if (pf.mode === 'static') return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
  return (
    <div
      {...editProps}
      className={cls(className, ['pf-editable', selected && 'pf-selected'])}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

const WIDTHS = [400, 800, 1200, 1600];

function srcsetFor(src: string, ext: string, origWidth?: number) {
  if (!src) return '';
  // Convention (§11.3): files are named <slug>-<width>.<ext>; the stored src
  // points at the largest width, so strip that suffix before re-appending.
  const base = src.replace(/-\d+(\.[^.]+)$/, '$1').replace(/\.[^.]+$/, '');
  // Derivatives never exceed the original width (§11.3) — don't reference files
  // that were never generated.
  const widths = origWidth ? WIDTHS.filter((w) => w <= origWidth) : WIDTHS;
  return widths.map((w) => `${base}-${w}.${ext} ${w}w`).join(', ');
}

export function PFImage({ field, className, sizes = '100vw' }: { field: string; className?: string; sizes?: string }) {
  const { editProps, selected, pf } = useEditable({ field, text: false });
  const value = (resolveValue(pf.content, field) ?? { src: '', alt: '' }) as ImageValue;
  const mf = getField(pf.manifest, field);
  const priority = mf?.type === 'image' && mf.priority === true;
  // Raster images ship avif + webp variants; webp is a universal fallback, so we drop the
  // heavy PNG entirely. SVGs have no variants — render them as a plain <img> (no dead sources).
  const isRaster = /\.(png|jpe?g)$/i.test(value.src);
  const fallbackSrc = isRaster ? value.src.replace(/\.[^.]+$/, '.webp') : value.src;
  const fallbackExt = isRaster ? 'webp' : value.src.split('.').pop() || 'jpg';
  const img = (
    <img
      src={fallbackSrc}
      srcSet={srcsetFor(value.src, fallbackExt, value.width)}
      sizes={sizes}
      alt={value.alt}
      width={value.width}
      height={value.height}
      loading={priority ? undefined : 'lazy'}
      {...(priority ? ({ fetchpriority: 'high' } as Record<string, string>) : {})}
      className={className}
    />
  );
  const picture = value.src && isRaster ? (
    <picture>
      <source type="image/avif" srcSet={srcsetFor(value.src, 'avif', value.width)} sizes={sizes} />
      {img}
    </picture>
  ) : (
    img
  );
  if (pf.mode === 'static') return picture;
  return (
    <span {...editProps} className={cls('pf-image-wrap', ['pf-editable', selected && 'pf-selected'])} style={{ display: 'contents' }}>
      {picture}
    </span>
  );
}

/** Inline SVG icon, currentColor. Content value: image shape with src pointing at assets/icons/*.svg.
 *  Static/export mode inlines the SVG source pre-loaded into context by the server renderer;
 *  edit mode fetches the same file in the browser so both modes render identically. */
export function PFIcon({ field, className }: { field: string; className?: string }) {
  const { editProps, selected, pf } = useEditable({ field, text: false });
  const value = (resolveValue(pf.content, field) ?? { src: '', alt: '' }) as ImageValue;
  const [fetched, setFetched] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (pf.mode !== 'edit' || !value.src) return;
    let alive = true;
    fetch(value.src)
      .then((r) => (r.ok ? r.text() : null))
      .then((t) => alive && setFetched(t))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [pf.mode, value.src]);

  const svg = pf.mode === 'static' ? pf.iconSvg?.[field] : fetched;
  const el = svg ? (
    <span className={cls('pf-icon', [className])} role="img" aria-label={value.alt} dangerouslySetInnerHTML={{ __html: svg }} />
  ) : (
    <img src={value.src} alt={value.alt} className={className} width={value.width} height={value.height} />
  );
  if (pf.mode === 'static') return el;
  return (
    <span {...editProps} className={cls(className, ['pf-editable', selected && 'pf-selected'])}>
      {el}
    </span>
  );
}

function linkProps(pf: ReturnType<typeof usePF>, field: string, value: LinkValue) {
  const mf = getField(pf.manifest, field);
  const external = mf?.type === 'link' || mf?.type === 'button' ? mf.external : false;
  let rel = value.rel || (mf && 'defaultRel' in mf ? mf.defaultRel : undefined);
  if (external) {
    const parts = new Set((rel || '').split(/\s+/).filter(Boolean));
    parts.add('noopener');
    rel = [...parts].join(' ');
  }
  return { href: value.href, rel: rel || undefined }; // same-tab: no target="_blank"
}

export function PFLink({ field, className }: { field: string; className?: string }) {
  const { editProps, selected, pf } = useEditable({ field, text: false });
  const value = (resolveValue(pf.content, field) ?? { label: '', href: '' }) as LinkValue;
  const props = linkProps(pf, field, value);
  if (pf.mode === 'static')
    return (
      <a {...props} className={className}>
        {value.label}
      </a>
    );
  return (
    <a
      {...props}
      {...editProps}
      className={cls(className, ['pf-editable', selected && 'pf-selected'])}
      onClick={(e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        pf.onSelect(field);
      }}
    >
      {value.label}
    </a>
  );
}

export function PFButton({ field, className, variant = 'primary' }: { field: string; className?: string; variant?: string }) {
  return <PFLink field={field} className={cls(className, [`btn-${variant}`])} />;
}

// An icon wrapped in a link — for clickable social / payment icons. `linkField` is a link
// field ({href, rel, label}); `iconField` is an icon field. Both stay independently editable.
export function PFIconLink({
  linkField,
  iconField,
  className,
  iconClassName,
}: {
  linkField: string;
  iconField: string;
  className?: string;
  iconClassName?: string;
}) {
  const { editProps, selected, pf } = useEditable({ field: linkField, text: false });
  const value = (resolveValue(pf.content, linkField) ?? { label: '', href: '' }) as LinkValue;
  const props = linkProps(pf, linkField, value);
  const icon = <PFIcon field={iconField} className={iconClassName} />;
  if (pf.mode === 'static')
    return (
      <a {...props} className={className} aria-label={value.label || undefined}>
        {icon}
      </a>
    );
  return (
    <a
      {...props}
      {...editProps}
      className={cls(className, ['pf-editable', selected && 'pf-selected'])}
      aria-label={value.label || undefined}
      onClick={(e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        pf.onSelect(linkField);
      }}
    >
      {icon}
    </a>
  );
}

// An image optionally wrapped in a link — for award badges. If the item's link has no href,
// it renders just the image; otherwise the image becomes clickable. Both stay editable.
export function PFImageLink({
  linkField,
  imageField,
  className,
  imgClassName,
  sizes,
}: {
  linkField: string;
  imageField: string;
  className?: string;
  imgClassName?: string;
  sizes?: string;
}) {
  const { editProps, selected, pf } = useEditable({ field: linkField, text: false });
  const value = (resolveValue(pf.content, linkField) ?? { label: '', href: '' }) as LinkValue;
  const image = <PFImage field={imageField} className={imgClassName} sizes={sizes} />;
  if (!value.href) return image; // no link set — plain image
  const props = linkProps(pf, linkField, value);
  if (pf.mode === 'static')
    return (
      <a {...props} className={className} aria-label={value.label || undefined}>
        {image}
      </a>
    );
  return (
    <a
      {...props}
      {...editProps}
      className={cls(className, ['pf-editable', selected && 'pf-selected'])}
      aria-label={value.label || undefined}
      onClick={(e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        pf.onSelect(linkField);
      }}
    >
      {image}
    </a>
  );
}

export function PFVideo({ field, className }: { field: string; className?: string }) {
  const { editProps, selected, pf } = useEditable({ field, text: false });
  const value = (resolveValue(pf.content, field) ?? { url: '' }) as VideoValue;
  const el = <video src={value.url} poster={value.poster} controls className={className} />;
  if (pf.mode === 'static') return el;
  return (
    <span {...editProps} className={cls(className, ['pf-editable', selected && 'pf-selected'])} style={{ display: 'contents' }}>
      {el}
    </span>
  );
}

export function PFRepeat({
  field,
  className,
  children,
}: {
  field: string;
  className?: string;
  children: (itemPrefix: string, index: number) => ReactNode;
}) {
  const pf = usePF();
  const items = (resolveValue(pf.content, field) ?? []) as Record<string, unknown>[];
  const mf = getField(pf.manifest, field);
  const min = mf?.type === 'repeat' ? mf.min ?? 0 : 0;
  const max = mf?.type === 'repeat' ? mf.max ?? Infinity : Infinity;
  const edit = pf.mode === 'edit';

  const addItem = () => {
    if (items.length >= max || mf?.type !== 'repeat') return;
    const blank: Record<string, unknown> = {};
    for (const [k, f] of Object.entries(mf.item ?? {})) {
      const ff = f as { type: string };
      blank[k] = ff.type === 'image' || ff.type === 'icon' ? { src: '', alt: '' } : ff.type === 'link' ? { label: '', href: '' } : '';
    }
    pf.onChange(field, [...items, blank]);
  };
  const removeItem = (i: number) => {
    if (items.length <= min) return;
    pf.onChange(field, items.filter((_, idx) => idx !== i));
  };

  return (
    <div className={className} data-pf-repeat={edit ? field : undefined}>
      {items.map((_, i) => (
        <div key={i} className={edit ? 'pf-repeat-item' : undefined} style={edit ? { position: 'relative' } : undefined}>
          {children(`${field}.${i}`, i)}
          {edit && items.length > min && (
            <button
              type="button"
              className="pf-repeat-remove"
              onClick={(e) => {
                e.stopPropagation();
                removeItem(i);
              }}
            >
              ×
            </button>
          )}
        </div>
      ))}
      {edit && items.length < max && (
        <button type="button" className="pf-repeat-add" onClick={addItem}>
          + Add item
        </button>
      )}
    </div>
  );
}
