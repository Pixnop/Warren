import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  worker: {
    // Geometry workers (OpenSCAD / Manifold) are emitted as ES modules.
    format: 'es',
  },
  optimizeDeps: {
    // manifold-3d ships a .wasm asset; let Vite handle it rather than
    // trying to pre-bundle the binary.
    exclude: ['manifold-3d'],
  },
})
