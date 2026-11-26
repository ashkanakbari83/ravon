import { expect, test as base } from '@playwright/test'

/** هر تست خطای صفحه و کنسول رو هم چک می‌کنه */
export const test = base.extend({
  page: async ({ page }, use) => {
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    await use(page)
    expect(errors, 'بدون خطای صفحه').toEqual([])
  },
})
export { expect }

export async function startFresh(page) {
  await page.goto('./')
  await page.getByRole('button', { name: 'شروع از صفر' }).click()
}

export async function startDemo(page, name = 'اول با داده‌ی نمونه ببینم') {
  await page.goto('./')
  await page.getByRole('button', { name }).click()
  await expect(page.getByRole('heading', { name: 'مهلت تحویل' })).toBeVisible()
}

export const state = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ravon:state')))
export const sheet = (page) => page.getByRole('dialog')
export const toast = (page) => page.locator('.toasts')

export async function go(page, path) {
  await page.evaluate((p) => (window.location.hash = p), `#/${path}`)
  await expect(page.locator('.loading')).toHaveCount(0)
}

export async function quickAdd(page, { title, client, service = 'ریلز', amount }) {
  await page.locator('.nav__new').click()
  const dialog = sheet(page)
  await dialog.getByLabel('عنوان').fill(title)
  await dialog.getByLabel('کارفرما', { exact: true }).fill(client)
  const chip = dialog.getByRole('button', { name: service, exact: true })
  // خدمت‌های کم‌استفاده پشت «بیشتر»ان
  if (!(await chip.count())) await dialog.getByRole('button', { name: 'بیشتر', exact: true }).click()
  await chip.click()
  await dialog.getByLabel('مبلغ', { exact: true }).fill(amount)
  await dialog.getByRole('button', { name: 'ثبت پروژه' }).click()
  await expect(dialog).toHaveCount(0)
}
