import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api/grsai': {
        target: 'https://grsai.dakka.com.cn',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/grsai/, ''),
        secure: false,
      },
      '/api/ark': {
        target: 'https://ark.cn-beijing.volces.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/ark/, ''),
        secure: false,
      },
      '/api/comfyui': {
        target: 'http://localhost:8188',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/comfyui/, ''),
      },
    },
  },
  build: { outDir: 'dist' },
})
