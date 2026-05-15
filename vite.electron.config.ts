import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  build: {
    target: 'node18',
    outDir: 'dist-electron',
    lib: {
      entry: {
        main: path.resolve(__dirname, 'electron/main.ts'),
        preload: path.resolve(__dirname, 'electron/preload.ts'),
      },
      formats: ['cjs'],
    },
    rollupOptions: {
      external: ['electron', 'path', 'fs', 'os', 'child_process', 'crypto', 'http', 'https', 'ali-oss'],
    },
    emptyOutDir: true,
    minify: false,
  },
})
