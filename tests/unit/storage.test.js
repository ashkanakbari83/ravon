import assert from 'node:assert/strict'
import { test } from 'node:test'
import { markBackup, needsBackup, parseBackup, serializeBackup, snoozeBackup } from '../../src/lib/domain/backup.js'
import { addProject } from '../../src/lib/domain/projects.js'
import { emptyState, withDefaults } from '../../src/lib/domain/state.js'
import { CORRUPT_KEY, createGateway, STORAGE_KEY } from '../../src/lib/gateway.js'
import { apply, cleanSeed, input, makeCtx, TODAY } from './helpers.js'

const memory = (initial = {}) => {
  const map = new Map(Object.entries(initial))
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, v) }
}
const one = () => apply(cleanSeed(), addProject, input, makeCtx()).db

test('withDefaults: ورودی خراب امن می‌شه و رکورد یتیم حذف', () => {
  assert.deepEqual(withDefaults('x'), emptyState())
  const db = withDefaults({
    clients: [{ id: 'c1', name: 'الف' }, null, { name: 'بی‌شناسه' }],
    projects: [
      { id: 'p1', clientId: 'c1', title: 'ت', amount: -5, status: 'weird', revisions: 'x', dueDate: 'bad' },
      { id: 'p2', clientId: 'missing' },
    ],
    payments: [{ id: 'a', projectId: 'p2', amount: 5, date: TODAY }, { id: 'b', projectId: 'p1', amount: -1, date: TODAY }],
    timeEntries: [{ id: 't', projectId: 'p1', minutes: 30, date: 'nope' }],
    timer: { projectId: 'p2', startedAt: 'x' },
    settings: { theme: 'neon', currency: 'btc' },
  })
  assert.equal(db.clients.length, 1)
  assert.equal(db.projects.length, 1)
  assert.deepEqual([db.projects[0].amount, db.projects[0].status, db.projects[0].revisions, db.projects[0].dueDate], [0, 'active', 0, null])
  assert.deepEqual([db.payments, db.timeEntries, db.timer, db.settings.theme, db.settings.currency], [[], [], null, 'system', 'toman'])
})

test('withDefaults داده‌ی سالم رو عوض نمی‌کنه', () => {
  const db = one()
  assert.deepEqual(withDefaults(JSON.parse(JSON.stringify(db))), db)
})

test('gateway: ذخیره و خواندن', () => {
  const storage = memory()
  const gateway = createGateway(storage)
  assert.equal(gateway.load().error, null)
  const db = one()
  assert.equal(gateway.save(db), true)
  assert.deepEqual(gateway.load().db, db)
})

test('gateway: داده‌ی خراب کنار گذاشته می‌شه، نسخه‌ی جدیدتر دست نمی‌خوره', () => {
  const broken = memory({ [STORAGE_KEY]: '{oops' })
  assert.equal(createGateway(broken).load().error, 'corrupt')
  assert.equal(broken.map.get(CORRUPT_KEY), '{oops')
  const newer = memory({ [STORAGE_KEY]: JSON.stringify({ ...one(), version: 99 }) })
  assert.equal(createGateway(newer).load().error, 'newer')
})

test('gateway: حافظه‌ی پر یا مسدود', () => {
  const full = createGateway({ getItem: () => null, setItem: () => { throw new Error('quota') } })
  assert.equal(full.save(one()), false)
  const blocked = createGateway({ getItem: () => { throw new Error('denied') }, setItem() {} })
  assert.equal(blocked.load().error, 'blocked')
})

test('پشتیبان: رفت‌وبرگشت و فایل نامعتبر', () => {
  const db = one()
  assert.deepEqual(apply(serializeBackup(db, makeCtx()), parseBackup).db, db)
  assert.equal(parseBackup('nope').error, 'err.backupInvalid')
  assert.equal(parseBackup('{"app":"other","data":{}}').error, 'err.backupInvalid')
  assert.equal(parseBackup(JSON.stringify({ app: 'ravon', version: 9, data: db })).error, 'err.backupNewer')
})

test('یادآوری پشتیبان از تاریخ محاسبه می‌شه', () => {
  assert.equal(needsBackup(cleanSeed(), TODAY), false)
  const db = one()
  assert.equal(needsBackup(db, TODAY), false)
  assert.equal(needsBackup(db, '2026-12-02'), true)
  const saved = apply(db, markBackup, makeCtx('2026-12-02')).db
  assert.equal(needsBackup(saved, '2026-12-15'), false)
  assert.equal(needsBackup(saved, '2026-12-16'), true)
  const snoozed = apply(db, snoozeBackup, makeCtx('2026-12-02')).db
  assert.equal(needsBackup(snoozed, '2026-12-03'), false)
  const demo = { ...db, projects: db.projects.map((p) => ({ ...p, demo: true })) }
  assert.equal(needsBackup(demo, '2027-01-01'), false)
})
