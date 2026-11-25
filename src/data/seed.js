// داده‌ی نمونه‌ی قطعی: با یک تاریخ مبدا، روی همه‌ی دستگاه‌ها دقیقاً یکیه. همه‌ی رکوردها demo و با id پیشوندی‌ان.
// برای اضافه‌کردن نمونه‌ی جدید: رکورد با release بالاتر بساز و SEED_RELEASE رو یکی زیاد کن.
import { addDays } from '../lib/jalali.js'
import { createRandom } from '../lib/prng.js'

export const SEED_RELEASE = 1

const CLIENTS = [
  ['آتلیه نور', 'atelier.noor'],
  ['کافه دُردی', 'dordi.cafe'],
  ['سارا محمدی', 'sara.vlogs'],
  ['پادکست راه‌آب', 'rahab.fm'],
  ['فروشگاه چوبینه', 'choobineh'],
  ['آکادمی زبان پارسه', 'parseh.academy'],
  ['امیرحسین رضایی', 'amir.tech'],
  ['کلینیک لبخند', 'labkhand.clinic'],
  ['برند پوشاک ترنج', 'toranj.wear'],
  ['استودیو هفت‌رنگ', 'haftrang'],
  ['نیلوفر کریمی', 'niloo.cooks'],
  ['گالری فیروزه', 'firoozeh.art'],
  ['باشگاه ورزشی آرش', 'arash.fit'],
  ['رستوران سماق', 'somagh.food'],
  ['مهدی صالحی', 'mehdi.travel'],
  ['شرکت داده‌پویان', 'dadehpouyan'],
  ['مزون ماهور', 'mahour.mezon'],
  ['آموزشگاه موسیقی نوا', 'nava.music'],
  ['الهام احمدی', 'elham.life'],
  ['املاک سپیدار', 'sepidar.home'],
  ['نشر کاغذ', 'kaghaz.pub'],
  ['عسل ارگانیک کوهپایه', 'koohpayeh'],
  ['حسین مرادی', 'hossein.cars'],
  ['کانال علمی ذره', 'zarreh.science'],
]

// [خدمت، حداقل مبلغ، حداکثر (تومان)، حداقل ساعت، حداکثر ساعت، روز تحویل، عنوان‌ها]
const CATALOG = [
  ['reels', 800e3, 3.5e6, 2, 9, 5, ['ریلز معرفی محصول', 'پک ریلز هفتگی', 'ریلز پشت صحنه', 'ریلز کمپین تخفیف', 'تیزر عمودی رویداد']],
  ['youtube', 2.5e6, 9e6, 6, 18, 8, ['ادیت قسمت جدید یوتیوب', 'ولاگ سفر', 'ویدیوی آموزشی بلند', 'بررسی محصول', 'مصاحبه‌ی یوتیوبی']],
  ['video', 3e6, 14e6, 8, 26, 12, ['تیزر تبلیغاتی', 'ویدیوی معرفی برند', 'کلیپ رویداد افتتاحیه', 'ویدیوی دوره‌ی آموزشی', 'مستند کوتاه تیم']],
  ['motion', 5e6, 22e6, 14, 40, 16, ['موشن معرفی اپ', 'اینفوموشن گزارش سال', 'لوگوموشن', 'موشن آموزشی']],
  ['cover', 300e3, 1.2e6, 1, 3, 2, ['طراحی کاور یوتیوب', 'کاور ریلز', 'کاور پادکست', 'تامبنیل سری جدید']],
  ['color', 1.5e6, 6e6, 4, 12, 6, ['اصلاح رنگ تیزر', 'کالرگرید موزیک‌ویدیو', 'اصلاح رنگ مصاحبه']],
  ['podcast', 900e3, 3.5e6, 3, 8, 5, ['تدوین قسمت پادکست', 'پاک‌سازی صدا و میکس', 'کلیپ‌های کوتاه پادکست']],
  ['content', 6e6, 18e6, 12, 30, 25, ['تولید محتوای ماهانه', 'تقویم محتوا و سناریو', 'فیلم‌برداری و ادیت پک محصول']],
]
const WEIGHTS = [0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 3, 4, 4, 4, 5, 6, 6, 7]

const LEVELS = {
  // openDue: فاصله‌ی ددلاین پروژه‌های باز از امروز
  light: { seed: 11, clients: 6, past: 12, span: 110, openDue: [-2, 1, 3, 9, null] },
  busy: { seed: 97, clients: CLIENTS.length, past: 128, span: 420, openDue: [-4, -1, 0, 1, 2, 4, 5, 7, 11, 15, 22, null] },
}

const round = (v, step = 50e3) => Math.round(v / step) * step
const at = (iso, hour) => `${iso}T${String(hour).padStart(2, '0')}:00:00.000Z`

export function buildSeed(level, anchor) {
  const config = LEVELS[level]
  const rnd = createRandom(config.seed)
  const mark = { demo: true, release: 1 }
  const seed = { clients: [], projects: [], payments: [], timeEntries: [] }

  for (let i = 0; i < config.clients; i += 1) {
    const [name, handle] = CLIENTS[i]
    seed.clients.push({
      id: `demo-c-${i + 1}`,
      name,
      handle,
      phone: '',
      note: '',
      createdAt: at(addDays(anchor, -config.span - 5 + i), 9),
      ...mark,
    })
  }

  let paymentNo = 0
  let timeNo = 0
  let itemNo = 0
  const pay = (projectId, amount, date) => {
    if (amount <= 0) return
    paymentNo += 1
    seed.payments.push({ id: `demo-pay-${paymentNo}`, projectId, amount, date, note: '', createdAt: at(date, 14), ...mark })
  }
  const log = (projectId, minutes, date) => {
    timeNo += 1
    seed.timeEntries.push({ id: `demo-t-${timeNo}`, projectId, minutes, date, note: '', source: 'manual', createdAt: at(date, 18), ...mark })
  }

  const total = config.past + config.openDue.length
  for (let i = 0; i < total; i += 1) {
    const openIndex = i - config.past
    const open = openIndex >= 0
    const [service, min, max, minH, maxH, lead, titles] = CATALOG[rnd.pick(WEIGHTS)]
    // کارهای گذشته هرچی جدیدتر، متراکم‌تر
    const createdAgo = open
      ? rnd.int(2, 18)
      : Math.round(config.span - (config.span - 4) * Math.pow((i + rnd.next()) / config.past, 0.85))
    const createdOn = addDays(anchor, -Math.max(1, createdAgo))
    const amount = round(min + rnd.next() * (max - min))
    const deliveredAgo = open ? null : Math.max(0, createdAgo - rnd.int(Math.ceil(lead / 2), lead + 2))
    const deliveredOn = open ? null : addDays(anchor, -deliveredAgo)
    const offset = open ? config.openDue[openIndex] : null
    const dueDate = open ? (offset == null ? null : addDays(anchor, offset)) : addDays(createdOn, lead)
    const cancelled = !open && rnd.chance(0.025)
    const status = open ? ['active', 'review', 'active', 'queued', 'active'][openIndex % 5] : cancelled ? 'cancelled' : 'delivered'
    const id = `demo-p-${i + 1}`
    const title = rnd.pick(titles)

    const items = []
    if (/پک|سری|ماهانه|کلیپ‌ها|دوره/.test(title) || (open && openIndex === 0)) {
      const count = rnd.int(3, 5)
      for (let k = 0; k < count; k += 1) {
        itemNo += 1
        const state = !open ? 'done' : k === 0 ? 'done' : k === 1 ? 'doing' : 'todo'
        items.push({ id: `demo-i-${itemNo}`, title: `ویدیوی ${'۱۲۳۴۵'[k]}`, status: state })
      }
    }

    seed.projects.push({
      id,
      title,
      clientId: seed.clients[rnd.chance(0.35) ? rnd.int(0, 3) : rnd.int(0, config.clients - 1)].id,
      service,
      amount,
      status,
      dueDate,
      note: open && openIndex % 4 === 0 ? 'فایل‌های خام رو توی درایو گذاشتن. موزیک بی‌کلام باشه.' : '',
      revisions: status === 'review' ? rnd.int(1, 3) : rnd.chance(0.3) ? rnd.int(1, 2) : 0,
      items,
      archived: !open && deliveredAgo > 240 && rnd.chance(0.4),
      createdAt: at(createdOn, rnd.int(8, 17)),
      createdOn,
      deliveredOn: status === 'delivered' ? deliveredOn : null,
      ...mark,
    })

    // پرداخت‌ها
    if (cancelled) {
      if (rnd.chance(0.5)) pay(id, round(amount * 0.2), createdOn)
    } else if (open) {
      if (rnd.chance(0.55)) pay(id, round(amount * rnd.pick([0.3, 0.4, 0.5])), createdOn)
    } else {
      const roll = rnd.next()
      const recent = deliveredAgo < 45
      const full = roll < (recent ? 0.55 : 0.95)
      const deposit = rnd.chance(0.6) ? round(amount * rnd.pick([0.3, 0.4, 0.5])) : 0
      pay(id, deposit, createdOn)
      const settleOn = addDays(anchor, -Math.max(0, deliveredAgo - rnd.int(0, 8)))
      if (full) pay(id, amount - deposit, settleOn)
      else if (rnd.chance(0.35)) pay(id, round((amount - deposit) * 0.5), settleOn)
    }

    // زمان
    const worked = Math.round((minH + rnd.next() * (maxH - minH)) * 60 * (open ? 0.2 + rnd.next() * 0.5 : 1))
    if (status !== 'queued' && !cancelled && rnd.chance(0.93)) {
      const lastAgo = open ? 0 : deliveredAgo
      const firstAgo = Math.max(lastAgo, createdAgo)
      const parts = Math.max(1, Math.min(5, Math.round(worked / 180)))
      let left = worked
      for (let k = 0; k < parts; k += 1) {
        const minutes = k === parts - 1 ? left : round(worked / parts, 15)
        left -= minutes
        if (minutes >= 15) log(id, Math.min(minutes, 600), addDays(anchor, -rnd.int(lastAgo, firstAgo)))
      }
    }
  }
  return seed
}
