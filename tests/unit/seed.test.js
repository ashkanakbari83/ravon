import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildSeed, SEED_RELEASE } from '../../src/data/seed.js'
import { applySeedRelease, loadDemo, removeDemo } from '../../src/lib/domain/demo.js'
import { addPayment } from '../../src/lib/domain/payments.js'
import { addProject, deleteProject, duplicateProject } from '../../src/lib/domain/projects.js'
import { withDefaults } from '../../src/lib/domain/state.js'
import { dashboardStats } from '../../src/lib/domain/stats.js'
import { apply, cleanSeed, input, makeCtx, TODAY } from './helpers.js'

const KEYS = ['clients', 'projects', 'payments', 'timeEntries']
const real = (db) => Object.fromEntries(KEYS.map((k) => [k, db[k].filter((x) => !x.demo)]))

for (const level of ['light', 'busy']) {
  test(`نمونه‌ی ${level}: قطعی، علامت‌دار و معتبر`, () => {
    const seed = buildSeed(level, TODAY)
    assert.deepEqual(seed, buildSeed(level, TODAY))
    for (const key of KEYS) {
      assert.ok(seed[key].length > 0)
      assert.equal(new Set(seed[key].map((x) => x.id)).size, seed[key].length)
      assert.ok(seed[key].every((x) => x.demo && x.id.startsWith('demo-') && x.release >= 1 && x.release <= SEED_RELEASE))
    }
    for (const p of seed.projects) {
      const paid = seed.payments.filter((x) => x.projectId === p.id).reduce((s, x) => s + x.amount, 0)
      assert.ok(paid <= p.amount, `${p.id} بیش‌دریافت`)
      assert.ok(p.createdOn < TODAY && (!p.deliveredOn || (p.deliveredOn >= p.createdOn && p.deliveredOn <= TODAY)), p.id)
    }
    for (const x of [...seed.payments, ...seed.timeEntries]) assert.ok(x.date <= TODAY, x.id)
    // هیچ رکوردی توی نرمال‌سازی نمی‌افته
    const db = apply(cleanSeed(), loadDemo, level, makeCtx()).db
    const normal = withDefaults(JSON.parse(JSON.stringify(db)))
    for (const key of KEYS) assert.equal(normal[key].length, seed[key].length, key)
  })
}

test('نمونه‌ی شلوغ همه‌ی صفحه‌ها رو پر می‌کنه', () => {
  const db = apply(cleanSeed(), loadDemo, 'busy', makeCtx()).db
  const s = dashboardStats(db, TODAY)
  assert.ok(db.projects.length >= 100 && db.clients.length >= 20)
  assert.ok(s.activeCount >= 8 && s.overdue.length >= 1 && s.awaiting.length >= 3 && s.monthReceived > 0)
  assert.ok(db.projects.some((p) => p.archived) && db.projects.some((p) => p.items.length))
})

test('پاک‌کردن نمونه به داده‌ی واقعی دست نمی‌زنه', () => {
  const ctx = makeCtx()
  let db = apply(cleanSeed(), addProject, input, ctx).db
  const mine = real(db)
  db = apply(db, loadDemo, 'busy', ctx).db
  db = apply(db, loadDemo, 'light', ctx).db
  assert.equal(db.projects.length, buildSeed('light', TODAY).projects.length + 1, 'نمونه‌ی قبلی جایگزین می‌شه')
  db = apply(db, removeDemo).db
  assert.deepEqual(real(db), mine)
  assert.equal(db.projects.length, 1)
  assert.equal(db.meta.demo, null)
})

test('نمونه‌ای که کاربر بهش دست زده می‌مونه', () => {
  const ctx = makeCtx()
  let db = apply(cleanSeed(), loadDemo, 'light', ctx).db
  const open = db.projects.find((p) => p.status === 'active')
  db = apply(db, addPayment, open.id, { amount: 1000 }, ctx).db
  const copy = apply(db, duplicateProject, db.projects[0].id, ctx)
  db = apply(copy.db, removeDemo).db
  assert.deepEqual(db.projects.map((p) => p.id).sort(), [open.id, copy.id].sort())
  assert.ok(db.projects.every((p) => !p.demo) && db.clients.every((c) => !c.demo) && db.payments.every((x) => !x.demo))
  assert.ok(db.projects.every((p) => db.clients.some((c) => c.id === p.clientId)))
})

test('داده‌ی نمونه‌ی تازه فقط یک‌بار و با id اضافه می‌شه', () => {
  let db = apply(cleanSeed(), loadDemo, 'light', makeCtx()).db
  db = apply(db, deleteProject, 'demo-p-1').db
  db.projects[0] = { ...db.projects[0], title: 'عوضش کردم' }
  const build = (level, anchor) => {
    const seed = buildSeed(level, anchor)
    seed.projects.push({ ...seed.projects[1], id: 'demo-p-new', release: 2 })
    return seed
  }
  const next = applySeedRelease(db, 2, build)
  assert.equal(next.projects.length, db.projects.length + 1)
  assert.equal(next.projects[0].title, 'عوضش کردم')
  assert.ok(!next.projects.some((p) => p.id === 'demo-p-1'), 'حذف‌شده زنده نمی‌شه')
  assert.equal(next.meta.seedRelease, 2)
  assert.equal(applySeedRelease(next, 2, build), next)
  assert.equal(applySeedRelease(cleanSeed(), 2, build).projects.length, 0, 'بدون نمونه، چیزی اضافه نمی‌شه')
})
