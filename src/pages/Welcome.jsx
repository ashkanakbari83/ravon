import Logo from '../components/Logo.jsx'
import { useApp } from '../context/AppContext.jsx'
import { loadDemo } from '../lib/domain/demo.js'

export default function Welcome() {
  const { db, t, run, ctx, commit } = useApp()
  return (
    <main className="welcome">
      <div className="welcome__art" aria-hidden="true">
        <svg viewBox="0 0 320 150">
          <path className="w-clip w-clip--a" d="M214 28h82" />
          <path className="w-clip w-clip--b" d="M96 62h118" />
          <path className="w-clip w-clip--c" d="M44 96h150" />
          <path className="w-clip w-clip--d" d="M150 130h108" />
          <path className="w-head" d="M214 6v138" />
        </svg>
      </div>
      <div className="welcome__brand"><Logo size={44} /><span>{t('app.name')}</span></div>
      <h1>{t('welcome.title')}</h1>
      <p>{t('welcome.text')}</p>
      <div className="welcome__actions">
        <button type="button" className="btn btn--primary btn--block" onClick={() => commit({ ...db, meta: { ...db.meta, onboarded: true } })}>{t('welcome.start')}</button>
        <button type="button" className="btn btn--block" onClick={() => run(loadDemo, 'busy', ctx())}>{t('welcome.demo')}</button>
        <button type="button" className="link" onClick={() => run(loadDemo, 'light', ctx())}>{t('welcome.demoLight')}</button>
      </div>
      <p className="welcome__note">{t('welcome.local')}</p>
    </main>
  )
}
