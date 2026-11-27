import { diffDays, isIsoDate } from '../jalali.js'
import { addClient, findClientByName, normalizeText } from './clients.js'
import { ITEM_STATUSES, MAX_AMOUNT, MAX_REVISION_LIMIT, OPEN_STATUSES, SOON_DAYS, STATUSES } from './constants.js'
import { clean, cleanNote, fail, ok, replaceById } from './result.js'

export const isOpen = (p) => OPEN_STATUSES.includes(p.status)

const validAmount = (v) => Number.isInteger(v) && v >= 0 && v <= MAX_AMOUNT
export const paidFor = (db, projectId) =>
  db.payments.reduce((sum, x) => (x.projectId === projectId ? sum + x.amount : sum), 0)

/**
 * ثبت سریع: عنوان، کارفرما (id یا اسم جدید)، نوع خدمت و مبلغ. بقیه اختیاری.
 */
export function addProject(db, input, ctx) {
  // ترتیب بررسی همون ترتیب فیلدهای فرمه تا فوکوس روی اولین خطا بره
  const title = clean(input.title, 120)
  if (!title) return fail('err.title')
  const name = clean(input.clientName, 80)
  if (input.clientId ? !db.clients.some((c) => c.id === input.clientId) : !name) return fail('err.client')
  const service = clean(input.service, 40)
  if (!service) return fail('err.service')
  if (!validAmount(input.amount)) return fail('err.amount')
  if (input.dueDate && !isIsoDate(input.dueDate)) return fail('err.date')

  let next = db
  let clientId = input.clientId
  if (!clientId) {
    const existing = findClientByName(db, name)
    if (existing) clientId = existing.id
    else {
      const created = addClient(db, { name }, ctx)
      if (!created.ok) return created
      next = created.db
      clientId = created.id
    }
  }

  const status = STATUSES.includes(input.status) ? input.status : 'active'
  const project = {
    id: ctx.newId('p'),
    title,
    clientId,
    service,
    amount: input.amount,
    status,
    dueDate: input.dueDate || null,
    note: cleanNote(input.note),
    revisions: 0,
    revisionLimit: null,
    followedUpOn: null,
    items: [],
    archived: false,
    createdAt: ctx.now,
    createdOn: ctx.today,
    deliveredOn: status === 'delivered' ? ctx.today : null,
  }
  return ok({ ...next, projects: [...next.projects, project] }, { id: project.id })
}

function withProject(db, id, change) {
  const project = db.projects.find((p) => p.id === id)
  if (!project) return fail('err.notFound')
  const next = change(project)
  if (next.error) return fail(next.error)
  return ok({ ...db, projects: replaceById(db.projects, id, next) })
}

export function updateProject(db, id, patch) {
  return withProject(db, id, (p) => {
    const next = { ...p }
    if ('title' in patch) {
      next.title = clean(patch.title, 120)
      if (!next.title) return { error: 'err.title' }
    }
    if ('clientId' in patch) {
      if (!db.clients.some((c) => c.id === patch.clientId)) return { error: 'err.client' }
      next.clientId = patch.clientId
    }
    if ('service' in patch) {
      next.service = clean(patch.service, 40)
      if (!next.service) return { error: 'err.service' }
    }
    if ('amount' in patch) {
      if (!validAmount(patch.amount)) return { error: 'err.amount' }
      if (patch.amount < paidFor(db, id)) return { error: 'err.amountBelowPaid' }
      next.amount = patch.amount
    }
    if ('dueDate' in patch) {
      if (patch.dueDate && !isIsoDate(patch.dueDate)) return { error: 'err.date' }
      next.dueDate = patch.dueDate || null
    }
    if ('note' in patch) next.note = cleanNote(patch.note)
    return next
  })
}

/** وضعیت اجرایی مستقل از وضعیت مالیه. تاریخ تحویل خودکار ثبت/پاک می‌شه. */
export function setStatus(db, id, status, ctx) {
  if (!STATUSES.includes(status)) return fail('err.status')
  return withProject(db, id, (p) => ({
    ...p,
    status,
    deliveredOn: status === 'delivered' ? (p.status === 'delivered' ? p.deliveredOn : ctx.today) : null,
  }))
}

export const setArchived = (db, id, archived) => withProject(db, id, (p) => ({ ...p, archived: Boolean(archived) }))

export const changeRevisions = (db, id, delta) =>
  withProject(db, id, (p) => ({ ...p, revisions: Math.min(999, Math.max(0, p.revisions + delta)) }))

/** null یعنی سقفی توافق نشده */
export function setRevisionLimit(db, id, limit) {
  if (limit !== null && !(Number.isInteger(limit) && limit >= 0 && limit <= MAX_REVISION_LIMIT)) return fail('err.notFound')
  return withProject(db, id, (p) => ({ ...p, revisionLimit: limit }))
}

export const extraRevisions = (project) =>
  project.revisionLimit == null ? 0 : Math.max(0, project.revisions - project.revisionLimit)

/** هزینه‌ی کارِ اضافه روی مبلغ پروژه می‌ره، پس طلب و گزارش‌ها خودشون درست می‌شن */
export function addCharge(db, id, extra) {
  return withProject(db, id, (p) => {
    if (!Number.isInteger(extra) || extra <= 0 || !validAmount(p.amount + extra)) return { error: 'err.charge' }
    if (p.status === 'cancelled') return { error: 'err.status' }
    return { ...p, amount: p.amount + extra }
  })
}

export function addItem(db, projectId, title, ctx) {
  const name = clean(title, 120)
  if (!name) return fail('err.itemTitle')
  return withProject(db, projectId, (p) => ({
    ...p,
    items: [...p.items, { id: ctx.newId('i'), title: name, status: 'todo' }],
  }))
}

export function setItemStatus(db, projectId, itemId, status) {
  if (!ITEM_STATUSES.includes(status)) return fail('err.status')
  return withProject(db, projectId, (p) =>
    p.items.some((i) => i.id === itemId)
      ? { ...p, items: p.items.map((i) => (i.id === itemId ? { ...i, status } : i)) }
      : { error: 'err.notFound' },
  )
}

export const removeItem = (db, projectId, itemId) =>
  withProject(db, projectId, (p) => ({ ...p, items: p.items.filter((i) => i.id !== itemId) }))

/** «ساخت مشابه»: مشخصات سفارش کپی می‌شه؛ پول، زمان، ددلاین و اصلاحات نه. */
export function duplicateProject(db, id, ctx, title) {
  const source = db.projects.find((p) => p.id === id)
  if (!source) return fail('err.notFound')
  const { demo: _demo, ...rest } = source
  const copy = {
    ...rest,
    id: ctx.newId('p'),
    title: clean(title, 120) || source.title,
    status: 'active',
    dueDate: null,
    revisions: 0,
    followedUpOn: null,
    items: source.items.map((i) => ({ id: ctx.newId('i'), title: i.title, status: 'todo' })),
    archived: false,
    createdAt: ctx.now,
    createdOn: ctx.today,
    deliveredOn: null,
  }
  return ok({ ...db, projects: [...db.projects, copy] }, { id: copy.id })
}

export function deleteProject(db, id) {
  if (!db.projects.some((p) => p.id === id)) return fail('err.notFound')
  return ok({
    ...db,
    projects: db.projects.filter((p) => p.id !== id),
    payments: db.payments.filter((x) => x.projectId !== id),
    timeEntries: db.timeEntries.filter((x) => x.projectId !== id),
    timer: db.timer?.projectId === id ? null : db.timer,
  })
}

/** وضعیت ددلاین از تاریخ محاسبه می‌شه، ذخیره نمی‌شه. */
export function dueInfo(project, today) {
  if (!project.dueDate) return { state: 'none', days: null }
  if (project.status === 'cancelled') return { state: 'none', days: null }
  if (project.status === 'delivered') {
    const late = project.deliveredOn ? diffDays(project.dueDate, project.deliveredOn) : 0
    return { state: late > 0 ? 'deliveredLate' : 'delivered', days: Math.max(0, late) }
  }
  const days = diffDays(today, project.dueDate)
  if (days < 0) return { state: 'overdue', days: -days }
  if (days === 0) return { state: 'today', days: 0 }
  return { state: days <= SOON_DAYS ? 'soon' : 'later', days }
}

export const FILTERS = ['open', 'unsettled', 'delivered', 'all', 'archived']

export function matchesFilter(row, filter) {
  const { project, balance } = row
  if (filter === 'archived') return project.archived
  // طلب آرشیوشده هنوز طلبه؛ توی «تسویه‌نشده» دیده می‌شه
  if (filter === 'unsettled') return balance > 0
  if (project.archived) return false
  if (filter === 'open') return isOpen(project)
  if (filter === 'delivered') return project.status === 'delivered'
  return true
}

export function searchRows(rows, query, serviceName = (s) => s) {
  const q = normalizeText(query)
  if (!q) return rows
  return rows.filter(({ project, client }) =>
    normalizeText(
      `${project.title} ${client?.name || ''} ${serviceName(project.service)} ${project.note} ${project.items.map((i) => i.title).join(' ')}`,
    ).includes(q),
  )
}

/** بازها: نزدیک‌ترین ددلاین اول؛ بقیه: جدیدترین اول */
export function sortRows(rows) {
  const key = (p) => (isOpen(p) ? 0 : 1)
  return [...rows].sort((a, b) => {
    const pa = a.project
    const pb = b.project
    if (key(pa) !== key(pb)) return key(pa) - key(pb)
    if (isOpen(pa)) {
      const da = pa.dueDate || '9999-99-99'
      const db_ = pb.dueDate || '9999-99-99'
      if (da !== db_) return da.localeCompare(db_)
    }
    return pb.createdAt.localeCompare(pa.createdAt)
  })
}

/** محتمل‌ترین کار بعدی، تا با یک لمس انجام بشه */
export function nextStep(project) {
  if (project.status === 'queued') return { status: 'active', label: 'step.start' }
  if (project.status === 'active' || project.status === 'review') return { status: 'delivered', label: 'step.deliver' }
  if (project.status === 'cancelled') return { status: 'active', label: 'step.reopen' }
  return null
}

export const DUE_GROUPS = ['overdue', 'week', 'later', 'none']

/** ردیف‌های باز (از قبل مرتب‌شده) به ترتیب فوریت گروه می‌شن */
export function groupByDue(rows, today) {
  const keyOf = ({ project }) => {
    const { state } = dueInfo(project, today)
    if (state === 'overdue' || state === 'none' || state === 'later') return state
    return 'week'
  }
  return DUE_GROUPS.map((key) => ({ key, rows: rows.filter((r) => keyOf(r) === key) })).filter((g) => g.rows.length)
}
