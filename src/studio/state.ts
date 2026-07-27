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
  outlinesVisible: true,
  canvasWidth: 'full',
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
  | { type: 'error'; error: string | null };

function setDeep(content: Content, key: string, value: ContentValue): Content {
  // Keys like "games.slides.0.name" index into arrays.
  const parts = key.split('.');
  // Find the longest prefix that is an array-bearing content key.
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
      return { ...state, content: setDeep(state.content, action.field, action.value), undoStack, redoStack: [], saveStatus: 'saving' };
    }
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
