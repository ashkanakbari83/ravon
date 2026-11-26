import { ok } from './result.js'

/** تغییراتی که کاربر هنوز ندیده */
export function unseenReleases(db, releases) {
  const seen = db.meta.seenRelease
  const fresh = releases.filter((r) => r.id > seen)
  // کسی که از قبلِ این قابلیت استفاده می‌کرده، فقط آخرین تغییرات رو می‌بینه
  return seen ? fresh : fresh.slice(0, 1)
}

export const markReleasesSeen = (db, id) =>
  ok({ ...db, meta: { ...db.meta, seenRelease: Math.max(db.meta.seenRelease, id) } })
