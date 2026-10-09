// OgaPay push alerts ("Alerts on this device", src/lib/push.ts).
// Registered with scope /push/, so it never handles page loads or caches
// anything: it only shows alerts and opens the right page when one is tapped.
// The backend (services/push.service.js) sends JSON { title, body, url, tag }.

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('push', (event) => {
  let d = {}
  try { d = event.data ? event.data.json() : {} } catch (e) { d = { body: event.data ? event.data.text() : '' } }
  event.waitUntil(self.registration.showNotification(d.title || 'OgaPay', {
    body: d.body || '',
    icon: '/favicon-192.png',
    badge: '/push/badge-96.png', // the small white mark in Android's status bar
    tag: d.tag || undefined, // the same alert twice replaces itself
    data: { url: d.url || '/notifications' },
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL((event.notification.data && event.notification.data.url) || '/notifications', self.location.origin)
  if (url.origin !== self.location.origin) return // only ever our own pages
  event.waitUntil((async () => {
    // An OgaPay window is already open: bring it up and let the app go to the
    // page (this worker doesn't control pages, so it can't navigate them itself)
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const win = wins.find((w) => new URL(w.url).origin === url.origin)
    if (win) {
      await win.focus()
      win.postMessage({ type: 'ogapay:open', url: url.pathname + url.search })
      return
    }
    await self.clients.openWindow(url.href)
  })())
})
