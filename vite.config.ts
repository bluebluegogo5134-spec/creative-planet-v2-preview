import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/creative-planet-v2-preview/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'assets/*.jpg'],
      manifest: {
        id: './',
        name: '创作星球',
        short_name: '创作星球',
        description: '保护创作时间、记录作品推进、完成每周计划与复盘。',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#edf5fb',
        theme_color: '#edf5fb',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,webp}'],
        navigateFallback: 'index.html'
      }
    })
  ]
})
