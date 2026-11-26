import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { useServiceOptions } from '../components/Pickers.jsx'
import { Chips, EmptyState, ProjectRow } from '../components/ui.jsx'
import { useApp } from '../context/AppContext.jsx'
import { replaceRoute } from '../hooks/useRoute.js'
import { takeSearchRequest } from '../hooks/useShortcuts.js'
import { FILTERS, groupByDue, matchesFilter, searchRows, sortRows } from '../lib/domain/projects.js'

const PAGE = 30

export default function Projects({ query }) {
  const { db, rows, t, fmt, today, serviceName, openSheet } = useApp()
  const filter = FILTERS.includes(query.filter) ? query.filter : 'open'
  const service = query.service || ''
  const [search, setSearch] = useState(() => sessionStorageGet('ravon:q'))
  // «بیشتر»‌های زده‌شده بعد از برگشت از جزئیات می‌مونه
  const [limit, setLimitState] = useState(() => Number(sessionStorageGet('ravon:limit')) || PAGE)
  const setLimit = (next) => {
    setLimitState((current) => {
      const value = typeof next === 'function' ? next(current) : next
      sessionStorageSet('ravon:limit', String(value))
      return value
    })
  }
  const searchBox = useRef(null)
  useEffect(() => {
    if (takeSearchRequest()) searchBox.current?.focus()
  }, [])
  const services = useServiceOptions().filter((s) => db.projects.some((p) => p.service === s))

  const go = (next) => {
    const params = new URLSearchParams({ filter, ...(service && { service }), ...next })
    if (!params.get('service')) params.delete('service')
    setLimit(PAGE)
    replaceRoute(`projects?${params}`)
  }
  const type = (value) => {
    setSearch(value)
    setLimit(PAGE)
    sessionStorageSet('ravon:q', value)
  }

  const found = useMemo(
    () => searchRows(rows.filter((r) => !service || r.project.service === service), search, serviceName),
    [rows, service, search, serviceName],
  )
  const list = useMemo(() => sortRows(found.filter((r) => matchesFilter(r, filter))), [found, filter])
  const owed = list.reduce((s, r) => s + r.balance, 0)

  if (!db.projects.length) {
    return (
      <>
        <h1 className="page-title">{t('nav.projects')}</h1>
        <EmptyState title={t('projects.emptyTitle')} text={t('projects.emptyText')}>
          <button type="button" className="btn btn--primary" onClick={() => openSheet('quickAdd')}><Icon name="plus" />{t('nav.new')}</button>
        </EmptyState>
      </>
    )
  }

  return (
    <>
      <h1 className="page-title">{t('nav.projects')}</h1>
      <div className="toolbar">
        <label className="search">
          <Icon name="search" size={18} />
          <input ref={searchBox} type="search" value={search} onChange={(e) => type(e.target.value)} placeholder={t('projects.searchPh')} aria-label={t('projects.search')} aria-keyshortcuts="/" />
          <kbd className="kbd" aria-hidden="true">/</kbd>
        </label>
        {services.length > 1 && (
          <select className="select" value={service} aria-label={t('f.service')} onChange={(e) => go({ service: e.target.value })}>
            <option value="">{t('projects.serviceFilter')}</option>
            {services.map((s) => <option key={s} value={s}>{serviceName(s)}</option>)}
          </select>
        )}
      </div>
      <Chips scroll label={t('projects.filters')} value={filter} onChange={(f) => go({ filter: f })} options={FILTERS.map((f) => ({
        value: f,
        label: (
          <>
            {t(`projects.filter.${f}`)}
            <span className="chip__count">{fmt.num(found.filter((r) => matchesFilter(r, f)).length)}</span>
          </>
        ),
      }))} />
      {list.length ? (
        <>
          <p className="summary" aria-live="polite">
            <span>{t('projects.count', { n: list.length })}</span>
            {owed > 0 && <strong>{t('projects.owed', { amount: fmt.short(owed) })}</strong>}
          </p>
          {filter === 'open' ? (
            groupByDue(list.slice(0, limit), today).map((group) => (
              <section key={group.key} aria-labelledby={`group-${group.key}`}>
                <h2 id={`group-${group.key}`} className={`group group--${group.key}`}>{t(`group.${group.key}`)}</h2>
                <ul className="rows">
                  {group.rows.map((row) => <ProjectRow key={row.project.id} row={row} />)}
                </ul>
              </section>
            ))
          ) : (
            <ul className="rows">
              {list.slice(0, limit).map((row) => <ProjectRow key={row.project.id} row={row} quickPay={filter === 'unsettled'} />)}
            </ul>
          )}
          {list.length > limit && <button type="button" className="btn btn--block" onClick={() => setLimit((n) => n + PAGE)}>{t('common.more')}</button>}
        </>
      ) : (
        <EmptyState title={t('projects.noneTitle')} text={t('projects.noneText')}>
          <button type="button" className="btn" onClick={() => (type(''), go({ filter: 'all', service: '' }))}>{t('projects.clear')}</button>
        </EmptyState>
      )}
    </>
  )
}

// عبارت جست‌وجو بعد از برگشت از جزئیات می‌مونه
function sessionStorageGet(key) {
  try {
    return window.sessionStorage.getItem(key) || ''
  } catch {
    return ''
  }
}
function sessionStorageSet(key, value) {
  try {
    window.sessionStorage.setItem(key, value)
  } catch {
    /* مهم نیست */
  }
}
