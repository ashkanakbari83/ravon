import { clean, cleanNote, fail, ok, replaceById } from './result.js'

/** برای مقایسه‌ی اسم‌ها: ی/ک عربی، نیم‌فاصله و فاصله یکی حساب می‌شن */
export const normalizeText = (v) =>
  String(v ?? '')
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[‌‏‎]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

export const findClientByName = (db, name) => db.clients.find((c) => normalizeText(c.name) === normalizeText(name))

const fields = (input) => ({
  name: clean(input.name, 80),
  phone: clean(input.phone, 40),
  handle: clean(input.handle, 80),
  note: cleanNote(input.note),
})

export function addClient(db, input, ctx) {
  const data = fields(input)
  if (!data.name) return fail('err.clientName')
  if (findClientByName(db, data.name)) return fail('err.clientExists')
  const client = { id: ctx.newId('c'), ...data, createdAt: ctx.now }
  return ok({ ...db, clients: [...db.clients, client] }, { id: client.id })
}

export function updateClient(db, id, patch) {
  const current = db.clients.find((c) => c.id === id)
  if (!current) return fail('err.notFound')
  const data = fields({ ...current, ...patch })
  if (!data.name) return fail('err.clientName')
  const twin = findClientByName(db, data.name)
  if (twin && twin.id !== id) return fail('err.clientExists')
  return ok({ ...db, clients: replaceById(db.clients, id, { ...current, ...data }) })
}

export function deleteClient(db, id) {
  if (!db.clients.some((c) => c.id === id)) return fail('err.notFound')
  if (db.projects.some((p) => p.clientId === id)) return fail('err.clientHasProjects')
  return ok({ ...db, clients: db.clients.filter((c) => c.id !== id) })
}

/** کارفرماهای پرکار اخیر اول — برای انتخاب سریع */
export function clientsByRecency(db) {
  const last = new Map()
  for (const p of db.projects) {
    if (!last.has(p.clientId) || last.get(p.clientId) < p.createdAt) last.set(p.clientId, p.createdAt)
  }
  const when = (c) => last.get(c.id) || c.createdAt
  return [...db.clients].sort((a, b) => when(b).localeCompare(when(a)))
}
