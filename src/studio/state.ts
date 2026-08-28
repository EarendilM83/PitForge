import type { Project, Content, ContentValue } from '../runtime/types';

export type Tab = 'edit' | 'preview' | 'seo';
export type SaveStatus = 'saved' | 'saving' | 'error';

export interface StudioState {
  project: Project | null;
  content: Content;
  selected: string | null;
  tab: Tab;
  saveStatus: SaveStatus;
  undoStack: Content[];
  redoStack: Content[];
  outlinesVisible: boolean;
  canvasWidth: number | 'full';
  activeLang: string; // 'en' = source language; others edit into content._t[lang]
  error: string | null;
}

export const initialState: StudioState = {
  project: null,
  content: {},
  selected: null,
  tab: 'edit',
  saveStatus: 'saved',
  undoStack: [],
  redoStack: [],
  outlinesVisible: false,
  canvasWidth: 'full',
  activeLang: 'en',
  error: null,
};

export type Action =
  | { type: 'project-loaded'; project: Project }
  | { type: 'select'; field: string | null }
  | { type: 'change'; field: string; value: ContentValue }
  | { type: 'set-content'; content: Content }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'tab'; tab: Tab }
  | { type: 'save-status'; status: SaveStatus }
  | { type: 'toggle-outlines' }
  | { type: 'canvas-width'; width: number | 'full' }
  | { type: 'set-lang'; lang: string }
  | { type: 'error'; error: string | null };

// Write a value for the active language. English (or reserved `_`-keys like _tags/_style) writes to
// the base content; other languages write a flat per-key override into content._t[lang].
function applyChange(content: Content, field: string, value: ContentValue, lang: string): Content {
  if (lang === 'en' || field.startsWith('_')) return setDeep(content, field, value);
  const t = { ...((content['_t'] as Record<string, Record<string, ContentValue>>) || {}) };
  t[lang] = { ...(t[lang] || {}), [field]: value };
  return { ...content, _t: t };
}

function setDeep(content: Content, key: string, value: ContentValue): Content {
  // Direct top-level keys (including whole-array replacements like "games.slides")
  // always win; only keys with numeric segments ("games.slides.0.name") index into arrays.
  if (key in content || !/\.\d+(\.|$)/.test(key)) return { ...content, [key]: value };
  const parts = key.split('.');
  const next: Content = { ...content };
  for (let i = parts.length; i > 0; i--) {
    const prefix = parts.slice(0, i).join('.');
    if (Array.isArray(next[prefix])) {
      const arr = [...(next[prefix] as Record<string, unknown>[])];
      const idx = Number(parts[i]);
      const rest = parts.slice(i + 1);
      const item = { ...arr[idx] };
      let cur: Record<string, unknown> = item;
      for (let j = 0; j < rest.length - 1; j++) cur = cur[rest[j]] as Record<string, unknown>;
      if (rest.length) cur[rest[rest.length - 1]] = value;
      arr[idx] = item;
      next[prefix] = arr;
      return next;
    }
  }
  next[key] = value;
  return next;
}

const UNDO_LIMIT = 50;

export function reducer(state: StudioState, action: Action): StudioState {
  switch (action.type) {
    case 'project-loaded':
      return { ...initialState, project: action.project, content: action.project.content, canvasWidth: state.canvasWidth };
    case 'select':
      return { ...state, selected: action.field };
    case 'change': {
      const undoStack = [...state.undoStack, state.content].slice(-UNDO_LIMIT);
      return { ...state, content: applyChange(state.content, action.field, action.value, state.activeLang), undoStack, redoStack: [], saveStatus: 'saving' };
    }
    case 'set-lang':
      return { ...state, activeLang: action.lang };
    case 'set-content':
      return { ...state, content: action.content };
    case 'undo': {
      if (!state.undoStack.length) return state;
      const prev = state.undoStack[state.undoStack.length - 1];
      return {
        ...state,
        content: prev,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, state.content],
        saveStatus: 'saving',
      };
    }
    case 'redo': {
      if (!state.redoStack.length) return state;
      const nextContent = state.redoStack[state.redoStack.length - 1];
      return {
        ...state,
        content: nextContent,
        redoStack: state.redoStack.slice(0, -1),
        undoStack: [...state.undoStack, state.content],
        saveStatus: 'saving',
      };
    }
    case 'tab':
      return { ...state, tab: action.tab };
    case 'save-status':
      return { ...state, saveStatus: action.status };
    case 'toggle-outlines':
      return { ...state, outlinesVisible: !state.outlinesVisible };
    case 'canvas-width':
      return { ...state, canvasWidth: action.width };
    case 'error':
      return { ...state, error: action.error };
    default:
      return state;
  }
}
