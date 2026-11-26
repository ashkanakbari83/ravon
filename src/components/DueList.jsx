// مهلت تحویل: هر کار یه کاشیِ شمارش روز داره، تا دیر/مونده بدون تفسیر خونده بشه.
import { useApp } from '../context/AppContext.jsx'
import { href } from '../hooks/useRoute.js'
import Icon from './Icon.jsx'

function Countdown({ due }) {
  const { t, fmt } = useApp()
  if (due.state === 'today' || due.days === 1 && due.state !== 'overdue') {
    return <strong className="count__word">{t(due.state === 'today' ? 'common.today' : 'pick.tomorrow')}</strong>
  }
  return (
    <>
      <strong className="count__number">{fmt.num(due.days)}</strong>
      <span className="count__label">{t(due.state === 'overdue' ? 'count.late' : 'count.left')}</span>
    </>
  )
}

export default function DueList({ rows }) {
  const { t, fmt, serviceName, changeStatus } = useApp()
  return (
    <ol className="duelist">
      {rows.map(({ project, client, due }) => (
        <li key={project.id} className="duelist__row">
          <a className="duelist__link" href={href(`project/${project.id}`)}>
            <span className={`count count--${due.state}`}>
              <Countdown due={due} />
            </span>
            <span className="duelist__title">{project.title}</span>
            <span className="duelist__sub">
              <span className="duelist__client">{client?.name || serviceName(project.service)}</span>
              <span className="duelist__date">{fmt.date(project.dueDate)}</span>
            </span>
          </a>
          <button type="button" className="duelist__done" aria-label={t('step.deliverOf', { title: project.title })} title={t('step.deliver')} onClick={() => changeStatus(project.id, 'delivered')}>
            <span><Icon name="check" size={18} /></span>
          </button>
        </li>
      ))}
    </ol>
  )
}
