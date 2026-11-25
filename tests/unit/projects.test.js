import assert from 'node:assert/strict'
import { test } from 'node:test'
import { addClient, clientsByRecency, deleteClient, updateClient } from '../../src/lib/domain/clients.js'
import { addPayment, paymentState, removePayment } from '../../src/lib/domain/payments.js'
import { addItem, addProject, changeRevisions, deleteProject, dueInfo, duplicateProject, matchesFilter, searchRows, setArchived, setItemStatus, setStatus, sortRows, updateProject } from '../../src/lib/domain/projects.js'
import { projectRows } from '../../src/lib/domain/stats.js'
import { addTime, startTimer } from '../../src/lib/domain/time.js'
import { apply, cleanSeed, input, makeCtx, TODAY } from './helpers.js'

const withProject = (extra = {}) => {
  const ctx = makeCtx()
  const { db, id } = apply(cleanSeed(), addProject, { ...input, ...extra }, ctx)
  return { db, id, ctx }
}
const project = (db, id) => db.projects.find((p) => p.id === id)

test('ثبت سریع با چهار فیلد، کارفرمای جدید هم می‌سازه', () => {
  const { db, id } = withProject()
  assert.equal(db.clients.length, 1)
  assert.deepEqual(
    [project(db, id).status, project(db, id).dueDate, project(db, id).items.length, project(db, id).createdOn],
    ['active', null, 0, TODAY],
  )
})

test('اسم تکراری (حتی با ی/ک عربی و فاصله‌ی اضافه) کارفرمای دوم نمی‌سازه', () => {
  const { db, ctx } = withProject({ clientName: 'علی کریمی' })
  const next = apply(db, addProject, { ...input, clientName: '  علي  كريمي ' }, ctx).db
  assert.equal(next.clients.length, 1)
  assert.equal(next.projects.length, 2)
})

test('خطاهای ثبت، بدون تغییر داده', () => {
  const db = cleanSeed()
  const cases = [
    [{ title: '  ' }, 'err.title'],
    [{ clientName: '' }, 'err.client'],
    [{ clientId: 'nope' }, 'err.client'],
    [{ service: '' }, 'err.service'],
    [{ amount: null }, 'err.amount'],
    [{ amount: -1 }, 'err.amount'],
    [{ amount: 1.5 }, 'err.amount'],
    [{ dueDate: '1405-01-01x' }, 'err.date'],
  ]
  for (const [patch, error] of cases) assert.deepEqual(addProject(db, { ...input, ...patch }, makeCtx()), { ok: false, error })
  assert.equal(db.clients.length, 0)
  assert.equal(addProject(db, { ...input, amount: 0 }, makeCtx()).ok, true, 'کار رایگان مجازه')
})

test('وضعیت اجرایی و مالی مستقل‌ان؛ تاریخ تحویل خودکاره', () => {
  const { db, id, ctx } = withProject()
  let next = apply(db, setStatus, id, 'delivered', ctx).db
  assert.equal(project(next, id).deliveredOn, TODAY)
  assert.equal(projectRows(next)[0].payState, 'unpaid')
  next = apply(next, setStatus, id, 'delivered', makeCtx('2026-12-01')).db
  assert.equal(project(next, id).deliveredOn, TODAY, 'تاریخ تحویل اول می‌مونه')
  next = apply(next, setStatus, id, 'review', ctx).db
  assert.equal(project(next, id).deliveredOn, null)
  assert.equal(setStatus(next, id, 'done', ctx).error, 'err.status')
})

test('چند پرداخت، مانده‌ی خودکار و جلوگیری از اضافه‌دریافت', () => {
  const { db, id, ctx } = withProject()
  let next = apply(db, addPayment, id, { amount: 500_000 }, ctx).db
  assert.deepEqual([projectRows(next)[0].balance, projectRows(next)[0].payState], [1_500_000, 'partial'])
  assert.equal(addPayment(next, id, { amount: 1_500_001 }, ctx).error, 'err.paymentExceeds')
  assert.equal(addPayment(next, id, { amount: 0 }, ctx).error, 'err.paymentAmount')
  assert.equal(addPayment(next, id, { amount: 1, date: '2026-11-26' }, ctx).error, 'err.futureDate')
  assert.equal(updateProject(next, id, { amount: 400_000 }).error, 'err.amountBelowPaid')
  const paid = apply(next, addPayment, id, { amount: 1_500_000 }, ctx)
  assert.equal(projectRows(paid.db)[0].payState, 'paid')
  next = apply(paid.db, removePayment, paid.id).db
  assert.equal(projectRows(next)[0].balance, 1_500_000)
  assert.equal(paymentState({ status: 'active', amount: 0 }, 0), 'free')
})

test('پروژه‌ی لغوشده طلب نداره و فقط پول دریافتی حساب می‌شه', () => {
  const { db, id, ctx } = withProject()
  let next = apply(db, addPayment, id, { amount: 300_000 }, ctx).db
  next = apply(next, setStatus, id, 'cancelled', ctx).db
  const [row] = projectRows(next)
  assert.deepEqual([row.balance, row.agreed, row.paid], [0, 300_000, 300_000])
})

test('ساخت مشابه: مشخصات کپی می‌شه، پول و زمان و ددلاین نه', () => {
  const { db, id, ctx } = withProject({ dueDate: '2026-12-01', note: 'یادداشت' })
  let next = apply(db, addItem, id, 'ویدیوی ۱', ctx).db
  next = apply(next, setItemStatus, id, project(next, id).items[0].id, 'done').db
  next = apply(next, changeRevisions, id, 2).db
  next = apply(next, addPayment, id, { amount: 1000 }, ctx).db
  next = apply(next, addTime, id, { minutes: 30 }, ctx).db
  next.projects[0].demo = true
  const copy = apply(next, duplicateProject, id, makeCtx('2026-12-10'))
  const p = project(copy.db, copy.id)
  assert.notEqual(p.id, id)
  assert.deepEqual([p.title, p.amount, p.note, p.dueDate, p.revisions, p.status, p.demo], [input.title, input.amount, 'یادداشت', null, 0, 'active', undefined])
  assert.deepEqual(p.items.map((i) => i.status), ['todo'])
  assert.notEqual(p.items[0].id, project(next, id).items[0].id)
  assert.equal(projectRows(copy.db).find((r) => r.project.id === copy.id).paid, 0)
})

test('حذف پروژه پرداخت، زمان و تایمرش رو هم می‌بره', () => {
  const { db, id, ctx } = withProject()
  let next = apply(db, addPayment, id, { amount: 1000 }, ctx).db
  next = apply(next, addTime, id, { minutes: 30 }, ctx).db
  next = apply(next, startTimer, id, ctx).db
  next = apply(next, deleteProject, id).db
  assert.deepEqual([next.projects, next.payments, next.timeEntries, next.timer], [[], [], [], null])
})

test('شمارنده‌ی اصلاحات زیر صفر نمی‌ره', () => {
  const { db, id } = withProject()
  assert.equal(project(apply(db, changeRevisions, id, -1).db, id).revisions, 0)
})

test('ددلاین از تاریخ محاسبه می‌شه', () => {
  const p = (dueDate, status = 'active', deliveredOn = null) => ({ dueDate, status, deliveredOn })
  assert.deepEqual(dueInfo(p('2026-11-22'), TODAY), { state: 'overdue', days: 3 })
  assert.equal(dueInfo(p(TODAY), TODAY).state, 'today')
  assert.deepEqual(dueInfo(p('2026-12-02'), TODAY), { state: 'soon', days: 7 })
  assert.equal(dueInfo(p('2026-12-03'), TODAY).state, 'later')
  assert.equal(dueInfo(p(null), TODAY).state, 'none')
  assert.equal(dueInfo(p('2026-11-01', 'delivered', '2026-11-01'), TODAY).state, 'delivered')
  assert.deepEqual(dueInfo(p('2026-11-01', 'delivered', '2026-11-04'), TODAY), { state: 'deliveredLate', days: 3 })
  assert.equal(dueInfo(p('2026-11-01', 'cancelled'), TODAY).state, 'none')
})

test('فیلتر، جست‌وجو و مرتب‌سازی', () => {
  const ctx = makeCtx()
  let db = apply(cleanSeed(), addProject, { ...input, title: 'دیر', dueDate: '2026-12-09' }, ctx).db
  db = apply(db, addProject, { ...input, title: 'زود', clientName: 'استودیو', dueDate: '2026-11-26' }, ctx).db
  const done = apply(db, addProject, { ...input, title: 'تحویلی', status: 'delivered' }, ctx)
  db = done.db
  const titles = (filter) => sortRows(projectRows(db).filter((r) => matchesFilter(r, filter))).map((r) => r.project.title)
  assert.deepEqual(titles('open'), ['زود', 'دیر'])
  assert.deepEqual(titles('delivered'), ['تحویلی'])
  db = apply(db, setArchived, done.id, true).db
  assert.deepEqual(titles('all'), ['زود', 'دیر'])
  assert.deepEqual(titles('archived'), ['تحویلی'])
  assert.ok(titles('unsettled').includes('تحویلی'), 'طلب آرشیوشده گم نمی‌شه')
  assert.deepEqual(searchRows(projectRows(db), 'استوديو').map((r) => r.project.title), ['زود'])
  assert.equal(searchRows(projectRows(db), 'Reels', () => 'reels').length, 3)
})

test('کارفرما: یکتا، ویرایش، و حذف فقط وقتی پروژه نداره', () => {
  const { db, ctx } = withProject()
  const added = apply(db, addClient, { name: 'تازه' }, makeCtx('2026-12-01'))
  assert.equal(addClient(added.db, { name: 'تازه' }, ctx).error, 'err.clientExists')
  assert.equal(updateClient(added.db, added.id, { name: input.clientName }).error, 'err.clientExists')
  assert.equal(updateClient(added.db, added.id, { name: '' }).error, 'err.clientName')
  assert.equal(clientsByRecency(added.db)[0].id, added.id)
  assert.equal(deleteClient(added.db, db.clients[0].id).error, 'err.clientHasProjects')
  assert.equal(apply(added.db, deleteClient, added.id).db.clients.length, 1)
})
