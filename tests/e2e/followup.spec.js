import { LATEST_RELEASE } from '../../src/data/releases.js'
import { expect, go, quickAdd, sheet, startFresh, state, test, toast } from './fixtures.js'

/** اشتراک‌گذاری و کلیپ‌بورد گوشی رو شبیه‌سازی می‌کنه؛ هر چی فرستاده شد توی window.__sent می‌مونه */
const fakeDevice = (page, { share = true, cancel = false } = {}) =>
  page.addInitScript(({ share, cancel }) => {
    window.__sent = []
    window.__persist = 0
    const set = (key, value) => Object.defineProperty(navigator, key, { configurable: true, value })
    set('share', share ? async (data) => {
      if (cancel) throw new DOMException('no', 'AbortError')
      const file = data.files?.[0]
      window.__sent.push(file ? { name: file.name, type: file.type, text: await file.text() } : { text: data.text })
    } : undefined)
    set('canShare', share ? () => true : undefined)
    set('clipboard', { writeText: async (text) => window.__sent.push({ copied: text }) })
    set('storage', { persisted: async () => false, persist: async () => ((window.__persist += 1), true) })
  }, { share, cancel })

const sent = (page) => page.evaluate(() => window.__sent)

async function oneProject(page) {
  await startFresh(page)
  await quickAdd(page, { title: 'تیزر کافه', client: 'کافه دُردی', amount: '3000000' })
  await go(page, 'projects')
  await page.getByRole('link', { name: /تیزر کافه/ }).click()
}

test('پیام پیگیری فرستاده و تاریخش ثبت می‌شه', async ({ page }) => {
  await fakeDevice(page)
  await oneProject(page)
  await page.getByRole('button', { name: 'پیام پیگیری' }).click()
  const box = sheet(page).getByLabel(/متن پیام/)
  await expect(box).toHaveValue(/تیزر کافه.*۳٬۰۰۰٬۰۰۰/)
  await box.fill('متن دلخواه خودم')
  await sheet(page).getByRole('button', { name: 'فرستادن' }).click()
  await expect(sheet(page)).toHaveCount(0)
  expect(await sent(page)).toEqual([{ text: 'متن دلخواه خودم' }])
  await expect(page.getByText('آخرین پیگیری: امروز')).toBeVisible()
  expect((await state(page)).projects[0].followedUpOn).toBeTruthy()
})

test('لغو اشتراک‌گذاری چیزی ثبت نمی‌کنه', async ({ page }) => {
  await fakeDevice(page, { cancel: true })
  await oneProject(page)
  await page.getByRole('button', { name: 'پیام پیگیری' }).click()
  await sheet(page).getByRole('button', { name: 'فرستادن' }).click()
  await expect(sheet(page)).toBeVisible()
  expect((await state(page)).projects[0].followedUpOn).toBeNull()
})

test('بدون اشتراک‌گذاری، کپی کار اصلیه', async ({ page }) => {
  await fakeDevice(page, { share: false })
  await oneProject(page)
  await page.getByRole('button', { name: 'پیام پیگیری' }).click()
  await expect(sheet(page).getByRole('button', { name: 'فرستادن' })).toHaveCount(0)
  await sheet(page).getByRole('button', { name: 'کپی متن' }).click()
  await expect(toast(page)).toContainText('متن کپی شد')
  expect((await sent(page))[0].copied).toContain('تیزر کافه')
})

test('در عرض ۳۲۰ تاریخ پیگیری توی خانه کامل دیده می‌شه و انتخاب سقف یک ردیفه', async ({ page }) => {
  await fakeDevice(page)
  await page.setViewportSize({ width: 320, height: 640 })
  await oneProject(page)
  await expect(page.locator('.revlimit .chip').first()).toBeVisible()
  const tops = await page.locator('.revlimit .chip').evaluateAll((chips) => chips.map((c) => Math.round(c.getBoundingClientRect().top)))
  expect(new Set(tops).size).toBe(1)
  await page.getByRole('button', { name: 'تحویل دادم' }).click()
  await page.getByRole('button', { name: 'پیام پیگیری' }).click()
  await sheet(page).getByRole('button', { name: 'فرستادن' }).click()
  await go(page, '')
  const note = page.locator('.awaiting .line__follow')
  await expect(note).toHaveText('پیگیری: امروز')
  expect(await note.evaluate((n) => n.scrollWidth <= n.clientWidth + 1)).toBe(true)
})

test('صفحه‌ی کارفرما: تماس، پیامک و واتساپ با شماره‌ی درست', async ({ page }) => {
  await fakeDevice(page)
  await oneProject(page)
  await go(page, 'clients')
  await page.getByRole('link', { name: /کافه دُردی/ }).click()
  await expect(page.locator('.contacts')).toHaveCount(0)
  await page.getByRole('button', { name: 'ویرایش کارفرما' }).click()
  await sheet(page).getByLabel('شماره‌ی تماس').fill('۰۹۱۲۳۴۵۶۷۸۹')
  await sheet(page).getByRole('button', { name: 'ذخیره' }).click()
  const contacts = page.locator('.contacts')
  await expect(contacts.getByRole('link', { name: 'تماس' })).toHaveAttribute('href', 'tel:09123456789')
  await expect(contacts.getByRole('link', { name: 'واتساپ' })).toHaveAttribute('href', 'https://wa.me/989123456789')
  await page.getByRole('button', { name: 'پیام پیگیری' }).click()
  await expect(sheet(page).getByRole('link', { name: 'پیامک' })).toHaveAttribute('href', /^sms:\+989123456789\?&body=/)
})

test('سقف اصلاح رایگان و هزینه‌ی اضافه با برگردون', async ({ page }) => {
  await fakeDevice(page)
  await oneProject(page)
  await page.getByRole('group', { name: 'اصلاح رایگانِ توافق‌شده' }).getByRole('button', { name: '۱', exact: true }).click()
  const plus = page.getByRole('button', { name: 'یه دور اصلاح اضافه کن' })
  await plus.click()
  await expect(page.getByText('اصلاح‌های رایگان تموم شد')).toBeVisible()
  await plus.click()
  await expect(page.getByText('۱ دور بیشتر از توافق')).toBeVisible()
  await page.getByRole('button', { name: 'هزینه‌ی اضافه' }).click()
  await sheet(page).getByRole('button', { name: 'اضافه کن به مبلغ' }).click()
  await expect(sheet(page).getByRole('alert')).toContainText('مبلغ اضافه')
  await sheet(page).getByLabel('مبلغ اضافه', { exact: true }).fill('500000')
  await sheet(page).getByRole('button', { name: 'اضافه کن به مبلغ' }).click()
  await expect(sheet(page)).toHaveCount(0)
  expect((await state(page)).projects[0].amount).toBe(3_500_000)
  await toast(page).getByRole('button', { name: 'برگردون' }).click()
  expect((await state(page)).projects[0].amount).toBe(3_000_000)
})

test('پشتیبان با اشتراک‌گذاری به‌صورت txt می‌ره و همون فایل برمی‌گرده', async ({ page }) => {
  await fakeDevice(page)
  await oneProject(page)
  await go(page, 'settings')
  await page.getByRole('button', { name: 'فرستادن پشتیبان' }).click()
  await expect(toast(page)).toContainText('پشتیبان فرستاده شد')
  const [file] = await sent(page)
  expect(file.name).toMatch(/^ravon-backup-\d{4}-\d{2}-\d{2}\.txt$/)
  expect(file.type).toBe('text/plain')
  expect((await state(page)).meta.lastBackupAt).toBeTruthy()
  await page.getByTestId('restore-input').setInputFiles({ name: file.name, mimeType: file.type, buffer: Buffer.from(file.text) })
  await expect(sheet(page)).toContainText('۱')
})

test('ماندگاری داده فقط برای داده‌ی واقعی درخواست می‌شه', async ({ page }) => {
  await fakeDevice(page)
  await startFresh(page)
  expect(await page.evaluate(() => window.__persist)).toBe(0)
  await quickAdd(page, { title: 'تیزر', client: 'علی', amount: '1000' })
  await expect.poll(() => page.evaluate(() => window.__persist)).toBeGreaterThan(0)
  await go(page, 'settings')
  await expect(page.getByText('داده‌ها رو خودکار پاک نکنه')).toBeVisible()
})

test('میان‌بُر آیکن برنامه فرم ثبت رو باز می‌کنه؛ «تازه‌ها» می‌مونه برای بعد', async ({ page }) => {
  await startFresh(page)
  await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('ravon:state'))
    db.meta.seenRelease = 1
    localStorage.setItem('ravon:state', JSON.stringify(db))
  })
  await page.goto('about:blank')
  await page.goto('./#/new')
  await expect(page.getByRole('dialog', { name: 'پروژه‌ی جدید' })).toBeVisible()
  await expect(page).toHaveURL(/#\/$/)
  await expect(sheet(page)).toHaveCount(1)
  expect((await state(page)).meta.seenRelease).toBeLessThan(LATEST_RELEASE)
  await page.keyboard.press('Escape')
  await expect(sheet(page)).toHaveCount(0)
  // برنامه‌ی باز هم با میان‌بُر فرم رو میاره
  await go(page, 'reports')
  await go(page, 'new')
  await expect(page.getByRole('dialog', { name: 'پروژه‌ی جدید' })).toBeVisible()
})

test('مانیفست سه میان‌بُر داره', async ({ page }) => {
  await page.goto('./')
  const manifest = await page.evaluate(async () => (await fetch('./manifest.webmanifest')).json())
  expect(manifest.shortcuts.map((s) => s.url)).toEqual(['./#/new', './#/projects?filter=unsettled', './#/reports'])
})
