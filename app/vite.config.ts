import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    tailwindcss(),
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
        description: 'Earn NGN and crypto by completing tasks, or hire workers for your projects.',
        theme_color: '#111111',
        background_color: '#111111',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
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
