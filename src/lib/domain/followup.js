// پیام پیگیری طلب: خودکار فرستاده نمی‌شه؛ متن آماده می‌شه و خودت می‌فرستی
import { diffDays } from '../jalali.js'
import { fail, ok } from './result.js'

/**
 * طلب‌های یک پروژه یا همه‌ی یک کارفرما. برای کارفرما پیش‌فرض فقط تحویل‌شده‌هاست،
 * چون خواستنِ پولِ کارِ تحویل‌نشده معمولاً زوده.
 */
export function followUpData(rows, { projectId, clientId, scope } = {}) {
  const owed = rows
    .filter((r) => r.balance > 0 && (projectId ? r.project.id === projectId : r.project.clientId === clientId))
    .sort((a, b) => a.project.createdAt.localeCompare(b.project.createdAt))
  if (!owed.length) return null
  const delivered = owed.filter((r) => r.project.status === 'delivered')
  const canNarrow = !projectId && delivered.length > 0 && delivered.length < owed.length
  const chosen = canNarrow && scope !== 'all' ? delivered : owed
  return {
    client: owed[0].client,
    rows: chosen,
    total: chosen.reduce((sum, r) => sum + r.balance, 0),
    canNarrow,
  }
}

export function followUpText({ client, rows, total }, { t, money, date }) {
  const name = client.name
  if (rows.length === 1) return t('follow.textOne', { name, title: rows[0].project.title, amount: money(rows[0].balance) })
  // کارهای هم‌اسم (مثلاً «ساخت مشابه») با تاریخ از هم جدا می‌شن
  const label = ({ project: p }) =>
    rows.filter((r) => r.project.title === p.title).length > 1 ? `${p.title} (${date(p.deliveredOn || p.createdOn)})` : p.title
  const list = rows.map((r) => t('follow.line', { title: label(r), amount: money(r.balance) })).join('\n')
  return t('follow.textMany', { name, list, total: money(total) })
}

export function markFollowedUp(db, ids, ctx) {
  const wanted = new Set(ids)
  if (!db.projects.some((p) => wanted.has(p.id))) return fail('err.notFound')
  return ok({ ...db, projects: db.projects.map((p) => (wanted.has(p.id) ? { ...p, followedUpOn: ctx.today } : p)) })
}

/** چند روز از آخرین پیگیری گذشته (null یعنی هیچ‌وقت) */
export const daysSinceFollowUp = (project, today) =>
  project.followedUpOn ? Math.max(0, diffDays(project.followedUpOn, today)) : null
