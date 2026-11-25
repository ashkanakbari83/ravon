// سازنده‌ی کوچک xlsx (zip بدون فشرده‌سازی) تا کتابخونه‌ی سنگین وارد build نشه.
const encoder = new TextEncoder()

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
export function crc32(bytes) {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i += 1) c = CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

export function zip(files) {
  const chunks = []
  const directory = []
  let offset = 0
  const header = (size) => {
    const view = new DataView(new ArrayBuffer(size))
    let p = 0
    return {
      u16: (v) => (view.setUint16(p, v, true), (p += 2)),
      u32: (v) => (view.setUint32(p, v, true), (p += 4)),
      bytes: () => new Uint8Array(view.buffer),
    }
  }
  for (const { name, content } of files) {
    const nameBytes = encoder.encode(name)
    const data = encoder.encode(content)
    const crc = crc32(data)
    const local = header(30)
    ;[local.u32(0x04034b50), local.u16(20), local.u16(0x0800), local.u16(0), local.u16(0), local.u16(0x21)]
    ;[local.u32(crc), local.u32(data.length), local.u32(data.length), local.u16(nameBytes.length), local.u16(0)]
    chunks.push(local.bytes(), nameBytes, data)

    const central = header(46)
    ;[central.u32(0x02014b50), central.u16(20), central.u16(20), central.u16(0x0800), central.u16(0), central.u16(0), central.u16(0x21)]
    ;[central.u32(crc), central.u32(data.length), central.u32(data.length), central.u16(nameBytes.length)]
    ;[central.u16(0), central.u16(0), central.u16(0), central.u16(0), central.u32(0), central.u32(offset)]
    directory.push(central.bytes(), nameBytes)
    offset += 30 + nameBytes.length + data.length
  }
  const size = directory.reduce((s, c) => s + c.length, 0)
  const end = header(22)
  ;[end.u32(0x06054b50), end.u16(0), end.u16(0), end.u16(files.length), end.u16(files.length), end.u32(size), end.u32(offset), end.u16(0)]
  const all = [...chunks, ...directory, end.bytes()]
  const out = new Uint8Array(all.reduce((s, c) => s + c.length, 0))
  let p = 0
  for (const c of all) {
    out.set(c, p)
    p += c.length
  }
  return out
}

const escapeXml = (v) =>
  String(v)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const columnName = (i) => (i >= 26 ? columnName(Math.floor(i / 26) - 1) : '') + String.fromCharCode(65 + (i % 26))

/** عدد → سلول عددی؛ متن → inlineStr (پس فرمول تزریق نمی‌شه). style 1 = سرستون، 2 = عدد هزارگان */
function cell(value, ref, isHeader) {
  if (value == null || value === '') return ''
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${ref}" s="${Number.isInteger(value) ? 2 : 0}"><v>${value}</v></c>`
  }
  return `<c r="${ref}" t="inlineStr"${isHeader ? ' s="1"' : ''}><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`
}

function worksheet({ rows, widths }, rtl) {
  const cols = (widths || rows[0].map(() => 18))
    .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
    .join('')
  const body = rows
    .map((row, r) => `<row r="${r + 1}">${row.map((v, c) => cell(v, `${columnName(c)}${r + 1}`, r === 0)).join('')}</row>`)
    .join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"${rtl ? ' rightToLeft="1"' : ''}><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="18"/><cols>${cols}</cols><sheetData>${body}</sheetData></worksheet>`
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEDE7F3"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="3"><xf/><xf fontId="1" fillId="2" applyFont="1" applyFill="1"/><xf numFmtId="3" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`

/** sheets: [{ name, rows: [[...]], widths }] → Uint8Array */
export function buildXlsx(sheets, { rtl = true } = {}) {
  const head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  const rel = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
  const main = 'application/vnd.openxmlformats-officedocument.spreadsheetml'
  const files = [
    {
      name: '[Content_Types].xml',
      content: `${head}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="${main}.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="${main}.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="${main}.worksheet+xml"/>`).join('')}</Types>`,
    },
    {
      name: '_rels/.rels',
      content: `${head}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      name: 'xl/workbook.xml',
      content: `${head}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${rel}"><sheets>${sheets.map((s, i) => `<sheet name="${escapeXml(s.name.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`,
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      content: `${head}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${rel}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="${rel}/styles" Target="styles.xml"/></Relationships>`,
    },
    { name: 'xl/styles.xml', content: STYLES },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, content: worksheet(s, rtl) })),
  ]
  return zip(files)
}
