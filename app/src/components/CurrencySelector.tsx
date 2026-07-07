import { useCurrency } from '../context/CurrencyContext'
import { Currency, CURRENCIES, CURRENCY_SYMBOLS } from '../lib/currency'

interface Props {
  /** Optional compact mode for embedding in cards */
  compact?: boolean
  style?: React.CSSProperties
}

export default function CurrencySelector({ compact, style }: Props) {
  const { preferredCurrency, setPreferredCurrency, rates, lastUpdated } = useCurrency()

  return (
    <div
      style={{
        display: 'inline-flex',
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 3,
        gap: 2,
        ...style,
      }}
    >
      {CURRENCIES.map((cur) => {
        const active = preferredCurrency === cur
        return (
          <button
            key={cur}
            onClick={() => setPreferredCurrency(cur)}
            style={{
              padding: compact ? '6px 12px' : '8px 18px',
              borderRadius: 10,
              border: 'none',
              background: active ? 'var(--accent)' : 'transparent',
              color: active ? '#fff' : 'var(--text2)',
              fontSize: compact ? 12 : 13,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              minHeight: compact ? 32 : 38,
            }}
          >
            <span>{CURRENCY_SYMBOLS[cur]}</span>
            <span>{cur}</span>
          </button>
        )
      })}
    </div>
  )
}
