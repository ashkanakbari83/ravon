// امضای بصری رَوون: ددلاین‌ها مثل تایم‌لاین تدوین. خط عمودی = امروز، هر کلیپ = فاصله تا تحویل.
import { useApp } from '../context/AppContext.jsx'
import { href } from '../hooks/useRoute.js'
import { addDays } from '../lib/jalali.js'
import Icon from './Icon.jsx'
import { dueText } from './ui.jsx'

const PAST = 5
const FUTURE = 16
const position = (days) => ((Math.max(-PAST, Math.min(FUTURE, days)) + PAST) / (PAST + FUTURE)) * 100

export default function Timeline({ rows }) {
  const { t, fmt, today, serviceName, changeStatus } = useApp()
  const todayAt = position(0)
  return (
    <div className="timeline" style={{ '--today': `${todayAt}%` }}>
      <div className="timeline__ruler" aria-hidden="true">
        {[0, 7, 14].map((d) => (
          <span key={d} style={{ insetInlineStart: `${position(d)}%` }}>{d === 0 ? t('common.today') : fmt.date(addDays(today, d))}</span>
        ))}
      </div>
      <ol className="timeline__list">
        {rows.map(({ project, client, due }) => {
          const signed = due.state === 'overdue' ? -due.days : due.days
          const at = position(signed)
          const start = Math.min(at, todayAt)
          const width = Math.abs(at - todayAt)
          return (
            <li key={project.id}>
              <button type="button" className="clip__done" aria-label={t('step.deliverOf', { title: project.title })} title={t('step.deliver')} onClick={() => changeStatus(project.id, 'delivered')}>
                <span><Icon name="check" size={16} /></span>
              </button>
              <a className={`clip clip--${due.state}${signed > FUTURE ? ' clip--beyond' : ''}`} href={href(`project/${project.id}`)}>
                <span className="clip__title">{project.title}</span>
                <span className="clip__due">{dueText(t, due)}</span>
                <span className="clip__client">{client?.name || serviceName(project.service)}</span>
                <span className="clip__track" aria-hidden="true">
                  <span className="clip__bar" style={{ insetInlineStart: `${start}%`, width: `${width}%` }} />
                  <span className="clip__end" style={{ insetInlineStart: `${at}%` }} />
                </span>
              </a>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
