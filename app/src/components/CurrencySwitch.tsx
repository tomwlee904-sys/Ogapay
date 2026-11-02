import { useCurrency } from '../context/CurrencyContext'
import { useAuth } from '../context/AuthContext'
import { displayPref, type DisplayPref } from '../lib/money'

// Quick switch for the display currency (same setting as Settings > Payments).
// Saved on the account when signed in, and in this browser otherwise.
// Cedis are offered to members in Ghana (and to anyone who already picked them)
const OPTIONS: [DisplayPref, string][] = [['NGN', '₦ Naira'], ['USDC', '$ USDC'], ['GHS', 'GH₵ Cedi'], ['BOTH', 'Both']]

export default function CurrencySwitch() {
  const { preferredCurrency, setPreferredCurrency } = useCurrency()
  const { user } = useAuth()
  const cur = displayPref(preferredCurrency)
  const options = OPTIONS.filter(([v]) => v !== 'GHS' || user?.country === 'GH' || cur === 'GHS')
  return (
    <div className="cur-switch">
      <span id="cur-switch-label">Show amounts in</span>
      <div role="radiogroup" aria-labelledby="cur-switch-label">
        {options.map(([v, label]) => (
          <button key={v} type="button" role="radio" aria-checked={cur === v} className={cur === v ? 'on' : ''} onClick={() => setPreferredCurrency(v)}>
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
