// تبدیل میلادی ↔ شمسی (الگوریتم jalaali) و ابزار تاریخ. تاریخ‌ها همیشه رشته‌ی 'YYYY-MM-DD' محلی‌ان.
const BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178]
const div = (a, b) => ~~(a / b)
const mod = (a, b) => a - ~~(a / b) * b

function jalCal(jy) {
  const gy = jy + 621
  let leapJ = -14
  let jp = BREAKS[0]
  let jump = 0
  for (let i = 1; i < BREAKS.length; i += 1) {
    const jm = BREAKS[i]
    jump = jm - jp
    if (jy < jm) break
    leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4)
    jp = jm
  }
  let n = jy - jp
  leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4)
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150
  const march = 20 + leapJ - leapG
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33
  let leap = mod(mod(n + 1, 33) - 1, 4)
  if (leap === -1) leap = 4
  return { leap, gy, march }
}

function g2d(gy, gm, gd) {
  const d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408
  return d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752
}

function d2g(jdn) {
  let j = 4 * jdn + 139361631
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908
  const i = div(mod(j, 1461), 4) * 5 + 308
  const gd = div(mod(i, 153), 5) + 1
  const gm = mod(div(i, 153), 12) + 1
  return { gy: div(j, 1461) - 100100 + div(8 - gm, 6), gm, gd }
}

const pad = (n) => String(n).padStart(2, '0')

export const isJalaliLeap = (jy) => jalCal(jy).leap === 0
export const jalaliMonthLength = (jy, jm) => (jm <= 6 ? 31 : jm <= 11 ? 30 : isJalaliLeap(jy) ? 30 : 29)

export function isoToJalali(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const jdn = g2d(y, m, d)
  let jy = d2g(jdn).gy - 621
  const r = jalCal(jy)
  let k = jdn - g2d(r.gy, 3, r.march)
  if (k >= 0) {
    if (k <= 185) return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 }
    k -= 186
  } else {
    jy -= 1
    k += 179
    if (r.leap === 1) k += 1
  }
  return { jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 }
}

export function jalaliToIso(jy, jm, jd) {
  const r = jalCal(jy)
  const { gy, gm, gd } = d2g(g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1)
  return `${gy}-${pad(gm)}-${pad(gd)}`
}

const DAY = 86400000
export const dayNumber = (iso) => Date.parse(`${iso}T00:00:00Z`) / DAY
export const diffDays = (from, to) => Math.round(dayNumber(to) - dayNumber(from))
export const addDays = (iso, n) => new Date((dayNumber(iso) + n) * DAY).toISOString().slice(0, 10)
export const isIsoDate = (v) =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(dayNumber(v)) && addDays(v, 0) === v
/** تاریخ محلی دستگاه */
export const toIsoDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
/** ۰ = شنبه */
export const weekdayIndex = (iso) => (new Date(`${iso}T00:00:00Z`).getUTCDay() + 1) % 7

export const monthKey = (iso) => {
  const { jy, jm } = isoToJalali(iso)
  return `${jy}-${pad(jm)}`
}
export function shiftJalaliMonth(jy, jm, delta) {
  const index = jy * 12 + (jm - 1) + delta
  return { jy: Math.floor(index / 12), jm: (index % 12) + 1 }
}
