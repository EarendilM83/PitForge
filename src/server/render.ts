import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';
import { PFProvider } from '../runtime/context';
import { RenderPage, type BlockModule } from '../runtime/renderPage';
import type { Project, Content, ImageValue } from '../runtime/types';
import { PROJECTS_DIR } from './projects';

/** Loads a block module by project id + block name. Dev: vite.ssrLoadModule; CLI: tsx import. */
export type BlockLoader = (projectId: string, blockName: string) => Promise<BlockModule>;

export async function loadAllBlocks(project: Project, loadBlock: BlockLoader): Promise<Record<string, BlockModule>> {
  const blocks: Record<string, BlockModule> = {};
  for (const name of project.config.blocks) {
    blocks[name] = await loadBlock(project.id, name);
  }
  return blocks;
}

function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/(href|xlink:href)="(https?:)?\/\/[^"]*"/gi, '$1=""');
}

/** Read + sanitise the SVG source of every icon field so PFIcon can inline it (§6). */
function loadIconSvg(project: Project, content: Content): Record<string, string> {
  const out: Record<string, string> = {};
  const read = (key: string, v: ImageValue | undefined) => {
    if (!v?.src?.endsWith('.svg')) return;
    const file = path.join(PROJECTS_DIR, project.id, 'assets', v.src.replace(/^\/assets\//, ''));
    if (fs.existsSync(file)) out[key] = sanitizeSvg(fs.readFileSync(file, 'utf8'));
  };
  for (const [key, field] of Object.entries(project.manifest.fields)) {
    if (field.type === 'icon') read(key, content[key] as ImageValue | undefined);
    if (field.type === 'repeat' && field.item) {
      const items = (content[key] as Record<string, unknown>[] | undefined) ?? [];
      items.forEach((item, i) => {
        for (const [ik, ifield] of Object.entries(field.item!)) {
          if (ifield.type === 'icon') read(`${key}.${i}.${ik}`, item[ik] as ImageValue | undefined);
        }
      });
    }
  }
  return out;
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
        projectId: project.id,
        content,
        manifest: project.manifest,
        selected: null,
        onSelect: () => {},
        onChange: () => {},
        iconSvg: loadIconSvg(project, content),
      },
    },
    React.createElement(RenderPage, { config: project.config, blocks })
  );
  return renderToStaticMarkup(el);
}
