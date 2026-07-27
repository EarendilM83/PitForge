import React, { useRef, useCallback, ReactNode } from 'react';
import { usePF } from './context';
import { getField, resolveValue, type ContentValue, type ImageValue, type LinkValue, type VideoValue } from './types';

// ---------- shared edit-mode helpers ----------

interface EditableProps {
  field: string;
  text?: boolean; // contentEditable text field
}

function useEditable({ field, text }: EditableProps) {
  const pf = usePF();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selected = pf.selected === field;
  if (pf.mode !== 'edit') return { editProps: {} as Record<string, unknown>, selected, pf };
  const editProps: Record<string, unknown> = {
    'data-pf-field': field,
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
  const { editProps, selected, pf } = useEditable({ field, text: true });
  const value = String(resolveValue(pf.content, field) ?? '');
  if (pf.mode === 'static') return <span className={className}>{value}</span>;
  return (
    <span {...editProps} className={cls(className, ['pf-editable', selected && 'pf-selected'])}>
      {value}
    </span>
  );
}

export function PFHeading({ field, level = 2, className }: { field: string; level?: 1 | 2 | 3 | 4 | 5 | 6; className?: string }) {
  const { editProps, selected, pf } = useEditable({ field, text: true });
  const value = String(resolveValue(pf.content, field) ?? '');
  const Tag = `h${level}` as 'h1';
  if (pf.mode === 'static') return <Tag className={className}>{value}</Tag>;
  return (
    <Tag {...editProps} className={cls(className, ['pf-editable', selected && 'pf-selected'])}>
      {value}
    </Tag>
  );
}

/** Minimal richtext: bold, italic, links only. Stored as a tiny HTML subset. */
export function PFRichText({ field, className }: { field: string; className?: string }) {
  const { editProps, selected, pf } = useEditable({ field, text: true });
  const html = String(resolveValue(pf.content, field) ?? '');
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
  const img = (
    <img
      src={value.src}
      srcSet={srcsetFor(value.src, value.src.split(".").pop() || "jpg", value.width)}
      sizes={sizes}
      alt={value.alt}
      width={value.width}
      height={value.height}
      loading={priority ? undefined : 'lazy'}
      {...(priority ? ({ fetchpriority: 'high' } as Record<string, string>) : {})}
      className={className}
    />
  );
  const picture = value.src ? (
    <picture>
      <source type="image/avif" srcSet={srcsetFor(value.src, 'avif', value.width)} sizes={sizes} />
      <source type="image/webp" srcSet={srcsetFor(value.src, 'webp', value.width)} sizes={sizes} />
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

/** Inline SVG icon, currentColor. Content value: image shape with src pointing at assets/icons/*.svg */
export function PFIcon({ field, className }: { field: string; className?: string }) {
  const { editProps, selected, pf } = useEditable({ field, text: false });
  const value = (resolveValue(pf.content, field) ?? { src: '', alt: '' }) as ImageValue;
  // SVG content is inlined at export; in the studio we render <img> for simplicity,
  // but static mode uses an inline <svg> via dangerouslySetInnerHTML is unsafe without the file.
  // Convention: icon srcs are served and embedded as <img> in studio; export pipeline inlines.
  const el = <img src={value.src} alt={value.alt} className={className} width={value.width} height={value.height} />;
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
  return { href: value.href, rel: rel || undefined, target: external ? '_blank' : undefined };
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
