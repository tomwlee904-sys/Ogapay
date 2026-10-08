import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import TransferModal from '../components/TransferModal'
import WithdrawModal from '../components/wallet/WithdrawModal'
import AddBankForm from '../components/wallet/AddBankForm'
import Sheet from '../components/wallet/Sheet'
import LevelCard from '../components/wallet/LevelCard'
import MoneyInCard from '../components/wallet/MoneyInCard'
import { apiRequest } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useWalletBalance } from '../context/WalletBalanceContext'
import { isCredit, isEscrowHeld, isStoreHeld, kycOf, isPending, isVoid, usefulNote, maskAcct, money, naira, statusLabel, txDetail, txTitle, when, type Balances, type Bank, type Summary, type Tx } from '../lib/wallet'
import '../styles/wallet.css'

// Wallet, top to bottom: the balance (with what's on hold and on its way), your
// verification level and what it lets you withdraw, money in (your OgaPay
// account number) beside money out (your own bank), then the history with the
// lifetime totals from the server. Adding money by card has its own page.

const PAGE = 30
const FILTERS = [
  { key: 'all', label: 'All', test: (_: Tx) => true },
  { key: 'in', label: 'Money in', test: (t: Tx) => !isVoid(t) && isCredit(t) },
  { key: 'out', label: 'Money out', test: (t: Tx) => !isVoid(t) && !isCredit(t) },
  { key: 'pending', label: 'Pending', test: (t: Tx) => isPending(t) },
] as const

export default function Wallet() {
  const { user, refreshUser } = useAuth()
  const { refresh: refreshHeader } = useWalletBalance()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [balances, setBalances] = useState<Balances | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [txs, setTxs] = useState<Tx[] | null>(null)
  const [page, setPage] = useState(1)
  const [more, setMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('all')
  const [open, setOpen] = useState<string | null>(null)
  const [banks, setBanks] = useState<Bank[] | null>(null)
  const [bankMenu, setBankMenu] = useState<string | null>(null)
  const [bankErr, setBankErr] = useState('')
  const [modal, setModal] = useState<null | 'withdraw' | 'send' | 'bank'>(null)
  const [didit, setDidit] = useState(false)
  const [diditNin, setDiditNin] = useState(false)

  // Whether the ID + selfie and NIN + selfie checks are on (they change how each level is reached)
  useEffect(() => {
    apiRequest<Record<string, boolean>>('/social/providers', { auth: false }).then((p) => { setDidit(!!p?.didit); setDiditNin(!!p?.diditNin) }).catch(() => {})
  }, [])

  // Old links: /wallet?add=1 (menu Top up) now goes to Add money
  useEffect(() => {
    if (params.get('add') === '1') navigate('/deposit', { replace: true })
    else if (params.get('withdraw') === '1') { setModal('withdraw'); params.delete('withdraw'); setParams(params, { replace: true }) }
  }, [params, setParams, navigate])

  const load = useCallback(async () => {
    const [b, s, h, bk] = await Promise.all([
      apiRequest<Balances>('/wallet/balance').catch(() => null),
      apiRequest<Summary>('/wallet/summary').catch(() => null),
      apiRequest<Tx[]>(`/users/transactions/history?page=1&limit=${PAGE}`).catch(() => null),
      apiRequest<Bank[]>('/wallet/banks').catch(() => null),
    ])
    setBalances(b || {})
    setSummary(s || {})
    setTxs(Array.isArray(h) ? h : [])
    setMore(Array.isArray(h) && h.length === PAGE)
    setPage(1)
    setBanks(Array.isArray(bk) ? bk : [])
  }, [])
  useEffect(() => { load() }, [load])

  const refreshAll = () => { load(); refreshUser(); refreshHeader() }
  // Verification may have changed since sign-in (approved by our team, or on another device)
  useEffect(() => { refreshUser() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadMore() {
    setLoadingMore(true)
    try {
      const next = await apiRequest<Tx[]>(`/users/transactions/history?page=${page + 1}&limit=${PAGE}`)
      const rows = Array.isArray(next) ? next : []
      setTxs((l) => [...(l || []), ...rows.filter((r) => !(l || []).some((x) => x.id === r.id))])
      setPage((p) => p + 1)
      setMore(rows.length === PAGE)
    } catch { /* keep the button */ }
    setLoadingMore(false)
  }

  async function bankAction(id: string, action: 'default' | 'remove') {
    setBankMenu(null); setBankErr('')
    try {
      if (action === 'default') await apiRequest(`/wallet/banks/${id}/default`, { method: 'PUT' })
      else await apiRequest(`/wallet/banks/${id}`, { method: 'DELETE' })
      setBanks(await apiRequest<Bank[]>('/wallet/banks'))
    } catch (e: any) { setBankErr(e?.message || "That didn't work. Try again.") }
  }

  const ngn = balances?.NGN
  const available = Number(ngn?.available ?? 0)
  const sumNgn = summary?.NGN
  // Bank withdrawals waiting to be paid are held too: show them once, as "on its way"
  const onItsWay = Number(sumNgn?.withdrawing ?? 0)
  const onHold = Math.max(0, Number(ngn?.lockedBalance ?? 0) - onItsWay)
  const coins = (['USDC', 'USDT', 'SOL'] as const).filter((c) => Number(balances?.[c]?.balance ?? 0) > 0)
  const { tier, verified } = kycOf(user)
  const shown = (txs || []).filter(FILTERS.find((f) => f.key === filter)!.test)
  const loading = balances === null

  return (
    <Layout>
      <div className="ui-page">
        <div className="ui-head">
          <div>
            <span className="ui-eyebrow"><i className="ti ti-wallet" /> Wallet</span>
            <h1 className="ui-title">Your money</h1>
          </div>
        </div>

        <div className="wl-stack">
            <section className="ui-card wl-bal" aria-label="Balance">
              <div className="wl-bal-top">
                <div>
                  <div className="wl-bal-label">Available</div>
                  {loading ? <div className="ui-sk" style={{ height: 46, width: 220, marginTop: 8, borderRadius: 12 }} /> : (
                    <div className="wl-bal-num">{naira(available).split('.')[0]}<small>.{naira(available).split('.')[1]}</small></div>
                  )}
                  {(onHold > 0 || onItsWay > 0) && (
                    <div className="wl-bal-notes">
                      {onHold > 0 && <span><i className="ti ti-lock" /> {naira(onHold)} held for your jobs</span>}
                      {onItsWay > 0 && <span><i className="ti ti-clock" /> {naira(onItsWay)} on its way to your bank</span>}
                    </div>
                  )}
                </div>
                <div className="wl-bal-actions">
                  <Link className="ui-btn ui-btn-dark" to="/deposit"><i className="ti ti-plus" /> Add money</Link>
                  <button type="button" className="ui-btn ui-btn-ghost" onClick={() => setModal('withdraw')}><i className="ti ti-arrow-up-right" /> Withdraw</button>
                  <button type="button" className="ui-btn ui-btn-ghost" onClick={() => setModal('send')}><i className="ti ti-send" /> Send</button>
                </div>
              </div>
              {coins.length > 0 && (
                <div className="wl-coins">
                  {coins.map((c) => (
                    <span className="wl-coin" key={c}>
                      <span className="wl-coin-dot" style={{ background: c === 'SOL' ? '#7c3aed' : c === 'USDT' ? '#16a34a' : '#2775ca' }}>{c === 'SOL' ? '◎' : '$'}</span>
                      <b>{money(Number(balances?.[c]?.available ?? 0), c)}</b>
                    </span>
                  ))}
                </div>
              )}
            </section>

            <LevelCard tier={verified ? tier : 0} didit={didit} diditNin={diditNin} />

            <div className="wl-pair">
              <MoneyInCard verified={verified} />

              <section className="ui-card wl-sec wl-dir-card" aria-labelledby="wl-out">
                <div className="wl-dir-label">
                  <span className="wl-dir out"><i className="ti ti-arrow-up-right" /></span> Money out
                  {verified && banks && banks.length > 0 && <button type="button" className="wl-link wl-dir-add" onClick={() => setModal('bank')}><i className="ti ti-plus" /> Add bank</button>}
                </div>
                <h2 id="wl-out" className="wl-dir-title">Withdrawals go to</h2>
              {!verified ? (
                <p className="wl-note wl-dir-note">Verify your identity to add your bank and withdraw. <Link to="/settings/verification">Verify now</Link></p>
              ) : banks === null ? <div className="ui-sk" style={{ height: 62, borderRadius: 14 }} /> : banks.length === 0 ? (
                <>
                  <p className="wl-note wl-dir-note">Add your own bank account. Withdrawals are paid into it.</p>
                  <button type="button" className="wl-add wl-full" onClick={() => setModal('bank')}><i className="ti ti-plus" /> Add bank account</button>
                </>
              ) : (
                <ul className="wl-banks">
                  {banks.map((b) => (
                    <li className="wl-bank" key={b.id}>
                      <span className="wl-bank-ic"><i className="ti ti-building-bank" /></span>
                      <span className="wl-bank-main">
                        <strong>{b.accountName}</strong>
                        <span>{b.bankName} {maskAcct(b.accountNumber)}</span>
                        {b.isDefault && <em className="wl-def">Default</em>}
                      </span>
                      <span className="wl-bank-menu">
                        <button type="button" className="wl-icon-btn" aria-label={`Options for ${b.bankName} ${maskAcct(b.accountNumber)}`} aria-expanded={bankMenu === b.id} onClick={() => setBankMenu(bankMenu === b.id ? null : b.id)}><i className="ti ti-dots" /></button>
                        {bankMenu === b.id && (
                          <div className="wl-pop" role="menu" onMouseLeave={() => setBankMenu(null)}>
                            {!b.isDefault && <button type="button" role="menuitem" onClick={() => bankAction(b.id, 'default')}><i className="ti ti-star" /> Make default</button>}
                            <button type="button" role="menuitem" className="danger" onClick={() => { if (window.confirm(`Remove ${b.bankName} ${maskAcct(b.accountNumber)}?`)) bankAction(b.id, 'remove'); else setBankMenu(null) }}><i className="ti ti-trash" /> Remove</button>
                          </div>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {bankErr && <div className="wl-err" role="alert" style={{ marginTop: 12, marginBottom: 0 }}><i className="ti ti-alert-circle" /><span>{bankErr}</span></div>}
              </section>
            </div>

            <section className="ui-card wl-sec" aria-labelledby="wl-history">
              <div className="wl-sec-head">
                <h2 id="wl-history">History</h2>
                {summary && (
                  <span className="wl-totals">
                    Added <b>{naira(sumNgn?.deposited ?? 0, 0)}</b> · Earned <b>{naira(sumNgn?.earned ?? 0, 0)}</b> · Withdrawn <b>{naira(sumNgn?.withdrawn ?? 0, 0)}</b>
                  </span>
                )}
              </div>
              <div className="wl-chips" role="group" aria-label="Filter history">
                {FILTERS.map((f) => (
                  <button key={f.key} type="button" className={`ui-chip${filter === f.key ? ' on' : ''}`} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>{f.label}</button>
                ))}
              </div>
              {txs === null ? (
                <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>{[0, 1, 2, 3].map((i) => <div key={i} className="ui-sk" style={{ height: 52, borderRadius: 12 }} />)}</div>
              ) : shown.length === 0 ? (
                <div className="wl-empty" style={{ marginTop: 8 }}>
                  {txs.length === 0 ? <><b>No transactions yet</b>Money you add, earn, send or withdraw shows up here.</> : <>Nothing here{more ? ' yet. Load more to look further back.' : '.'}</>}
                </div>
              ) : (
                <ul className="wl-txs">
                  {shown.map((t) => {
                    const cr = isCredit(t), v = isVoid(t), p = isPending(t), held = isEscrowHeld(t)
                    const detail = txDetail(t)
                    const amt = Math.abs(Number(t.amount || 0))
                    return (
                      <li className="wl-tx" key={t.id}>
                        <button type="button" className="wl-tx-row" aria-expanded={open === t.id} onClick={() => setOpen(open === t.id ? null : t.id)}>
                          <span className={`wl-tx-ic${v ? ' void' : cr ? ' in' : ''}`}><i className={`ti ${v ? 'ti-x' : cr ? 'ti-arrow-down-left' : 'ti-arrow-up-right'}`} /></span>
                          <span className="wl-tx-main">
                            <strong>{txTitle(t)}</strong>
                            <span>{when(t.createdAt)}{detail ? ` · ${detail}` : ''}</span>
                          </span>
                          <span className="wl-tx-amt">
                            <b className={v ? 'void' : cr ? 'in' : ''}>{v ? '' : cr ? '+' : '−'}{money(amt, t.currency)}</b>
                            {(p || v || held) && <span className={`wl-pill ${v ? 'bad' : held ? 'hold' : 'wait'}`}>{held ? 'In escrow' : statusLabel(t.status)}</span>}
                          </span>
                        </button>
                        {open === t.id && (
                          <div className="wl-tx-more">
                            <div><span>Status</span><b>{held ? (isStoreHeld(t) ? 'Held until you confirm you received the order' : 'Held in escrow for your job') : statusLabel(t.status)}</b></div>
                            <div><span>Date</span><b>{new Date(t.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</b></div>
                            {Number(t.fee || 0) > 0 && <div><span>Fee</span><b>{money(Number(t.fee), t.currency)}</b></div>}
                            {usefulNote(t) && <div><span>Note</span><b>{usefulNote(t)}</b></div>}
                            <div><span>Reference</span><code>{t.reference}</code></div>
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
              {more && txs && (
                <div className="wl-more"><button type="button" className="ui-btn ui-btn-ghost" disabled={loadingMore} onClick={loadMore}>{loadingMore ? 'Loading…' : 'Load more'}</button></div>
              )}
            </section>
        </div>
      </div>

      {modal === 'withdraw' && <WithdrawModal balances={balances} onClose={() => { setModal(null); load() }} onDone={refreshAll} />}
      {modal === 'send' && <TransferModal onClose={() => setModal(null)} onSuccess={refreshAll} />}
      {modal === 'bank' && (
        <Sheet title="Add bank account" onClose={() => setModal(null)}>
          <AddBankForm makeDefault={!banks?.length} onCancel={() => setModal(null)} onSaved={() => { setModal(null); apiRequest<Bank[]>('/wallet/banks').then(setBanks).catch(() => {}) }} />
        </Sheet>
      )}
    </Layout>
  )
}
