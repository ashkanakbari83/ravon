import { useApp } from '../context/AppContext.jsx'
import { REVISION_LIMITS } from '../lib/domain/constants.js'
import { changeRevisions, extraRevisions, setRevisionLimit } from '../lib/domain/projects.js'
import Icon from './Icon.jsx'
import { Chips } from './ui.jsx'

export default function Revisions({ project }) {
  const { t, fmt, run, openSheet } = useApp()
  const { id, revisions, revisionLimit: limit } = project
  const over = extraRevisions(project)
  const full = limit != null && !over && revisions > 0 && revisions >= limit
  const options = [...new Set([...REVISION_LIMITS, ...(limit == null ? [] : [limit])])].sort((a, b) => a - b)
  return (
    <>
      <div className="counter">
        <span id="rev-label">{t('project.revisions')}</span>
        <div className="counter__control" role="group" aria-labelledby="rev-label">
          <button type="button" className="iconbtn" aria-label={t('project.revMinus')} disabled={!revisions} onClick={() => run(changeRevisions, id, -1)}><Icon name="minus" /></button>
          <output aria-live="polite" className={over ? 'counter__over' : undefined}>
            {limit == null || over ? fmt.num(revisions) : t('rev.of', { n: revisions, limit })}
          </output>
          <button type="button" className="iconbtn" aria-label={t('project.revPlus')} onClick={() => run(changeRevisions, id, 1)}><Icon name="plus" /></button>
        </div>
      </div>
      <div className="field revlimit">
        <span className="field__label" aria-hidden="true">{t('rev.limit')}</span>
        <Chips label={t('rev.limit')} value={limit} onChange={(v) => run(setRevisionLimit, id, v)}
          options={[{ value: null, label: t('rev.none') }, ...options.map((n) => ({ value: n, label: fmt.num(n) }))]} />
      </div>
      {full && <p className="revnote">{t('rev.full')}</p>}
      {over > 0 && (
        <p className="revnote revnote--over">
          <span>{t('rev.over', { n: over })}</span>
          {project.status !== 'cancelled' && <button type="button" className="btn btn--small" onClick={() => openSheet('charge', { projectId: id })}>{t('rev.charge')}</button>}
        </p>
      )}
    </>
  )
}
