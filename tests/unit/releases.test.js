import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { LATEST_RELEASE, RELEASES } from '../../src/data/releases.js'
import { messages } from '../../src/i18n/index.js'
import { parseBackup, serializeBackup } from '../../src/lib/domain/backup.js'
import { markReleasesSeen, unseenReleases } from '../../src/lib/domain/releases.js'
import { withDefaults } from '../../src/lib/domain/state.js'
import { apply, cleanSeed, makeCtx } from './helpers.js'

test('هر نسخه یه مورد «تازه‌ها» داره و متن‌هاش هست', () => {
  const { version } = JSON.parse(readFileSync('package.json', 'utf8'))
  assert.equal(RELEASES[0].version, version, 'برای این نسخه مورد تازه به releases.js اضافه کن')
  assert.deepEqual(RELEASES.map((r) => r.id), RELEASES.map((_, i) => LATEST_RELEASE - i))
  for (const r of RELEASES) for (const key of r.items) assert.ok(messages[key], key)
})

const releases = [{ id: 5 }, { id: 4 }, { id: 3 }]
const ids = (seen) => {
  const db = cleanSeed()
  db.meta.seenRelease = seen
  return unseenReleases(db, releases).map((r) => r.id)
}

test('فقط ندیده‌ها؛ کاربر قدیمی بدون سابقه فقط آخری', () => {
  assert.deepEqual(ids(3), [5, 4])
  assert.deepEqual(ids(5), [])
  assert.deepEqual(ids(0), [5])
})

test('دیده‌شده عقب برنمی‌گرده و ذخیره‌ی قدیمی از صفر شروع می‌شه', () => {
  const db = apply(cleanSeed(), markReleasesSeen, 3).db
  assert.equal(apply(db, markReleasesSeen, 1).db.meta.seenRelease, 3)
  const old = cleanSeed()
  delete old.meta.seenRelease
  assert.equal(withDefaults(old).meta.seenRelease, 0)
  assert.equal(parseBackup(serializeBackup(db, makeCtx())).db.meta.seenRelease, 3)
})

test('رنگ برنامه‌ی ناشناخته به پیش‌فرض برمی‌گرده', () => {
  const db = cleanSeed()
  db.settings.accent = 'neon'
  assert.equal(withDefaults(db).settings.accent, 'indigo')
})
