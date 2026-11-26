import { useApp } from '../context/AppContext.jsx'
import { cameFrom, href } from '../hooks/useRoute.js'
import { dueInfo } from '../lib/domain/projects.js'
import Icon from './Icon.jsx'

export function EmptyState({ title, text, children }) {
  return (
    <div className="empty">
      <svg className="empty__art" viewBox="0 0 96 56" aria-hidden="true">
        <path d="M50 12h38M14 28h56M32 44h50" />
        <path className="empty__head" d="M60 4v48" />
      </svg>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
      {children && <div className="empty__actions">{children}</div>}
    </div>
  )
}

export function Chips({ label, options, value, onChange, scroll = false }) {
  return (
    <div className={scroll ? 'chips chips--scroll' : 'chips'} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" className="chip" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** نوار تسویه: سبز = دریافتی، هاشور = مانده */
export function MoneyBar({ paid, total, thin = false }) {
  const { t, fmt } = useApp()
  const ratio = total > 0 ? Math.min(1, paid / total) : 0
  return (
    <div className={thin ? 'moneybar moneybar--thin' : 'moneybar'} role="img" aria-label={t('money.barLabel', { received: fmt.short(paid), agreed: fmt.short(total) })}>
      {ratio > 0 && <span className="moneybar__paid" style={{ flexGrow: ratio }} />}
      {ratio < 1 && <span className="moneybar__rest" style={{ flexGrow: 1 - ratio }} />}
    </div>
  )
}

export function dueText(t, info) {
  if (info.state === 'none') return t('due.none')
  if (info.state === 'overdue') return t('due.overdue', { n: info.days })
  if (info.state === 'today') return t('due.today')
  if (info.state === 'delivered') return t('due.delivered')
  if (info.state === 'deliveredLate') return t('due.deliveredLate', { n: info.days })
  return info.days === 1 ? t('due.tomorrow') : t('due.days', { n: info.days })
}

export function DueTag({ project }) {
  const { t, today } = useApp()
  const info = dueInfo(project, today)
  if (info.state === 'none' || info.state === 'delivered') return null
  return <span className={`due due--${info.state}`}>{dueText(t, info)}</span>
}

export function StatusButton({ project }) {
  const { t, openSheet } = useApp()
  const label = t(`status.${project.status}`)
  return (
    <button type="button" className={`status status--${project.status}`} onClick={() => openSheet('status', { projectId: project.id })} aria-label={t('status.of', { title: project.title, status: label })}>
      <span className="status__pill">
        {label}
        <Icon name="chevron" size={14} />
      </span>
    </button>
  )
}

export function ProjectRow({ row, showClient = true, quickPay = false }) {
  const { t, fmt, serviceName, openSheet } = useApp()
  const { project, client, paid, balance, payState } = row
  return (
    <li className="row">
      <a className="row__link" href={href(`project/${project.id}`)}>
        <span className="row__title">{project.title}</span>
        <span className="row__amount">{project.amount ? fmt.compact(project.amount) : t('pay.free')}</span>
        <span className="row__sub">
          {showClient && <span className="row__client">{client?.name}</span>}
          <span className="row__service">{serviceName(project.service)}</span>
        </span>
        <span className={`row__pay row__pay--${payState}`}>
          {payState === 'paid' && t('pay.paid')}
          {balance > 0 && t('projects.owed', { amount: fmt.compact(balance) })}
        </span>
      </a>
      <div className="row__foot">
        <StatusButton project={project} />
        <DueTag project={project} />
        {balance > 0 && (quickPay || project.status === 'delivered') ? (
          <button type="button" className="row__action" aria-label={`${t('pay.add')}: ${project.title}`} onClick={() => openSheet('payment', { projectId: project.id })}>
            <span><Icon name="wallet" size={14} />{t('pay.addShort')}</span>
          </button>
        ) : (
          balance > 0 && paid > 0 && <MoneyBar paid={paid} total={project.amount} thin />
        )}
      </div>
    </li>
  )
}

export function Stat({ label, value, to, tone }) {
  const body = (
    <>
      <span className="stat__value">{value}</span>
      <span className="stat__label">{label}</span>
    </>
  )
  const className = tone ? `stat stat--${tone}` : 'stat'
  return to ? (
    <a className={className} href={href(to)}>{body}</a>
  ) : (
    <div className={className}>{body}</div>
  )
}

export function BackLink({ to, children }) {
  // اگه از همون صفحه اومده، برگشت واقعی تا فیلتر و جای فهرست بمونه
  const back = (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || !cameFrom(to)) return
    event.preventDefault()
    window.history.back()
  }
  return (
    <a className="back" href={href(to)} onClick={back}>
      <Icon name="back" size={18} />
      {children}
    </a>
  )
}
