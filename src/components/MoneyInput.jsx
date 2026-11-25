import { useId } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { parseAmount } from '../lib/format.js'

/** مقدار: عدد صحیح یا null. رقم فارسی/لاتین می‌پذیره و خودش جدا می‌کنه. */
export default function MoneyInput({ label, value, onChange, autoFocus = false }) {
  const { t, fmt } = useApp()
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="money">
        <input
          id={id}
          className="money__input"
          inputMode="numeric"
          autoComplete="off"
          enterKeyHint="done"
          placeholder={fmt.digits(0)}
          data-autofocus={autoFocus ? '' : undefined}
          value={value == null ? '' : fmt.num(value)}
          onChange={(e) => {
            const text = e.target.value
            if (!text.trim()) return onChange(null)
            const n = parseAmount(text)
            if (n != null && n <= 999_999_999_999) onChange(n)
          }}
        />
        <span className="money__unit">{fmt.currency}</span>
        <button type="button" className="money__zeros" aria-label={t('amount.thousand')} disabled={!value || value > 999_999_999} onClick={() => onChange(value * 1000)}>
          {fmt.digits('000')}
        </button>
      </div>
      <p className="field__hint" aria-live="polite">{value >= 1000 ? fmt.short(value) : ' '}</p>
    </div>
  )
}
