import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import TransferModal from '../components/TransferModal'
import WithdrawModal from '../components/wallet/WithdrawModal'
import AddBankForm from '../components/wallet/AddBankForm'
import Sheet from '../components/wallet/Sheet'
import ConvertUsdc from '../components/wallet/ConvertUsdc'
import LevelCard from '../components/wallet/LevelCard'
import MoneyInCard from '../components/wallet/MoneyInCard'
import { apiRequest } from '../lib/api'
import { sharedGet, dropShared } from '../lib/shared'
import { useAuth } from '../context/AuthContext'
import { useWalletBalance } from '../context/WalletBalanceContext'
import { isCredit, isEscrowHeld, isStoreHeld, kycOf, isPending, isVoid, usefulNote, maskAcct, money, naira, MIN_WITHDRAW_NGN, PAYOUT_LABEL, payoutNote, payoutStatusOf, statusLabel, txDetail, txTitle, when, type Balances, type Bank, type PayoutStatus, type Summary, type Tx } from '../lib/wallet'
import { levelsFor, nextStep, nextTierFor, UNLOCKS } from '../lib/levels'
import '../styles/wallet.css'
import InfoTip from '../components/InfoTip'

// Wallet. Main column: the balance (with what's on hold and on its way), then
// one line about your level (or one "verify" banner if you aren't verified),
// then the history with the lifetime totals from the server. Side panel (on the
// right on desktop, after the history on phones and tablets): your level and
// limits, money in (your OgaPay account number) and money out (your own bank).
// Adding money by card has its own page.

const PAGE = 30
const isWithdrawal = (t: Tx) => String(t.type || '').toUpperCase() === 'WITHDRAWAL'
// Money out is job funding, fees, transfers and purchases; withdrawals to your
// bank or crypto wallet have their own filter
const FILTERS = [
  { key: 'all', label: 'All', test: (_: Tx) => true },
  { key: 'in', label: 'Money in', test: (t: Tx) => !isVoid(t) && isCredit(t) },
  { key: 'out', label: 'Money out', test: (t: Tx) => !isVoid(t) && !isCredit(t) && !isWithdrawal(t) },
  { key: 'withdrawals', label: 'Withdrawals', test: (t: Tx) => isWithdrawal(t) },
  { key: 'pending', label: 'Pending', test: (t: Tx) => isPending(t) },
] as const
// The Withdrawals filter asks the server for withdrawals only, so every one of
// them shows, not just those among the latest pages of everything
const historyUrl = (page: number, onlyWithdrawals: boolean) => `/users/transactions/history?page=${page}&limit=${PAGE}${onlyWithdrawals ? '&type=WITHDRAWAL' : ''}`
const PAYOUT_PILL: Record<PayoutStatus, string> = { processing: 'wait', paid: 'ok', failed: 'bad', refunded: 'hold' }

export default function Wallet() {
  const { user, refreshUser } = useAuth()
  const { refresh: refreshHeader } = useWalletBalance()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [balances, setBalances] = useState<Balances | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  // A request that failed is said so, never shown as ₦0 or "no bank yet"
  const [balErr, setBalErr] = useState(false)
  const [sumErr, setSumErr] = useState(false)
  const [banksErr, setBanksErr] = useState(false)
  const [txs, setTxs] = useState<Tx[] | null>(null)
  // The history request failed: say so, rather than "No withdrawals yet"
  const [histFailed, setHistFailed] = useState(false)
  const [page, setPage] = useState(1)
  const [more, setMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('all')
  const [open, setOpen] = useState<string | null>(null)
  const [banks, setBanks] = useState<Bank[] | null>(null)
  const [bankMenu, setBankMenu] = useState<string | null>(null)
  const [bankErr, setBankErr] = useState('')
  const [modal, setModal] = useState<null | 'withdraw' | 'send' | 'bank' | 'convert'>(null)
  const [didit, setDidit] = useState(false)
  const [ninInstant, setNinInstant] = useState(false)
  const [bankKyc, setBankKyc] = useState(false)

  // Whether the ID + selfie check is on (it changes how Level 2 is reached) and
  // whether a NIN is confirmed on the spot
  useEffect(() => {
    apiRequest<Record<string, boolean>>('/social/providers', { auth: false }).then((p) => { setDidit(!!p?.didit); setNinInstant(!!p?.ninInstant); setBankKyc(!!p?.bankKyc) }).catch(() => {})
  }, [])

  // Old links: /wallet?add=1 (menu Top up) now goes to Add money
  useEffect(() => {
    if (params.get('add') === '1') navigate('/deposit', { replace: true })
    else if (params.get('withdraw') === '1') { setModal('withdraw'); params.delete('withdraw'); setParams(params, { replace: true }) }
  }, [params, setParams, navigate])

  const load = useCallback(async () => {
    const [b, s, bk] = await Promise.all([
      apiRequest<Balances>('/wallet/balance').catch(() => null),
      apiRequest<Summary>('/wallet/summary').catch(() => null),
      sharedGet<Bank[]>('/wallet/banks', 5000).catch(() => null),
    ])
    setBalances(b || {}); setBalErr(b === null)
    setSummary(s || {}); setSumErr(s === null)
    setBanks(Array.isArray(bk) ? bk : []); setBanksErr(bk === null)
  }, [])
  useEffect(() => { load() }, [load])

  // The history loads again when the Withdrawals filter is switched on or off.
  // Only the latest request's answer is used, so a quick switch can't show the
  // wrong list.
  const onlyWd = filter === 'withdrawals'
  const histSeq = useRef(0)
  const loadHistory = useCallback(async () => {
    const seq = ++histSeq.current
    const h = await apiRequest<Tx[]>(historyUrl(1, onlyWd)).catch(() => null)
    if (seq !== histSeq.current) return
    setHistFailed(h === null)
    setTxs(Array.isArray(h) ? h : [])
    setMore(Array.isArray(h) && h.length === PAGE)
    setPage(1)
  }, [onlyWd])
  useEffect(() => { setTxs(null); loadHistory() }, [loadHistory])

  const reload = () => { load(); loadHistory() }
  const refreshAll = () => { reload(); refreshUser(); refreshHeader() }
  // Verification may have changed since sign-in (approved by our team, or on another device)
  useEffect(() => { refreshUser() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadMore() {
    setLoadingMore(true)
    const seq = histSeq.current
    try {
      const next = await apiRequest<Tx[]>(historyUrl(page + 1, onlyWd))
      if (seq !== histSeq.current) { setLoadingMore(false); return }
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
      dropShared('/wallet/banks')
      setBanks(await sharedGet<Bank[]>('/wallet/banks'))
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
  const retryBalances = () => { setBalances(null); setBalErr(false); load() }

  // Levels and limits, shown under "See limits" (the full card is in the desktop side panel)
  const shownTier = verified ? tier : 0
  const levels = levelsFor(didit, ninInstant, bankKyc)
  const current = levels.find((l) => l.tier === shownTier)
  const next = nextStep(shownTier, didit)
  const nextTier = nextTierFor(shownTier, didit)
  const limits = (
    <details className="wl-limits">
      <summary><span>See limits</span><i className="ti ti-chevron-down" aria-hidden="true" /></summary>
      <ol className="wl-steps" aria-label="Verification levels">
        {levels.map((l) => (
          <li key={l.tier} className={shownTier >= l.tier ? 'done' : l.tier === nextTier ? 'next' : ''}>
            <span className="wl-step-name">{l.name}: {l.short}</span>
            <span className="wl-step-limit">{naira(l.limit, 0)} a day</span>
          </li>
        ))}
      </ol>
      <p className="wl-note wl-limits-foot">Minimum withdrawal {naira(MIN_WITHDRAW_NGN, 0)}. Fee 1.5%, at least ₦100.</p>
    </details>
  )

  return (
    <Layout>
      <div className="ui-page">
        <div className="ui-head">
          <div>
            <span className="ui-eyebrow"><i className="ti ti-wallet" /> Wallet</span>
            <h1 className="ui-title">Your money</h1>
          </div>
        </div>

        <div className="ui-split wl-split">
          <div className="wl-main">
            <section className="ui-card wl-bal" aria-label="Balance">
              <div className="wl-bal-top">
                <div>
                  <div className="wl-bal-label">Available</div>
                  {loading ? <div className="ui-sk" style={{ height: 46, width: 220, marginTop: 8, borderRadius: 12 }} /> : balErr ? (
                    <div className="wl-bal-err" role="alert">
                      <b>We couldn't load your balance</b>
                      <span>Check your connection and try again. Nothing has changed on your account.</span>
                      <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={retryBalances}><i className="ti ti-refresh" aria-hidden="true" /> Try again</button>
                    </div>
                  ) : (
                    <div className="wl-bal-num">{naira(available).split('.')[0]}<small>.{naira(available).split('.')[1]}</small></div>
                  )}
                  {!balErr && (onHold > 0 || onItsWay > 0) && (
                    <div className="wl-bal-notes">
                      {onHold > 0 && <span><i className="ti ti-lock" /> {naira(onHold)} held for your jobs <InfoTip label="What is held money?" title="Held for your jobs">
                        <p>Money for jobs you posted or things you bought, kept safe by OgaPay. Workers are paid from it when you approve their work; store sellers are paid when you confirm the order (or after 3 days).</p>
                        <p>Money for places nobody used comes back to your wallet when the job ends.</p>
                      </InfoTip></span>}
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
                  {Number(balances?.USDC?.available ?? 0) > 0 && (
                    <button type="button" className="wl-coin wl-coin-btn" onClick={() => setModal('convert')}><i className="ti ti-arrows-exchange" aria-hidden="true" /> Convert USDC to naira</button>
                  )}
                </div>
              )}
            </section>

            {!verified ? (
              // Not verified: one banner, one button (the level card, money in and
              // money out each used to ask for it)
              <section className="ui-card wl-verify" aria-labelledby="wl-verify-h">
                <div className="wl-verify-top">
                  <span className="wl-verify-ic" aria-hidden="true"><i className="ti ti-shield-check" /></span>
                  <div className="wl-verify-text">
                    <h2 id="wl-verify-h">Verify your identity</h2>
                    <p>To {UNLOCKS}. Adding money by card or USSD works without it.</p>
                  </div>
                  <Link className="ui-btn ui-btn-dark wl-verify-btn" to={next?.to || '/settings/verification'}>Verify now</Link>
                </div>
                {limits}
              </section>
            ) : (
              // Verified, phones and tablets: one line (the full card is in the desktop side panel)
              <section className="ui-card wl-lvrow wl-narrow-only" aria-labelledby="wl-lvrow-h">
                <div className="wl-lvrow-top">
                  <span className="wl-badge ok"><i className="ti ti-circle-check" aria-hidden="true" /> {current?.name || `Level ${tier}`}</span>
                  <h2 id="wl-lvrow-h" className="wl-lvrow-limit">Withdraw up to <b>{naira(current?.limit ?? 0, 0)}</b> a day</h2>
                  {next && <Link className="wl-level-next" to={next.to}>Upgrade <i className="ti ti-arrow-right" aria-hidden="true" /></Link>}
                </div>
                {limits}
              </section>
            )}

            <section className="ui-card wl-sec" aria-labelledby="wl-history">
              <div className="wl-sec-head">
                <h2 id="wl-history">History</h2>
              </div>
              {summary && !sumErr && (
                <div className="wl-lifetime" aria-label="All-time totals">
                  <div><span>Added</span><b>{naira(sumNgn?.deposited ?? 0, 0)}</b></div>
                  <div><span>Earned</span><b>{naira(sumNgn?.earned ?? 0, 0)}</b></div>
                  <div><span>Withdrawn</span><b>{naira(sumNgn?.withdrawn ?? 0, 0)}</b></div>
                </div>
              )}
              <div className="wl-chips" role="group" aria-label="Filter history">
                {FILTERS.map((f) => (
                  <button key={f.key} type="button" className={`ui-chip${filter === f.key ? ' on' : ''}`} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>{f.label}</button>
                ))}
              </div>
              {txs === null ? (
                <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>{[0, 1, 2, 3].map((i) => <div key={i} className="ui-sk" style={{ height: 52, borderRadius: 12 }} />)}</div>
              ) : histFailed ? (
                <div className="wl-empty" style={{ marginTop: 8 }} role="alert">
                  <b>We couldn't load your history</b>Check your connection and try again. Nothing has changed on your account.
                  <div className="wl-more"><button type="button" className="ui-btn ui-btn-ghost" onClick={() => { setTxs(null); loadHistory() }}><i className="ti ti-refresh" aria-hidden="true" /> Try again</button></div>
                </div>
              ) : shown.length === 0 ? (
                <div className="wl-empty" style={{ marginTop: 8 }}>
                  {txs.length === 0 && onlyWd ? <><b>No withdrawals yet</b>Money you send to your bank or crypto wallet shows up here.</> : txs.length === 0 ? <><b>No transactions yet</b>Money you add, earn, send or withdraw shows up here.</> : <>Nothing here{more ? ' yet. Load more to look further back.' : '.'}</>}
                </div>
              ) : (
                <ul className="wl-txs">
                  {shown.map((t) => {
                    const cr = isCredit(t), v = isVoid(t), p = isPending(t), held = isEscrowHeld(t)
                    // Withdrawals always say where they stand (processing, paid, failed, refunded)
                    const wd = isWithdrawal(t) ? payoutStatusOf(t) : null
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
                            {wd ? <span className={`wl-pill ${PAYOUT_PILL[wd]}`}>{PAYOUT_LABEL[wd]}</span>
                              : (p || v || held) && <span className={`wl-pill ${v ? 'bad' : held ? 'hold' : 'wait'}`}>{held ? 'In escrow' : statusLabel(t.status)}</span>}
                          </span>
                        </button>
                        {open === t.id && (
                          <div className="wl-tx-more">
                            <div><span>Status</span><b>{wd ? [PAYOUT_LABEL[wd], payoutNote(t)].filter(Boolean).join('. ') : held ? (isStoreHeld(t) ? 'Held until you confirm you received the order' : 'Held in escrow for your job') : statusLabel(t.status)}</b></div>
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

          <div className="ui-split-side wl-side">
            {verified && <div className="wl-wide-only"><LevelCard tier={tier} didit={didit} ninInstant={ninInstant} bank={bankKyc} /></div>}

            <div className="wl-pair">
              <MoneyInCard verified={verified} />

              <section className="ui-card wl-sec wl-dir-card" aria-labelledby="wl-out">
                <div className="wl-dir-label">
                  <span className="wl-dir out"><i className="ti ti-arrow-up-right" /></span> Money out
                  {verified && banks && banks.length > 0 && <button type="button" className="wl-link wl-dir-add" onClick={() => setModal('bank')}><i className="ti ti-plus" /> Add bank</button>}
                </div>
                <h2 id="wl-out" className="wl-dir-title">Your bank account</h2>
              {!verified ? (
                <p className="wl-note wl-dir-note">No bank added yet. You can add one once you're verified: withdrawals are paid into your own bank account.</p>
              ) : banks === null ? <div className="ui-sk" style={{ height: 62, borderRadius: 14 }} /> : banksErr ? (
                <>
                  <p className="wl-note wl-dir-note" role="alert">We couldn't load your bank accounts. Check your connection and try again.</p>
                  <div className="wl-dir-actions"><button type="button" className="ui-btn ui-btn-ghost" onClick={() => { setBanks(null); load() }}><i className="ti ti-refresh" aria-hidden="true" /> Try again</button></div>
                </>
              ) : banks.length === 0 ? (
                <>
                  <p className="wl-note wl-dir-note">No bank added yet. Withdrawals are paid into your own bank account.</p>
                  <div className="wl-dir-actions"><button type="button" className="ui-btn ui-btn-ghost" onClick={() => setModal('bank')}><i className="ti ti-plus" aria-hidden="true" /> Add bank account</button></div>
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
          </div>
        </div>
      </div>

      {modal === 'withdraw' && <WithdrawModal balances={balances} onClose={() => { setModal(null); reload() }} onDone={refreshAll} />}
      {modal === 'send' && <TransferModal onClose={() => setModal(null)} onSuccess={refreshAll} />}
      {modal === 'convert' && (
        <Sheet title="Convert USDC to naira" onClose={() => setModal(null)}>
          <ConvertUsdc available={Number(balances?.USDC?.available ?? 0)} onCancel={() => setModal(null)} onDone={refreshAll} />
        </Sheet>
      )}
      {modal === 'bank' && (
        <Sheet title="Add bank account" onClose={() => setModal(null)}>
          <AddBankForm makeDefault={!banks?.length} onCancel={() => setModal(null)} onSaved={() => { setModal(null); dropShared('/wallet/banks'); sharedGet<Bank[]>('/wallet/banks').then(setBanks).catch(() => {}) }} />
        </Sheet>
      )}
    </Layout>
  )
}
