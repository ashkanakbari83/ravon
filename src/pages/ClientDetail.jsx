import Icon from '../components/Icon.jsx'
import { BackLink, ProjectRow } from '../components/ui.jsx'
import { useApp } from '../context/AppContext.jsx'
import { navigate } from '../hooks/useRoute.js'
import { deleteClient } from '../lib/domain/clients.js'
import { sortRows } from '../lib/domain/projects.js'
import { moneyTotals } from '../lib/domain/stats.js'
import { toEnDigits } from '../lib/format.js'
import NotFound from './NotFound.jsx'

export default function ClientDetail({ id }) {
  const { db, rows, t, fmt, openSheet, run, toast } = useApp()
  const client = db.clients.find((c) => c.id === id)
  if (!client) return <NotFound />
  const mine = sortRows(rows.filter((r) => r.project.clientId === id))
  const money = moneyTotals(mine)
  const remove = () =>
    openSheet('confirm', {
      title: t('clients.delete'),
      text: t('clients.deleteConfirm', { name: client.name }),
      action: t('common.delete'),
      onConfirm: () => {
        navigate('clients')
        run(deleteClient, id)
        toast(t('clients.deleted'))
      },
    })
  return (
    <>
      <BackLink to="clients">{t('nav.clients')}</BackLink>
      <header className="detail-head">
        <div>
          <h1>{client.name}</h1>
          <p className="detail-head__sub">
            {client.phone && <a href={`tel:${toEnDigits(client.phone).replace(/\s/g, '')}`} dir="ltr">{client.phone}</a>}
            {client.handle && <bdi dir="ltr">{client.handle}</bdi>}
          </p>
        </div>
        <button type="button" className="iconbtn" aria-label={t('clients.edit')} onClick={() => openSheet('client', { clientId: id })}><Icon name="edit" /></button>
      </header>
      {client.note && <p className="note">{client.note}</p>}
      <dl className="trio card">
        <div><dt>{t('money.agreed')}</dt><dd>{fmt.compact(money.agreed)}</dd></div>
        <div className="trio__paid"><dt>{t('money.received')}</dt><dd>{fmt.compact(money.received)}</dd></div>
        <div className={money.outstanding ? 'trio__owed' : undefined}><dt>{t('money.outstanding')}</dt><dd>{fmt.compact(money.outstanding)}</dd></div>
      </dl>
      <div className="page-head">
        <h2>{t('clients.projects')}</h2>
        <button type="button" className="btn btn--small" onClick={() => openSheet('quickAdd', { clientName: client.name })}><Icon name="plus" size={18} />{t('clients.newProject')}</button>
      </div>
      {mine.length ? (
        <ul className="rows">{mine.map((row) => <ProjectRow key={row.project.id} row={row} showClient={false} />)}</ul>
      ) : (
        <>
          <p className="muted">{t('clients.noProjects')}</p>
          <button type="button" className="link link--danger" onClick={remove}>{t('clients.delete')}</button>
        </>
      )}
    </>
  )
}
