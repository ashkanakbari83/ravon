import { useEffect, useState } from 'react'

/**
 * از مرورگر می‌خواد داده‌ها رو موقع کمبود جا پاک نکنه (فقط وقتی داده‌ی واقعی هست).
 * خروجی: true / false / null (نامعلوم یا پشتیبانی‌نشده)
 */
export function usePersistentStorage(wanted) {
  const [persisted, setPersisted] = useState(null)
  useEffect(() => {
    const storage = navigator.storage
    if (!storage?.persisted) return undefined
    let alive = true
    const check = async () => {
      let granted = await storage.persisted()
      if (!granted && wanted) granted = await storage.persist()
      if (alive) setPersisted(granted)
    }
    check().catch(() => {})
    return () => {
      alive = false
    }
  }, [wanted])
  return persisted
}
