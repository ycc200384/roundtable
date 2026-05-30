import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Auto-increment version on each build
import { readFileSync, writeFileSync, existsSync } from 'fs';
const VER_FILE = '.version';
let ver = 1;
if (existsSync(VER_FILE)) { ver = parseInt(readFileSync(VER_FILE, 'utf8')) + 1; }
writeFileSync(VER_FILE, String(ver));

export default defineConfig({
  base: '/roundtable/',
  build: { outDir: 'docs' },
  define: { __VERSION__: JSON.stringify(ver) },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '圆桌会 Roundtable',
        short_name: '圆桌会',
        description: 'AI 驱动的结构化圆桌讨论',
        theme_color: '#2D2A26',
        background_color: '#FBF7F0',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/roundtable/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        runtimeCaching: [
          { urlPattern: /^\/api\/.*/i, handler: 'NetworkOnly' },
        ],
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: { '/api': 'http://localhost:8000' },
  },
})
