import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNow } from '../hooks/useNow.js'
import { translate } from '../i18n/index.js'
import { applySeedRelease } from '../lib/domain/demo.js'
import { emptyState } from '../lib/domain/state.js'
import { projectRows } from '../lib/domain/stats.js'
import * as format from '../lib/format.js'
import { createGateway, STORAGE_KEY } from '../lib/gateway.js'
import { newId } from '../lib/ids.js'
import { toIsoDate } from '../lib/jalali.js'

const AppContext = createContext(null)
export const useApp = () => useContext(AppContext)

const browserStorage = {
  getItem: (k) => window.localStorage.getItem(k),
  setItem: (k, v) => window.localStorage.setItem(k, v),
}
const gateway = createGateway(browserStorage)

export function AppProvider({ children }) {
  const [initial] = useState(() => {
    const loaded = gateway.load()
    return { ...loaded, db: applySeedRelease(loaded.db) }
  })
  const [db, setDb] = useState(initial.db)
  const [storageError, setStorageError] = useState(initial.error)
  const [toasts, setToasts] = useState([])
  const [sheet, setSheet] = useState(null)
  const dbRef = useRef(db)
  const toastId = useRef(0)
  const now = useNow()
  const today = toIsoDate(now)
  const { locale, currency, theme } = db.settings

  const t = useCallback((key, vars) => translate(locale, key, vars), [locale])

  const dismissToast = useCallback((id) => setToasts((list) => list.filter((x) => x.id !== id)), [])
  const toast = useCallback(
    (message, { tone = 'ok', action } = {}) => {
      toastId.current += 1
      const id = toastId.current
      setToasts((list) => [...list.slice(-1), { id, message, tone, action }])
      setTimeout(() => dismissToast(id), action ? 6000 : 3200)
    },
    [dismissToast],
  )

  // خطای قبلی نباید توی برگه‌ی تازه دیده بشه
  const openSheet = useCallback((type, props = {}) => {
    setToasts((list) => list.filter((x) => x.tone !== 'bad'))
    setSheet({ type, props, key: (toastId.current += 1) })
  }, [])
  const closeSheet = useCallback(() => setSheet(null), [])

  // وقتی ذخیره‌ی قبلی خونده نشد (نسخه‌ی جدیدتر)، روش نمی‌نویسیم
  const readOnly = storageError === 'newer'
  const commit = useCallback(
    (next) => {
      dbRef.current = next
      setDb(next)
      if (!readOnly && !gateway.save(next)) toast(translate(next.settings.locale, 'storage.full'), { tone: 'bad' })
    },
    [readOnly, toast],
  )

  const ctx = useCallback(() => {
    const date = new Date()
    return { now: date.toISOString(), today: toIsoDate(date), newId }
  }, [])

  /** run(domainFn, ...args) — خطا رو خودش اعلام می‌کنه */
  const run = useCallback(
    (fn, ...args) => {
      const result = fn(dbRef.current, ...args)
      if (result.ok) commit(result.db)
      else toast(translate(dbRef.current.settings.locale, result.error), { tone: 'bad' })
      return result
    },
    [commit, toast],
  )

  const wipe = useCallback(() => {
    const next = emptyState()
    next.settings = dbRef.current.settings
    next.meta.onboarded = true
    commit(next)
  }, [commit])

  useEffect(() => {
    if (initial.db.meta.seedRelease && !initial.error) gateway.save(dbRef.current)
  }, [initial])

  // هماهنگی بین تب‌ها
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== STORAGE_KEY) return
      const loaded = gateway.load()
      if (loaded.error) return
      dbRef.current = loaded.db
      setDb(loaded.db)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') delete root.dataset.theme
    else root.dataset.theme = theme
    root.lang = locale
    root.dir = locale === 'fa' ? 'rtl' : 'ltr'
    document.title = translate(locale, 'app.name')
  }, [theme, locale])

  const fmt = useMemo(
    () => ({
      num: (n, d) => format.formatNumber(n, locale, d),
      money: (n) => format.formatMoney(n, currency, locale),
      short: (n) => format.formatMoneyShort(n, currency, locale),
      compact: (n) => format.compactNumber(n, locale),
      parts: (n) => format.compactParts(n, locale),
      currency: format.currencyLabel(currency, locale),
      date: (iso, options) => format.formatDate(iso, { locale, today, ...options }),
      clock: (m) => format.formatClock(m, locale),
      hours: (m) => format.formatHours(m, locale),
      digits: (v) => format.localizeDigits(v, locale),
      percent: (r) => `${format.formatNumber(Math.round(r * 100), locale)}${locale === 'fa' ? '٪' : '%'}`,
    }),
    [locale, currency, today],
  )

  const rows = useMemo(() => projectRows(db), [db])
  const serviceName = useCallback(
    (id) => {
      const label = translate(locale, `service.${id}`)
      return label === `service.${id}` ? id : label
    },
    [locale],
  )

  const value = {
    db, rows, today, locale, t, fmt, serviceName, run, ctx, wipe, commit,
    toast, toasts, dismissToast,
    sheet, openSheet, closeSheet,
    storageError, dismissStorageError: () => setStorageError((e) => (e === 'newer' ? e : null)), rawData: gateway.raw,
  }
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
