import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PFProvider } from '../runtime/context';
import { RenderPage, type BlockModule } from '../runtime/renderPage';
import type { Project, Content } from '../runtime/types';

/** Loads a block module by project id + block name. Dev: vite.ssrLoadModule; CLI: tsx import. */
export type BlockLoader = (projectId: string, blockName: string) => Promise<BlockModule>;

export async function loadAllBlocks(project: Project, loadBlock: BlockLoader): Promise<Record<string, BlockModule>> {
  const blocks: Record<string, BlockModule> = {};
  for (const name of project.config.blocks) {
    blocks[name] = await loadBlock(project.id, name);
  }
  return blocks;
}

/** Render the page exactly as the export does: PFProvider in static mode. */
export async function renderStaticHtml(
  project: Project,
  loadBlock: BlockLoader,
  content: Content = project.content
): Promise<string> {
  const blocks = await loadAllBlocks(project, loadBlock);
  const el = React.createElement(
    PFProvider,
    {
      value: {
        mode: 'static' as const,
        content,
        manifest: project.manifest,
        selected: null,
        onSelect: () => {},
        onChange: () => {},
      },
    },
    React.createElement(RenderPage, { config: project.config, blocks })
  );
  return renderToStaticMarkup(el);
}
