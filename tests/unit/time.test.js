import assert from 'node:assert/strict'
import { test } from 'node:test'
import { addProject } from '../../src/lib/domain/projects.js'
import { addTime, discardTimer, startTimer, stopTimer } from '../../src/lib/domain/time.js'
import { apply, cleanSeed, input, makeCtx, TODAY } from './helpers.js'

const base = () => {
  const ctx = makeCtx()
  const { db, id } = apply(cleanSeed(), addProject, input, ctx)
  return { db, id, ctx }
}

test('ثبت دستی زمان و محدوده‌ها', () => {
  const { db, id, ctx } = base()
  assert.equal(apply(db, addTime, id, { minutes: 90 }, ctx).db.timeEntries[0].date, TODAY)
  for (const minutes of [0, -1, 1441, 1.5]) assert.equal(addTime(db, id, { minutes }, ctx).error, 'err.minutes')
  assert.equal(addTime(db, id, { minutes: 10, date: '2027-01-01' }, ctx).error, 'err.futureDate')
  assert.equal(addTime(db, 'x', { minutes: 10 }, ctx).error, 'err.notFound')
})

test('تایمر: یکی در هر لحظه، توقف = ثبت', () => {
  const { db, id, ctx } = base()
  const running = apply(db, startTimer, id, ctx).db
  assert.equal(startTimer(running, id, ctx).error, 'err.timerRunning')
  const stopped = apply(running, stopTimer, makeCtx(TODAY, '11:25:40')).db
  assert.equal(stopped.timer, null)
  assert.deepEqual([stopped.timeEntries[0].minutes, stopped.timeEntries[0].source], [85, 'timer'])
  assert.equal(stopTimer(stopped, ctx).error, 'err.noTimer')
})

test('زیر یک دقیقه دور ریخته می‌شه؛ بیش از ۲۴ ساعت مدت دستی می‌خواد', () => {
  const { db, id, ctx } = base()
  const running = apply(db, startTimer, id, ctx).db
  const quick = apply(running, stopTimer, makeCtx(TODAY, '10:00:30'))
  assert.equal(quick.discarded, true)
  assert.equal(quick.db.timeEntries.length, 0)
  const later = makeCtx('2026-11-28')
  assert.equal(stopTimer(running, later).error, 'err.timerTooLong')
  assert.equal(apply(running, stopTimer, later, { minutes: 120 }).db.timeEntries[0].minutes, 120)
  assert.equal(apply(running, discardTimer).db.timer, null)
})
