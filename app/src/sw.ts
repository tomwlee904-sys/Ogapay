/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

declare const self: ServiceWorkerGlobalScope

// Precache all assets built by Vite
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// Navigation preload - speeds up navigation requests
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
  if (self.registration.navigationPreload) {
    self.registration.navigationPreload.enable()
  }
})

// SPA fallback - serve index.html for all navigation requests
registerRoute(
  new NavigationRoute(async ({ request, preloadResponsePromise }) => {
    try {
      const preloadResponse = await preloadResponsePromise
      if (preloadResponse) return preloadResponse

      const networkResponse = await fetch(request)
      if (networkResponse.ok) return networkResponse

      throw new Error('Network failed')
    } catch {
      const cache = await caches.open('workbox-precache')
      const cachedResponse = await cache.match('/index.html')
      if (cachedResponse) return cachedResponse

      return new Response('Offline', { status: 503 })
    }
  })
)

// API requests - NetworkFirst with timeout
registerRoute(
  /^https?:\/\/ogapay-production\.up\.railway\.app\/api\/.*/i,
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 }),
    ],
  })
)

// Google Fonts - StaleWhileRevalidate
registerRoute(
  /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
  new StaleWhileRevalidate({
    cacheName: 'google-fonts',
    plugins: [
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 60 }),
    ],
  })
)

// Images - CacheFirst
registerRoute(
  /\.(?:png|jpg|jpeg|svg|gif|ico|webp)$/i,
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 }),
    ],
  })
)
