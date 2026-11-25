import { useState } from 'react'
import DateField from '../components/DateField.jsx'
import MoneyInput from '../components/MoneyInput.jsx'
import Sheet from '../components/Sheet.jsx'
import { useApp } from '../context/AppContext.jsx'
import { addPayment } from '../lib/domain/payments.js'

export default function PaymentSheet({ projectId }) {
  const { rows, t, fmt, today, run, ctx, toast, closeSheet } = useApp()
  const row = rows.find((r) => r.project.id === projectId)
  const [amount, setAmount] = useState(row?.balance || null)
  const [date, setDate] = useState(today)
  const [note, setNote] = useState('')
  if (!row) return null
  const half = Math.round(row.balance / 2)
  const submit = () => {
    if (run(addPayment, projectId, { amount, date, note }, ctx()).ok) {
      closeSheet()
      toast(t('pay.done'))
    }
  }
  return (
    <Sheet title={t('pay.add')} onSubmit={submit} footer={<button type="submit" className="btn btn--primary btn--block" data-autofocus="">{t('pay.add')}</button>}>
      <p className="sheet__context">
        <span>{row.project.title}</span>
        <strong>{t('pay.remaining', { amount: fmt.money(row.balance) })}</strong>
      </p>
      <MoneyInput label={t('f.amount')} value={amount} onChange={setAmount} />
      <div className="chips">
        <button type="button" className="chip" aria-pressed={amount === row.balance} onClick={() => setAmount(row.balance)}>{t('pay.full')}</button>
        {half > 0 && <button type="button" className="chip" aria-pressed={amount === half} onClick={() => setAmount(half)}>{t('pay.half')}</button>}
      </div>
      <DateField label={t('f.date')} value={date} onChange={setDate} past />
      <div className="field">
        <label htmlFor="pay-note">{t('f.note')}</label>
        <input id="pay-note" className="input" value={note} placeholder={t('pay.notePh')} maxLength={200} onChange={(e) => setNote(e.target.value)} />
      </div>
    </Sheet>
  )
}
