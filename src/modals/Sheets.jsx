import { useApp } from '../context/AppContext.jsx'
import ClientSheet from './ClientSheet.jsx'
import ConfirmSheet from './ConfirmSheet.jsx'
import PaymentSheet from './PaymentSheet.jsx'
import ProjectEdit from './ProjectEdit.jsx'
import QuickAdd from './QuickAdd.jsx'
import StatusSheet from './StatusSheet.jsx'
import TimeSheet, { TimerConfirm } from './TimeSheet.jsx'

const SHEETS = {
  quickAdd: QuickAdd,
  status: StatusSheet,
  payment: PaymentSheet,
  time: TimeSheet,
  timerConfirm: TimerConfirm,
  projectEdit: ProjectEdit,
  client: ClientSheet,
  confirm: ConfirmSheet,
}

export default function Sheets() {
  const { sheet } = useApp()
  if (!sheet) return null
  const Component = SHEETS[sheet.type]
  return <Component key={sheet.key} {...sheet.props} />
}
