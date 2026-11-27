import { LATEST_RELEASE, RELEASES } from '../../src/data/releases.js'
import { expect, go, sheet, startDemo, startFresh, state, test } from './fixtures.js'

const news = (page) => page.getByRole('dialog', { name: 'چی تازه شده؟' })

/** کاربری که نسخه‌ی قبلی رو داشته: همون داده، بدون سابقه‌ی «دیده‌شده» */
async function asReturningUser(page) {
  await startDemo(page)
  await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('ravon:state'))
    delete db.meta.seenRelease
    localStorage.setItem('ravon:state', JSON.stringify(db))
  })
  await page.reload()
}

test('کاربر تازه پنجره‌ی تغییرات نمی‌بینه', async ({ page }) => {
  await startFresh(page)
  await expect(page.getByRole('heading', { name: 'اولین پروژه‌ات رو ثبت کن' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'اولین پروژه‌ات رو ثبت کن' })).toBeVisible()
  await expect(sheet(page)).toHaveCount(0)
})

test('بعد از به‌روزرسانی یک بار میاد و بعد از بستن دیگه نه', async ({ page }) => {
  await asReturningUser(page)
  // فقط تازه‌ترین نسخه، با همه‌ی موردهاش
  await expect(news(page).locator('.news li')).toHaveCount(RELEASES[0].items.length)
  await expect(news(page).locator('.news')).toHaveCount(1)
  // تا نبسته، دیده‌شده نیست
  await page.reload()
  await expect(news(page)).toBeVisible()
  await news(page).getByRole('button', { name: 'تغییرات قبلی' }).click()
  await expect(news(page).locator('.news')).toHaveCount(RELEASES.length)
  await news(page).getByRole('button', { name: 'فهمیدم' }).click()
  await expect(sheet(page)).toHaveCount(0)
  expect((await state(page)).meta.seenRelease).toBe(LATEST_RELEASE)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'مهلت تحویل' })).toBeVisible()
  await expect(sheet(page)).toHaveCount(0)
})

test('Esc هم یعنی دیدم؛ و از تنظیمات همیشه در دسترسه', async ({ page }) => {
  await asReturningUser(page)
  await expect(news(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(sheet(page)).toHaveCount(0)
  await go(page, 'settings')
  await page.getByRole('button', { name: 'تازه‌های رَوون' }).click()
  await expect(news(page).locator('.news')).toHaveCount(RELEASES.length)
})

test('مهلت تحویل: دیر و مونده با عدد و کلمه', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-25T09:00:00+03:30') })
  await startDemo(page)
  const counts = page.locator('.duelist .count')
  await expect(counts.first()).toHaveText(/روز دیر/)
  await expect(page.locator('.duelist .count--today')).toHaveText('امروز')
  await expect(page.locator('.duelist .count--soon').filter({ hasText: 'روز مونده' }).first()).toBeVisible()
})

test('رنگ برنامه عوض می‌شه، می‌مونه و رنگ نوار گوشی با پوسته می‌خونه', async ({ page }) => {
  await startDemo(page)
  await go(page, 'settings')
  const brand = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--brand').trim())
  const before = await brand()
  await page.getByRole('button', { name: 'فیروزه‌ای' }).click()
  expect(await brand()).not.toBe(before)
  await page.getByRole('button', { name: 'تیره', exact: true }).click()
  await expect(page.locator('meta[name="theme-color"]').first()).toHaveAttribute('content', '#0e1017')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-accent', 'teal')
})

test.describe('موبایل', () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== 'mobile', 'فقط لمسی'))

  test('با کیبورد باز، نوار پایین کنار می‌ره', async ({ page }) => {
    await startDemo(page)
    await go(page, 'projects')
    const nav = page.getByRole('navigation', { name: 'منوی اصلی' })
    const search = page.getByLabel('جست‌وجوی عنوان، کارفرما یا یادداشت')
    await search.focus()
    await expect(nav).toBeHidden()
    await search.blur()
    await expect(nav).toBeVisible()
  })

  test('فیلتر انتخاب‌شده همیشه کامل دیده می‌شه', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 })
    await startDemo(page)
    for (const filter of ['archived', 'all', 'open']) {
      await go(page, `projects?filter=${filter}`)
      await expect(page.locator('.chips--scroll [aria-pressed="true"]')).toBeInViewport({ ratio: 0.99 })
    }
  })

  test('کشیدن سربرگ به پایین برگه رو می‌بنده', async ({ page }) => {
    await startDemo(page)
    await page.locator('.nav__new').click()
    const head = page.locator('.sheet__head')
    const drag = async (distance) => {
      const { x, y, width } = await head.boundingBox()
      const at = { pointerType: 'touch', pointerId: 7, isPrimary: true, bubbles: true, clientX: x + width / 2 }
      // رویداد لمسی ساختگی، چون Playwright کشیدن لمسی نداره
      await head.evaluate((el, args) => {
        el.setPointerCapture = () => {}
        el.dispatchEvent(new PointerEvent('pointerdown', { ...args.at, clientY: args.y }))
        el.dispatchEvent(new PointerEvent('pointermove', { ...args.at, clientY: args.y + args.distance }))
        el.dispatchEvent(new PointerEvent('pointerup', { ...args.at, clientY: args.y + args.distance }))
      }, { at, y: y + 10, distance })
    }
    await drag(30)
    await expect(sheet(page)).toBeVisible()
    await drag(160)
    await expect(sheet(page)).toHaveCount(0)
  })

  test('گوشی افقی همون چیدمان موبایل رو داره', async ({ page }) => {
    await page.setViewportSize({ width: 932, height: 430 })
    await startDemo(page)
    await expect(page.locator('.topbar')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0)
  })
})

test('لمس دکمه‌ی پایین صفحه وقتی کیبورد بازه، به نوار پایین نمی‌خوره', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'فقط لمسی')
  await startDemo(page)
  await go(page, 'project/demo-p-129')
  await page.getByLabel('اسم خروجی').fill('نسخه‌ی تازه')
  const add = page.getByRole('button', { name: 'افزودن', exact: true })
  // دکمه درست جایی که نوار پایین می‌شینه
  await add.evaluate((el) => window.scrollBy(0, el.getBoundingClientRect().bottom - window.innerHeight + 6))
  await add.tap()
  await expect(page.getByText('نسخه‌ی تازه')).toBeVisible()
  await expect(page).toHaveURL(/project\/demo-p-129/)
})
