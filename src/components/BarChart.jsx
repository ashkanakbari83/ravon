import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { MONTHS } from '../lib/format.js'

/** تک‌سری، پس بدون راهنما. لمس/هاور هر ستون عددش رو بالا نشون می‌ده؛ جدول هم زیرشه. */
export default function BarChart({ series }) {
  const { t, fmt, locale } = useApp()
  const [active, setActive] = useState(series.length - 1)
  const max = Math.max(...series.map((m) => m.received), 1)
  const current = series[Math.min(active, series.length - 1)]
  const label = (m) => `${MONTHS[locale][m.jm - 1]} ${fmt.digits(m.jy)}`
  return (
    <figure className="chart">
      <figcaption className="chart__readout" aria-live="polite">
        <span>{label(current)}</span>
        <strong>{fmt.money(current.received)}</strong>
      </figcaption>
      <div className="chart__scale" aria-hidden="true"><span>{fmt.compact(max)}</span></div>
      <div className="chart__plot">
        {series.map((m, i) => (
          <button key={m.key} type="button" className="chart__col" aria-pressed={i === active} aria-label={`${label(m)}: ${fmt.money(m.received)}`} onClick={() => setActive(i)} onPointerEnter={(e) => e.pointerType === 'mouse' && setActive(i)} onFocus={() => setActive(i)}>
            <span className="chart__area"><span className="chart__bar" style={{ height: `${(m.received / max) * 100}%` }} /></span>
            <span className="chart__tick">{MONTHS[locale][m.jm - 1]}</span>
          </button>
        ))}
      </div>
      <details className="chart__table">
        <summary>{t('reports.table')}</summary>
        <table>
          <thead><tr><th scope="col">{t('xls.month')}</th><th scope="col">{t('xls.received')}</th><th scope="col">{t('xls.hours')}</th></tr></thead>
          <tbody>
            {[...series].reverse().map((m) => (
              <tr key={m.key}><th scope="row">{label(m)}</th><td>{fmt.num(m.received)}</td><td>{fmt.hours(m.minutes)}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}
