import { useApp } from '../context/AppContext.jsx'
import { markBackup, serializeBackup } from '../lib/domain/backup.js'
import { downloadFile } from '../lib/download.js'

// مرورگرها فایل json رو توی اشتراک‌گذاری قبول نمی‌کنن، پس همون محتوا با پسوند txt
const shareFile = (text, name) => new File([text], name, { type: 'text/plain' })

function canShareFiles() {
  try {
    return Boolean(navigator.canShare?.({ files: [shareFile('ravon', 'ravon.txt')] }))
  } catch {
    return false
  }
}

export function useBackup() {
  const { db, t, run, ctx, toast } = useApp()
  const download = () => {
    const context = ctx()
    downloadFile(`ravon-backup-${context.today}.json`, serializeBackup(db, context), 'application/json')
    run(markBackup, context)
    toast(t('settings.backupDone'))
  }
  const share = async () => {
    const context = ctx()
    const file = shareFile(serializeBackup(db, context), `ravon-backup-${context.today}.txt`)
    try {
      await navigator.share({ files: [file] })
    } catch (error) {
      // خودش پشیمون شده؛ چیزی ثبت نمی‌شه
      if (error?.name !== 'AbortError') download()
      return
    }
    run(markBackup, context)
    toast(t('backup.shared'))
  }
  return { canShare: canShareFiles(), share, download }
}
