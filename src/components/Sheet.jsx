// برگه‌ی پایین (موبایل) / پنجره‌ی وسط (دسکتاپ) روی <dialog> بومی: فوکوس، Esc و دکمه‌ی برگشت اندروید مجانی.
import { useEffect, useId, useRef } from 'react'
import { useApp } from '../context/AppContext.jsx'
import Icon from './Icon.jsx'

/** کیبورد iOS روی صفحه می‌افته؛ برگه به اندازه‌ش بالا میاد */
function useKeyboardInset(ref) {
  useEffect(() => {
    const view = window.visualViewport
    if (!view) return
    const fit = () => {
      const covered = window.innerHeight - view.height - view.offsetTop
      // تغییرهای کوچیک (نوار آدرس) و زوم، کیبورد حساب نمی‌شن
      ref.current?.style.setProperty('--kb', `${covered > 120 && view.scale < 1.05 ? Math.round(covered) : 0}px`)
    }
    fit()
    view.addEventListener('resize', fit)
    view.addEventListener('scroll', fit)
    return () => {
      view.removeEventListener('resize', fit)
      view.removeEventListener('scroll', fit)
    }
  }, [])
}

const CLOSE_AFTER = 90

/** کشیدن سربرگ به پایین، برگه رو می‌بنده (فقط لمسی) */
function useSwipeDown(ref, close) {
  const from = useRef(null)
  const end = (event, cancelled) => {
    if (from.current == null) return
    const moved = event.clientY - from.current
    from.current = null
    ref.current.style.translate = ''
    if (!cancelled && moved > CLOSE_AFTER) close()
  }
  return {
    onPointerDown: (event) => {
      if (event.pointerType !== 'touch' || event.target.closest('button')) return
      from.current = event.clientY
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    onPointerMove: (event) => {
      if (from.current != null) ref.current.style.translate = `0 ${Math.max(0, event.clientY - from.current)}px`
    },
    onPointerUp: (event) => end(event, false),
    onPointerCancel: (event) => end(event, true),
  }
}

export default function Sheet({ title, children, footer, onSubmit, onClose }) {
  const { t, closeSheet, toasts } = useApp()
  const close = onClose || closeSheet
  const ref = useRef(null)
  const swipe = useSwipeDown(ref, close)
  const titleId = useId()
  useKeyboardInset(ref)
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
    <dialog ref={ref} className="sheet" aria-labelledby={titleId} tabIndex={-1} onCancel={(e) => (e.preventDefault(), close())} onClose={(e) => !e.currentTarget.open && e.currentTarget.isConnected && close()} onClick={(e) => e.target === ref.current && close()}>
      <Body
        className="sheet__box"
        noValidate={onSubmit ? true : undefined}
        onSubmit={onSubmit ? (e) => (e.preventDefault(), onSubmit()) : undefined}
      >
        <header className="sheet__head" {...swipe}>
          <span className="sheet__grab" aria-hidden="true" />
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="iconbtn" onClick={close} aria-label={t('common.close')}>
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
