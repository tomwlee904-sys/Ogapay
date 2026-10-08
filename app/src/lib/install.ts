import { useEffect, useState } from 'react'

// "Install the app". Chrome and Edge (Android and desktop) can install a site
// that has a manifest (ours comes from vite.config). When they're ready they
// hand the page a beforeinstallprompt event; we keep it so our own Install
// button can open the browser's install dialog. iPhone and iPad have no such
// event: there we show how to add OgaPay from the Share menu instead. Nothing
// is offered once OgaPay is already running as an installed app.

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let waiting: InstallPromptEvent | null = null
const listeners = new Set<() => void>()
const changed = () => listeners.forEach((l) => l())

export const isInstalled = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true

// iPadOS reports itself as a Mac; a touch screen gives it away
const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

// Runs before the app renders: the browser can send the event straight away
export function initInstall() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // no browser bar of its own; our button and card ask instead
    waiting = e as InstallPromptEvent
    changed()
  })
  window.addEventListener('appinstalled', () => { waiting = null; changed() })
}

// 'prompt': the browser's install dialog is ready; 'ios': show the Share-menu
// steps; null: nothing to offer (installed already, or the browser can't)
export type InstallMode = 'prompt' | 'ios' | null
export function installMode(): InstallMode {
  if (isInstalled()) return null
  if (waiting) return 'prompt'
  if (isIos()) return 'ios'
  return null
}

// Opens the browser's dialog; true if the visitor installed
export async function promptInstall(): Promise<boolean> {
  const e = waiting
  if (!e) return false
  waiting = null // each event opens the dialog once
  changed()
  await e.prompt()
  const { outcome } = await e.userChoice
  return outcome === 'accepted'
}

export function useInstallMode(): InstallMode {
  const [mode, setMode] = useState<InstallMode>(installMode)
  useEffect(() => {
    const update = () => setMode(installMode())
    listeners.add(update)
    update()
    return () => { listeners.delete(update) }
  }, [])
  return mode
}
