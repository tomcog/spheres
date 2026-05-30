import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icon.svg', 'apple-touch-icon-180x180.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
      manifest: {
        name: 'Spheres',
        short_name: 'Spheres',
        description: 'Time allocation across spheres of attention',
        theme_color: '#f5f5f7',
        background_color: '#f5f5f7',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['productivity', 'lifestyle'],
        icons: [
          { src: 'pwa-64x64.png',              sizes: '64x64',   type: 'image/png' },
          { src: 'pwa-192x192.png',             sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png',             sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png',   sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
