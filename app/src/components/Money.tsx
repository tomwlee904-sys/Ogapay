import { useCurrency } from '../context/CurrencyContext'
import { amountNumber, displayMoney } from '../lib/money'

type Convert = (amount: number, from: any, to: any) => number

/* An amount with its currency built in and an optional quiet second line.
   It follows the display currency setting (lib/money displayMoney): in naira or
   dollars, or the real currency plus a conversion ("Both"). Pass `exact` where
   money actually moves, so the real currency stays first.
   size sets the main figure (px). See .o-money in styles/system.css. */
export default function Money({ amount, currency = 'NGN', convert: convertProp, size = 28, positive, className = '', note, exact = false }: {
  amount: number; currency?: string; convert?: Convert; size?: number; positive?: boolean; className?: string; note?: string; exact?: boolean
}) {
  const { preferredCurrency, convert } = useCurrency()
  const d = displayMoney(amount, currency, preferredCurrency, convertProp || convert, exact)
  return (
    <span className={`o-money${positive ? ' money-pos' : ''}${className ? ' ' + className : ''}`}>
      <span className="o-money-main" style={{ fontSize: size }}>
        {d.converted
          ? <><small className="o-money-approx">≈</small>{d.converted}</>
          : currency === 'NGN' ? <>₦{amountNumber(amount, 'NGN')}</> : <>{amountNumber(amount, currency)}<small>{currency}</small></>}
      </span>
      {(d.alt || note) && <span className="o-money-alt">{[d.alt, note].filter(Boolean).join(' · ')}</span>}
    </span>
  )
}
