import assert from 'node:assert/strict'
import { test } from 'node:test'
import { translate } from '../../src/i18n/index.js'
import { parseBackup, serializeBackup } from '../../src/lib/domain/backup.js'
import { contactLinks, intlPhone } from '../../src/lib/domain/contact.js'
import { daysSinceFollowUp, followUpData, followUpText, markFollowedUp } from '../../src/lib/domain/followup.js'
import { addPayment } from '../../src/lib/domain/payments.js'
import { addCharge, addProject, changeRevisions, duplicateProject, extraRevisions, setRevisionLimit, setStatus } from '../../src/lib/domain/projects.js'
import { withDefaults } from '../../src/lib/domain/state.js'
import { projectRows } from '../../src/lib/domain/stats.js'
import { apply, cleanSeed, input, makeCtx, TODAY } from './helpers.js'

const t = (key, vars) => translate('fa', key, vars)
const money = (n) => `${n} تومان`
const find = (db, id) => db.projects.find((p) => p.id === id)

function twoProjects() {
  const ctx = makeCtx()
  const first = apply(cleanSeed(), addProject, { ...input, title: 'تیزر', amount: 3_000_000, status: 'delivered' }, ctx)
  const second = apply(first.db, addProject, { ...input, title: 'ریلز دوم', amount: 1_000_000 }, makeCtx(TODAY, '11:00:00'))
  const db = apply(second.db, addPayment, first.id, { amount: 1_000_000 }, ctx).db
  return { db, ctx, a: first.id, b: second.id, clientId: db.clients[0].id }
}

test('شماره‌ی ایرانی و بین‌المللی درست می‌شه، شماره‌ی نامعلوم حدس زده نمی‌شه', () => {
  assert.equal(intlPhone('۰۹۱۲ ۳۴۵ ۶۷۸۹'), '989123456789')
  assert.equal(intlPhone('+98 912-345-6789'), '989123456789')
  assert.equal(intlPhone('0049 30 1234567'), '49301234567')
  assert.equal(intlPhone('021 8888 7777'), null)
  assert.equal(intlPhone(''), null)
})

test('راه‌های تماس فقط وقتی داده‌اش هست؛ آیدیِ تنها لینک نمی‌شه', () => {
  const links = contactLinks({ phone: '09123456789', handle: '@someone' }, 'سلام')
  assert.equal(links.tel, 'tel:09123456789')
  assert.equal(links.sms, `sms:+989123456789?&body=${encodeURIComponent('سلام')}`)
  assert.equal(links.whatsapp, `https://wa.me/989123456789?text=${encodeURIComponent('سلام')}`)
  assert.equal(links.web, null)
  assert.deepEqual(contactLinks({ handle: 't.me/someone' }), { tel: null, sms: null, whatsapp: null, web: 'https://t.me/someone' })
  assert.equal(contactLinks({ handle: 'javascript:alert(1)' }).web, null)
})

test('پیگیری کارفرما پیش‌فرض فقط تحویل‌شده‌هاست و می‌شه همه رو گرفت', () => {
  const { db, a, b, clientId } = twoProjects()
  const rows = projectRows(db)
  const narrow = followUpData(rows, { clientId })
  assert.deepEqual([narrow.canNarrow, narrow.total, narrow.rows.map((r) => r.project.id)], [true, 2_000_000, [a]])
  const all = followUpData(rows, { clientId, scope: 'all' })
  assert.deepEqual([all.total, all.rows.map((r) => r.project.id)], [3_000_000, [a, b]])
  assert.equal(followUpData(rows, { projectId: b }).total, 1_000_000)
  const settled = apply(db, addPayment, b, { amount: 1_000_000 }, makeCtx()).db
  assert.equal(followUpData(projectRows(settled), { projectId: b }), null)
})

test('متن پیام مبلغ مانده رو داره، نه مبلغ کل', () => {
  const { db, a, clientId } = twoProjects()
  const rows = projectRows(db)
  const one = followUpText(followUpData(rows, { projectId: a }), { t, money })
  assert.match(one, /کافه دُردی/)
  assert.match(one, /«تیزر».*2000000 تومان/)
  const many = followUpText(followUpData(rows, { clientId, scope: 'all' }), { t, money })
  assert.match(many, /• تیزر: 2000000 تومان\n• ریلز دوم: 1000000 تومان\nجمع: 3000000 تومان/)
})

test('کارهای هم‌اسم توی پیام با تاریخ جدا می‌شن', () => {
  const { db, a, clientId } = twoProjects()
  const twin = apply(db, duplicateProject, a, makeCtx(TODAY, '12:00:00')).db
  const text = followUpText(followUpData(projectRows(twin), { clientId, scope: 'all' }), { t, money, date: (d) => d })
  assert.equal(text.split(`• تیزر (${TODAY}):`).length - 1, 2)
  assert.match(text, /• ریلز دوم:/)
})

test('تاریخ پیگیری ثبت می‌شه و کپی پروژه از صفر شروع می‌شه', () => {
  const { db, a, b, ctx } = twoProjects()
  assert.equal(daysSinceFollowUp(find(db, a), TODAY), null)
  const next = apply(db, markFollowedUp, [a], ctx).db
  assert.equal(daysSinceFollowUp(find(next, a), '2026-11-28'), 3)
  assert.equal(find(next, b).followedUpOn, null)
  const copy = apply(next, duplicateProject, a, ctx)
  assert.equal(find(copy.db, copy.id).followedUpOn, null)
  assert.equal(markFollowedUp(db, ['nope'], ctx).ok, false)
})

test('سقف اصلاح: بیشترشدن حساب می‌شه و هزینه‌ی اضافه طلب رو بالا می‌بره', () => {
  const { db, a, ctx } = twoProjects()
  let next = apply(db, setRevisionLimit, a, 1).db
  next = apply(apply(apply(next, changeRevisions, a, 1).db, changeRevisions, a, 1).db, changeRevisions, a, 1).db
  assert.equal(extraRevisions(find(next, a)), 2)
  assert.equal(extraRevisions(find(apply(next, setRevisionLimit, a, null).db, a)), 0)
  const before = projectRows(next).find((r) => r.project.id === a).balance
  const charged = apply(next, addCharge, a, 500_000).db
  assert.equal(find(charged, a).amount, 3_500_000)
  assert.equal(projectRows(charged).find((r) => r.project.id === a).balance, before + 500_000)
  for (const bad of [0, -1, null, 1.5, 999_999_999_999]) assert.equal(addCharge(db, a, bad).ok, false)
  const cancelled = apply(db, setStatus, a, 'cancelled', ctx).db
  assert.equal(addCharge(cancelled, a, 1000).ok, false)
  for (const bad of [-1, 100, 1.5, '2', undefined]) assert.equal(setRevisionLimit(db, a, bad).ok, false)
  const copy = apply(next, duplicateProject, a, ctx)
  assert.deepEqual([find(copy.db, copy.id).revisionLimit, find(copy.db, copy.id).revisions], [1, 0])
})

test('داده‌ی قدیمی بدون این فیلدها سالم می‌مونه و پشتیبان هر دو رو نگه می‌داره', () => {
  const { db, a, ctx } = twoProjects()
  const old = structuredClone(db)
  for (const p of old.projects) {
    delete p.revisionLimit
    delete p.followedUpOn
  }
  assert.deepEqual([withDefaults(old).projects[0].revisionLimit, withDefaults(old).projects[0].followedUpOn], [null, null])
  const next = apply(apply(db, setRevisionLimit, a, 0).db, markFollowedUp, [a], ctx).db
  const restored = parseBackup(serializeBackup(next, ctx)).db
  assert.deepEqual([find(restored, a).revisionLimit, find(restored, a).followedUpOn], [0, TODAY])
})
