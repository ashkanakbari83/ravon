import { useMemo } from 'react'
import Icon from '../components/Icon.jsx'
import Timeline from '../components/Timeline.jsx'
import { EmptyState, MoneyBar, Stat } from '../components/ui.jsx'
import { useApp } from '../context/AppContext.jsx'
import { href } from '../hooks/useRoute.js'
import { markBackup, needsBackup, serializeBackup, snoozeBackup } from '../lib/domain/backup.js'
import { removeDemo } from '../lib/domain/demo.js'
import { dashboardStats } from '../lib/domain/stats.js'
import { downloadFile } from '../lib/download.js'
import { MONTHS } from '../lib/format.js'
import { isoToJalali } from '../lib/jalali.js'

const TIMELINE_ROWS = 5

function BackupReminder() {
  const { db, t, today, run, ctx, toast } = useApp()
  if (!needsBackup(db, today)) return null
  const download = () => {
    const context = ctx()
    downloadFile(`ravon-backup-${context.today}.json`, serializeBackup(db, context), 'application/json')
    run(markBackup, context)
    toast(t('settings.backupDone'))
  }
  return (
    <div className="banner">
      <span>{t('backup.remind')}</span>
      <button type="button" className="link" onClick={download}>{t('backup.now')}</button>
      <button type="button" className="link link--quiet" onClick={() => run(snoozeBackup, ctx())}>{t('backup.later')}</button>
    </div>
  )
}

export default function Dashboard() {
  const { db, rows, t, fmt, today, locale, openSheet, run } = useApp()
  const stats = useMemo(() => dashboardStats(db, today, rows), [db, today, rows])
  const month = MONTHS[locale][isoToJalali(today).jm - 1]

  if (!db.projects.length) {
    return (
      <>
        <h1 className="sr-only">{t('nav.home')}</h1>
        <EmptyState title={t('dash.emptyTitle')} text={t('dash.emptyText')}>
          <button type="button" className="btn btn--primary" onClick={() => openSheet('quickAdd')}><Icon name="plus" />{t('nav.new')}</button>
        </EmptyState>
      </>
    )
  }

  const owed = fmt.parts(stats.outstanding)
  return (
    <>
      <h1 className="sr-only">{t('nav.home')}</h1>
      {db.meta.demo && (
        <div className="banner banner--quiet">
          <span>{t('dash.demoNote')}</span>
          <button type="button" className="link" onClick={() => run(removeDemo)}>{t('dash.demoExit')}</button>
        </div>
      )}
      <BackupReminder />
      <div className="dash">
        <section className="card owed" aria-labelledby="owed-title">
          <h2 id="owed-title">{t('dash.owed')}</h2>
          <a className="owed__value" href={href('projects?filter=unsettled')}>
            <span className="owed__number">{owed.value}</span>
            <span className="owed__unit">{owed.unit} {fmt.currency}</span>
          </a>
          <MoneyBar paid={stats.received} total={stats.agreed} />
          <dl className="legend">
            <div className="legend__paid"><dt>{t('money.received')}</dt><dd>{fmt.compact(stats.received)}</dd></div>
            <div className="legend__total"><dt>{t('money.agreed')}</dt><dd>{fmt.compact(stats.agreed)}</dd></div>
          </dl>
        </section>

        <div className="counts">
          <Stat label={t('dash.active')} value={fmt.num(stats.activeCount)} to="projects?filter=open" />
          <Stat label={t('dash.overdue')} value={fmt.num(stats.overdue.length)} to="projects?filter=open" tone={stats.overdue.length ? 'bad' : undefined} />
          <Stat label={t('dash.delivered')} value={fmt.num(stats.deliveredCount)} to="projects?filter=delivered" />
        </div>

        <section className="card dash__timeline" aria-labelledby="tl-title">
          <h2 id="tl-title">{t('dash.timeline')}</h2>
          {stats.dated.length ? <Timeline rows={stats.dated.slice(0, TIMELINE_ROWS)} /> : <p className="muted">{t('dash.timelineEmpty')}</p>}
          {(stats.dated.length > TIMELINE_ROWS || stats.undatedCount > 0) && (
            <p className="card__foot">
              {stats.dated.length > TIMELINE_ROWS && <a href={href('projects?filter=open')}>{t('dash.timelineMore', { n: stats.dated.length - TIMELINE_ROWS })}</a>}
              {stats.undatedCount > 0 && <a href={href('projects?filter=open')}>{t('dash.undated', { n: stats.undatedCount })}</a>}
            </p>
          )}
        </section>

        <section className="card awaiting" aria-labelledby="await-title">
          <h2 id="await-title">{t('dash.awaiting')}</h2>
          {stats.awaiting.length ? (
            <ul className="lines">
              {stats.awaiting.slice(0, 4).map(({ project, client, balance }) => (
                <li key={project.id} className="line">
                  <a href={href(`project/${project.id}`)} className="line__main">
                    <span className="line__title">{client?.name}</span>
                    <span className="line__sub">{project.title}</span>
                  </a>
                  <strong className="line__value">{fmt.compact(balance)}</strong>
                  <button type="button" className="btn btn--small" onClick={() => openSheet('payment', { projectId: project.id })}>{t('pay.addShort')}</button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">{t('dash.allClear')}</p>
          )}
          {stats.awaiting.length > 4 && <p className="card__foot"><a href={href('projects?filter=unsettled')}>{t('dash.awaitingAll')}</a></p>}
        </section>

        <section className="card month" aria-labelledby="month-title">
          <h2 id="month-title">{t('dash.month', { month })}</h2>
          <div className="month__stats">
            <Stat label={t('dash.monthReceived')} value={fmt.compact(stats.monthReceived)} />
            <Stat label={t('dash.monthHours')} value={fmt.hours(stats.monthMinutes)} />
            <Stat label={t('dash.monthDelivered')} value={fmt.num(stats.monthDelivered)} />
          </div>
        </section>
      </div>
    </>
  )
}
