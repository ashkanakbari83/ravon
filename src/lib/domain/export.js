import { isoToJalali } from '../jalali.js'
import { currencyLabel, MONTHS } from '../format.js'
import { monthlySeries, rangeBounds, within } from './reports.js'
import { projectRows } from './stats.js'

const jalaliText = (iso) => {
  if (!iso) return ''
  const { jy, jm, jd } = isoToJalali(iso)
  return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`
}
const hours = (minutes) => Math.round((minutes / 60) * 100) / 100

/** برگه‌های اکسل برای بازه‌ی انتخابی. t و serviceName از بیرون میان تا منطق به UI وابسته نشه. */
export function exportSheets(db, range, today, { t, serviceName, locale = 'fa' }) {
  const bounds = rangeBounds(range, today)
  const rows = projectRows(db)
  const byId = new Map(rows.map((r) => [r.project.id, r]))
  const payments = db.payments.filter((x) => within(x.date, bounds))
  const entries = db.timeEntries.filter((x) => within(x.date, bounds))
  const active = new Set([...payments, ...entries].map((x) => x.projectId))
  const projects = rows.filter(
    (r) => range === 'all' || active.has(r.project.id) || within(r.project.createdOn, bounds) || within(r.project.deliveredOn, bounds),
  )
  const money = (key) => `${t(key)} (${currencyLabel(db.settings.currency, locale)})`
  const first = db.payments
    .map((x) => x.date)
    .concat(db.timeEntries.map((x) => x.date))
    .sort()[0]
  const span = (from) => {
    const a = isoToJalali(from)
    const b = isoToJalali(today)
    return (b.jy - a.jy) * 12 + (b.jm - a.jm) + 1
  }
  const from = range === 'all' ? first || today : bounds.from
  const series = monthlySeries(db, today, Math.max(1, span(from)))

  return [
    {
      name: t('xls.monthly'),
      widths: [18, 22, 14, 16],
      rows: [
        [t('xls.month'), money('xls.received'), t('xls.hours'), t('xls.deliveredCount')],
        ...series.map((m) => [`${MONTHS[locale][m.jm - 1]} ${m.jy}`, m.received, hours(m.minutes), m.delivered]),
      ],
    },
    {
      name: t('xls.projects'),
      widths: [32, 24, 18, 16, 18, 18, 18, 14, 14, 14, 10, 10, 30],
      rows: [
        [
          t('f.title'), t('f.client'), t('f.service'), t('f.status'), money('f.amount'), money('money.received'),
          money('money.outstanding'), t('xls.createdOn'), t('f.due'), t('xls.deliveredOn'), t('xls.hours'), t('xls.archived'), t('f.note'),
        ],
        ...projects.map(({ project: p, client, paid, balance, minutes }) => [
          p.title, client?.name || '', serviceName(p.service), t(`status.${p.status}`), p.amount, paid, balance,
          jalaliText(p.createdOn), jalaliText(p.dueDate), jalaliText(p.deliveredOn), hours(minutes), p.archived ? t('common.yes') : '', p.note,
        ]),
      ],
    },
    {
      name: t('xls.payments'),
      widths: [14, 32, 24, 20, 30],
      rows: [
        [t('f.date'), t('f.title'), t('f.client'), money('f.amount'), t('f.note')],
        ...[...payments]
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((x) => [jalaliText(x.date), byId.get(x.projectId).project.title, byId.get(x.projectId).client?.name || '', x.amount, x.note]),
      ],
    },
    {
      name: t('xls.time'),
      widths: [14, 32, 24, 10, 30],
      rows: [
        [t('f.date'), t('f.title'), t('f.client'), t('xls.hours'), t('f.note')],
        ...[...entries]
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((x) => [jalaliText(x.date), byId.get(x.projectId).project.title, byId.get(x.projectId).client?.name || '', hours(x.minutes), x.note]),
      ],
    },
  ]
}
