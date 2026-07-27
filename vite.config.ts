import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { createApiApp } from './src/server/index';

function pitforgeApi(): Plugin {
  return {
    name: 'pitforge-api',
    configureServer(server) {
      server.middlewares.use(createApiApp());
    },
  };
}

export default defineConfig({
  plugins: [react(), pitforgeApi()],
  server: { port: 4321, strictPort: true },
});
