import { apiRequest } from './api'
import { isInstalled } from './install'

// Push alerts on this device (Settings → Notifications). The browser keeps a
// subscription with its push service; the backend (services/push.service.js)
// sends each new notification to it, and public/push/sw.js shows it. That
// worker has its own scope (/push/) so it never touches page loads, and the
// site's older /sw.js (which removes itself) can't replace it.

const SW_URL = '/push/sw.js'
const SCOPE = '/push/'

export type PushState =
  | 'unsupported' // this browser can't do push
  | 'install-first' // iPhone/iPad: only an app added to the home screen gets alerts
  | 'unavailable' // the server has no keys yet
  | 'blocked' // the person said no to notifications for ogapay.app
  | 'off'
  | 'on'

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

let keyCache: Promise<string | null> | null = null
const serverKey = () => (keyCache ??= apiRequest<{ publicKey: string | null }>('/push/key', { auth: false })
  .then((r) => r?.publicKey || null)
  .catch(() => { keyCache = null; return null }))

const registration = () => navigator.serviceWorker.getRegistration(SCOPE)

async function currentSubscription() {
  const reg = await registration()
  return reg ? reg.pushManager.getSubscription() : null
}

const keyBytes = (b64url: string) => {
  const s = atob((b64url + '='.repeat((4 - (b64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(s, (c) => c.charCodeAt(0))
}
const sameKey = (sub: PushSubscription, key: string) => {
  const k = sub.options?.applicationServerKey
  if (!k) return true // the browser doesn't say: assume it's ours
  const a = new Uint8Array(k), b = keyBytes(key)
  return a.length === b.length && a.every((v, i) => v === b[i])
}

export async function pushState(): Promise<PushState> {
  if (isIos() && !isInstalled()) return 'install-first'
  if (!supported()) return 'unsupported'
  if (!(await serverKey())) return 'unavailable'
  if (Notification.permission === 'denied') return 'blocked'
  const sub = await currentSubscription()
  return sub && Notification.permission === 'granted' ? 'on' : 'off'
}

// The worker has to be running before the browser will subscribe
async function activeRegistration() {
  const reg = await navigator.serviceWorker.register(SW_URL, { scope: SCOPE })
  if (reg.active) return reg
  const w = reg.installing || reg.waiting
  await new Promise<void>((resolve) => {
    if (!w) return resolve()
    const check = () => { if (w.state === 'activated') { w.removeEventListener('statechange', check); resolve() } }
    w.addEventListener('statechange', check)
    check()
  })
  return reg
}

// Ask the browser, subscribe, and tell the server. Returns the new state.
export async function turnOnPush(): Promise<PushState> {
  const key = await serverKey()
  if (!key) return 'unavailable'
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off'
  const reg = await activeRegistration()
  let sub = await reg.pushManager.getSubscription()
  if (sub && !sameKey(sub, key)) { await sub.unsubscribe(); sub = null } // the server's keys changed
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) })
  await apiRequest('/push/subscribe', { method: 'POST', body: JSON.stringify(sub.toJSON()) })
  return 'on'
}

export async function turnOffPush(): Promise<PushState> {
  const sub = await currentSubscription()
  if (sub) {
    await apiRequest('/push/unsubscribe', { method: 'POST', body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {})
    await sub.unsubscribe().catch(() => false)
  }
  return 'off'
}

// Signing out: this device stops getting that account's alerts. Runs before
// the session is cleared so the server is told too; if that fails, the
// browser's subscription is gone anyway and the server drops it on the next send.
export async function dropPushOnSignOut() {
  try {
    if (!supported()) return
    await turnOffPush()
  } catch { /* nothing to undo */ }
}

// Make sure the server has this device for whoever is signed in now (it may
// have been turned on under another account on this browser)
export async function resyncPush() {
  try {
    if (!supported() || Notification.permission !== 'granted') return
    const sub = await currentSubscription()
    if (sub) await apiRequest('/push/subscribe', { method: 'POST', body: JSON.stringify(sub.toJSON()) })
  } catch { /* the Settings switch shows the real state */ }
}

export const sendTestPush = () => apiRequest<{ sent: number; devices: number }>('/push/test', { method: 'POST' })

// A tapped alert asks an open OgaPay window to go to its page (public/push/sw.js)
export function listenForAlertTaps(go: (url: string) => void) {
  if (!('serviceWorker' in navigator)) return () => {}
  const onMessage = (e: MessageEvent) => {
    const d = e.data
    if (d && d.type === 'ogapay:open' && typeof d.url === 'string' && d.url.startsWith('/') && !d.url.startsWith('//')) go(d.url)
  }
  navigator.serviceWorker.addEventListener('message', onMessage)
  return () => navigator.serviceWorker.removeEventListener('message', onMessage)
}
