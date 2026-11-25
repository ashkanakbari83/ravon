import { useState } from 'react'
import MoneyInput from '../components/MoneyInput.jsx'
import { ServicePicker } from '../components/Pickers.jsx'
import Sheet from '../components/Sheet.jsx'
import { useApp } from '../context/AppContext.jsx'
import { clientsByRecency } from '../lib/domain/clients.js'
import { updateProject } from '../lib/domain/projects.js'

export default function ProjectEdit({ projectId }) {
  const { db, t, run, closeSheet } = useApp()
  const project = db.projects.find((p) => p.id === projectId)
  const [form, setForm] = useState(() => project && { title: project.title, clientId: project.clientId, service: project.service, amount: project.amount })
  if (!project) return null
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))
  return (
    <Sheet title={t('project.edit')} onSubmit={() => run(updateProject, projectId, form).ok && closeSheet()} footer={<button type="submit" className="btn btn--primary btn--block">{t('common.save')}</button>}>
      <div className="field">
        <label htmlFor="edit-title">{t('f.title')}</label>
        <input id="edit-title" className="input" value={form.title} maxLength={120} onChange={(e) => set('title')(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="edit-client">{t('f.client')}</label>
        <select id="edit-client" className="input" value={form.clientId} onChange={(e) => set('clientId')(e.target.value)}>
          {clientsByRecency(db).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <ServicePicker value={form.service} onChange={set('service')} />
      <MoneyInput label={t('f.amount')} value={form.amount} onChange={set('amount')} />
    </Sheet>
  )
}
