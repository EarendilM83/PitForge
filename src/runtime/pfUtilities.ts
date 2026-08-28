/* Bounded style utilities — the closed set of classes a marketer's style overrides resolve to.
   One source of truth: injected into the Studio canvas AND concatenated into the export bundle, so
   the published site renders identically. Marketers pick tokens (align/weight/space/opacity/vis);
   the runtime maps them to these classes. Styling still depends on classes, never the tag. */

export const SPACE_SCALE: Record<string, string> = { '0': '0', xs: '.5rem', s: '1rem', m: '2rem', l: '3.5rem' };
export const OPACITY_STEPS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

export const PF_UTILITIES_CSS = `
/* alignment */
.pf-al-left{text-align:left!important}.pf-al-center{text-align:center!important}
.pf-al-right{text-align:right!important}.pf-al-justify{text-align:justify!important}
/* weight */
.pf-fw-regular{font-weight:400!important}.pf-fw-medium{font-weight:500!important}
.pf-fw-semibold{font-weight:600!important}.pf-fw-bold{font-weight:700!important}
/* margin top / bottom (token scale) */
.pf-mt-0{margin-top:0!important}.pf-mt-xs{margin-top:.5rem!important}.pf-mt-s{margin-top:1rem!important}.pf-mt-m{margin-top:2rem!important}.pf-mt-l{margin-top:3.5rem!important}
.pf-mb-0{margin-bottom:0!important}.pf-mb-xs{margin-bottom:.5rem!important}.pf-mb-s{margin-bottom:1rem!important}.pf-mb-m{margin-bottom:2rem!important}.pf-mb-l{margin-bottom:3.5rem!important}
/* opacity */
${OPACITY_STEPS.map((o) => `.pf-op-${o}{opacity:${o / 100}}`).join('')}
/* responsive visibility */
@media (min-width:1025px){.pf-hide-desktop{display:none!important}}
@media (max-width:1024px) and (min-width:601px){.pf-hide-tablet{display:none!important}}
@media (max-width:600px){.pf-hide-mobile{display:none!important}}
`.trim();

export interface StyleTokens {
  align?: 'left' | 'center' | 'right' | 'justify';
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  mt?: '0' | 'xs' | 's' | 'm' | 'l';
  mb?: '0' | 'xs' | 's' | 'm' | 'l';
  opacity?: number; // 10..100
  css?: Record<string, string>; // free-form (Builder mode only) — inline style escape hatch
}
export interface VisTokens { desktop?: boolean; tablet?: boolean; mobile?: boolean }

/** Resolve an element's overrides into utility classes + an optional inline style (free-form). */
export function resolveOverrides(
  style: StyleTokens | undefined,
  vis: VisTokens | undefined,
): { classes: string[]; style?: React.CSSProperties } {
  const classes: string[] = [];
  if (style) {
    if (style.align) classes.push(`pf-al-${style.align}`);
    if (style.weight) classes.push(`pf-fw-${style.weight}`);
    if (style.mt) classes.push(`pf-mt-${style.mt}`);
    if (style.mb) classes.push(`pf-mb-${style.mb}`);
    if (style.opacity != null) classes.push(`pf-op-${style.opacity}`);
  }
  if (vis) {
    if (vis.desktop === false) classes.push('pf-hide-desktop');
    if (vis.tablet === false) classes.push('pf-hide-tablet');
    if (vis.mobile === false) classes.push('pf-hide-mobile');
  }
  return { classes, style: style?.css as React.CSSProperties | undefined };
}
