// نسخه‌ی تازه‌ی PWA: خبر می‌دیم و کاربر خودش به‌روز می‌کنه تا وسط نوشتن صفحه نپره.
import { useSyncExternalStore } from 'react'
import { registerSW } from 'virtual:pwa-register'

let ready = false
const listeners = new Set()

const update = registerSW({
  onNeedRefresh() {
    ready = true
    listeners.forEach((fn) => fn())
  },
  onRegisteredSW(_url, registration) {
    if (!registration) return
    // اپ نصب‌شده روی گوشی معمولاً بسته نمی‌شه؛ هر بار که برمی‌گرده نسخه رو چک می‌کنیم
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') registration.update().catch(() => {})
    })
  },
})

const subscribe = (fn) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useAppUpdate() {
  return { ready: useSyncExternalStore(subscribe, () => ready), apply: () => update(true) }
}
