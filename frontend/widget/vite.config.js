import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  server: { port: 5174, strictPort: true, open: '/demo.html' },
  publicDir: false,
  build: {
    outDir: resolve(root, '../../static/widget'),
    emptyOutDir: false,
    target: 'es2019',
    lib: {
      entry: resolve(root, 'src/main.js'),
      name: 'AskDeskWidget',
      formats: ['iife'],
      fileName: () => 'askdesk-widget.js',
    },
  },
});
