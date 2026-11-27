import { toEnDigits } from '../format.js'

const dialable = (phone) => toEnDigits(String(phone || '')).replace(/[^\d+]/g, '')

/** شماره‌ی بین‌المللی بدون + (برای واتساپ)؛ اگه کشورش معلوم نیست، null */
export function intlPhone(phone) {
  const raw = dialable(phone)
  if (/^\+\d{8,15}$/.test(raw)) return raw.slice(1)
  if (/^00\d{8,15}$/.test(raw)) return raw.slice(2)
  if (/^09\d{9}$/.test(raw)) return `98${raw.slice(1)}`
  if (/^989\d{9}$/.test(raw)) return raw
  return null
}

/** آیدیِ تنها (@x) معلوم نیست مال کدوم برنامه‌ست، پس فقط لینک واقعی باز می‌شه */
function webLink(handle) {
  const value = String(handle || '').trim()
  if (/^https?:\/\/\S+$/i.test(value)) return value
  if (/^(www\.|t\.me\/|instagram\.com\/|wa\.me\/)\S+$/i.test(value)) return `https://${value}`
  return null
}

export function contactLinks({ phone, handle } = {}, text = '') {
  const raw = dialable(phone)
  const intl = intlPhone(phone)
  const body = text ? encodeURIComponent(text) : ''
  return {
    tel: raw.length >= 3 ? `tel:${raw}` : null,
    // «?&» هم روی اندروید کار می‌کنه هم iOS
    sms: intl ? `sms:+${intl}${body ? `?&body=${body}` : ''}` : null,
    whatsapp: intl ? `https://wa.me/${intl}${body ? `?text=${body}` : ''}` : null,
    web: webLink(handle),
  }
}
