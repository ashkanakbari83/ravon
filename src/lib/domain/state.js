import { isIsoDate } from '../jalali.js'
import { ITEM_STATUSES, MAX_AMOUNT, STATE_VERSION, STATUSES, THEMES } from './constants.js'

export function emptyState() {
  return {
    version: STATE_VERSION,
    meta: { onboarded: false, demo: null, demoAnchor: null, seedRelease: 0, lastBackupAt: null, backupSnoozedAt: null },
    settings: { currency: 'toman', theme: 'system', locale: 'fa' },
    clients: [],
    projects: [],
    payments: [],
    timeEntries: [],
    timer: null,
  }
}

const str = (v, fallback = '') => (typeof v === 'string' ? v : fallback)
const int = (v, min, max, fallback = min) =>
  Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback
const list = (v) => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object' && typeof x.id === 'string') : [])
const dateOr = (v, fallback = null) => (isIsoDate(v) ? v : fallback)
const demoFlag = (x) => (x.demo ? { demo: true } : {})
const unique = (arr) => [...new Map(arr.map((x) => [x.id, x])).values()]

/** هر ورودی ناقص یا قدیمی رو به شکل کامل و امن برمی‌گردونه. رکورد یتیم حذف می‌شه. */
export function withDefaults(raw) {
  const base = emptyState()
  if (!raw || typeof raw !== 'object') return base
  const meta = { ...base.meta, ...(raw.meta || {}) }
  const settings = { ...base.settings, ...(raw.settings || {}) }
  if (!THEMES.includes(settings.theme)) settings.theme = 'system'
  if (!['toman', 'rial', 'usd'].includes(settings.currency)) settings.currency = 'toman'
  if (!['fa', 'en'].includes(settings.locale)) settings.locale = 'fa'

  const clients = unique(list(raw.clients)).map((c) => ({
    id: c.id,
    name: str(c.name) || '—',
    phone: str(c.phone),
    handle: str(c.handle),
    note: str(c.note),
    createdAt: str(c.createdAt) || '1970-01-01T00:00:00.000Z',
    ...demoFlag(c),
  }))
  const clientIds = new Set(clients.map((c) => c.id))

  const projects = unique(list(raw.projects))
    .filter((p) => clientIds.has(p.clientId))
    .map((p) => {
      const status = STATUSES.includes(p.status) ? p.status : 'active'
      const createdAt = str(p.createdAt) || '1970-01-01T00:00:00.000Z'
      return {
        id: p.id,
        title: str(p.title) || '—',
        clientId: p.clientId,
        service: str(p.service) || 'other',
        amount: int(p.amount, 0, MAX_AMOUNT),
        status,
        dueDate: dateOr(p.dueDate),
        note: str(p.note),
        revisions: int(p.revisions, 0, 999),
        items: unique(list(p.items)).map((i) => ({
          id: i.id,
          title: str(i.title) || '—',
          status: ITEM_STATUSES.includes(i.status) ? i.status : 'todo',
        })),
        archived: Boolean(p.archived),
        createdAt,
        createdOn: dateOr(p.createdOn, dateOr(createdAt.slice(0, 10), '1970-01-01')),
        deliveredOn: status === 'delivered' ? dateOr(p.deliveredOn, dateOr(createdAt.slice(0, 10))) : null,
        ...demoFlag(p),
      }
    })
  const projectIds = new Set(projects.map((p) => p.id))

  const payments = unique(list(raw.payments))
    .filter((p) => projectIds.has(p.projectId) && p.amount > 0 && isIsoDate(p.date))
    .map((p) => ({
      id: p.id,
      projectId: p.projectId,
      amount: int(p.amount, 1, MAX_AMOUNT),
      date: p.date,
      note: str(p.note),
      createdAt: str(p.createdAt) || `${p.date}T12:00:00.000Z`,
      ...demoFlag(p),
    }))

  const timeEntries = unique(list(raw.timeEntries))
    .filter((t) => projectIds.has(t.projectId) && t.minutes > 0 && isIsoDate(t.date))
    .map((t) => ({
      id: t.id,
      projectId: t.projectId,
      minutes: int(t.minutes, 1, 24 * 60),
      date: t.date,
      note: str(t.note),
      source: t.source === 'timer' ? 'timer' : 'manual',
      createdAt: str(t.createdAt) || `${t.date}T12:00:00.000Z`,
      ...demoFlag(t),
    }))

  const timer =
    raw.timer && projectIds.has(raw.timer.projectId) && !Number.isNaN(Date.parse(raw.timer.startedAt))
      ? { projectId: raw.timer.projectId, startedAt: raw.timer.startedAt }
      : null

  return { version: STATE_VERSION, meta, settings, clients, projects, payments, timeEntries, timer }
}
