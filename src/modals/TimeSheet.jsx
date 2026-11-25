import { useState } from 'react'
import DateField from '../components/DateField.jsx'
import Sheet from '../components/Sheet.jsx'
import { useApp } from '../context/AppContext.jsx'
import { addTime, discardTimer, elapsedMinutes, stopTimer } from '../lib/domain/time.js'
import { parseAmount } from '../lib/format.js'

function Duration({ hours, minutes, onHours, onMinutes }) {
  const { t, fmt } = useApp()
  const field = (id, label, value, onChange, max, auto) => (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} className="input input--number" inputMode="numeric" data-autofocus={auto ? '' : undefined} value={value === '' ? '' : fmt.digits(value)} placeholder={fmt.digits(0)}
        onChange={(e) => {
          if (!e.target.value.trim()) return onChange('')
          const n = parseAmount(e.target.value)
          if (n != null && n <= max) onChange(n)
        }} />
    </div>
  )
  return (
    <div className="duo">
      {field('dur-h', t('time.hours'), hours, onHours, 24, true)}
      {field('dur-m', t('time.minutes'), minutes, onMinutes, 999, false)}
    </div>
  )
}

export default function TimeSheet({ projectId }) {
  const { db, t, fmt, today, run, ctx, toast, closeSheet } = useApp()
  const project = db.projects.find((p) => p.id === projectId)
  const [hours, setHours] = useState('')
  const [minutes, setMinutes] = useState('')
  const [date, setDate] = useState(today)
  const [note, setNote] = useState('')
  if (!project) return null
  const total = Number(hours || 0) * 60 + Number(minutes || 0)
  const submit = () => {
    if (run(addTime, projectId, { minutes: total, date, note }, ctx()).ok) {
      closeSheet()
      toast(t('time.done', { time: fmt.clock(total) }))
    }
  }
  return (
    <Sheet title={t('time.add')} onSubmit={submit} footer={<button type="submit" className="btn btn--primary btn--block">{t('time.add')}</button>}>
      <p className="sheet__context">{project.title}</p>
      <Duration hours={hours} minutes={minutes} onHours={setHours} onMinutes={setMinutes} />
      <DateField label={t('f.date')} value={date} onChange={setDate} past />
      <div className="field">
        <label htmlFor="time-note">{t('f.note')}</label>
        <input id="time-note" className="input" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} />
      </div>
    </Sheet>
  )
}

export function TimerConfirm() {
  const { db, t, fmt, run, ctx, toast, closeSheet } = useApp()
  const [elapsed] = useState(() => (db.timer ? Math.min(24 * 60, elapsedMinutes(db.timer, new Date().toISOString())) : 0))
  const [hours, setHours] = useState(Math.floor(elapsed / 60))
  const [minutes, setMinutes] = useState(elapsed % 60)
  if (!db.timer) return null
  const total = Number(hours || 0) * 60 + Number(minutes || 0)
  const submit = () => {
    if (total < 1) return
    if (run(stopTimer, ctx(), { minutes: total }).ok) {
      closeSheet()
      toast(t('time.done', { time: fmt.clock(total) }))
    }
  }
  return (
    <Sheet title={t('timer.confirmTitle')} onSubmit={submit}
      footer={
        <div className="duo">
          <button type="button" className="btn" onClick={() => run(discardTimer).ok && closeSheet()}>{t('timer.discard')}</button>
          <button type="submit" className="btn btn--primary">{t('common.save')}</button>
        </div>
      }>
      <p>{t('timer.confirmText')}</p>
      <Duration hours={hours} minutes={minutes} onHours={setHours} onMinutes={setMinutes} />
    </Sheet>
  )
}
