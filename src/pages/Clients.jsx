import { useMemo, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { Chips, EmptyState } from '../components/ui.jsx'
import { useApp } from '../context/AppContext.jsx'
import { href, replaceRoute } from '../hooks/useRoute.js'
import { normalizeText } from '../lib/domain/clients.js'
import { clientSummaries } from '../lib/domain/stats.js'

export default function Clients({ query }) {
  const { db, rows, t, fmt, openSheet } = useApp()
  const [search, setSearch] = useState('')
  const all = useMemo(() => clientSummaries(db, rows), [db, rows])
  const q = normalizeText(search)
  const filter = query.filter === 'owed' ? 'owed' : 'all'
  const found = all.filter((s) => normalizeText(`${s.client.name} ${s.client.handle} ${s.client.phone}`).includes(q))
  // طلب‌دارها: بیشترین طلب اول
  const list = filter === 'owed' ? found.filter((s) => s.outstanding > 0).sort((a, b) => b.outstanding - a.outstanding) : found
  return (
    <>
      <div className="page-head">
        <h1 className="page-title">{t('nav.clients')}</h1>
        <button type="button" className="btn btn--small" onClick={() => openSheet('client')}><Icon name="plus" size={18} />{t('clients.new')}</button>
      </div>
      {all.length === 0 ? (
        <EmptyState title={t('clients.emptyTitle')} text={t('clients.emptyText')} />
      ) : (
        <>
          <div className="toolbar">
            <label className="search">
              <Icon name="search" size={18} />
              <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('clients.search')} aria-label={t('clients.search')} />
            </label>
          </div>
          <div className="clients-filter">
            <Chips label={t('clients.filters')} value={filter} onChange={(f) => replaceRoute(`clients?filter=${f}`)} options={['all', 'owed'].map((f) => ({ value: f, label: t(`clients.filter.${f}`) }))} />
          </div>
          {list.length === 0 && (
            <EmptyState title={t('projects.noneTitle')} text={t(filter === 'owed' && !q ? 'clients.noneOwed' : 'projects.noneText')} />
          )}
          <ul className="rows rows--grid">
            {list.map(({ client, count, openCount, received, outstanding }) => (
              <li key={client.id} className="row">
                <a className="person" href={href(`client/${client.id}`)}>
                  <span className="person__initial" aria-hidden="true">{client.name.slice(0, 1)}</span>
                  <span className="person__name">{client.name}</span>
                  <span className="person__sub">
                    <span>{t('clients.count', { n: count })}</span>
                    {openCount > 0 && <span className="person__open">{t('clients.openCount', { n: openCount })}</span>}
                  </span>
                  <span className={outstanding ? 'person__money person__money--owed' : 'person__money'}>
                    <strong>{fmt.compact(outstanding || received)}</strong>
                    <small>{t(outstanding ? 'clients.owed' : 'clients.paidSoFar')}</small>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}
