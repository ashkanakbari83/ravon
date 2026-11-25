import { useState } from 'react'
import DateField from '../components/DateField.jsx'
import Icon from '../components/Icon.jsx'
import MoneyInput from '../components/MoneyInput.jsx'
import { ClientPicker, ServicePicker } from '../components/Pickers.jsx'
import Sheet from '../components/Sheet.jsx'
import { useApp } from '../context/AppContext.jsx'
import { navigate } from '../hooks/useRoute.js'
import { STATUSES } from '../lib/domain/constants.js'
import { addProject } from '../lib/domain/projects.js'

export default function QuickAdd({ clientName = '' }) {
  const { db, t, run, ctx, toast, closeSheet } = useApp()
  const [form, setForm] = useState(() => {
    // آخرین خدمت از قبل انتخابه تا یک لمس کمتر بشه
    const last = [...db.projects].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
    return { title: '', clientName, service: last?.service || '', amount: null, dueDate: null, status: 'active', note: '' }
  })
  const [more, setMore] = useState(false)
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

  // کلید «بعدی» کیبورد موبایل نباید فرم نصفه رو ثبت کنه
  const nextField = (event) => {
    if (event.key !== 'Enter' || event.target.tagName !== 'INPUT' || event.target.enterKeyHint !== 'next') return
    event.preventDefault()
    const inputs = [...event.target.form.querySelectorAll('input')]
    inputs[inputs.indexOf(event.target) + 1]?.focus()
  }

  const submit = () => {
    const result = run(addProject, form, ctx())
    if (!result.ok) return
    closeSheet()
    toast(t('quick.done'), { action: { label: t('common.open'), run: () => navigate(`project/${result.id}`) } })
  }

  return (
    <Sheet title={t('quick.title')} onSubmit={submit} footer={<button type="submit" className="btn btn--primary btn--block">{t('quick.submit')}</button>}>
      <div className="fields" onKeyDown={nextField}>
        <div className="field">
          <label htmlFor="qa-title">{t('f.title')}</label>
          <input id="qa-title" className="input" data-autofocus="" value={form.title} placeholder={t('quick.titlePh')} maxLength={120} autoComplete="off" enterKeyHint="next" onChange={(e) => set('title')(e.target.value)} />
        </div>
        <ClientPicker value={form.clientName} onChange={set('clientName')} />
        <ServicePicker value={form.service} onChange={set('service')} />
        <MoneyInput label={t('f.amount')} value={form.amount} onChange={set('amount')} />
      </div>
      <button type="button" className="disclosure" aria-expanded={more} onClick={() => setMore((v) => !v)}>
        <Icon name="chevron" size={18} />
        {t('quick.more')}
      </button>
      {more && (
        <>
          <DateField label={t('f.due')} value={form.dueDate} onChange={set('dueDate')} />
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
    </Sheet>
  )
}
