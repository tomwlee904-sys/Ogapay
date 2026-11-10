import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../lib/api'
import { useMoney } from '../lib/useMoney'
import { useCurrency } from '../context/CurrencyContext'
import type { Currency } from '../lib/currency'
import LoadError from './LoadError'
import { Pagination } from './Pagination'

// My Store > Earnings (F26, 2026-11-10): store sales that reached the seller's
// wallet (released, or paid at purchase on older orders), a bar chart for the
// range, totals per month and the list of sales. Bars work like the Profile
// earnings chart: a day for 7 and 30 days, a week for 90 days, a month for a year.
type Sum = { currency: string; amount: number; sales: number }
type Data = {
  range: string; from: string; to: string
  days: { date: string; currency: string; amount: number }[]
  months: (Sum & { month: string })[]
  totals: Sum[]
  sales: { id: string; product: { id: string; name: string }; buyer: string | null; quantity: number; currency: string; amount: number; partRefunded: boolean; paidAt: string }[]
  pagination: { page: number; limit: number; total: number; pages: number }
}
const RANGES = [['7d', '7 days', 7], ['30d', '30 days', 30], ['90d', '90 days', 90], ['1y', 'Last year', 365]] as const
const monthName = (m: string) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

export default function MyStoreEarnings() {
  const show = useMoney()
  const { convert } = useCurrency()
  const [range, setRange] = useState<(typeof RANGES)[number][0]>('30d')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Data | null>(null)
  const [failed, setFailed] = useState(false)
  const load = () => {
    setFailed(false)
    apiRequest<Data>(`/store/my-earnings?range=${range}&page=${page}`).then(setData).catch(() => setFailed(true))
  }
  useEffect(load, [range, page])

  if (!data) return failed ? <LoadError what="your earnings" onRetry={load} /> : <div className="up-skel" style={{ height: 180 }} />
  const days = RANGES.find((r) => r[0] === data.range)?.[2] || 30
  const step = days === 365 ? 30 : days === 90 ? 7 : 1
  const barCount = Math.ceil(days / step)
  // Each bar in naira (sales in older USDC products are converted at today's rate)
  const toNgn = (amount: number, cur: string) => (cur === 'NGN' ? amount : convert(amount, cur as Currency, 'NGN'))
  const bars = new Array(barCount).fill(0)
  const today = new Date(`${data.to}T12:00:00Z`).getTime()
  for (const d of data.days) {
    const idx = Math.floor(Math.round((today - new Date(`${d.date}T12:00:00Z`).getTime()) / 86400000) / step)
    if (idx >= 0 && idx < barCount) bars[barCount - 1 - idx] += toNgn(d.amount, d.currency)
  }
  const max = Math.max(...bars, 1)
  const totalLine = data.totals.length ? data.totals.map((t) => show(t.amount, t.currency)).join(' · ') : show(0)
  const salesCount = data.totals.reduce((n, t) => n + t.sales, 0)
  const p = data.pagination
  return (
    <div>
      <div className="up-card ms2-earn">
        <div className="ms2-earn-h">
          <div>
            <b>{totalLine}</b>
            <small>{salesCount === 1 ? '1 sale' : `${salesCount} sales`} paid to you in the {days === 365 ? 'last year' : `last ${days} days`}{step > 1 ? ` · each bar is ${step === 7 ? 'a week' : 'a month'}` : ''}</small>
          </div>
          <div className="ms2-seg" role="radiogroup" aria-label="Range">
            {RANGES.map(([v, label]) => (
              <button key={v} type="button" role="radio" aria-checked={range === v} className={range === v ? 'on' : ''} onClick={() => { setRange(v); setPage(1) }}>{label}</button>
            ))}
          </div>
        </div>
        <div className="ms2-bars" role="img" aria-label={`Store earnings chart: ${totalLine}`}>
          {bars.some((b) => b > 0)
            ? bars.map((b, i) => <div key={i} className="ms2-bar" style={{ height: `${Math.min(Math.max((b / max) * 100, b > 0 ? 6 : 2), 100)}%` }} title={show(b, 'NGN')} />)
            : <div className="ms2-bars-empty">No sales paid to you in the {days === 365 ? 'last year' : `last ${days} days`}</div>}
        </div>
      </div>

      {data.months.length > 0 && (
        <section className="ms2-group">
          <h2 className="ms2-group-h">By month <small>The last 12 months</small></h2>
          <div className="up-card ms2-months">
            {data.months.map((m) => (
              <div key={`${m.month}-${m.currency}`}>
                <span>{monthName(m.month)}</span>
                <small>{m.sales === 1 ? '1 sale' : `${m.sales} sales`}</small>
                <b>{show(m.amount, m.currency)}</b>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="ms2-group">
        <h2 className="ms2-group-h">Sales history <em>{p.total}</em><small>Every sale paid to your wallet, newest first</small></h2>
        {data.sales.length === 0 ? (
          <div className="up-empty"><i className="ti ti-coin" />No sales paid to you yet. When a buyer confirms an order (or 3 days after you mark it delivered), it shows here.</div>
        ) : (
          <div className="up-card ms2-months">
            {data.sales.map((s) => (
              <div key={s.id}>
                <span>
                  <Link to={`/store/${s.product.id}`} style={{ color: 'inherit' }}>{s.product.name}</Link>{s.quantity > 1 ? ` × ${s.quantity}` : ''}
                  <small>{new Date(s.paidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}{s.buyer ? ` · @${s.buyer}` : ''}{s.partRefunded ? ' · part refunded to the buyer' : ''}</small>
                </span>
                <b>{show(s.amount, s.currency, { exact: true })}</b>
              </div>
            ))}
          </div>
        )}
        <Pagination page={p.page} totalPages={p.pages} firstItem={(p.page - 1) * p.limit + 1} lastItem={Math.min(p.page * p.limit, p.total)} totalItems={p.total} onPageChange={setPage} />
      </section>
    </div>
  )
}
