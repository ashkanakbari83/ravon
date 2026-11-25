import assert from 'node:assert/strict'
import { test } from 'node:test'
import { compactNumber, formatClock, formatDate, formatNumber, parseAmount, toEnDigits } from '../../src/lib/format.js'

test('ورودی مبلغ: فارسی، عربی، لاتین و جداکننده', () => {
  assert.equal(parseAmount('۲٬۵۰۰٬۰۰۰'), 2500000)
  assert.equal(parseAmount('٢٥٠٠'), 2500)
  assert.equal(parseAmount('1,200,000'), 1200000)
  assert.equal(parseAmount('۰'), 0)
  for (const bad of ['', 'abc', '-5', '1.5', '1'.repeat(16)]) assert.equal(parseAmount(bad), null, bad)
  assert.equal(toEnDigits('۱۴۰۵'), '1405')
})

test('عدد، خلاصه‌ی پول و ساعت فارسی', () => {
  assert.equal(formatNumber(1234567), '۱٬۲۳۴٬۵۶۷')
  assert.equal(compactNumber(850_000), '۸۵۰ هزار')
  assert.equal(compactNumber(2_450_000), '۲٫۴۵ میلیون')
  assert.equal(compactNumber(106_900_000), '۱۰۷ میلیون')
  assert.equal(compactNumber(999_999), '۱ میلیون')
  assert.equal(compactNumber(1_500_000_000), '۱٫۵ میلیارد')
  assert.equal(compactNumber(0), '۰')
  assert.equal(compactNumber(2_000_000, 'en'), '2 M')
  assert.equal(formatClock(577), '۹:۳۷')
})

test('تاریخ شمسی؛ سال فقط وقتی فرق داره', () => {
  assert.equal(formatDate('2026-11-25', { today: '2026-11-25' }), '۴ آذر')
  assert.equal(formatDate('2025-11-25', { today: '2026-11-25' }), '۴ آذر ۱۴۰۴')
})
