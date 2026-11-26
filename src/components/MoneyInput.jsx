import { useId } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { parseAmount } from '../lib/format.js'

/** مقدار: عدد صحیح یا null. رقم فارسی/لاتین می‌پذیره و خودش جدا می‌کنه. */
export default function MoneyInput({ label, value, onChange, autoFocus = false, error, suggestions = [] }) {
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
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
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
      {error && <p id={`${id}-error`} className="field__error" role="alert">{error}</p>}
      {suggestions.length > 0 && (
        <div className="chips chips--scroll" role="group" aria-label={t('quick.suggest')}>
          {suggestions.map((amount) => (
            <button key={amount} type="button" className="chip chip--soft" aria-pressed={value === amount} onClick={() => onChange(amount)}>{fmt.compact(amount)}</button>
          ))}
        </div>
      )}
      {/* جای خالیِ راهنما فقط وقتی چیزی زیرش نیست نگه داشته می‌شه */}
      {!error && (value >= 1000 || !suggestions.length) && <p className="field__hint" aria-live="polite">{value >= 1000 ? fmt.short(value) : '\u00a0'}</p>}
    </div>
  )
}
