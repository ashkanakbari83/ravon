import { useCallback, useEffect, useRef, useState } from 'react'
import DateField from '../components/DateField.jsx'
import FollowUpNote from '../components/FollowUpNote.jsx'
import Icon from '../components/Icon.jsx'
import Revisions from '../components/Revisions.jsx'
import { BackLink, DueTag, dueText, MoneyBar, StatusButton } from '../components/ui.jsx'
import { useApp } from '../context/AppContext.jsx'
import { href, navigate } from '../hooks/useRoute.js'
import { useStopTimer } from '../hooks/useStopTimer.js'
import { ITEM_STATUSES } from '../lib/domain/constants.js'
import { removePayment } from '../lib/domain/payments.js'
import { addItem, deleteProject, dueInfo, duplicateProject, nextStep, removeItem, setArchived, setItemStatus, updateProject } from '../lib/domain/projects.js'
import { addTime, removeTime, startTimer } from '../lib/domain/time.js'
import { restoreItem } from '../lib/domain/undo.js'
import { extractLinks } from '../lib/format.js'
import NotFound from './NotFound.jsx'

const byDate = (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)

function Money({ row }) {
  const { db, t, fmt, openSheet, removeWithUndo } = useApp()
  const { project, paid, balance, payState } = row
  const payments = db.payments.filter((x) => x.projectId === project.id).sort(byDate)
  return (
    <section className="card" aria-labelledby="money-title">
      <div className="card__head">
        <h2 id="money-title">{t('money.title')}</h2>
        <span className={`tag tag--${payState}`}>{t(`pay.${payState}`)}</span>
      </div>
      <dl className="trio">
        <div><dt>{t('money.agreed')}</dt><dd>{fmt.compact(project.amount)}</dd></div>
        <div className="trio__paid"><dt>{t('money.received')}</dt><dd>{fmt.compact(paid)}</dd></div>
        <div className={balance ? 'trio__owed' : undefined}><dt>{t('money.outstanding')}</dt><dd>{fmt.compact(balance)}</dd></div>
      </dl>
      {project.amount > 0 && <MoneyBar paid={paid} total={project.status === 'cancelled' ? paid : project.amount} />}
      {balance > 0 && (
        <button type="button" className="btn btn--primary btn--block" onClick={() => openSheet('payment', { projectId: project.id })}>
          <Icon name="wallet" />{t('pay.add')}
        </button>
      )}
      {balance > 0 && (
        <>
          <button type="button" className="btn btn--block" onClick={() => openSheet('followUp', { projectId: project.id })}>
            <Icon name="message" />{t('follow.open')}
          </button>
          <FollowUpNote project={project} className="muted" />
        </>
      )}
      {payments.length > 0 && (
        <ul className="lines" aria-label={t('pay.list')}>
          {payments.map((x) => (
            <li key={x.id} className="line">
              <span className="line__main">
                <span className="line__title">{fmt.money(x.amount)}</span>
                <span className="line__sub">{fmt.date(x.date)}{x.note && <span className="line__note">{x.note}</span>}</span>
              </span>
              <button type="button" className="iconbtn iconbtn--quiet" aria-label={t('pay.remove', { amount: fmt.money(x.amount) })}
                onClick={() => removeWithUndo(t('pay.removed'), removePayment, x.id)}>
                <Icon name="trash" size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {!payments.length && project.amount > 0 && <p className="muted">{t('pay.empty')}</p>}
    </section>
  )
}

function Time({ row }) {
  const { db, t, fmt, openSheet, run, ctx, toast, removeWithUndo, undoAction } = useApp()
  const stop = useStopTimer()
  const [all, setAll] = useState(false)
  const { project, minutes, agreed } = row
  const entries = db.timeEntries.filter((x) => x.projectId === project.id).sort(byDate)
  const running = db.timer?.projectId === project.id
  const quick = (m) => {
    const result = run(addTime, project.id, { minutes: m }, ctx())
    if (result.ok) toast(t('time.done', { time: fmt.clock(m) }), { action: undoAction(removeTime, result.id) })
  }
  return (
    <section className="card" aria-labelledby="time-title">
      <div className="card__head">
        <h2 id="time-title">{t('time.title')}</h2>
        {minutes > 0 && <strong>{t('time.total', { time: fmt.clock(minutes) })}</strong>}
      </div>
      {minutes >= 30 && agreed > 0 && <p className="muted">{t('time.rate', { amount: fmt.short(Math.round((agreed / minutes) * 60)) })}</p>}
      <div className="field" role="group" aria-label={t('time.quickLabel')}>
        <span className="field__label">{t('time.quickLabel')}</span>
        <div className="chips">
          {[[30, 'time.quick30'], [60, 'time.quick60'], [120, 'time.quick120']].map(([m, key]) => (
            <button key={m} type="button" className="chip" onClick={() => quick(m)}>{t(key)}</button>
          ))}
        </div>
      </div>
      <div className="duo">
        <button type="button" className="btn" onClick={() => openSheet('time', { projectId: project.id })}><Icon name="clock" />{t('time.add')}</button>
        {running ? (
          <button type="button" className="btn btn--primary" onClick={stop}><Icon name="stop" />{t('time.stop')}</button>
        ) : (
          <button type="button" className="btn" onClick={() => run(startTimer, project.id, ctx()).ok && toast(t('timer.started'))}><Icon name="play" />{t('time.start')}</button>
        )}
      </div>
      {entries.length > 0 ? (
        <>
          <ul className="lines">
            {entries.slice(0, all ? undefined : 4).map((x) => (
              <li key={x.id} className="line">
                <span className="line__main">
                  <span className="line__title">{fmt.clock(x.minutes)}</span>
                  <span className="line__sub">{fmt.date(x.date)}<span className="line__note">{x.note || t(x.source === 'timer' ? 'time.fromTimer' : 'time.manual')}</span></span>
                </span>
                <button type="button" className="iconbtn iconbtn--quiet" aria-label={t('time.remove', { time: fmt.clock(x.minutes) })}
                  onClick={() => removeWithUndo(t('time.removed'), removeTime, x.id)}>
                  <Icon name="trash" size={18} />
                </button>
              </li>
            ))}
          </ul>
          {entries.length > 4 && !all && <button type="button" className="link" onClick={() => setAll(true)}>{t('common.more')}</button>}
        </>
      ) : (
        <p className="muted">{t('time.empty')}</p>
      )}
    </section>
  )
}

function Items({ project }) {
  const { t, run, ctx, toast, undoAction } = useApp()
  const remove = (item, index) => {
    if (run(removeItem, project.id, item.id).ok) toast(t('item.removed'), { action: undoAction(restoreItem, project.id, item, index) })
  }
  const [title, setTitle] = useState('')
  const done = project.items.filter((i) => i.status === 'done').length
  const next = (s) => ITEM_STATUSES[(ITEM_STATUSES.indexOf(s) + 1) % ITEM_STATUSES.length]
  return (
    <section className="card" aria-labelledby="items-title">
      <div className="card__head">
        <h2 id="items-title">{t('project.items')}</h2>
        {project.items.length > 0 && <span className="muted">{t('project.itemsDone', { done, total: project.items.length })}</span>}
      </div>
      {project.items.length > 0 ? (
        <ul className="lines">
          {project.items.map((i, index) => (
            <li key={i.id} className="line">
              <span className="line__main"><span className="line__title">{i.title}</span></span>
              <button type="button" className={`itemstate itemstate--${i.status}`} aria-label={t('item.cycle', { title: i.title, status: t(`item.${i.status}`) })} onClick={() => run(setItemStatus, project.id, i.id, next(i.status))}>
                <span>{t(`item.${i.status}`)}</span>
              </button>
              <button type="button" className="iconbtn iconbtn--quiet" aria-label={t('item.remove', { title: i.title })} onClick={() => remove(i, index)}><Icon name="close" size={16} /></button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">{t('project.itemsHint')}</p>
      )}
      <form className="inline" onSubmit={(e) => (e.preventDefault(), title.trim() && run(addItem, project.id, title, ctx()).ok && setTitle(''))}>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('project.itemPh')} aria-label={t('project.itemPh')} maxLength={120} />
        <button type="submit" className="btn" disabled={!title.trim()}>{t('common.add')}</button>
      </form>
    </section>
  )
}

/** با خروج از فیلد، ترک صفحه یا بستن برنامه ذخیره می‌شه؛ دکمه‌ی «ذخیره» لازم نیست */
function NoteField({ project }) {
  const { t, run, db } = useApp()
  const [text, setText] = useState(project.note)
  const latest = useRef({})
  latest.current = { text, db, run }
  const save = useCallback(() => {
    const now = latest.current
    const current = now.db.projects.find((p) => p.id === project.id)
    if (current && now.text.trim() !== current.note) now.run(updateProject, project.id, { note: now.text })
  }, [project.id])
  useEffect(() => setText(project.note), [project.note])
  useEffect(() => {
    window.addEventListener('pagehide', save)
    return () => {
      window.removeEventListener('pagehide', save)
      save()
    }
  }, [save])
  return (
    <div className="field">
      <label htmlFor="note">{t('f.note')}</label>
      <textarea id="note" className="input" rows={3} value={text} placeholder={t('project.notePh')} onChange={(e) => setText(e.target.value)} onBlur={save} />
      {extractLinks(text).length > 0 && (
        <ul className="links" aria-label={t('project.links')}>
          {extractLinks(text).map((url) => (
            <li key={url}><a href={url} target="_blank" rel="noopener noreferrer" dir="ltr">{url.replace(/^https?:\/\/(www\.)?/, '')}</a></li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Details({ project }) {
  const { t, fmt, today, run } = useApp()
  const due = dueInfo(project, today)
  return (
    <section className="card" aria-labelledby="details-title">
      <h2 id="details-title">{t('project.details')}</h2>
      <DateField collapsible label={t('f.due')} value={project.dueDate} onChange={(dueDate) => run(updateProject, project.id, { dueDate })} />
      <Revisions project={project} />
      <NoteField key={project.id} project={project} />
      <p className="muted meta">
        <span>{t('project.createdOn', { date: fmt.date(project.createdOn) })}</span>
        {project.deliveredOn && <span>{t('project.deliveredOn', { date: fmt.date(project.deliveredOn) })}</span>}
        {due.state === 'deliveredLate' && <span>{dueText(t, due)}</span>}
      </p>
    </section>
  )
}

export default function ProjectDetail({ id }) {
  const { rows, t, serviceName, openSheet, run, ctx, toast, changeStatus, removeWithUndo } = useApp()
  const row = rows.find((r) => r.project.id === id)
  if (!row) return <NotFound />
  const { project, client } = row

  const duplicate = () => {
    const result = run(duplicateProject, id, ctx())
    if (result.ok) {
      toast(t('project.duplicated'))
      navigate(`project/${result.id}`)
    }
  }
  const archive = () => run(setArchived, id, !project.archived).ok && toast(t(project.archived ? 'project.unarchived' : 'project.archived'))
  const remove = () => {
    navigate('projects')
    removeWithUndo(t('project.deleted'), deleteProject, id)
  }
  const step = nextStep(project)

  return (
    <>
      <BackLink to="projects">{t('nav.projects')}</BackLink>
      <header className="detail-head">
        <div>
          <h1>{project.title}</h1>
          <p className="detail-head__sub">
            <a href={href(`client/${client.id}`)}>{client.name}</a>
            <span>{serviceName(project.service)}</span>
            {project.archived && <span className="tag">{t('project.archivedTag')}</span>}
            <DueTag project={project} />
          </p>
        </div>
        <button type="button" className="iconbtn" aria-label={t('project.edit')} onClick={() => openSheet('projectEdit', { projectId: id })}><Icon name="edit" /></button>
      </header>
      <div className="stepbar">
        <StatusButton project={project} />
        {step && (
          <button type="button" className={step.status === 'delivered' ? 'btn btn--primary' : 'btn'} onClick={() => changeStatus(id, step.status)}>
            {step.status === 'delivered' && <Icon name="check" />}
            {t(step.label)}
          </button>
        )}
      </div>
      <div className="columns">
        <div className="columns__col">
          <Money row={row} />
          <Details project={project} />
        </div>
        <div className="columns__col">
          <Items project={project} />
          <Time row={row} />
          <div className="actions">
            <button type="button" className="btn" onClick={duplicate}><Icon name="copy" />{t('project.duplicate')}</button>
            <button type="button" className="btn" onClick={archive}><Icon name="archive" />{t(project.archived ? 'project.unarchive' : 'project.archive')}</button>
            <button type="button" className="link link--danger" onClick={remove}>{t('project.delete')}</button>
          </div>
        </div>
      </div>
    </>
  )
}
