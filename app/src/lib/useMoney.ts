import { useCallback } from 'react'
import { useCurrency } from '../context/CurrencyContext'
import { showMoney } from './money'

/** show(amount, currency?, { exact?, short? }): an amount as one line of text in
 *  the display currency the person chose (see showMoney in lib/money). */
export function useMoney() {
  const { preferredCurrency, convert } = useCurrency()
  return useCallback(
    (amount: number, currency: string = 'NGN', opts?: { exact?: boolean; short?: boolean }) => showMoney(amount, currency, preferredCurrency, convert, opts),
    [preferredCurrency, convert],
  )
}
