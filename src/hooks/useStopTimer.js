import { useApp } from '../context/AppContext.jsx'
import { elapsedMinutes, stopTimer } from '../lib/domain/time.js'

/** تایمر بیش از ۸ ساعت: احتمالاً جا مونده، پس اول مدت رو تأیید می‌گیریم */
export function useStopTimer() {
  const { db, t, fmt, openSheet, run, ctx, toast } = useApp()
  return () => {
    if (!db.timer) return
    const context = ctx()
    const minutes = elapsedMinutes(db.timer, context.now)
    if (minutes > 8 * 60) return openSheet('timerConfirm')
    const result = run(stopTimer, context)
    if (result.ok) toast(result.discarded ? t('timer.discarded') : t('time.done', { time: fmt.clock(minutes) }))
  }
}
