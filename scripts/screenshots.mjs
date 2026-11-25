// اسکرین‌شات همه‌ی صفحه‌ها + چک خطای صفحه و اسکرول افقی.  پیش‌نیاز: npm run build
//   npm run shots            (خروجی: screenshots/)
import { mkdirSync } from 'node:fs'
import { chromium } from '@playwright/test'
import { preview } from 'vite'

const server = await preview({ preview: { port: 4175, strictPort: true }, logLevel: 'error' })
const base = 'http://localhost:4175/'
const out = process.argv[2] || 'screenshots'
const scale = Number(process.env.SCALE || 1)
mkdirSync(out, { recursive: true })

const VIEWS = {
  m390: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  m320: { viewport: { width: 320, height: 700 }, isMobile: true, hasTouch: true },
  desk: { viewport: { width: 1280, height: 800 } },
}
const browser = await chromium.launch()
const problems = []

for (const [name, options] of Object.entries(VIEWS)) {
  for (const theme of name === 'm390' ? ['light', 'dark'] : ['light']) {
    const context = await browser.newContext({ ...options, deviceScaleFactor: scale, colorScheme: theme, locale: 'fa-IR', serviceWorkers: 'block' })
    const page = await context.newPage()
    const tag = theme === 'dark' ? `${name}-dark` : name
    page.on('pageerror', (e) => problems.push(`${tag}: ${e.message}`))
    page.on('console', (m) => m.type() === 'error' && problems.push(`${tag}: ${m.text()}`))
    const shot = async (label, fullPage = true) => {
      await page.waitForTimeout(350)
      await page.evaluate(() => document.fonts.ready)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      if (overflow > 0) problems.push(`${tag}/${label}: horizontal overflow ${overflow}px`)
      // نوار ثابت پایین توی عکس تمام‌قد وسط صفحه نیفته
      if (fullPage) {
        const height = await page.evaluate(() => document.documentElement.scrollHeight)
        await page.setViewportSize({ width: options.viewport.width, height: Math.max(height, options.viewport.height) })
      }
      await page.screenshot({ path: `${out}/${tag}-${label}.png` })
      await page.setViewportSize(options.viewport)
    }
    const go = async (path) => {
      await page.evaluate((p) => (window.location.hash = p), `#/${path}`)
      await page.waitForSelector('.loading', { state: 'detached' })
      await page.waitForTimeout(150)
    }

    await page.goto(base)
    await shot('00-welcome', false)
    await page.getByRole('button', { name: 'اول با داده‌ی نمونه ببینم' }).click()
    await shot('01-home')
    await shot('01-home-fold', false)
    await go('projects')
    await shot('02-projects', false)
    await go('projects?filter=unsettled')
    await shot('02-projects-unsettled', false)
    await page.locator('.row__link').first().click()
    await shot('03-detail')
    await go('clients')
    await shot('04-clients', false)
    await page.locator('.person').first().click()
    await shot('05-client', false)
    await go('reports')
    await shot('06-reports')
    await go('settings')
    await shot('07-settings')
    await go('')
    await page.locator('.nav__new').click()
    await shot('08-quickadd', false)
    await page.getByRole('button', { name: 'جزئیات بیشتر' }).click()
    await page.getByRole('button', { name: 'تقویم' }).click()
    await shot('09-quickadd-more', false)
    await page.keyboard.press('Escape')
    await go('projects')
    await page.locator('.status').first().click()
    await shot('10-status', false)
    await page.keyboard.press('Escape')
    await page.locator('.row__link').first().click()
    await page.getByRole('button', { name: 'شروع تایمر' }).click()
    await shot('11-timer', false)
    await context.close()
  }
}
await browser.close()
await new Promise((resolve) => server.httpServer.close(resolve))
console.log(problems.length ? problems.join('\n') : 'no page errors, no horizontal overflow')
