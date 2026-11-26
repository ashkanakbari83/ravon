// کمک به ثبت سریع: بیعانه‌ی هم‌زمان و مبلغ‌های پیشنهادی
import { findClientByName } from './clients.js'
import { addPayment } from './payments.js'
import { addProject } from './projects.js'
import { fail } from './result.js'

/** پروژه و (اگه بود) دریافتی اولیه، با هم یا هیچ‌کدوم */
export function createProject(db, input, ctx) {
  const created = addProject(db, input, ctx)
  if (!created.ok || !input.deposit) return created
  if (input.deposit > input.amount) return fail('err.depositExceeds')
  const paid = addPayment(created.db, created.id, { amount: input.deposit }, ctx)
  return paid.ok ? { ...paid, id: created.id } : paid
}

/** مبلغ‌های اخیرِ همین خدمت؛ سابقه‌ی همین کارفرما جلوتر */
export function suggestAmounts(db, { service, clientName }, limit = 3) {
  if (!service) return []
  const clientId = clientName ? findClientByName(db, clientName)?.id : null
  const recent = db.projects
    .filter((p) => p.service === service && p.amount > 0 && p.status !== 'cancelled')
    .sort((a, b) => (b.clientId === clientId) - (a.clientId === clientId) || b.createdAt.localeCompare(a.createdAt))
  return [...new Set(recent.map((p) => p.amount))].slice(0, limit)
}
