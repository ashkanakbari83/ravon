import { useState } from 'react'
import Sheet from '../components/Sheet.jsx'
import { useApp } from '../context/AppContext.jsx'
import { addClient, updateClient } from '../lib/domain/clients.js'

export default function ClientSheet({ clientId }) {
  const { db, t, run, ctx, toast, closeSheet } = useApp()
  const client = db.clients.find((c) => c.id === clientId)
  const [form, setForm] = useState({ name: client?.name || '', phone: client?.phone || '', handle: client?.handle || '', note: client?.note || '' })
  const input = (key, label, props = {}) => (
    <div className="field">
      <label htmlFor={`client-${key}`}>{label}</label>
      <input id={`client-${key}`} className="input" value={form[key]} autoComplete="off" onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} {...props} />
    </div>
  )
  const submit = () => {
    const result = client ? run(updateClient, client.id, form) : run(addClient, form, ctx())
    if (result.ok) {
      closeSheet()
      toast(t('clients.saved'))
    }
  }
  return (
    <Sheet title={t(client ? 'clients.edit' : 'clients.new')} onSubmit={submit} footer={<button type="submit" className="btn btn--primary btn--block">{t('common.save')}</button>}>
      {input('name', t('clients.name'), { maxLength: 80, 'data-autofocus': '' })}
      {input('phone', t('clients.phone'), { type: 'tel', dir: 'ltr', maxLength: 40 })}
      {input('handle', t('clients.handle'), { dir: 'ltr', maxLength: 80 })}
      <div className="field">
        <label htmlFor="client-note">{t('f.note')}</label>
        <textarea id="client-note" className="input" rows={3} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
      </div>
    </Sheet>
  )
}
