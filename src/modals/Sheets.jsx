import { useApp } from '../context/AppContext.jsx'
import ChargeSheet from './ChargeSheet.jsx'
import ClientSheet from './ClientSheet.jsx'
import ConfirmSheet from './ConfirmSheet.jsx'
import FollowUp from './FollowUp.jsx'
import PaymentSheet from './PaymentSheet.jsx'
import ProjectEdit from './ProjectEdit.jsx'
import QuickAdd from './QuickAdd.jsx'
import StatusSheet from './StatusSheet.jsx'
import TimeSheet, { TimerConfirm } from './TimeSheet.jsx'
import WhatsNew from './WhatsNew.jsx'

const SHEETS = {
  quickAdd: QuickAdd,
  status: StatusSheet,
  payment: PaymentSheet,
  time: TimeSheet,
  timerConfirm: TimerConfirm,
  projectEdit: ProjectEdit,
  client: ClientSheet,
  confirm: ConfirmSheet,
  whatsNew: WhatsNew,
  followUp: FollowUp,
  charge: ChargeSheet,
}

export default function Sheets() {
  const { sheet } = useApp()
  if (!sheet) return null
  const Component = SHEETS[sheet.type]
  return <Component key={sheet.key} {...sheet.props} />
}
