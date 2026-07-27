import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { createApiApp } from './src/server/index';
import type { RenderHtml } from './src/server/ssr-entry';

function pitforgeApi(): Plugin {
  return {
    name: 'pitforge-api',
    configureServer(server) {
      let cached: RenderHtml | null = null;
      const getRender = async (): Promise<RenderHtml> => {
        if (!cached) {
          const mod = await server.ssrLoadModule('/src/server/ssr-entry.ts');
          cached = mod.ssrRender as RenderHtml;
        }
        return cached;
      };
      server.middlewares.use(createApiApp(getRender));
    },
  };
}

export default defineConfig({
  plugins: [react(), pitforgeApi()],
  server: { port: 4321, strictPort: true },
});
