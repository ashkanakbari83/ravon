import { useMemo } from 'react'
import BarChart from '../components/BarChart.jsx'
import Icon from '../components/Icon.jsx'
import { Chips, EmptyState, Stat } from '../components/ui.jsx'
import { useApp } from '../context/AppContext.jsx'
import { href, replaceRoute } from '../hooks/useRoute.js'
import { exportSheets } from '../lib/domain/export.js'
import { buildReport, monthlySeries, RANGES } from '../lib/domain/reports.js'
import { downloadFile } from '../lib/download.js'
import { buildXlsx } from '../lib/xlsx.js'

function Money({ amount }) {
  const { fmt } = useApp()
  const { value, unit } = fmt.parts(amount)
  return (
    <p className="headline__value">
      {value}
      <small>{unit} {fmt.currency}</small>
    </p>
  )
}

function Breakdown({ title, list, name, link }) {
  const { t, fmt } = useApp()
  const max = Math.max(...list.map((g) => g.received), 1)
  const total = list.reduce((sum, g) => sum + g.received, 0) || 1
  return (
    <section className="card">
      <h2>{title}</h2>
      {list.length ? (
        <ul className="lines">
          {list.slice(0, 8).map((g) => {
            const content = (
              <>
                <span className="share__name">{name(g.key)}</span>
                <strong className="share__value">{fmt.compact(g.received)}</strong>
                <span className="share__sub">
                  <span className="share__part">{t('reports.shareOf', { percent: fmt.percent(g.received / total) })}</span>
                  <span>{t('reports.deliveredN', { n: g.delivered })}</span>
                  {g.minutes > 0 && <span>{t('reports.hoursN', { n: fmt.hours(g.minutes) })}</span>}
                  {g.outstanding > 0 && <span className="share__owed">{t('projects.owed', { amount: fmt.compact(g.outstanding) })}</span>}
                </span>
                <span className="share__bar" aria-hidden="true"><span style={{ width: `${(g.received / max) * 100}%` }} /></span>
              </>
            )
            return (
              <li key={g.key}>
                {link ? <a className="share" href={href(link(g.key))}>{content}</a> : <div className="share">{content}</div>}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="muted">{t('reports.none')}</p>
      )}
    </section>
  )
}

export default function Reports({ query }) {
  const { db, t, fmt, today, locale, serviceName, toast } = useApp()
  const range = RANGES.includes(query.range) ? query.range : 'half'
  const report = useMemo(() => buildReport(db, range, today), [db, range, today])
  const series = useMemo(() => monthlySeries(db, today, 12), [db, today])

  if (!db.projects.length) {
    return (
      <>
        <h1 className="page-title">{t('nav.reports')}</h1>
        <EmptyState title={t('reports.emptyTitle')} text={t('reports.emptyText')} />
      </>
    )
  }
  const exportExcel = () => {
    const sheets = exportSheets(db, range, today, { t, serviceName, locale })
    downloadFile(`ravon-${range}-${today}.xlsx`, buildXlsx(sheets, { rtl: locale === 'fa' }), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    toast(t('reports.exported'))
  }
  const percent = (r) => (r == null ? '—' : fmt.percent(r))
  const clientName = (id) => db.clients.find((c) => c.id === id)?.name

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">{t('nav.reports')}</h1>
        <button type="button" className="btn btn--small" onClick={exportExcel}><Icon name="download" size={18} />{t('reports.export')}</button>
      </div>
      <Chips scroll label={t('reports.range')} value={range} onChange={(r) => replaceRoute(`reports?range=${r}`)} options={RANGES.map((r) => ({ value: r, label: t(`reports.range.${r}`) }))} />

      <section className="card headline" aria-label={t('reports.received')}>
        <div>
          <h2>{t('reports.received')}</h2>
          <Money amount={report.received} />
        </div>
        <div>
          <h2>{t('reports.hourly')}</h2>
          {report.hourly == null ? <p className="headline__value">—</p> : <Money amount={report.hourly} />}
          <p className="muted">{report.hourly == null ? t('reports.noHourly') : t('reports.hourlyHint', { n: report.timedCount })}</p>
        </div>
      </section>
      <div className="metrics">
        <Stat label={t('reports.delivered')} value={fmt.num(report.deliveredCount)} />
        <Stat label={t('reports.hours')} value={fmt.hours(report.minutes)} />
        <Stat label={t('reports.settled')} value={percent(report.settledRatio)} />
        <Stat label={t('reports.onTime')} value={percent(report.onTimeRatio)} />
      </div>
      <p className="linksrow">
        <a href={href('projects?filter=unsettled')}><span>{t('reports.unsettledLink')}</span><strong>{fmt.short(report.outstanding)}</strong></a>
        <a href={href('projects?filter=open')}><span>{t('reports.openLink')}</span><Icon name="next" size={18} /></a>
      </p>

      <section className="card">
        <h2>{t('reports.chart')}</h2>
        <p className="muted">{t('reports.chartHint')}</p>
        <BarChart series={series} />
      </section>
      <div className="columns">
        <Breakdown title={t('reports.byService')} list={report.byService} name={serviceName} />
        <Breakdown title={t('reports.byClient')} list={report.byClient} name={clientName} link={(id) => `client/${id}`} />
      </div>
    </>
  )
}
