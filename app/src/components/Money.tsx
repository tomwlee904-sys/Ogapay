import { amountNumber, formatConversion } from '../lib/money'

type Convert = (amount: number, from: any, to: any) => number

/* An amount with its currency built in and an optional quiet conversion line.
   size sets the main figure (px). See .o-money in styles/system.css. */
export default function Money({ amount, currency = 'NGN', convert, size = 28, positive, className = '', note }: {
  amount: number; currency?: string; convert?: Convert; size?: number; positive?: boolean; className?: string; note?: string
}) {
  const alt = convert ? formatConversion(amount, currency, convert) : ''
  return (
    <span className={`o-money${positive ? ' money-pos' : ''}${className ? ' ' + className : ''}`}>
      <span className="o-money-main" style={{ fontSize: size }}>
        {currency === 'NGN' ? <>₦{amountNumber(amount, 'NGN')}</> : <>{amountNumber(amount, currency)}<small>{currency}</small></>}
      </span>
      {(alt || note) && <span className="o-money-alt">{[alt, note].filter(Boolean).join(' · ')}</span>}
    </span>
  )
}
