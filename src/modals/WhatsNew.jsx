import { useState } from 'react'
import Sheet from '../components/Sheet.jsx'
import { useApp } from '../context/AppContext.jsx'
import { LATEST_RELEASE, RELEASES } from '../data/releases.js'
import { markReleasesSeen, unseenReleases } from '../lib/domain/releases.js'

export default function WhatsNew({ all = false }) {
  const { db, t, fmt, run, closeSheet } = useApp()
  const [fresh] = useState(() => (all ? RELEASES : unseenReleases(db, RELEASES)))
  const [older, setOlder] = useState(false)
  const shown = older ? RELEASES : fresh
  // فقط وقتی خود کاربر ببنده «دیده‌شده» حساب می‌شه
  const close = () => {
    run(markReleasesSeen, LATEST_RELEASE)
    closeSheet()
  }
  return (
    <Sheet title={t('news.title')} onClose={close} footer={<button type="button" className="btn btn--primary btn--block" data-autofocus="" onClick={close}>{t('news.ok')}</button>}>
      {shown.map((release) => (
        <section key={release.id} className="news">
          <h3>
            {t('news.version', { version: fmt.digits(release.version) })}
            <span>{fmt.date(release.date)}</span>
          </h3>
          <ul>
            {release.items.map((key) => <li key={key}>{t(key)}</li>)}
          </ul>
        </section>
      ))}
      {shown.length < RELEASES.length && (
        <button type="button" className="link" onClick={() => setOlder(true)}>{t('news.older')}</button>
      )}
    </Sheet>
  )
}
