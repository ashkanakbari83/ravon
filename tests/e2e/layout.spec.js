import { expect, go, startDemo, test } from './fixtures.js'

const PAGES = ['', 'projects', 'project/demo-p-129', 'clients', 'client/demo-c-1', 'reports', 'settings']

async function audit(page, label) {
  const report = await page.evaluate(() => {
    const root = document.querySelector('dialog[open]') || document.body
    const controls = [...root.querySelectorAll('button, a[href], select, input:not([type=file]), textarea, summary')].filter(
      (el) => el.checkVisibility() && !el.classList.contains('skip'),
    )
    const describe = (el) => `${el.tagName}.${el.className} «${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30)}»`
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      // ورودی‌های داخل قاب (جست‌وجو/مبلغ) با قابشون سنجیده می‌شن
      small: controls.filter((el) => (el.closest('.search, .money') && el.tagName === 'INPUT' ? el.parentElement : el).getBoundingClientRect().height < 43.5).map(describe),
      unnamed: controls
        .filter((el) => ['BUTTON', 'A'].includes(el.tagName) && !(el.getAttribute('aria-label') || el.textContent.trim()))
        .map(describe),
      // هیچ عنصری از لبه‌ی برگه بیرون نزنه (به‌جز ردیف‌های اسکرولی)
      clipped:
        root === document.body
          ? []
          : [...root.querySelectorAll('.sheet__body *, .sheet__foot *')]
              .filter((el) => !el.closest('.chips--scroll') && el.checkVisibility())
              .filter((el) => {
                const a = el.getBoundingClientRect()
                const b = root.getBoundingClientRect()
                return a.width && (a.left < b.left - 1 || a.right > b.right + 1)
              })
              .map(describe),
    }
  })
  expect(report, label).toEqual({ overflow: 0, small: [], unnamed: [], clipped: [] })
}

for (const width of [320, 390, 1280]) {
  test(`چیدمان در ${width}px: بدون اسکرول افقی، لمس ۴۴px و دکمه‌ی بی‌نام`, async ({ page }, info) => {
    test.skip((width === 1280) !== (info.project.name === 'desktop'), 'عرض مربوط به پروژه‌ی دیگه')
    await page.setViewportSize({ width, height: 720 })
    await startDemo(page)
    for (const path of PAGES) {
      await go(page, path)
      await audit(page, path || 'home')
    }
    await page.locator('.nav__new').click()
    await page.getByRole('button', { name: 'جزئیات بیشتر' }).click()
    await page.getByRole('button', { name: 'تقویم' }).click()
    await audit(page, 'quickadd')
    await page.keyboard.press('Escape')
    await go(page, 'project/demo-p-129')
    for (const name of ['ثبت زمان', 'ویرایش پروژه', 'ثبت دریافتی']) {
      const button = page.getByRole('button', { name, exact: true }).first()
      if (!(await button.count())) continue
      await button.click()
      await audit(page, name)
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog')).toHaveCount(0)
    }
  })
}

test('RTL واقعی و کنتراست متن‌ها با هر رنگ، در هر دو پوسته', async ({ page }) => {
  test.slow()
  await startDemo(page)
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  const looks = ['light', 'dark'].flatMap((scheme) => ['indigo', 'teal', 'plum', 'graphite'].map((accent) => [scheme, accent]))
  for (const [scheme, accent] of looks) {
    await page.emulateMedia({ colorScheme: scheme })
    await page.evaluate((a) => (document.documentElement.dataset.accent = a), accent)
    // همه‌ی صفحه‌ها با رنگ پیش‌فرض؛ بقیه‌ی رنگ‌ها جاهایی که برند دیده می‌شه
    for (const path of accent === 'indigo' ? PAGES : ['', 'projects', 'settings', 'reports']) {
      await go(page, path)
      const low = await page.evaluate(() => {
        const parse = (c) => (c.match(/[\d.]+/g) || []).map(Number)
        const lum = ([r, g, b]) => [r, g, b].map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0)
        const background = (el) => {
          for (let n = el; n; n = n.parentElement) {
            const style = getComputedStyle(n)
            // کارت‌های گرادیانی: اولین رنگ (روشن‌تر) سخت‌ترین حالته
            const stop = style.backgroundImage.startsWith('linear-gradient') && style.backgroundImage.match(/rgb\([^)]+\)/)?.[0]
            if (stop) return parse(stop)
            const c = parse(style.backgroundColor)
            if (c.length && (c[3] ?? 1) > 0.9) return c
          }
          return parse(getComputedStyle(document.body).backgroundColor)
        }
        return [...document.querySelectorAll('body *')]
          .filter((el) => el.checkVisibility() && !el.closest(':disabled, .sr-only, .skip, svg') && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))
          .flatMap((el) => {
            const [a, b] = [lum(parse(getComputedStyle(el).color)), lum(background(el))]
            const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
            return ratio < 4.5 ? [`${el.className} ${el.textContent.trim().slice(0, 20)} ${ratio.toFixed(2)}`] : []
          })
      })
      expect([...new Set(low)], `${scheme} ${accent} ${path || 'home'}`).toEqual([])
    }
  }
})
