import React from 'react';
import { usePF } from './context';
import type { ProjectConfig } from './types';

export interface BlockModule {
  default: React.ComponentType;
}

/**
 * Composes blocks in the order declared by pitforge.json.blocks (§5.1).
 * `blocks` maps block name -> loaded module.
 *
 * In edit mode each block is wrapped in a `display:contents` marker (data-pf-block) so the Studio's
 * Layers panel can group elements by section. `display:contents` generates no box, so layout is
 * untouched; the wrapper is never emitted in static/export mode, keeping published output clean.
 */
export function RenderPage({ config, blocks }: { config: ProjectConfig; blocks: Record<string, BlockModule> }) {
  const edit = usePF().mode === 'edit';
  return (
    <>
      {config.blocks.map((name) => {
        const mod = blocks[name];
        if (!mod?.default) {
          return (
            <div key={name} style={{ padding: 16, background: '#fee', color: '#900' }}>
              Missing block: {name}
            </div>
          );
        }
        const Block = mod.default;
        if (!edit) return <Block key={name} />;
        return (
          <div key={name} data-pf-block={name} style={{ display: 'contents' }}>
            <Block />
          </div>
        );
      })}
    </>
  );
}
