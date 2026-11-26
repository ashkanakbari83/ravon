// آیکن‌های PWA رو از روی favicon می‌سازه: node scripts/icons.mjs
import { readFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const svg = readFileSync('public/favicon.svg', 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage()
for (const [name, size, pad] of [['icon-192', 192, 0], ['icon-512', 512, 0], ['icon-maskable-512', 512, 0.12], ['apple-touch-icon', 180, 0.04]]) {
  await page.setViewportSize({ width: size, height: size })
  const inner = Math.round(size * (1 - pad * 2))
  const art = pad ? svg.replace('rx="9"', 'rx="0"') : svg
  await page.setContent(`<body style="margin:0;background:${pad ? '#4b3fd1' : 'transparent'};display:grid;place-items:center;height:${size}px">${art.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</body>`)
  await page.screenshot({ path: `public/${name}.png`, omitBackground: true })
}
await browser.close()
