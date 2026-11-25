// برگه‌ی پایین (موبایل) / پنجره‌ی وسط (دسکتاپ) روی <dialog> بومی: فوکوس، Esc و دکمه‌ی برگشت اندروید مجانی.
import { useEffect, useId, useRef } from 'react'
import { useApp } from '../context/AppContext.jsx'
import Icon from './Icon.jsx'

export default function Sheet({ title, children, footer, onSubmit }) {
  const { t, closeSheet, toasts } = useApp()
  const ref = useRef(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    const opener = document.activeElement
    if (!dialog.open) dialog.showModal()
    const first = dialog.querySelector('[data-autofocus]')
    if (first) first.focus()
    else dialog.focus()
    return () => {
      if (dialog.open) dialog.close()
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
    }
  }, [])

  const Body = onSubmit ? 'form' : 'div'
  const error = [...toasts].reverse().find((x) => x.tone === 'bad')
  return (
    <dialog ref={ref} className="sheet" aria-labelledby={titleId} tabIndex={-1} onCancel={(e) => (e.preventDefault(), closeSheet())} onClose={(e) => !e.currentTarget.open && e.currentTarget.isConnected && closeSheet()} onClick={(e) => e.target === ref.current && closeSheet()}>
      <Body
        className="sheet__box"
        noValidate={onSubmit ? true : undefined}
        onSubmit={onSubmit ? (e) => (e.preventDefault(), onSubmit()) : undefined}
      >
        <header className="sheet__head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="iconbtn" onClick={closeSheet} aria-label={t('common.close')}>
            <Icon name="close" />
          </button>
        </header>
        <div className="sheet__body">{children}</div>
        {(footer || error) && (
          <footer className="sheet__foot">
            {error && <p className="sheet__error" role="alert">{error.message}</p>}
            {footer}
          </footer>
        )}
      </Body>
    </dialog>
  )
}
