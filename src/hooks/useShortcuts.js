// میانبرهای دسکتاپ. با code کار می‌کنه تا روی کیبورد فارسی هم جواب بده.
import { useEffect } from 'react'
import { navigate } from './useRoute.js'

let wantsSearch = false
/** صفحه‌ی پروژه‌ها موقع باز شدن می‌پرسه باید جست‌وجو رو فعال کنه یا نه */
export function takeSearchRequest() {
  const wanted = wantsSearch
  wantsSearch = false
  return wanted
}

export function useShortcuts({ enabled, onNew }) {
  useEffect(() => {
    if (!enabled) return
    const handle = (event) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return
      if (event.target.closest?.('input, textarea, select, dialog, [contenteditable]')) return
      if (event.code === 'KeyN') {
        event.preventDefault()
        onNew()
      } else if (event.code === 'Slash') {
        event.preventDefault()
        const search = document.querySelector('.search input')
        if (search) search.focus()
        else {
          wantsSearch = true
          navigate('projects')
        }
      }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [enabled, onNew])
}
