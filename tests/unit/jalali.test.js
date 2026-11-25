import assert from 'node:assert/strict'
import { test } from 'node:test'
import { addDays, diffDays, isIsoDate, isJalaliLeap, isoToJalali, jalaliMonthLength, jalaliToIso, shiftJalaliMonth, weekdayIndex } from '../../src/lib/jalali.js'

const intl = new Intl.DateTimeFormat('en-US-u-ca-persian', { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC' })

test('تبدیل با تقویم Intl برای هر روز ۲۰۱۵ تا ۲۰۴۰ یکیه و رفت‌وبرگشت درسته', () => {
  for (let iso = '2015-01-01'; iso < '2040-01-01'; iso = addDays(iso, 1)) {
    const parts = Object.fromEntries(intl.formatToParts(new Date(`${iso}T00:00:00Z`)).map((p) => [p.type, p.value]))
    const j = isoToJalali(iso)
    assert.deepEqual([j.jy, j.jm, j.jd], [Number(parts.year), Number(parts.month), Number(parts.day)], iso)
    assert.equal(jalaliToIso(j.jy, j.jm, j.jd), iso)
  }
})

test('نوروز، کبیسه و طول ماه', () => {
  assert.equal(jalaliToIso(1405, 1, 1), '2026-03-21')
  assert.equal(isJalaliLeap(1403), true)
  assert.equal(isJalaliLeap(1404), false)
  assert.equal(jalaliMonthLength(1403, 12), 30)
  assert.equal(jalaliMonthLength(1404, 12), 29)
  assert.equal(jalaliMonthLength(1405, 6), 31)
})

test('ابزارهای تاریخ', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01')
  assert.equal(diffDays('2026-11-25', '2026-11-20'), -5)
  assert.equal(isIsoDate('2026-02-30'), false)
  assert.equal(isIsoDate('2026-02-28'), true)
  assert.equal(weekdayIndex('2026-11-28'), 0) // شنبه
  assert.deepEqual(shiftJalaliMonth(1405, 1, -1), { jy: 1404, jm: 12 })
  assert.deepEqual(shiftJalaliMonth(1405, 12, 1), { jy: 1406, jm: 1 })
})
