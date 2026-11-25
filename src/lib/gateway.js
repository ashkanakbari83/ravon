// مرز ذخیره‌سازی. امروز localStorage؛ روزی که سرور اومد فقط همین فایل عوض می‌شه (docs/server.md).
import { withDefaults } from './domain/state.js'

export const STORAGE_KEY = 'ravon:state'
export const CORRUPT_KEY = 'ravon:corrupt'

export function createGateway(storage) {
  return {
    load() {
      let raw
      try {
        raw = storage.getItem(STORAGE_KEY)
      } catch {
        return { db: withDefaults(null), error: 'blocked' }
      }
      if (raw == null) return { db: withDefaults(null), error: null }
      try {
        const parsed = JSON.parse(raw)
        if (!parsed || !Array.isArray(parsed.projects)) throw new Error('shape')
        // ذخیره‌ی نسخه‌ی جدیدتر رو دست نمی‌زنیم
        if (parsed.version > withDefaults(null).version) return { db: withDefaults(null), error: 'newer' }
        return { db: withDefaults(parsed), error: null }
      } catch {
        try {
          storage.setItem(CORRUPT_KEY, raw)
        } catch {
          /* جا نیست */
        }
        return { db: withDefaults(null), error: 'corrupt' }
      }
    },
    save(db) {
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(db))
        return true
      } catch {
        return false
      }
    },
    raw() {
      try {
        return storage.getItem(CORRUPT_KEY) ?? storage.getItem(STORAGE_KEY)
      } catch {
        return null
      }
    },
  }
}
