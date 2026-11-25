import { useId, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { clientsByRecency, findClientByName, normalizeText } from '../lib/domain/clients.js'
import { SERVICES } from '../lib/domain/constants.js'

/** یک فیلد برای هر دو کار: انتخاب کارفرمای قبلی یا نوشتن اسم جدید */
export function ClientPicker({ value, onChange }) {
  const { db, t } = useApp()
  const id = useId()
  const sorted = useMemo(() => clientsByRecency(db), [db])
  const query = normalizeText(value)
  const exact = value && findClientByName(db, value)
  const matches = exact ? [exact] : sorted.filter((c) => normalizeText(c.name).includes(query)).slice(0, 6)
  return (
    <div className="field">
      <label htmlFor={id}>{t('f.client')}</label>
      <input id={id} className="input" value={value} placeholder={t('quick.clientPh')} autoComplete="off" maxLength={80} enterKeyHint="next" onChange={(e) => onChange(e.target.value)} />
      {matches.length > 0 && (
        <div className="chips chips--scroll" role="group" aria-label={t('nav.clients')}>
          {matches.map((c) => (
            <button key={c.id} type="button" className="chip" aria-pressed={exact?.id === c.id} onClick={() => onChange(exact?.id === c.id ? '' : c.name)}>
              {c.name}
            </button>
          ))}
        </div>
      )}
      {query && !exact && <p className="field__hint">{t('quick.newClient', { name: value.trim() })}</p>}
    </div>
  )
}

/** خدمت‌ها به ترتیب پرکاربردی؛ سفارشی هم می‌شه */
export function useServiceOptions() {
  const { db } = useApp()
  return useMemo(() => {
    const count = new Map(SERVICES.map((s) => [s, 0]))
    for (const p of db.projects) count.set(p.service, (count.get(p.service) || 0) + 1)
    return [...count.keys()].sort((a, b) => (a === 'other') - (b === 'other') || count.get(b) - count.get(a))
  }, [db.projects])
}

export function ServicePicker({ value, onChange }) {
  const { t, serviceName } = useApp()
  const options = useServiceOptions()
  const [custom, setCustom] = useState(false)
  const [all, setAll] = useState(false)
  const top = options.slice(0, 6)
  const visible = all ? options : value && !custom && !top.includes(value) ? [...top.slice(0, 5), value] : top
  return (
    <div className="field" role="group" aria-label={t('f.service')}>
      <span className="field__label">{t('f.service')}</span>
      <div className="chips">
        {visible.map((s) => (
          <button key={s} type="button" className="chip" aria-pressed={!custom && value === s} onClick={() => (setCustom(false), onChange(s))}>
            {serviceName(s)}
          </button>
        ))}
        {all ? (
          <button type="button" className="chip chip--ghost" aria-pressed={custom} onClick={() => (setCustom(true), onChange(''))}>{t('service.custom')}</button>
        ) : (
          <button type="button" className="chip chip--ghost" aria-expanded="false" onClick={() => setAll(true)}>{t('service.more')}</button>
        )}
      </div>
      {custom && <input className="input" aria-label={t('service.customName')} placeholder={t('service.customName')} autoFocus maxLength={40} value={value} onChange={(e) => onChange(e.target.value)} />}
    </div>
  )
}
