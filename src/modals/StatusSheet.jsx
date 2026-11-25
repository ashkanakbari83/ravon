import Icon from '../components/Icon.jsx'
import Sheet from '../components/Sheet.jsx'
import { useApp } from '../context/AppContext.jsx'
import { STATUSES } from '../lib/domain/constants.js'
import { setStatus } from '../lib/domain/projects.js'

export default function StatusSheet({ projectId }) {
  const { db, t, run, ctx, closeSheet } = useApp()
  const project = db.projects.find((p) => p.id === projectId)
  if (!project) return null
  return (
    <Sheet title={t('status.change')}>
      <p className="sheet__context">{project.title}</p>
      <div className="options">
        {STATUSES.map((s) => (
          <button key={s} type="button" className={`option status--${s}`} aria-pressed={project.status === s} data-autofocus={project.status === s ? '' : undefined} onClick={() => run(setStatus, projectId, s, ctx()).ok && closeSheet()}>
            <span className="option__dot" aria-hidden="true" />
            {t(`status.${s}`)}
            {project.status === s && <Icon name="check" />}
          </button>
        ))}
      </div>
    </Sheet>
  )
}
