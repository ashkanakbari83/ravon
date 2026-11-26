import assert from 'node:assert/strict'
import { test } from 'node:test'
import { extractLinks } from '../../src/lib/format.js'
import { deleteClient } from '../../src/lib/domain/clients.js'
import { createProject, suggestAmounts } from '../../src/lib/domain/intake.js'
import { addPayment, removePayment } from '../../src/lib/domain/payments.js'
import { addItem, addProject, deleteProject, groupByDue, nextStep, removeItem, setStatus } from '../../src/lib/domain/projects.js'
import { addTime, startTimer } from '../../src/lib/domain/time.js'
import { removedBetween, restoreItem, restoreRemoved, restoreStatus } from '../../src/lib/domain/undo.js'
import { addDays } from '../../src/lib/jalali.js'
import { apply, cleanSeed, input, makeCtx, TODAY } from './helpers.js'

const ctx = makeCtx()

function full() {
  const created = apply(cleanSeed(), addProject, input, ctx)
  let db = apply(created.db, addPayment, created.id, { amount: 500_000 }, ctx).db
  db = apply(db, addTime, created.id, { minutes: 60 }, ctx).db
  db = apply(db, startTimer, created.id, ctx).db
  return { db, id: created.id }
}

test('برگردوندنِ حذف پروژه: پرداخت، زمان و تایمر هم برمی‌گردن', () => {
  const { db, id } = full()
  const after = apply(db, deleteProject, id).db
  const restored = apply(after, restoreRemoved, removedBetween(db, after)).db
  assert.deepEqual(restored.projects, db.projects)
  assert.deepEqual(restored.payments, db.payments)
  assert.deepEqual(restored.timeEntries, db.timeEntries)
  assert.deepEqual(restored.timer, db.timer)
})

test('برگردوندن تغییرهای بعدی رو پاک نمی‌کنه و تکرارش بی‌اثره', () => {
  const { db, id } = full()
  const after = apply(db, deleteProject, id).db
  const removed = removedBetween(db, after)
  const later = apply(after, addProject, { ...input, title: 'بعدی' }, ctx).db
  const restored = apply(later, restoreRemoved, removed).db
  assert.equal(restored.projects.length, 2)
  assert.deepEqual(apply(restored, restoreRemoved, removed).db.payments, restored.payments)
})

test('برگردوندن پرداخت وقتی بیش‌دریافت می‌سازه رد می‌شه', () => {
  const { db, id } = full()
  const after = apply(db, removePayment, db.payments[0].id).db
  const paidAgain = apply(after, addPayment, id, { amount: input.amount }, ctx).db
  assert.deepEqual(restoreRemoved(paidAgain, removedBetween(db, after)), { ok: false, error: 'err.paymentExceeds' })
})

test('برگردوندن کارفرمای حذف‌شده', () => {
  const created = apply(cleanSeed(), addProject, input, ctx)
  const db = apply(created.db, deleteProject, created.id).db
  const after = apply(db, deleteClient, db.clients[0].id).db
  assert.deepEqual(apply(after, restoreRemoved, removedBetween(db, after)).db.clients, db.clients)
})

test('برگردوندن وضعیت و خروجی', () => {
  const created = apply(cleanSeed(), addProject, input, ctx)
  const done = apply(created.db, setStatus, created.id, 'delivered', ctx).db
  const back = apply(done, restoreStatus, created.id, { status: 'active', deliveredOn: null }).db
  assert.deepEqual(back.projects, created.db.projects)

  let db = apply(created.db, addItem, created.id, 'یک', ctx).db
  db = apply(db, addItem, created.id, 'دو', ctx).db
  const [first] = db.projects[0].items
  const after = apply(db, removeItem, created.id, first.id).db
  assert.deepEqual(apply(after, restoreItem, created.id, first, 0).db.projects, db.projects)
})

test('ثبت با بیعانه: هر دو با هم، یا هیچ‌کدوم', () => {
  const ok = apply(cleanSeed(), createProject, { ...input, deposit: 500_000 }, ctx)
  assert.deepEqual(ok.db.payments.map((p) => [p.projectId, p.amount]), [[ok.id, 500_000]])
  assert.equal(createProject(cleanSeed(), { ...input, deposit: input.amount + 1 }, ctx).error, 'err.depositExceeds')
  assert.equal(apply(cleanSeed(), createProject, { ...input, deposit: null }, ctx).db.payments.length, 0)
  assert.equal(createProject(cleanSeed(), { ...input, title: ' ' }, ctx).error, 'err.title')
})

test('مبلغ پیشنهادی: همین خدمت، سابقه‌ی همین کارفرما اول، بدون تکرار و صفر', () => {
  let db = cleanSeed()
  const add = (clientName, amount, time, service = 'reels') => {
    db = apply(db, addProject, { ...input, clientName, amount, service }, makeCtx(TODAY, time)).db
  }
  add('الف', 100, '08:00:00')
  add('ب', 200, '09:00:00')
  add('ب', 200, '10:00:00')
  add('ج', 0, '11:00:00')
  add('ج', 300, '12:00:00', 'cover')
  assert.deepEqual(suggestAmounts(db, { service: 'reels', clientName: '' }), [200, 100])
  assert.deepEqual(suggestAmounts(db, { service: 'reels', clientName: 'الف' }), [100, 200])
  assert.deepEqual(suggestAmounts(db, { service: '', clientName: 'الف' }), [])
})

test('قدم بعدی هر وضعیت', () => {
  const next = (status) => nextStep({ status })?.status ?? null
  assert.deepEqual(['queued', 'active', 'review', 'delivered', 'cancelled'].map(next), ['active', 'delivered', 'delivered', null, 'active'])
})

test('گروه‌بندی بر اساس فوریت؛ گروه خالی حذف می‌شه', () => {
  const row = (offset) => ({ project: { status: 'active', dueDate: offset == null ? null : addDays(TODAY, offset) } })
  const groups = groupByDue([row(-2), row(0), row(3), row(30), row(null)], TODAY)
  assert.deepEqual(groups.map((g) => [g.key, g.rows.length]), [['overdue', 1], ['week', 2], ['later', 1], ['none', 1]])
  assert.deepEqual(groupByDue([row(1)], TODAY).map((g) => g.key), ['week'])
})

test('لینک‌های یادداشت', () => {
  assert.deepEqual(extractLinks('فایل: https://drive.google.com/x?a=1، نمونه (http://a.ir/y). باز هم https://drive.google.com/x?a=1'), ['https://drive.google.com/x?a=1', 'http://a.ir/y'])
  assert.deepEqual(extractLinks('javascript:alert(1) و ftp://x'), [])
})
