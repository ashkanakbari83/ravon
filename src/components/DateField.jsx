import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { MONTHS, WEEKDAYS } from '../lib/format.js'
import { addDays, isoToJalali, jalaliMonthLength, jalaliToIso, shiftJalaliMonth, weekdayIndex } from '../lib/jalali.js'
import Icon from './Icon.jsx'

function Calendar({ value, onPick, max }) {
  const { t, fmt, today, locale } = useApp()
  const [view, setView] = useState(() => isoToJalali(value || today))
  const first = jalaliToIso(view.jy, view.jm, 1)
  const days = jalaliMonthLength(view.jy, view.jm)
  const move = (delta) => setView({ ...shiftJalaliMonth(view.jy, view.jm, delta), jd: 1 })
  return (
    <div className="cal">
      <div className="cal__head">
        <button type="button" className="iconbtn" onClick={() => move(-1)} aria-label={t('pick.prevMonth')}><Icon name="prev" /></button>
        <strong aria-live="polite">{MONTHS[locale][view.jm - 1]} {fmt.digits(view.jy)}</strong>
        <button type="button" className="iconbtn" onClick={() => move(1)} aria-label={t('pick.nextMonth')}><Icon name="next" /></button>
      </div>
      <div className="cal__grid">
        {WEEKDAYS[locale].map((d) => <span key={d} className="cal__weekday" aria-hidden="true">{d.slice(0, 1)}</span>)}
        {Array.from({ length: weekdayIndex(first) }, (_, i) => <span key={`gap${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const iso = addDays(first, i)
          return (
            <button key={iso} type="button" className={iso === today ? 'cal__day is-today' : 'cal__day'} aria-pressed={iso === value} aria-label={fmt.date(iso, { withYear: true })} disabled={Boolean(max) && iso > max} onClick={() => onPick(iso)}>
              {fmt.digits(i + 1)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** past=true: برای تاریخ پرداخت/زمان (امروز و عقب‌تر) */
export default function DateField({ label, value, onChange, past = false, collapsible = false }) {
  const { t, fmt, today } = useApp()
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const quick = past
    ? [[today, t('common.today')]]
    : [[today, t('common.today')], [addDays(today, 1), t('pick.tomorrow')], [addDays(today, 3), t('pick.in3')], [addDays(today, 7), t('pick.in7')]]
  const pick = (v) => {
    onChange(v)
    setOpen(false)
    setExpanded(false)
  }
  // جایی که تاریخ فقط خونده می‌شه، تا وقتی لازم نشده انتخاب‌گر باز نیست
  if (collapsible && !expanded) {
    return (
      <div className="setting">
        <span className="setting__label">{label}</span>
        <button type="button" className="chip" aria-expanded="false" aria-label={`${t('common.change')} ${label}`} onClick={() => setExpanded(true)}>
          <Icon name="calendar" size={16} />
          {value ? fmt.date(value, { weekday: true }) : t('due.none')}
        </button>
      </div>
    )
  }
  return (
    <div className="field" role="group" aria-label={label}>
      <span className="field__label">
        {label}
        {value && <strong className="field__value">{fmt.date(value, { weekday: true })}</strong>}
      </span>
      <div className="chips">
        {quick.map(([iso, text]) => (
          <button key={iso} type="button" className="chip" aria-pressed={value === iso} onClick={() => pick(iso)}>{text}</button>
        ))}
        <button type="button" className="chip" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <Icon name="calendar" size={16} />
          {t('pick.calendar')}
        </button>
        {!past && value && (
          <button type="button" className="chip chip--ghost" onClick={() => pick(null)}>{t('pick.clear')}</button>
        )}
      </div>
      {open && <Calendar value={value} onPick={pick} max={past ? today : null} />}
    </div>
  )
}
