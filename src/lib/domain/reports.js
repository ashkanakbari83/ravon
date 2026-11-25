import { isoToJalali, jalaliToIso, monthKey, shiftJalaliMonth } from '../jalali.js'
import { moneyTotals, projectRows } from './stats.js'

export const RANGES = ['month', 'quarter', 'half', 'year', 'all']
const MONTHS_BACK = { month: 1, quarter: 3, half: 6 }

/** { from, to } به تاریخ میلادی؛ ماه‌ها شمسی حساب می‌شن */
export function rangeBounds(range, today) {
  const { jy, jm } = isoToJalali(today)
  if (range === 'all') return { from: '0000-01-01', to: today }
  if (range === 'year') return { from: jalaliToIso(jy, 1, 1), to: today }
  const start = shiftJalaliMonth(jy, jm, -(MONTHS_BACK[range] || 1) + 1)
  return { from: jalaliToIso(start.jy, start.jm, 1), to: today }
}

export const within = (date, { from, to }) => Boolean(date) && date >= from && date <= to

/** درآمد = پولی که توی اون ماه واقعاً دریافت شده */
export function monthlySeries(db, today, count = 12) {
  const { jy, jm } = isoToJalali(today)
  const months = Array.from({ length: count }, (_, i) => {
    const m = shiftJalaliMonth(jy, jm, i - count + 1)
    return { key: `${m.jy}-${String(m.jm).padStart(2, '0')}`, ...m, received: 0, minutes: 0, delivered: 0 }
  })
  const map = new Map(months.map((m) => [m.key, m]))
  const bump = (date, field, value) => {
    const m = date && map.get(monthKey(date))
    if (m) m[field] += value
  }
  db.payments.forEach((x) => bump(x.date, 'received', x.amount))
  db.timeEntries.forEach((x) => bump(x.date, 'minutes', x.minutes))
  db.projects.forEach((p) => bump(p.deliveredOn, 'delivered', 1))
  return months
}

export function buildReport(db, range, today) {
  const bounds = rangeBounds(range, today)
  const rows = projectRows(db)
  const payments = db.payments.filter((x) => within(x.date, bounds))
  const entries = db.timeEntries.filter((x) => within(x.date, bounds))
  const delivered = rows.filter((r) => within(r.project.deliveredOn, bounds))
  const received = payments.reduce((s, x) => s + x.amount, 0)
  const minutes = entries.reduce((s, x) => s + x.minutes, 0)

  // درآمد ساعتی فقط از تحویل‌هایی که زمان دارن؛ وگرنه عدد باد می‌کنه
  const timed = delivered.filter((r) => r.minutes > 0)
  const timedMinutes = timed.reduce((s, r) => s + r.minutes, 0)
  const hourly = timedMinutes ? Math.round((timed.reduce((s, r) => s + r.agreed, 0) / timedMinutes) * 60) : null

  const money = moneyTotals(delivered)
  const dated = delivered.filter((r) => r.project.dueDate)

  const group = (keyOf) => {
    const map = new Map()
    const get = (key) => {
      if (!map.has(key)) map.set(key, { key, received: 0, minutes: 0, delivered: 0, outstanding: 0 })
      return map.get(key)
    }
    const byId = new Map(rows.map((r) => [r.project.id, r]))
    payments.forEach((x) => (get(keyOf(byId.get(x.projectId))).received += x.amount))
    entries.forEach((x) => (get(keyOf(byId.get(x.projectId))).minutes += x.minutes))
    delivered.forEach((r) => (get(keyOf(r)).delivered += 1))
    // طلب، وضعیت امروزه و به بازه بستگی نداره
    rows.forEach((r) => {
      if (map.has(keyOf(r))) map.get(keyOf(r)).outstanding += r.balance
    })
    return [...map.values()].sort((a, b) => b.received - a.received || b.delivered - a.delivered)
  }

  return {
    bounds,
    received,
    minutes,
    deliveredCount: delivered.length,
    hourly,
    timedCount: timed.length,
    settledRatio: money.agreed ? money.received / money.agreed : null,
    onTimeRatio: dated.length ? dated.filter((r) => r.project.deliveredOn <= r.project.dueDate).length / dated.length : null,
    outstanding: moneyTotals(rows).outstanding,
    byService: group((r) => r.project.service),
    byClient: group((r) => r.project.clientId),
  }
}
