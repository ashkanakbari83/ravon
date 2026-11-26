// مسیریاب هش کوچک: #/projects?filter=unsettled
import { useSyncExternalStore } from 'react'

// هر خانه‌ی تاریخچه یه کلید می‌گیره تا «برگشت» همون‌جای قبلیِ صفحه رو نشون بده
const positions = new Map()
let current = { key: null, path: '' }
let pendingScroll = 0

function sync() {
  const state = window.history.state
  const path = window.location.hash
  if (state?.key && state.key === current.key) {
    current.path = path
    return
  }
  if (current.key) positions.set(current.key, window.scrollY)
  const key = state?.key || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
  pendingScroll = positions.get(key) || 0
  if (!state?.key) window.history.replaceState({ key, from: current.key ? current.path : null }, '')
  current = { key, path }
}

if (typeof window !== 'undefined') {
  window.history.scrollRestoration = 'manual'
  sync()
  // قبل از اشتراکِ React ثبت می‌شن، پس جای اسکرول پیش از رسم صفحه‌ی بعد ذخیره می‌شه
  window.addEventListener('popstate', sync)
  window.addEventListener('hashchange', sync)
}

/** جای اسکرول صفحه‌ی فعلی: صفحه‌ی تازه از بالا، برگشت از همون‌جا */
export function scrollTarget() {
  sync()
  return pendingScroll
}

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
  window.history.replaceState(window.history.state, '', `#/${path}`)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}
/** صفحه‌ی قبلی تاریخچه همینیه که لینکِ برگشت نشون می‌ده؟ */
export function cameFrom(path) {
  const from = window.history.state?.from
  return from != null && parseHash(from).name === parseHash(href(path)).name
}
