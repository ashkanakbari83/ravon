import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildSeed } from '../../src/data/seed.js'
import { loadDemo } from '../../src/lib/domain/demo.js'
import { exportSheets } from '../../src/lib/domain/export.js'
import { addPayment } from '../../src/lib/domain/payments.js'
import { addProject, matchesFilter, setStatus } from '../../src/lib/domain/projects.js'
import { buildReport, monthlySeries, rangeBounds } from '../../src/lib/domain/reports.js'
import { clientSummaries, dashboardStats, projectRows } from '../../src/lib/domain/stats.js'
import { addTime } from '../../src/lib/domain/time.js'
import { apply, cleanSeed, input, makeCtx, TODAY } from './helpers.js'

function scenario() {
  const ctx = makeCtx()
  const old = makeCtx('2026-08-01')
  // الف: تحویل امروز، ۲م، ۱م دریافت این ماه، ۲ ساعت
  let { db, id: a } = apply(cleanSeed(), addProject, { ...input, dueDate: '2026-11-24' }, ctx)
  db = apply(db, addPayment, a, { amount: 1_000_000 }, ctx).db
  db = apply(db, addTime, a, { minutes: 120 }, ctx).db
  db = apply(db, setStatus, a, 'delivered', ctx).db
  // ب: قدیمی، تسویه‌شده، بدون زمان
  const b = apply(db, addProject, { ...input, title: 'ب', service: 'cover', amount: 500_000 }, old)
  db = apply(b.db, addPayment, b.id, { amount: 500_000 }, old).db
  db = apply(db, setStatus, b.id, 'delivered', old).db
  // ج: باز و عقب‌افتاده
  db = apply(db, addProject, { ...input, title: 'ج', clientName: 'دیگری', amount: 3_000_000, dueDate: '2026-11-20' }, ctx).db
  return db
}

test('آمار داشبورد از داده حساب می‌شه', () => {
  const s = dashboardStats(scenario(), TODAY)
  assert.deepEqual(
    [s.agreed, s.received, s.outstanding, s.activeCount, s.deliveredCount, s.overdue.length],
    [5_500_000, 1_500_000, 4_000_000, 1, 2, 1],
  )
  assert.deepEqual([s.monthReceived, s.monthMinutes, s.monthDelivered], [1_000_000, 120, 1])
  assert.deepEqual([s.awaiting.length, s.awaitingTotal], [1, 1_000_000])
})

test('شمارنده‌های داشبورد با فهرست مقصدشون یکی‌ان (حتی با آرشیو)', () => {
  const db = apply(cleanSeed(), loadDemo, 'busy', makeCtx()).db
  const rows = projectRows(db)
  const s = dashboardStats(db, TODAY, rows)
  assert.equal(s.activeCount, rows.filter((r) => matchesFilter(r, 'open')).length)
  assert.equal(s.deliveredCount, rows.filter((r) => matchesFilter(r, 'delivered')).length)
})

test('گزارش: بازه، درآمد ساعتی فقط از تحویل‌های زمان‌دار', () => {
  const db = scenario()
  const month = buildReport(db, 'month', TODAY)
  assert.deepEqual([month.received, month.minutes, month.deliveredCount, month.hourly], [1_000_000, 120, 1, 1_000_000])
  assert.equal(month.settledRatio, 0.5)
  assert.equal(month.onTimeRatio, 0)
  const all = buildReport(db, 'all', TODAY)
  assert.deepEqual([all.received, all.deliveredCount, all.hourly, all.timedCount], [1_500_000, 2, 1_000_000, 1])
  assert.equal(all.outstanding, 4_000_000)
  assert.deepEqual(all.byService.map((g) => g.key), ['reels', 'cover'])
  assert.equal(buildReport(cleanSeed(), 'all', TODAY).hourly, null)
})

test('بازه‌ها و سری ماهانه شمسی‌ان', () => {
  assert.equal(rangeBounds('month', TODAY).from, '2026-11-22') // ۱ آذر
  assert.equal(rangeBounds('year', TODAY).from, '2026-03-21')
  assert.equal(rangeBounds('quarter', TODAY).from, '2026-09-23') // ۱ مهر
  const series = monthlySeries(scenario(), TODAY, 6)
  assert.deepEqual(series.map((m) => m.jm), [4, 5, 6, 7, 8, 9])
  assert.equal(series.at(-1).received, 1_000_000)
  assert.equal(series.reduce((s, m) => s + m.received, 0), 1_500_000)
})

test('روی داده‌ی شلوغ: توافق = دریافتی + طلب، و جمع کارفرماها می‌خونه', () => {
  const db = apply(cleanSeed(), loadDemo, 'busy', makeCtx()).db
  const s = dashboardStats(db, TODAY)
  assert.equal(s.agreed, s.received + s.outstanding)
  const clients = clientSummaries(db)
  assert.equal(clients.reduce((n, c) => n + c.received, 0), s.received)
  assert.equal(clients.reduce((n, c) => n + c.count, 0), buildSeed('busy', TODAY).projects.length)
})

test('برگه‌های اکسل: ماهانه، پروژه‌ها، پرداخت‌ها، زمان‌ها', () => {
  const sheets = exportSheets(scenario(), 'month', TODAY, { t: (k) => k, serviceName: (s) => s })
  assert.deepEqual(sheets.map((s) => s.name), ['xls.monthly', 'xls.projects', 'xls.payments', 'xls.time'])
  assert.equal(sheets[1].rows.length, 3) // سرستون + دو پروژه‌ی فعال در این ماه
  assert.equal(sheets[2].rows[1][0], '1405/09/04')
  assert.equal(sheets[2].rows[1][3], 1_000_000)
  const all = exportSheets(scenario(), 'all', TODAY, { t: (k) => k, serviceName: (s) => s })
  assert.equal(all[0].rows.slice(1).reduce((s, r) => s + r[1], 0), 1_500_000)
  for (const sheet of all) for (const row of sheet.rows) assert.equal(row.length, sheet.rows[0].length)
})
