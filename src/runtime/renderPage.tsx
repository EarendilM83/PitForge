import React from 'react';
import type { ProjectConfig } from './types';

export interface BlockModule {
  default: React.ComponentType;
}

/**
 * Composes blocks in the order declared by pitforge.json.blocks (§5.1).
 * `blocks` maps block name -> loaded module.
 */
export function RenderPage({ config, blocks }: { config: ProjectConfig; blocks: Record<string, BlockModule> }) {
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
        return <Block key={name} />;
      })}
    </>
  );
}
