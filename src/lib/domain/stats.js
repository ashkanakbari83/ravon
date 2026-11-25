// همه‌ی آمار از داده‌ی خام محاسبه می‌شه؛ هیچ عددی ذخیره نمی‌شه.
import { monthKey } from '../jalali.js'
import { agreedOf, balanceOf, paymentState } from './payments.js'
import { dueInfo, isOpen } from './projects.js'

const sumBy = (list, key, value) => {
  const map = new Map()
  for (const x of list) map.set(x[key], (map.get(x[key]) || 0) + x[value])
  return map
}

/** هر پروژه + کارفرما + مشتقات مالی و زمانی. یک بار حساب می‌شه، همه‌جا استفاده می‌شه. */
export function projectRows(db) {
  const paid = sumBy(db.payments, 'projectId', 'amount')
  const minutes = sumBy(db.timeEntries, 'projectId', 'minutes')
  const clients = new Map(db.clients.map((c) => [c.id, c]))
  return db.projects.map((project) => {
    const p = paid.get(project.id) || 0
    return {
      project,
      client: clients.get(project.clientId),
      paid: p,
      balance: balanceOf(project, p),
      agreed: agreedOf(project, p),
      payState: paymentState(project, p),
      minutes: minutes.get(project.id) || 0,
    }
  })
}

export function moneyTotals(rows) {
  const totals = rows.reduce(
    (t, r) => ({ agreed: t.agreed + r.agreed, received: t.received + r.paid, outstanding: t.outstanding + r.balance }),
    { agreed: 0, received: 0, outstanding: 0 },
  )
  return { ...totals, settledRatio: totals.agreed ? totals.received / totals.agreed : 0 }
}

export function dashboardStats(db, today, rows = projectRows(db)) {
  const month = monthKey(today)
  const inMonth = (x) => monthKey(x.date) === month
  const open = rows.filter((r) => !r.project.archived && isOpen(r.project))
  const dated = open
    .filter((r) => r.project.dueDate)
    .map((r) => ({ ...r, due: dueInfo(r.project, today) }))
    .sort((a, b) => a.project.dueDate.localeCompare(b.project.dueDate))
  // طلبِ کار تحویل‌شده فوری‌تره: بزرگ‌ترین‌ها اول
  const awaiting = rows
    .filter((r) => r.project.status === 'delivered' && r.balance > 0)
    .sort((a, b) => b.balance - a.balance)
  return {
    ...moneyTotals(rows),
    activeCount: open.length,
    // هم‌خوان با فهرستی که بهش لینک می‌شه (آرشیو جداست)
    deliveredCount: rows.filter((r) => !r.project.archived && r.project.status === 'delivered').length,
    overdue: dated.filter((r) => r.due.state === 'overdue'),
    dated,
    undatedCount: open.length - dated.length,
    awaiting,
    awaitingTotal: awaiting.reduce((s, r) => s + r.balance, 0),
    monthReceived: db.payments.filter(inMonth).reduce((s, x) => s + x.amount, 0),
    monthMinutes: db.timeEntries.filter(inMonth).reduce((s, x) => s + x.minutes, 0),
    monthDelivered: rows.filter((r) => r.project.deliveredOn && monthKey(r.project.deliveredOn) === month).length,
  }
}

export function clientSummaries(db, rows = projectRows(db)) {
  const map = new Map(
    db.clients.map((client) => [client.id, { client, count: 0, openCount: 0, received: 0, outstanding: 0, lastAt: client.createdAt }]),
  )
  for (const r of rows) {
    const s = map.get(r.project.clientId)
    if (!s) continue
    s.count += 1
    if (!r.project.archived && isOpen(r.project)) s.openCount += 1
    s.received += r.paid
    s.outstanding += r.balance
    if (r.project.createdAt > s.lastAt) s.lastAt = r.project.createdAt
  }
  return [...map.values()].sort((a, b) => b.lastAt.localeCompare(a.lastAt))
}
