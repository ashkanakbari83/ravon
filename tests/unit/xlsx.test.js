import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildXlsx, crc32 } from '../../src/lib/xlsx.js'

/** خواننده‌ی کوچک zip بدون فشرده‌سازی، برای وارسی */
function unzip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset)
  const files = {}
  let p = 0
  while (view.getUint32(p, true) === 0x04034b50) {
    const crc = view.getUint32(p + 14, true)
    const size = view.getUint32(p + 18, true)
    const nameLength = view.getUint16(p + 26, true)
    const name = new TextDecoder().decode(bytes.subarray(p + 30, p + 30 + nameLength))
    const data = bytes.subarray(p + 30 + nameLength, p + 30 + nameLength + size)
    assert.equal(crc32(data), crc, name)
    files[name] = new TextDecoder().decode(data)
    p += 30 + nameLength + size
  }
  assert.equal(view.getUint32(bytes.length - 22, true), 0x06054b50)
  return files
}

test('crc32', () => assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926))

test('ساختار xlsx، راست‌به‌چپ و امن در برابر فرمول و XML', () => {
  const files = unzip(buildXlsx([{ name: 'پروژه‌ها', rows: [['عنوان', 'مبلغ'], ['=1+1 <b>&"', 2500000]] }]))
  assert.ok(files['[Content_Types].xml'] && files['xl/workbook.xml'].includes('پروژه‌ها'))
  const sheet = files['xl/worksheets/sheet1.xml']
  assert.ok(sheet.includes('rightToLeft="1"'))
  assert.ok(sheet.includes('=1+1 &lt;b&gt;&amp;&quot;') && !sheet.includes('<f>'))
  assert.ok(sheet.includes('<v>2500000</v>'))
})
