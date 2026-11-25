import { expect, go, startDemo, test } from './fixtures.js'

const PAGES = ['', 'projects', 'projects?filter=unsettled', 'projects?filter=archived', 'clients', 'client/demo-c-1', 'project/demo-p-129', 'reports', 'settings']

const healthy = async (page) => {
  await expect(page.getByText('یه چیزی درست پیش نرفت')).toHaveCount(0)
  await expect(page.getByText('این صفحه پیدا نشد')).toHaveCount(0)
}

test('نوار اصلی: همه‌ی تب‌ها و دکمه‌ی ثبت', async ({ page }, info) => {
  await startDemo(page)
  const nav = page.getByRole('navigation', { name: 'منوی اصلی' })
  for (const [name, heading] of [['پروژه‌ها', 'پروژه‌ها'], ['کارفرماها', 'کارفرماها'], ['گزارش', 'گزارش'], ['خلاصه', 'خلاصه']]) {
    await nav.getByRole('link', { name }).click()
    await expect(page.getByRole('heading', { level: 1, name: heading })).toHaveCount(1)
    await expect(nav.getByRole('link', { name })).toHaveAttribute('aria-current', 'page')
  }
  await expect(nav.locator('a:visible, button:visible')).toHaveCount(info.project.name === 'mobile' ? 5 : 7)
  await page.getByRole('link', { name: 'تنظیمات' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'تنظیمات' })).toBeVisible()
  await nav.getByRole('button').click()
  await expect(page.getByRole('dialog', { name: 'پروژه‌ی جدید' })).toBeVisible()
})

test('همه‌ی لینک‌های داخلی به صفحه‌ی سالم می‌رسن', async ({ page }) => {
  test.slow()
  await startDemo(page)
  const targets = new Set()
  for (const path of PAGES) {
    await go(page, path)
    await healthy(page)
    for (const href of await page.locator('a[href^="#/"]').evaluateAll((links) => links.map((a) => a.getAttribute('href').slice(2)))) targets.add(href)
  }
  expect(targets.size).toBeGreaterThan(30)
  for (const target of targets) {
    await go(page, target)
    await healthy(page)
  }
})

test('هر نوع دکمه در هر صفحه بدون خطا کار می‌کنه', async ({ page }) => {
  test.setTimeout(180_000)
  await startDemo(page)
  const snapshot = await page.evaluate(() => localStorage.getItem('ravon:state'))
  let clicked = 0
  for (const path of PAGES) {
    // از هر «نوع» دکمه حداکثر چند تا
    const reset = async () => {
      await page.evaluate((s) => localStorage.setItem('ravon:state', s), snapshot)
      await go(page, 'settings')
      await page.reload()
      await go(page, path)
    }
    await reset()
    const picks = await page.locator('button').evaluateAll((buttons) => {
      const seen = new Map()
      return buttons.flatMap((b, index) => {
        const kind = `${b.className}|${b.closest('section,nav,header,div')?.className}`
        seen.set(kind, (seen.get(kind) || 0) + 1)
        return seen.get(kind) <= 2 && !b.disabled && b.checkVisibility() && !b.classList.contains('skip') ? [index] : []
      })
    })
    for (const index of picks) {
      await reset()
      await page.locator('button').nth(index).click()
      await healthy(page)
      const dialog = page.getByRole('dialog')
      if (await dialog.count()) {
        await dialog.getByRole('button', { name: 'بستن' }).click()
        await expect(dialog).toHaveCount(0)
      }
      clicked += 1
    }
  }
  expect(clicked).toBeGreaterThan(40)
})

test('مسیر نامعتبر و مورد حذف‌شده', async ({ page }) => {
  await startDemo(page)
  for (const path of ['nope', 'project/missing', 'client/missing']) {
    await go(page, path)
    await expect(page.getByRole('heading', { name: 'این صفحه پیدا نشد' })).toBeVisible()
  }
  await page.getByRole('link', { name: 'برو به خلاصه' }).click()
  await expect(page.getByRole('heading', { name: 'خط تحویل' })).toBeVisible()
})

test('دکمه‌ی برگشت مرورگر و برگه‌ها', async ({ page }) => {
  await startDemo(page)
  await go(page, 'projects')
  await page.locator('.row__link').first().click()
  await page.getByRole('button', { name: 'ثبت زمان' }).click()
  await page.goBack()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('heading', { level: 1, name: 'پروژه‌ها' })).toBeVisible()
})
