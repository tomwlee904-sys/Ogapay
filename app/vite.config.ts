import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'fs'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'OgaPay',
        short_name: 'OgaPay',
        description: 'Nigeria\'s microtask marketplace — earn NGN and crypto by completing tasks, or hire workers for your projects.',
        theme_color: '#111111',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        orientation: 'portrait',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      strategies: 'generateSW',
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      globIgnores: ['**/sw*', '**/workbox*'],
      cleanupOutdatedCaches: true,
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      navigateFallback: '/index.html',
      navigateFallbackDenylist: [/^\/api\//],
      workbox: {
        clientsClaim: true,
      },
      runtimeCaching: [
        {
          urlPattern: /^https?:\/\/ogapay-production\.up\.railway\.app\/api\/.*/i,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-cache',
            networkTimeoutSeconds: 5,
            expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
          },
        },
        {
          urlPattern: /\.(?:png|jpg|jpeg|svg|gif|ico|webp)$/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'images',
            expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
          },
        },
      ],
    }),
  ],
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: { port: 3000 },
})
