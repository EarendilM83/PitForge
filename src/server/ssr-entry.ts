// Loaded through vite.ssrLoadModule so blocks, runtime context and renderer all
// share one module graph (otherwise useContext splits across two React copies).
import { renderStaticHtml } from './render';
import type { Project, Content } from '../runtime/types';
import type { BlockModule } from '../runtime/renderPage';

export type RenderHtml = (project: Project, content?: Content) => Promise<string>;

export const ssrRender: RenderHtml = (project, content) =>
  renderStaticHtml(
    project,
    (projectId, blockName) =>
      import(/* @vite-ignore */ `/projects/${projectId}/blocks/${blockName}.tsx`) as Promise<BlockModule>,
    content
  );
