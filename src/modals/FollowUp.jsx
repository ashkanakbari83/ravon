import { useRef, useState } from 'react'
import Icon from '../components/Icon.jsx'
import Sheet from '../components/Sheet.jsx'
import { Chips } from '../components/ui.jsx'
import { useApp } from '../context/AppContext.jsx'
import { contactLinks } from '../lib/domain/contact.js'
import { followUpData, followUpText, markFollowedUp } from '../lib/domain/followup.js'

export default function FollowUp({ projectId, clientId }) {
  const { rows, t, fmt, run, ctx, toast, closeSheet } = useApp()
  const [scope, setScope] = useState('delivered')
  const data = followUpData(rows, { projectId, clientId, scope })
  const compose = (next) => (next ? followUpText(next, { t, money: fmt.money, date: fmt.date }) : '')
  const [text, setText] = useState(() => compose(data))
  const box = useRef(null)
  if (!data) return null

  const canSend = typeof navigator.share === 'function'
  const links = contactLinks(data.client, text)
  const done = (message) => {
    run(markFollowedUp, data.rows.map((r) => r.project.id), ctx())
    closeSheet()
    toast(message)
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      box.current.select()
      toast(t('follow.copyFailed'), { tone: 'bad' })
      return
    }
    done(t('follow.copied'))
  }
  const send = async () => {
    if (!canSend) return copy()
    try {
      await navigator.share({ text })
    } catch (error) {
      if (error?.name !== 'AbortError') await copy()
      return
    }
    done(t('follow.noted'))
  }
  const change = (next) => {
    setScope(next)
    setText(compose(followUpData(rows, { projectId, clientId, scope: next })))
  }
  // لینک باید اول باز بشه، بعد برگه بسته بشه
  const opened = () => setTimeout(() => done(t('follow.noted')), 0)

  return (
    <Sheet title={t('follow.title')} onSubmit={send}
      footer={
        <div className={canSend ? 'duo' : undefined}>
          {canSend && <button type="button" className="btn" onClick={copy}><Icon name="copy" />{t('follow.copy')}</button>}
          <button type="submit" className="btn btn--primary btn--block" data-autofocus="">
            <Icon name={canSend ? 'send' : 'copy'} />
            {t(canSend ? 'follow.send' : 'follow.copy')}
          </button>
        </div>
      }>
      <p className="sheet__context">
        <span>{data.client.name}</span>
        <strong>{t('pay.remaining', { amount: fmt.money(data.total) })}</strong>
      </p>
      {data.canNarrow && (
        <Chips label={t('follow.scope')} value={scope} onChange={change} options={[
          { value: 'delivered', label: t('follow.scopeDelivered') },
          { value: 'all', label: t('follow.scopeAll') },
        ]} />
      )}
      <div className="field">
        <label htmlFor="follow-text">{t('follow.message')}</label>
        <textarea id="follow-text" ref={box} className="input input--message" rows={6} value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      {(links.sms || links.whatsapp) && (
        <div className="chips" role="group" aria-label={t('follow.direct')}>
          {links.sms && <a className="chip" href={links.sms} onClick={opened}><Icon name="message" size={16} />{t('follow.sms')}</a>}
          {links.whatsapp && <a className="chip" href={links.whatsapp} target="_blank" rel="noopener noreferrer" onClick={opened}><Icon name="message" size={16} />{t('follow.whatsapp')}</a>}
        </div>
      )}
    </Sheet>
  )
}
