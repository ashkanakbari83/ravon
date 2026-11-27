import { useRef } from 'react'
import Icon from '../components/Icon.jsx'
import { Chips } from '../components/ui.jsx'
import { useApp } from '../context/AppContext.jsx'
import { RELEASES } from '../data/releases.js'
import { useBackup } from '../hooks/useBackup.js'
import { useInstall } from '../hooks/useInstall.js'
import { usePersistentStorage } from '../hooks/usePersistentStorage.js'
import { parseBackup } from '../lib/domain/backup.js'
import { ACCENTS, THEMES } from '../lib/domain/constants.js'
import { loadDemo, removeDemo } from '../lib/domain/demo.js'
import { markReleasesSeen } from '../lib/domain/releases.js'
import { CURRENCIES } from '../lib/format.js'

export default function Settings() {
  const { db, t, fmt, locale, run, ctx, wipe, commit, toast, openSheet } = useApp()
  const file = useRef(null)
  const app = useInstall()
  const setting = (key, value) => commit({ ...db, settings: { ...db.settings, [key]: value } })

  const backup = useBackup()
  const persisted = usePersistentStorage(db.projects.some((p) => !p.demo))
  const restore = async (event) => {
    const selected = event.target.files?.[0]
    event.target.value = ''
    if (!selected) return
    const result = parseBackup(await selected.text())
    if (!result.ok) return toast(t(result.error), { tone: 'bad' })
    openSheet('confirm', {
      title: t('settings.restore'),
      text: t('settings.restoreConfirm', { n: result.db.projects.length }),
      action: t('settings.restoreDo'),
      // پشتیبان قدیمی نباید «تازه‌ها»ی دیده‌شده رو دوباره بیاره
      onConfirm: () => (commit(markReleasesSeen(result.db, db.meta.seenRelease).db), toast(t('settings.restored'))),
    })
  }
  const demo = (level) => run(loadDemo, level, ctx()).ok && toast(t('settings.demoLoaded'))

  return (
    <>
      <h1 className="page-title">{t('nav.settings')}</h1>
      <div className="settings">
        <section className="card">
          <h2>{t('settings.look')}</h2>
          <Chips label={t('settings.look')} value={db.settings.theme} onChange={(v) => setting('theme', v)} options={THEMES.map((v) => ({ value: v, label: t(`settings.theme.${v}`) }))} />
          <h2>{t('settings.accent')}</h2>
          <Chips label={t('settings.accent')} value={db.settings.accent} onChange={(v) => setting('accent', v)} options={ACCENTS.map((v) => ({
            value: v,
            label: (
              <>
                <span className="swatch" data-accent={v} aria-hidden="true" />
                {t(`settings.accent.${v}`)}
              </>
            ),
          }))} />
          <h2>{t('settings.currency')}</h2>
          <Chips label={t('settings.currency')} value={db.settings.currency} onChange={(v) => setting('currency', v)} options={Object.entries(CURRENCIES).map(([v, c]) => ({ value: v, label: c[locale] }))} />
          <p className="muted">{t('settings.currencyHint')}</p>
        </section>
        {app.mode && (
          <section className="card">
            <h2>{t('settings.install')}</h2>
            <p className="muted">{t('settings.installHint')}</p>
            {app.mode === 'prompt' ? (
              <button type="button" className="btn btn--primary btn--block" onClick={app.install}><Icon name="download" />{t('settings.installDo')}</button>
            ) : (
              <p><strong>{t('settings.installIos')}</strong></p>
            )}
          </section>
        )}
        <section className="card">
          <h2>{t('settings.backup')}</h2>
          <p className="muted">{t('settings.backupHint')}</p>
          <p><strong>{db.meta.lastBackupAt ? t('settings.backupLast', { date: fmt.date(db.meta.lastBackupAt) }) : t('settings.backupNever')}</strong></p>
          {backup.canShare && (
            <>
              <button type="button" className="btn btn--primary btn--block" onClick={backup.share}><Icon name="send" />{t('backup.share')}</button>
              <p className="muted">{t('backup.shareHint')}</p>
            </>
          )}
          <button type="button" className={backup.canShare ? 'btn btn--block' : 'btn btn--primary btn--block'} onClick={backup.download}><Icon name="download" />{t('settings.backupDownload')}</button>
          <button type="button" className="btn btn--block" onClick={() => file.current.click()}><Icon name="upload" />{t('settings.restore')}</button>
          <input ref={file} type="file" accept="application/json,.json,text/plain,.txt" hidden onChange={restore} data-testid="restore-input" />
          {persisted !== null && <p className="muted">{t(persisted ? 'safety.on' : 'safety.off')}</p>}
        </section>
        <section className="card">
          <h2>{t('settings.demo')}</h2>
          <p className="muted">{t('settings.demoHint')}</p>
          <div className="duo">
            <button type="button" className="btn" aria-pressed={db.meta.demo === 'light'} onClick={() => demo('light')}>{t('settings.demoLight')}</button>
            <button type="button" className="btn" aria-pressed={db.meta.demo === 'busy'} onClick={() => demo('busy')}>{t('settings.demoBusy')}</button>
          </div>
          {db.meta.demo && <button type="button" className="btn btn--block" onClick={() => run(removeDemo).ok && toast(t('settings.demoRemoved'))}>{t('settings.demoRemove')}</button>}
        </section>
        <section className="card">
          <div className="setting">
            <button type="button" className="link" onClick={() => openSheet('whatsNew', { all: true })}>{t('news.open')}</button>
            <span className="muted">{t('news.version', { version: fmt.digits(RELEASES[0].version) })}</span>
          </div>
        </section>
        <button type="button" className="link link--danger" onClick={() => openSheet('confirm', { title: t('settings.wipe'), text: t('settings.wipeConfirm'), action: t('settings.wipe'), onConfirm: () => (wipe(), toast(t('settings.wiped'))) })}>
          {t('settings.wipe')}
        </button>
      </div>
    </>
  )
}
