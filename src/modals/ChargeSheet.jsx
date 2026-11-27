import { useState } from 'react'
import MoneyInput from '../components/MoneyInput.jsx'
import Sheet from '../components/Sheet.jsx'
import { useApp } from '../context/AppContext.jsx'
import { addCharge, updateProject } from '../lib/domain/projects.js'

export default function ChargeSheet({ projectId }) {
  const { db, t, fmt, attempt, toast, closeSheet, undoAction } = useApp()
  const project = db.projects.find((p) => p.id === projectId)
  const [amount, setAmount] = useState(null)
  const [error, setError] = useState(null)
  if (!project) return null
  const submit = () => {
    const before = project.amount
    const result = attempt(addCharge, projectId, amount)
    if (!result.ok) return setError(result.error)
    closeSheet()
    toast(t('rev.charged', { amount: fmt.money(amount) }), { action: undoAction(updateProject, projectId, { amount: before }) })
  }
  return (
    <Sheet title={t('rev.chargeTitle')} onSubmit={submit} footer={<button type="submit" className="btn btn--primary btn--block">{t('rev.chargeDo')}</button>}>
      <p className="sheet__context">
        <span>{project.title}</span>
        <strong>{fmt.money(project.amount)}</strong>
      </p>
      <MoneyInput label={t('rev.chargeAmount')} value={amount} onChange={(v) => (setAmount(v), setError(null))} error={error && t(error)} />
      {amount > 0 && <p className="muted" aria-live="polite">{t('rev.chargeNew', { amount: fmt.money(project.amount + amount) })}</p>}
    </Sheet>
  )
}
