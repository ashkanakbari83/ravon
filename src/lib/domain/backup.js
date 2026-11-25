import { diffDays } from '../jalali.js'
import { BACKUP_REMINDER_DAYS, STATE_VERSION } from './constants.js'
import { fail, ok } from './result.js'
import { withDefaults } from './state.js'

export const serializeBackup = (db, ctx) =>
  JSON.stringify({ app: 'ravon', version: STATE_VERSION, exportedAt: ctx.now, data: db }, null, 2)

export const markBackup = (db, ctx) => ok({ ...db, meta: { ...db.meta, lastBackupAt: ctx.today } })
export const snoozeBackup = (db, ctx) => ok({ ...db, meta: { ...db.meta, backupSnoozedAt: ctx.today } })

export function parseBackup(text) {
  let file
  try {
    file = JSON.parse(text)
  } catch {
    return fail('err.backupInvalid')
  }
  if (!file || file.app !== 'ravon' || !file.data || !Array.isArray(file.data.projects)) return fail('err.backupInvalid')
  if (file.version > STATE_VERSION) return fail('err.backupNewer')
  const db = withDefaults(file.data)
  db.meta.onboarded = true
  return ok(db)
}

/** داده فقط روی همین دستگاهه، پس هر دو هفته یادآوری می‌کنیم (فقط برای داده‌ی واقعی) */
export function needsBackup(db, today) {
  const real = db.projects.filter((p) => !p.demo)
  if (!real.length) return false
  const { lastBackupAt, backupSnoozedAt } = db.meta
  if (backupSnoozedAt && diffDays(backupSnoozedAt, today) < BACKUP_REMINDER_DAYS) return false
  if (lastBackupAt) return diffDays(lastBackupAt, today) >= BACKUP_REMINDER_DAYS
  const oldest = real.reduce((min, p) => (p.createdOn < min ? p.createdOn : min), today)
  return real.length >= 5 || diffDays(oldest, today) >= 7
}
