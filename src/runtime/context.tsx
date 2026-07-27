import { createContext, useContext } from 'react';
import type { Content, Manifest, ContentValue } from './types';

export type Mode = 'edit' | 'static';

export interface PFContextValue {
  mode: Mode;
  content: Content;
  manifest: Manifest;
  selected: string | null;
  onSelect(field: string): void;
  onChange(field: string, value: ContentValue): void;
  /** true when the Studio chrome wants outlines hidden */
  outlinesVisible?: boolean;
  /** field key → sanitised SVG source, pre-loaded server-side for static/export mode */
  iconSvg?: Record<string, string>;
}

export const PFContext = createContext<PFContextValue>({
  mode: 'static',
  content: {},
  manifest: { version: 1, fields: {} },
  selected: null,
  onSelect: () => {},
  onChange: () => {},
});

export const PFProvider = PFContext.Provider;

export function usePF(): PFContextValue {
  return useContext(PFContext);
}
