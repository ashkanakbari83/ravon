import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { bundles, messages, translate } from '../../src/i18n/index.js'
import { ACCENTS, ITEM_STATUSES, SERVICES, STATUSES, THEMES } from '../../src/lib/domain/constants.js'
import { DUE_GROUPS, FILTERS } from '../../src/lib/domain/projects.js'
import { RANGES } from '../../src/lib/domain/reports.js'

const files = readdirSync('src', { recursive: true })
  .map((f) => join('src', String(f)))
  .filter((f) => /\.jsx?$/.test(f) && !f.includes('i18n'))
const source = files.map((f) => readFileSync(f, 'utf8')).join('\n')
const namespaces = [...new Set(Object.keys(messages).map((k) => k.split('.')[0]))]

test('هر کلید دقیقاً [فارسی, انگلیسی] و بدون تکرار بین فایل‌ها', () => {
  assert.equal(Object.keys(messages).length, bundles.reduce((n, b) => n + Object.keys(b).length, 0))
  for (const [key, pair] of Object.entries(messages)) {
    assert.equal(pair.length, 2, key)
    assert.ok(pair.every((s) => typeof s === 'string' && s.trim()), key)
    const holes = (s) => (s.match(/\{\w+\}/g) || []).sort().join()
    assert.equal(holes(pair[0]), holes(pair[1]), key)
  }
})

test('همه‌ی کلیدهای توی کد وجود دارن', () => {
  const used = new Set()
  for (const m of source.matchAll(/'([a-zA-Z]+(?:\.[a-zA-Z0-9]+)+)'/g)) {
    if (namespaces.includes(m[1].split('.')[0])) used.add(m[1])
  }
  for (const m of source.matchAll(/\bt\(\s*'([^']+)'/g)) used.add(m[1])
  assert.ok(used.size > 150)
  assert.deepEqual([...used].filter((k) => !messages[k]), [])
})

test('کلیدهای ساخته‌شده در زمان اجرا', () => {
  const dynamic = {
    status: STATUSES,
    service: SERVICES,
    item: ITEM_STATUSES,
    'settings.theme': THEMES,
    'settings.accent': ACCENTS,
    'projects.filter': FILTERS,
    group: DUE_GROUPS,
    'clients.filter': ['all', 'owed'],
    'reports.range': RANGES,
    pay: ['free', 'unpaid', 'partial', 'paid', 'none'],
    storage: ['corrupt', 'blocked', 'newer'],
  }
  for (const [prefix, list] of Object.entries(dynamic)) for (const v of list) assert.ok(messages[`${prefix}.${v}`], `${prefix}.${v}`)
  // اگه کسی کلید پویای تازه‌ای ساخت، باید این‌جا اضافه‌اش کنه
  const prefixes = [...source.matchAll(/\bt\(`([a-zA-Z.]+)\.\$\{/g)].map((m) => m[1])
  assert.deepEqual(prefixes.filter((p) => !dynamic[p]), [])
})

test('هیچ متن فارسی سخت‌کدشده‌ای توی کامپوننت‌ها نیست', () => {
  for (const file of files.filter((f) => f.endsWith('.jsx'))) {
    const code = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')
    assert.equal(code.match(/[آ-ی]{2,}/)?.[0], undefined, file)
  }
})

test('جای‌گذاری عدد فارسی می‌شه', () => {
  assert.equal(translate('fa', 'project.itemsDone', { done: 2, total: 5 }), '۲ از ۵ آماده')
  assert.equal(translate('en', 'project.itemsDone', { done: 2, total: 5 }), '2 of 5 done')
  assert.equal(translate('fa', 'missing.key'), 'missing.key')
})

test('هیچ رنگ سخت‌کدشده‌ای بیرون از tokens.css نیست', () => {
  for (const file of ['base.css', 'components.css', 'pages.css', 'calm.css']) {
    const css = readFileSync(join('src/styles', file), 'utf8')
    assert.deepEqual(css.match(/#[0-9a-fA-F]{3,8}\b(?![^{]*\{)|rgba?\(/g)?.filter((c) => c !== '#000') ?? [], [], file)
  }
  assert.equal(source.match(/['"]#[0-9a-fA-F]{3,8}['"]/)?.[0], undefined)
})
