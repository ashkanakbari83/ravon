import { EmptyState } from '../components/ui.jsx'
import { useApp } from '../context/AppContext.jsx'
import { href } from '../hooks/useRoute.js'

export default function NotFound() {
  const { t } = useApp()
  return (
    <EmptyState title={t('notFound.title')} text={t('notFound.text')}>
      <a className="btn btn--primary" href={href('')}>{t('notFound.home')}</a>
    </EmptyState>
  )
}
