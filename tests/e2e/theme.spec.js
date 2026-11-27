import { expect, go, startDemo, state, test } from './fixtures.js'

const background = (page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor)
const LIGHT = 'rgb(244, 245, 250)'
const DARK = 'rgb(14, 16, 23)'

test('دکمه‌ی روشن/تیره در دسترسه، ذخیره می‌شه و «مثل گوشی» برمی‌گرده', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await startDemo(page)
  expect(await background(page)).toBe(LIGHT)
  await page.getByRole('button', { name: 'حالت تیره' }).click()
  expect(await background(page)).toBe(DARK)
  await expect(page.locator('meta[name="theme-color"]').first()).toHaveAttribute('content', '#0e1017')
  await page.reload()
  await expect(page.getByRole('button', { name: 'حالت روشن' })).toBeVisible()
  expect(await background(page)).toBe(DARK)
  await go(page, 'settings')
  await page.getByRole('button', { name: 'مثل گوشی' }).click()
  expect(await background(page)).toBe(LIGHT)
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.getByRole('button', { name: 'حالت روشن' })).toBeVisible()
  expect(await background(page)).toBe(DARK)
  // روی گوشیِ تیره هم می‌شه روشن رو انتخاب کرد
  await page.getByRole('button', { name: 'حالت روشن' }).click()
  expect(await background(page)).toBe(LIGHT)
  expect((await state(page)).settings.theme).toBe('light')
})

test('پوسته‌ی انتخابی قبل از بالا اومدن برنامه اعمال می‌شه', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await startDemo(page)
  await page.getByRole('button', { name: 'حالت تیره' }).click()
  // بدون کد برنامه: فقط HTML و CSS میان
  await page.route('**/assets/*.js', (route) => route.fulfill({ contentType: 'text/javascript', body: '' }))
  await page.reload()
  await expect(page.locator('#root')).toBeEmpty()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('html')).toHaveAttribute('data-accent', 'indigo')
  expect(await background(page)).toBe(DARK)
})

test('لمس لینک و دکمه مربع پیش‌فرض مرورگر رو نشون نمی‌ده', async ({ page }) => {
  await startDemo(page)
  const painted = await page.locator('a, button, label, input, select').evaluateAll((nodes) =>
    nodes.filter((n) => getComputedStyle(n).webkitTapHighlightColor !== 'rgba(0, 0, 0, 0)').map((n) => n.className || n.tagName))
  expect(painted).toEqual([])
})
