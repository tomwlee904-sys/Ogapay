import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import routePreload from './build-plugins/routePreload'

export default defineConfig({
  plugins: [
    tailwindcss(),
    routePreload(),
    react({
      // Add babel plugins for debugging if needed
      babel: {
        plugins: [],
      },
    }),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: "OgaPay - Nigeria's Microtask Marketplace",
        short_name: 'OgaPay',
        description: 'Earn in Naira or USDC doing paid jobs, or hire people for yours. Money held in escrow until work is approved.',
        theme_color: '#111111',
        background_color: '#111111',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        // The mark sits inside the middle 80%, so the same image works where
        // Android crops icons to its own shape (maskable)
        icons: [
          { src: '/favicon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/logo-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/logo-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      selfDestroying: true,
    }),
  ],
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          solana: ['@solana/web3.js', '@solana/spl-token', 'bs58'],
          charts: ['recharts'],
        },
      },
    },
  },
  server: { port: 3000 },
})
