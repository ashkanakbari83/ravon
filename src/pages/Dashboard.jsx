import { useMemo } from 'react'
import DueList from '../components/DueList.jsx'
import Icon from '../components/Icon.jsx'
import { EmptyState, MoneyBar, Stat } from '../components/ui.jsx'
import { useApp } from '../context/AppContext.jsx'
import { href } from '../hooks/useRoute.js'
import { markBackup, needsBackup, serializeBackup, snoozeBackup } from '../lib/domain/backup.js'
import { removeDemo } from '../lib/domain/demo.js'
import { dashboardStats } from '../lib/domain/stats.js'
import { downloadFile } from '../lib/download.js'
import { MONTHS } from '../lib/format.js'
import { isoToJalali } from '../lib/jalali.js'

const DUE_ROWS = 5

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
          <p className="owed__share">
            {t('dash.receivedShare', { percent: fmt.percent(stats.agreed ? Math.floor((stats.received / stats.agreed) * 100) / 100 : 0), total: fmt.short(stats.agreed) })}
          </p>
        </section>

        <div className="counts">
          <Stat label={t('dash.active')} value={fmt.num(stats.activeCount)} to="projects?filter=open" tone="active" />
          <Stat label={t('dash.overdue')} value={fmt.num(stats.overdue.length)} to="projects?filter=open" tone={stats.overdue.length ? 'bad' : undefined} />
          <Stat label={t('dash.delivered')} value={fmt.num(stats.deliveredCount)} to="projects?filter=delivered" tone="ok" />
        </div>

        <section className="card dash__due" aria-labelledby="due-title">
          <h2 id="due-title">{t('dash.due')}</h2>
          {stats.dated.length ? <DueList rows={stats.dated.slice(0, DUE_ROWS)} /> : <p className="muted">{t('dash.dueEmpty')}</p>}
          {(stats.dated.length > DUE_ROWS || stats.undatedCount > 0) && (
            <p className="card__foot">
              {stats.dated.length > DUE_ROWS && <a href={href('projects?filter=open')}>{t('dash.dueMore', { n: stats.dated.length - DUE_ROWS })}</a>}
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
