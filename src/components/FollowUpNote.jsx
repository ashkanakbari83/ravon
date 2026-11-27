import { useApp } from '../context/AppContext.jsx'
import { daysSinceFollowUp } from '../lib/domain/followup.js'

export default function FollowUpNote({ project, className, short = false }) {
  const { t, today } = useApp()
  const days = daysSinceFollowUp(project, today)
  if (days === null) return null
  const when = days === 0 ? t('follow.today') : days === 1 ? t('follow.yesterday') : t('follow.daysAgo', { n: days })
  return <span className={className}>{t(short ? 'follow.lastShort' : 'follow.last', { when })}</span>
}
