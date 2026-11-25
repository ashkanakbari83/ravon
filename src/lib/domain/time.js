import { isIsoDate, toIsoDate } from '../jalali.js'
import { MAX_ENTRY_MINUTES } from './constants.js'
import { cleanNote, fail, ok } from './result.js'

export function addTime(db, projectId, input, ctx) {
  if (!db.projects.some((p) => p.id === projectId)) return fail('err.notFound')
  if (!Number.isInteger(input.minutes) || input.minutes <= 0 || input.minutes > MAX_ENTRY_MINUTES) return fail('err.minutes')
  const date = input.date || ctx.today
  if (!isIsoDate(date)) return fail('err.date')
  if (date > ctx.today) return fail('err.futureDate')
  const entry = {
    id: ctx.newId('t'),
    projectId,
    minutes: input.minutes,
    date,
    note: cleanNote(input.note),
    source: input.source === 'timer' ? 'timer' : 'manual',
    createdAt: ctx.now,
  }
  return ok({ ...db, timeEntries: [...db.timeEntries, entry] }, { id: entry.id })
}

export function removeTime(db, id) {
  if (!db.timeEntries.some((x) => x.id === id)) return fail('err.notFound')
  return ok({ ...db, timeEntries: db.timeEntries.filter((x) => x.id !== id) })
}

export const elapsedMinutes = (timer, now) => Math.max(0, Math.floor((Date.parse(now) - Date.parse(timer.startedAt)) / 60000))

export function startTimer(db, projectId, ctx) {
  if (!db.projects.some((p) => p.id === projectId)) return fail('err.notFound')
  if (db.timer) return fail('err.timerRunning')
  return ok({ ...db, timer: { projectId, startedAt: ctx.now } })
}

/**
 * تایمر رو می‌بنده و ثبتش می‌کنه. زیر یک دقیقه دور ریخته می‌شه.
 * اگه جا مونده باشه (بیش از ۲۴ ساعت) باید مدت درست رو با input.minutes بدی.
 */
export function stopTimer(db, ctx, input = {}) {
  if (!db.timer) return fail('err.noTimer')
  const minutes = input.minutes ?? elapsedMinutes(db.timer, ctx.now)
  const cleared = { ...db, timer: null }
  if (minutes < 1) return ok(cleared, { discarded: true })
  if (minutes > MAX_ENTRY_MINUTES) return fail('err.timerTooLong')
  const date = toIsoDate(new Date(db.timer.startedAt))
  return addTime(cleared, db.timer.projectId, { minutes, date: date > ctx.today ? ctx.today : date, source: 'timer' }, ctx)
}

export const discardTimer = (db) => (db.timer ? ok({ ...db, timer: null }) : fail('err.noTimer'))
