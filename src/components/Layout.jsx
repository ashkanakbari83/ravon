import { useApp } from '../context/AppContext.jsx'
import { useAppUpdate } from '../hooks/useAppUpdate.js'
import { href } from '../hooks/useRoute.js'
import { useNow } from '../hooks/useNow.js'
import { useStopTimer } from '../hooks/useStopTimer.js'
import { downloadFile } from '../lib/download.js'
import Icon from './Icon.jsx'
import Logo from './Logo.jsx'

const TABS = [
  { name: 'home', path: '', icon: 'home', label: 'nav.home', match: ['home'] },
  { name: 'projects', path: 'projects', icon: 'projects', label: 'nav.projects', match: ['projects', 'project'] },
  null,
  { name: 'clients', path: 'clients', icon: 'clients', label: 'nav.clients', match: ['clients', 'client'] },
  { name: 'reports', path: 'reports', icon: 'reports', label: 'nav.reports', match: ['reports'] },
]

function Nav({ route }) {
  const { t, openSheet } = useApp()
  return (
    <nav className="nav" aria-label={t('nav.main')}>
      <a className="nav__brand" href={href('')}>
        <Logo />
        <span>{t('app.name')}</span>
      </a>
      {TABS.map((tab) =>
        tab ? (
          <a key={tab.name} className="nav__tab" href={href(tab.path)} aria-current={tab.match.includes(route.name) ? 'page' : undefined}>
            <Icon name={tab.icon} size={22} />
            <span>{t(tab.label)}</span>
          </a>
        ) : (
          <button key="new" type="button" className="nav__new" aria-keyshortcuts="N" onClick={() => openSheet('quickAdd')}>
            <span className="nav__plus"><Icon name="plus" size={24} /></span>
            <span className="nav__newShort">{t('nav.newShort')}</span>
            <span className="nav__newLong">{t('nav.new')}</span>
            <kbd className="kbd" aria-hidden="true">N</kbd>
          </button>
        ),
      )}
      <a className="nav__settings" href={href('settings')} aria-current={route.name === 'settings' ? 'page' : undefined}>
        <Icon name="settings" size={22} />
        <span>{t('nav.settings')}</span>
      </a>
    </nav>
  )
}

function TimerBar() {
  const { db, t, fmt } = useApp()
  const stop = useStopTimer()
  const now = useNow(1000)
  const project = db.projects.find((p) => p.id === db.timer.projectId)
  const seconds = Math.max(0, Math.floor((now - Date.parse(db.timer.startedAt)) / 1000))
  const clock = `${Math.floor(seconds / 3600)}:${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  return (
    <div className="timerbar" role="region" aria-label={t('timer.running')}>
      <a href={href(`project/${project.id}`)} className="timerbar__info">
        <span className="timerbar__dot" aria-hidden="true" />
        <span className="timerbar__title">{project.title}</span>
        <time className="timerbar__clock" dir="ltr">{fmt.digits(clock)}</time>
      </a>
      <button type="button" className="btn btn--small" onClick={stop}>
        <Icon name="stop" size={16} />
        {t('time.stop')}
      </button>
    </div>
  )
}

function Toasts() {
  const { t, toasts, dismissToast, sheet } = useApp()
  const update = useAppUpdate()
  // خطاهای داخل برگه، توی خود برگه نشون داده می‌شن
  const visible = sheet ? toasts.filter((x) => x.tone !== 'bad') : toasts
  return (
    <div className="toasts" role="status" aria-live="polite">
      {update.ready && (
        <div className="toast toast--update">
          <span>{t('news.updateReady')}</span>
          <button type="button" onClick={update.apply}>{t('news.update')}</button>
        </div>
      )}
      {visible.map((x) => (
        <div key={x.id} className={`toast toast--${x.tone}`}>
          <span>{x.message}</span>
          {x.action && (
            <button type="button" onClick={() => (dismissToast(x.id), x.action.run())}>{x.action.label}</button>
          )}
        </div>
      ))}
    </div>
  )
}

function StorageBanner() {
  const { t, storageError, dismissStorageError, rawData } = useApp()
  if (!storageError) return null
  return (
    <div className="banner banner--bad" role="alert">
      <span>{t(`storage.${storageError}`)}</span>
      {storageError === 'corrupt' && (
        <button type="button" className="link" onClick={() => downloadFile('ravon-raw.json', rawData() || '', 'application/json')}>{t('storage.download')}</button>
      )}
      {storageError !== 'newer' && <button type="button" className="link" onClick={dismissStorageError}>{t('common.close')}</button>}
    </div>
  )
}

export default function Layout({ route, children }) {
  const { db, t } = useApp()
  return (
    <div className={db.timer ? 'shell shell--timer' : 'shell'}>
      <button type="button" className="skip" onClick={() => document.getElementById('main').focus()}>{t('nav.skip')}</button>
      <header className="topbar">
        <a className="topbar__brand" href={href('')}>
          <Logo size={30} />
          <span>{t('app.name')}</span>
        </a>
        <a className="iconbtn" href={href('settings')} aria-label={t('nav.settings')} aria-current={route.name === 'settings' ? 'page' : undefined}>
          <Icon name="settings" />
        </a>
      </header>
      <Nav route={route} />
      <main id="main" className="main" tabIndex={-1}>
        <StorageBanner />
        {children}
      </main>
      {db.timer && <TimerBar />}
      <Toasts />
    </div>
  )
}
