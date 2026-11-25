import { isIsoDate } from '../jalali.js'
import { paidFor } from './projects.js'
import { cleanNote, fail, ok } from './result.js'

/** چیزی که هنوز طلبکاریم. پروژه‌ی لغوشده طلب نداره. */
export function balanceOf(project, paid) {
  return project.status === 'cancelled' ? 0 : Math.max(0, project.amount - paid)
}
/** ارزش قابل‌حساب پروژه: لغوشده فقط به اندازه‌ی پولی که گرفتیم */
export const agreedOf = (project, paid) => (project.status === 'cancelled' ? paid : project.amount)

/** وضعیت مالی: همیشه از پرداخت‌ها محاسبه می‌شه */
export function paymentState(project, paid) {
  if (project.status === 'cancelled') return paid > 0 ? 'paid' : 'none'
  if (project.amount === 0) return 'free'
  if (paid >= project.amount) return 'paid'
  return paid > 0 ? 'partial' : 'unpaid'
}

export function addPayment(db, projectId, input, ctx) {
  const project = db.projects.find((p) => p.id === projectId)
  if (!project) return fail('err.notFound')
  if (!Number.isInteger(input.amount) || input.amount <= 0) return fail('err.paymentAmount')
  if (input.amount > project.amount - paidFor(db, projectId)) return fail('err.paymentExceeds')
  const date = input.date || ctx.today
  if (!isIsoDate(date)) return fail('err.date')
  if (date > ctx.today) return fail('err.futureDate')
  const payment = { id: ctx.newId('pay'), projectId, amount: input.amount, date, note: cleanNote(input.note), createdAt: ctx.now }
  return ok({ ...db, payments: [...db.payments, payment] }, { id: payment.id })
}

export function removePayment(db, id) {
  if (!db.payments.some((x) => x.id === id)) return fail('err.notFound')
  return ok({ ...db, payments: db.payments.filter((x) => x.id !== id) })
}
