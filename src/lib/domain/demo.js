import { SEED_RELEASE, buildSeed } from '../../data/seed.js'
import { fail, ok } from './result.js'

const KEYS = ['clients', 'projects', 'payments', 'timeEntries']

function mergeById(db, seed, minRelease) {
  const next = { ...db }
  for (const key of KEYS) {
    const have = new Set(db[key].map((x) => x.id))
    const added = seed[key].filter((x) => x.release > minRelease && !have.has(x.id)).map(({ release: _r, ...x }) => x)
    next[key] = [...db[key], ...added]
  }
  return next
}

export function loadDemo(db, level, ctx) {
  if (!['light', 'busy'].includes(level)) return fail('err.notFound')
  const base = db.meta.demo ? removeDemo(db).db : db
  const next = mergeById(base, buildSeed(level, ctx.today), 0)
  return ok({ ...next, meta: { ...next.meta, demo: level, demoAnchor: ctx.today, seedRelease: SEED_RELEASE, onboarded: true } })
}

/** داده‌ی نمونه‌ی تازه فقط یک‌بار اضافه می‌شه؛ چیزی بازنویسی یا زنده نمی‌شه */
export function applySeedRelease(db, release = SEED_RELEASE, build = buildSeed) {
  const { demo, demoAnchor, seedRelease } = db.meta
  if (!demo || !demoAnchor || seedRelease >= release) return db
  const next = mergeById(db, build(demo, demoAnchor), seedRelease)
  return { ...next, meta: { ...next.meta, seedRelease: release } }
}

/** فقط داده‌ی نمونه پاک می‌شه. هر نمونه‌ای که کاربر بهش دست زده (پرداخت/زمان/پروژه‌ی واقعی) می‌مونه. */
export function removeDemo(db) {
  const touched = new Set([
    ...db.payments.filter((x) => !x.demo).map((x) => x.projectId),
    ...db.timeEntries.filter((x) => !x.demo).map((x) => x.projectId),
    ...(db.timer ? [db.timer.projectId] : []),
  ])
  const real = ({ demo: _d, ...x }) => x
  const projects = db.projects.filter((p) => !p.demo || touched.has(p.id)).map((p) => (touched.has(p.id) ? real(p) : p))
  const keptProjects = new Set(projects.map((p) => p.id))
  const keptClients = new Set(projects.map((p) => p.clientId))
  const clients = db.clients.filter((c) => !c.demo || keptClients.has(c.id)).map(real)
  const children = (list) =>
    list.filter((x) => keptProjects.has(x.projectId)).map((x) => (touched.has(x.projectId) ? real(x) : x))
  return ok({
    ...db,
    clients,
    projects,
    payments: children(db.payments),
    timeEntries: children(db.timeEntries),
    meta: { ...db.meta, demo: null, demoAnchor: null, seedRelease: 0 },
  })
}
