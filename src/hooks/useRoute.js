// مسیریاب هش کوچک: #/projects?filter=unsettled
import { useSyncExternalStore } from 'react'

const subscribe = (fn) => {
  window.addEventListener('hashchange', fn)
  return () => window.removeEventListener('hashchange', fn)
}

export function parseHash(hash) {
  const [path, search = ''] = hash.replace(/^#\/?/, '').split('?')
  const [name = '', id = null] = path.split('/')
  return { name: name || 'home', id: id ? decodeURIComponent(id) : null, query: Object.fromEntries(new URLSearchParams(search)) }
}

export function useRoute() {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash)
  return parseHash(hash)
}

export const href = (path) => `#/${path}`
export const navigate = (path) => {
  window.location.hash = `#/${path}`
}
/** بدون اضافه‌کردن به تاریخچه (برای فیلترها) */
export const replaceRoute = (path) => {
  window.history.replaceState(null, '', `#/${path}`)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}
export const goBack = (fallback) => {
  if (window.history.length > 1) window.history.back()
  else navigate(fallback)
}
