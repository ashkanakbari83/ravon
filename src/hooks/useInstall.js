// نصب PWA. رویداد مرورگر زود می‌رسه، پس همین موقعِ بارگذاری نگهش می‌داریم.
import { useSyncExternalStore } from 'react'

let deferred = null
const listeners = new Set()
const set = (event) => {
  deferred = event
  listeners.forEach((fn) => fn())
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    set(event)
  })
  window.addEventListener('appinstalled', () => set(null))
}

const subscribe = (fn) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
const ios = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (/macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1)

/** mode: 'prompt' (دکمه‌ی نصب) | 'ios' (راهنما) | null (نصب‌شده یا پشتیبانی‌نشده) */
export function useInstall() {
  const event = useSyncExternalStore(subscribe, () => deferred)
  if (standalone()) return { mode: null }
  if (event) {
    // هر رویداد فقط یک بار قابل استفاده‌ست
    return { mode: 'prompt', install: () => (set(null), event.prompt()) }
  }
  return { mode: ios() ? 'ios' : null }
}
