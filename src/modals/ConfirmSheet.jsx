import Sheet from '../components/Sheet.jsx'
import { useApp } from '../context/AppContext.jsx'

export default function ConfirmSheet({ title, text, action, onConfirm }) {
  const { t, closeSheet } = useApp()
  return (
    <Sheet title={title}
      footer={
        <div className="duo">
          <button type="button" className="btn" data-autofocus="" onClick={closeSheet}>{t('common.cancel')}</button>
          <button type="button" className="btn btn--danger" onClick={() => (closeSheet(), onConfirm())}>{action}</button>
        </div>
      }>
      <p>{text}</p>
    </Sheet>
  )
}
