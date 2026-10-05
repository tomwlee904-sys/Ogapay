import { useCurrency } from '../context/CurrencyContext'
import { displayPref, type DisplayPref } from '../lib/money'

// Quick switch for the display currency (same setting as Settings > Payments).
// Saved on the account when signed in, and in this browser otherwise.
const OPTIONS: [DisplayPref, string][] = [['NGN', '₦ Naira'], ['USDC', '$ USDC'], ['BOTH', 'Both']]

export default function CurrencySwitch() {
  const { preferredCurrency, setPreferredCurrency } = useCurrency()
  const cur = displayPref(preferredCurrency)
  return (
    <div className="cur-switch">
      <span id="cur-switch-label">Show amounts in</span>
      <div role="radiogroup" aria-labelledby="cur-switch-label">
        {OPTIONS.map(([v, label]) => (
          <button key={v} type="button" role="radio" aria-checked={cur === v} className={cur === v ? 'on' : ''} onClick={() => setPreferredCurrency(v)}>
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
