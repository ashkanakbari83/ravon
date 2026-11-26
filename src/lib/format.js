// قالب‌بندی عدد، پول، زمان و تاریخ. همه تابع خالص و وابسته به locale.
import { isoToJalali, weekdayIndex } from './jalali.js'

const FA = '۰۱۲۳۴۵۶۷۸۹'
const AR = '٠١٢٣٤٥٦٧٨٩'

export const toEnDigits = (v) =>
  String(v ?? '').replace(/[۰-۹٠-٩]/g, (c) => String(FA.indexOf(c) >= 0 ? FA.indexOf(c) : AR.indexOf(c)))
export const localizeDigits = (v, locale = 'fa') =>
  locale === 'fa' ? String(v).replace(/\d/g, (d) => FA[Number(d)]) : String(v)

const formatters = new Map()
export function formatNumber(n, locale = 'fa', maxDecimals = 0) {
  const key = `${locale}:${maxDecimals}`
  if (!formatters.has(key)) {
    formatters.set(key, new Intl.NumberFormat(locale === 'fa' ? 'fa-IR' : 'en-US', { maximumFractionDigits: maxDecimals }))
  }
  return formatters.get(key).format(n)
}

/** ورودی کاربر (فارسی، عربی یا لاتین، با جداکننده) → عدد صحیح یا null */
export function parseAmount(text) {
  const digits = toEnDigits(text).replace(/[,٬،\s_]/g, '')
  if (!/^\d{1,15}$/.test(digits)) return null
  return Number(digits)
}

/** لینک‌های http(s) داخل یادداشت */
export const extractLinks = (text) => [
  ...new Set((String(text).match(/https?:\/\/[^\s<>"'،]+/g) || []).map((u) => u.replace(/[.,;:!?)\]]+$/, ''))),
]

export const CURRENCIES = {
  toman: { fa: 'تومان', en: 'Toman' },
  rial: { fa: 'ریال', en: 'Rial' },
  usd: { fa: 'دلار', en: 'USD' },
}
export const currencyLabel = (currency = 'toman', locale = 'fa') =>
  (CURRENCIES[currency] || CURRENCIES.toman)[locale]

/** { value: '۲٫۵', unit: 'میلیون' } */
export function compactParts(amount, locale = 'fa') {
  const scales =
    locale === 'fa'
      ? [[1e9, 'میلیارد'], [1e6, 'میلیون'], [1e3, 'هزار']]
      : [[1e9, 'B'], [1e6, 'M'], [1e3, 'K']]
  const abs = Math.abs(amount)
  for (let i = 0; i < scales.length; i += 1) {
    const [size, unit] = scales[i]
    // ۹۹۹٬۹۶۰ باید «۱ میلیون» بشه نه «۱٬۰۰۰ هزار»
    if (abs >= size * 0.99995) {
      const decimals = abs / size >= 100 ? 0 : abs / size >= 10 ? 1 : 2
      return { value: formatNumber(amount / size, locale, decimals), unit }
    }
  }
  return { value: formatNumber(amount, locale), unit: '' }
}
export function compactNumber(amount, locale = 'fa') {
  const { value, unit } = compactParts(amount, locale)
  return unit ? `${value} ${unit}` : value
}
export const formatMoney = (amount, currency = 'toman', locale = 'fa') =>
  `${formatNumber(amount, locale)} ${currencyLabel(currency, locale)}`
export const formatMoneyShort = (amount, currency = 'toman', locale = 'fa') =>
  `${compactNumber(amount, locale)} ${currencyLabel(currency, locale)}`

export const MONTHS = {
  fa: ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'],
  en: ['Farvardin', 'Ordibehesht', 'Khordad', 'Tir', 'Mordad', 'Shahrivar', 'Mehr', 'Aban', 'Azar', 'Dey', 'Bahman', 'Esfand'],
}
export const WEEKDAYS = {
  fa: ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'],
  en: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
}

/** «۴ آذر» — سال فقط وقتی با سال مرجع فرق داره */
export function formatDate(iso, { locale = 'fa', today, withYear = false, weekday = false } = {}) {
  const { jy, jm, jd } = isoToJalali(iso)
  const showYear = withYear || (today && isoToJalali(today).jy !== jy)
  const base = `${localizeDigits(jd, locale)} ${MONTHS[locale][jm - 1]}${showYear ? ` ${localizeDigits(jy, locale)}` : ''}`
  return weekday ? `${WEEKDAYS[locale][weekdayIndex(iso)]} ${base}` : base
}

/** دقیقه → «۲:۳۰» */
export function formatClock(minutes, locale = 'fa') {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return localizeDigits(`${h}:${String(m).padStart(2, '0')}`, locale)
}
export const formatHours = (minutes, locale = 'fa') => formatNumber(minutes / 60, locale, 1)
