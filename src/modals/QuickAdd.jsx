import { useEffect, useMemo, useRef, useState } from 'react'
import DateField from '../components/DateField.jsx'
import Icon from '../components/Icon.jsx'
import MoneyInput from '../components/MoneyInput.jsx'
import { ClientPicker, ServicePicker } from '../components/Pickers.jsx'
import Sheet from '../components/Sheet.jsx'
import { useApp } from '../context/AppContext.jsx'
import { navigate } from '../hooks/useRoute.js'
import { STATUSES } from '../lib/domain/constants.js'
import { createProject, suggestAmounts } from '../lib/domain/intake.js'

// هر خطا کنار فیلد خودش نشون داده می‌شه و فوکوس می‌ره همون‌جا
const ERROR_FIELD = { 'err.title': 'title', 'err.client': 'client', 'err.service': 'service', 'err.amount': 'amount', 'err.depositExceeds': 'deposit' }

export default function QuickAdd({ clientName = '' }) {
  const { db, t, attempt, ctx, toast, closeSheet, drafts } = useApp()
  const blank = () => {
    // آخرین خدمت از قبل انتخابه تا یک لمس کمتر بشه
    const last = [...db.projects].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
    return { title: '', clientName, service: last?.service || '', amount: null, deposit: null, dueDate: null, status: 'active', note: '' }
  }
  const [draft] = useState(() => (clientName ? null : drafts.current.quickAdd))
  const [restored, setRestored] = useState(Boolean(draft))
  const [form, setForm] = useState(() => draft || blank())
  const [more, setMore] = useState(() => Boolean(draft && (draft.dueDate || draft.deposit || draft.note)))
  const [error, setError] = useState(null)
  const box = useRef(null)
  const saved = useRef(false)
  const latest = useRef(form)
  latest.current = form
  const set = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }))
    setError((e) => (e && ERROR_FIELD[e] === key.replace('Name', '') ? null : e))
  }
  const suggestions = useMemo(() => suggestAmounts(db, form), [db, form.service, form.clientName])

  // بستن اتفاقی نباید نوشته‌ها رو بپرونه
  useEffect(
    () => () => {
      const f = latest.current
      if (!clientName) drafts.current.quickAdd = !saved.current && (f.title.trim() || f.amount != null || f.note.trim()) ? f : null
    },
    [],
  )

  useEffect(() => {
    if (!error) return
    const field = box.current?.querySelector(`[data-field="${ERROR_FIELD[error]}"]`)
    const target = field?.querySelector('input, button')
    target?.focus()
    field?.scrollIntoView({ block: 'nearest' })
  }, [error])

  // کلید «بعدی» کیبورد موبایل نباید فرم نصفه رو ثبت کنه
  const nextField = (event) => {
    if (event.key !== 'Enter' || event.target.tagName !== 'INPUT' || event.target.enterKeyHint !== 'next') return
    event.preventDefault()
    const inputs = [...box.current.querySelectorAll('input')]
    inputs[inputs.indexOf(event.target) + 1]?.focus()
  }

  const submit = () => {
    const result = attempt(createProject, form, ctx())
    if (!result.ok) {
      if (ERROR_FIELD[result.error] === 'deposit') setMore(true)
      setError(null)
      requestAnimationFrame(() => setError(result.error))
      return
    }
    saved.current = true
    closeSheet()
    toast(t('quick.done'), { action: { label: t('common.open'), run: () => navigate(`project/${result.id}`) } })
  }
  const message = (field) => (error && ERROR_FIELD[error] === field ? t(error) : null)

  return (
    <Sheet title={t('quick.title')} onSubmit={submit} footer={<button type="submit" className="btn btn--primary btn--block">{t('quick.submit')}</button>}>
      {restored && (
        <p className="draft">
          <span>{t('quick.draft')}</span>
          <button type="button" className="link" onClick={() => (setForm(blank()), setMore(false), setRestored(false))}>{t('quick.reset')}</button>
        </p>
      )}
      <div className="fields" ref={box} onKeyDown={nextField}>
        <div className="field" data-field="title">
          <label htmlFor="qa-title">{t('f.title')}</label>
          <input id="qa-title" className="input" data-autofocus="" aria-invalid={message('title') ? true : undefined} value={form.title} placeholder={t('quick.titlePh')} maxLength={120} autoComplete="off" enterKeyHint="next" onChange={(e) => set('title')(e.target.value)} />
          {message('title') && <p className="field__error" role="alert">{message('title')}</p>}
        </div>
        <div data-field="client"><ClientPicker value={form.clientName} onChange={set('clientName')} error={message('client')} /></div>
        <div data-field="service"><ServicePicker value={form.service} onChange={set('service')} error={message('service')} /></div>
        <div data-field="amount"><MoneyInput label={t('f.amount')} value={form.amount} onChange={set('amount')} error={message('amount')} suggestions={suggestions} /></div>
        <button type="button" className="disclosure" aria-expanded={more} onClick={() => setMore((v) => !v)}>
          <Icon name="chevron" size={18} />
          {t('quick.more')}
        </button>
        {more && (
          <>
            <DateField label={t('f.due')} value={form.dueDate} onChange={set('dueDate')} />
            <div data-field="deposit"><MoneyInput label={t('quick.deposit')} value={form.deposit} onChange={set('deposit')} error={message('deposit')} /></div>
            <div className="field" role="group" aria-label={t('f.status')}>
              <span className="field__label">{t('f.status')}</span>
              <div className="chips">
                {STATUSES.filter((s) => s !== 'cancelled').map((s) => (
                  <button key={s} type="button" className="chip" aria-pressed={form.status === s} onClick={() => set('status')(s)}>{t(`status.${s}`)}</button>
                ))}
              </div>
            </div>
            <div className="field">
              <label htmlFor="qa-note">{t('f.note')}</label>
              <textarea id="qa-note" className="input" rows={3} value={form.note} placeholder={t('project.notePh')} onChange={(e) => set('note')(e.target.value)} />
            </div>
          </>
        )}
      </div>
    </Sheet>
  )
}
