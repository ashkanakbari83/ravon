// «برگردون»: فقط همون چیزی که عوض شد برمی‌گرده، پس تغییرهای بعدی کاربر از بین نمی‌ره.
import { paidFor } from './projects.js'
import { fail, ok, replaceById } from './result.js'

const KEYS = ['clients', 'projects', 'payments', 'timeEntries']

/** رکوردهایی که بین دو state حذف شدن */
export function removedBetween(before, after) {
  const removed = Object.fromEntries(
    KEYS.map((key) => {
      const kept = new Set(after[key].map((x) => x.id))
      return [key, before[key].filter((x) => !kept.has(x.id))]
    }),
  )
  return { ...removed, timer: before.timer && !after.timer ? before.timer : null }
}

export function restoreRemoved(db, removed) {
  const next = { ...db }
  const add = (key, valid = () => true) => {
    const have = new Set(next[key].map((x) => x.id))
    next[key] = [...next[key], ...removed[key].filter((x) => !have.has(x.id) && valid(x))]
  }
  add('clients')
  const clients = new Set(next.clients.map((c) => c.id))
  add('projects', (p) => clients.has(p.clientId))
  const projects = new Set(next.projects.map((p) => p.id))
  add('payments', (x) => projects.has(x.projectId))
  add('timeEntries', (x) => projects.has(x.projectId))
  // اگه تو این فاصله پرداخت تازه‌ای ثبت شده، برگردوندن نباید بیش‌دریافت بسازه
  const over = removed.payments.some((x) => {
    const project = next.projects.find((p) => p.id === x.projectId)
    return project && paidFor(next, x.projectId) > project.amount
  })
  if (over) return fail('err.paymentExceeds')
  if (removed.timer && !next.timer && projects.has(removed.timer.projectId)) next.timer = removed.timer
  return ok(next)
}

export function restoreStatus(db, id, { status, deliveredOn }) {
  const project = db.projects.find((p) => p.id === id)
  if (!project) return fail('err.notFound')
  return ok({ ...db, projects: replaceById(db.projects, id, { ...project, status, deliveredOn }) })
}

export function restoreItem(db, projectId, item, index) {
  const project = db.projects.find((p) => p.id === projectId)
  if (!project) return fail('err.notFound')
  if (project.items.some((i) => i.id === item.id)) return ok(db)
  const items = [...project.items]
  items.splice(index, 0, item)
  return ok({ ...db, projects: replaceById(db.projects, projectId, { ...project, items }) })
}
