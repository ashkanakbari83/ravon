import { emptyState } from '../../src/lib/domain/state.js'

export const TODAY = '2026-11-25' // ۴ آذر ۱۴۰۵

/** حالت تمیز و بدون داده‌ی نمونه */
export function cleanSeed() {
  const db = emptyState()
  db.meta.onboarded = true
  return db
}

// شمارنده سراسریه تا دو ctx جدا id تکراری نسازن
let n = 0
export function makeCtx(today = TODAY, time = '10:00:00') {
  return { today, now: `${today}T${time}.000Z`, newId: (prefix) => `${prefix}-test-${(n += 1)}` }
}

/** اجرای زنجیره‌ای قوانین؛ هر خطا تست رو می‌ندازه */
export function apply(db, fn, ...args) {
  const result = fn(db, ...args)
  if (!result.ok) throw new Error(`${fn.name}: ${result.error}`)
  return result
}

export const input = { title: 'ریلز معرفی', clientName: 'کافه دُردی', service: 'reels', amount: 2_000_000 }
