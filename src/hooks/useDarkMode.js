import { useSyncExternalStore } from 'react'
import { useApp } from '../context/AppContext.jsx'

const QUERY = '(prefers-color-scheme: dark)'
const subscribe = (onChange) => {
  const media = window.matchMedia(QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}
const systemIsDark = () => window.matchMedia(QUERY).matches

/** دکمه‌ی سریع روشن/تیره: همیشه برعکسِ چیزی که الان دیده می‌شه. «مثل گوشی» توی تنظیماته. */
export function useDarkMode() {
  const { db, commit } = useApp()
  const system = useSyncExternalStore(subscribe, systemIsDark)
  const { theme } = db.settings
  const dark = theme === 'system' ? system : theme === 'dark'
  return {
    icon: dark ? 'sun' : 'moon',
    label: dark ? 'theme.toLight' : 'theme.toDark',
    toggle: () => commit({ ...db, settings: { ...db.settings, theme: dark ? 'light' : 'dark' } }),
  }
}
