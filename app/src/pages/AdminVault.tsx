import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import AdminShell, { AdminEmpty, AdminRefresh } from '../components/AdminShell'
import LoadError from '../components/LoadError'
import { useToast } from '../components/Toast'
import { apiRequest } from '../lib/api'
import Money from '../components/Money'

// The vault pool and its revenue rows are kept in naira (fees and store sales
// in other currencies are converted when logged), so amounts show as naira.

const when = (d: string) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function AdminVault() {
  const { user: authUser } = useAuth()
  const { toast } = useToast()

  // Vault state
  const [pool, setPool] = useState<any>(null)
  const [holders, setHolders] = useState<any[]>([])
  const [recentRevenue, setRecentRevenue] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  // Numbers are only shown, and money buttons only work, after a good load
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  // Action states
  const [seedUserId, setSeedUserId] = useState('')
  const [seedAmount, setSeedAmount] = useState('')
  const [seeding, setSeeding] = useState(false)
  const [distributing, setDistributing] = useState(false)
  const [revAmount, setRevAmount] = useState('')
  const [revSource, setRevSource] = useState('task_fee')
  const [revDesc, setRevDesc] = useState('')
  const [addingRevenue, setAddingRevenue] = useState(false)
  // Which action is waiting for "Yes" (each moves money or tokens)
  const [confirm, setConfirm] = useState<null | 'seed' | 'revenue' | 'run'>(null)

  const fetchPool = async () => {
    setFailed(false)
    try {
      const res = await apiRequest<any>('/vault/admin/pool')
      const d = res?.data || res
      setPool(d?.pool || null)
      setHolders(d?.holders || [])
      // Also fetch holders separately
      const hRes = await apiRequest<any>('/vault/admin/holders').catch(() => null)
      if (hRes?.data) setHolders(hRes.data)
      if (d?.recentRevenue) setRecentRevenue(d.recentRevenue)
      setLoaded(true)
    } catch {
      setLoaded(false); setFailed(true)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchPool() }, [])

  const handleSeedPay = async () => {
    if (!seedUserId.trim() || !seedAmount) return
    setSeeding(true)
    try {
      const res = await apiRequest<any>('/vault/admin/seed-pay', {
        method: 'POST',
        body: JSON.stringify({ userId: seedUserId.trim(), amount: parseFloat(seedAmount) }),
      })
      if (res?.success) {
        toast(`Seeded ${seedAmount} $PAY to ${seedUserId}`, 'success')
        setSeedUserId(''); setSeedAmount('')
        fetchPool()
      }
    } catch { toast('Failed to seed $PAY', 'error') }
    setSeeding(false); setConfirm(null)
  }

  const handleDistribute = async () => {
    setDistributing(true)
    try {
      const res = await apiRequest<any>('/vault/admin/distribute', { method: 'POST' })
      const d = res?.data || res
      if (d?.distributed) {
        toast(`Distributed ${(d.totalNgp || 0).toLocaleString()} to ${d.recipients} holders`, 'success')
      } else {
        toast(`Skipped: ${d?.reason || 'nothing to do'}`, 'error')
      }
      fetchPool()
    } catch { toast('Distribution failed', 'error') }
    setDistributing(false); setConfirm(null)
  }

  const handleAddRevenue = async () => {
    if (!revAmount) return
    setAddingRevenue(true)
    try {
      const res = await apiRequest<any>('/vault/admin/add-revenue', {
        method: 'POST',
        body: JSON.stringify({ amountNgp: parseFloat(revAmount), source: revSource, description: revDesc }),
      })
      if (res?.success) {
        toast(`₦${Number(revAmount).toLocaleString('en-US')} added to pool`, 'success')
        setRevAmount(''); setRevDesc('')
        fetchPool()
      }
    } catch { toast('Failed to add revenue', 'error') }
    setAddingRevenue(false); setConfirm(null)
  }

  const isAdmin = authUser?.role === 'ADMIN'

  if (!isAdmin) {
    return (
      <Layout>
        <div className="ui-page">
          <div className="ui-empty">
            <strong>Admin access required</strong>
            You need admin rights to open this page.
          </div>
        </div>
      </Layout>
    )
  }

  const SOURCES: Record<string, string> = { task_fee: 'Task fee', store_commission: 'Store commission', service_cut: 'Service cut', other: 'Other' }
  const poolNgn = Number(pool?.totalNgp || 0)
  const off = !loaded

  return (
    <AdminShell
      section="vault"
      title="Vault"
      sub="The $PAY revenue pool: add revenue, seed $PAY and run distributions."
      how={<p>The pool is shared out to $PAY holders automatically at midnight UTC. Run a distribution by hand only when the automatic one didn't run. Every action here moves money or tokens and can't be undone.</p>}
      actions={<AdminRefresh onClick={() => { setLoading(true); fetchPool() }} loading={loading} />}
    >
      <style>{`
        .av-stats > div:first-child .ui-stats-value{font-size:24px}
        @media (max-width:767.98px){.av-stats > div:first-child{grid-column:1 / -1}}
        .av-stats .o-money-main{font-weight:600}
        .av-form{display:grid;gap:12px;grid-template-columns:minmax(0,1fr)}
        .av-form .ui-btn{width:100%}
        .av-id{font-family:var(--font-mono);font-size:12px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
        .av-rows li > div{min-width:0}
        .av-rows b{font-weight:600;overflow-wrap:anywhere}
        .av-rows small{display:block;font-size:12.5px;color:var(--text2);margin-top:2px;overflow-wrap:anywhere}
        .av-amt{font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap;text-align:right}
        .av-run p{margin:0;font-size:13.5px;line-height:1.5;color:var(--text2)}
        .av-body{display:grid;gap:16px}
      `}</style>

      {failed ? (
        <LoadError what="the vault" onRetry={() => { setLoading(true); fetchPool() }} />
      ) : (
        <div className="av-body">
          {off ? <div className="ui-sk" style={{ height: 96 }} /> : (
            <div className="ui-stats av-stats">
              <div><span className="ui-stats-label">Pool balance</span><span className="ui-stats-value"><Money amount={poolNgn} currency="NGN" exact size={24} /></span></div>
              <div><span className="ui-stats-label">Next distribution</span><span className="ui-stats-value" style={{ fontSize: 16 }}>{pool?.nextDistributionAt ? when(pool.nextDistributionAt) : 'Not scheduled'}</span></div>
              <div><span className="ui-stats-label">Last distribution</span><span className="ui-stats-value" style={{ fontSize: 16 }}>{pool?.lastDistributionAt ? when(pool.lastDistributionAt) : 'Never'}</span></div>
              <div><span className="ui-stats-label">$PAY holders</span><span className="ui-stats-value">{holders.length.toLocaleString()}</span></div>
            </div>
          )}

          <div className="ui-split">
            <div className="adm-stack">
              <section className="ui-card adm-card" aria-labelledby="av-holders">
                <h2 className="adm-card-title" id="av-holders">$PAY holders{loaded && <em>{holders.length}</em>}</h2>
                {off ? <div className="ui-sk" style={{ height: 80 }} /> : holders.length === 0 ? (
                  <AdminEmpty compact title="No $PAY holders yet">Seed $PAY to a member to add one.</AdminEmpty>
                ) : (
                  <ul className="adm-rows av-rows">
                    {holders.map((h: any) => (
                      <li key={h.userId}>
                        <div><b>{h.username || h.email || '—'}</b><div className="av-id" title={h.userId}>{h.userId}</div></div>
                        <span className="av-amt">{(h.payBalance || 0).toLocaleString()} $PAY</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="ui-card adm-card" aria-labelledby="av-rev">
                <h2 className="adm-card-title" id="av-rev">Recent revenue</h2>
                {off ? <div className="ui-sk" style={{ height: 80 }} /> : recentRevenue.length === 0 ? (
                  <AdminEmpty compact title="No revenue logged yet">Add revenue, or wait for task fees.</AdminEmpty>
                ) : (
                  <ul className="adm-rows av-rows">
                    {recentRevenue.map((r: any, i: number) => (
                      <li key={i}>
                        <div><span className="adm-pill">{SOURCES[r.source] || r.source}</span><small>{r.description || 'No note'} · {new Date(r.recordedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</small></div>
                        <span className="av-amt"><Money amount={Number(r.amountNgp || 0)} currency="NGN" exact size={14} /></span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <aside className="ui-split-side ui-split-side-first adm-stack">
              <section className="ui-card adm-card" aria-labelledby="av-add">
                <h2 className="adm-card-title" id="av-add">Add revenue to the pool</h2>
                <div className="av-form">
                  <div className="adm-field">
                    <label className="ui-label" htmlFor="av-amount">Amount (naira)</label>
                    <input id="av-amount" className="ui-input" type="number" inputMode="decimal" value={revAmount} onChange={e => setRevAmount(e.target.value)} placeholder="50000" />
                  </div>
                  <div className="adm-field">
                    <label className="ui-label" htmlFor="av-source">Source</label>
                    <select id="av-source" className="ui-select" value={revSource} onChange={e => setRevSource(e.target.value)}>
                      <option value="task_fee">Task fee</option>
                      <option value="store_commission">Store commission</option>
                      <option value="service_cut">Service cut</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="adm-field">
                    <label className="ui-label" htmlFor="av-desc">Note (optional)</label>
                    <input id="av-desc" className="ui-input" value={revDesc} onChange={e => setRevDesc(e.target.value)} placeholder="What it's from" />
                  </div>
                  {confirm === 'revenue' ? (
                    <div className="adm-confirm">
                      <p>Add <b>₦{Number(revAmount).toLocaleString('en-US')}</b> ({SOURCES[revSource]}) to the pool?</p>
                      <div className="adm-actions">
                        <button type="button" className="ui-btn ui-btn-dark" onClick={handleAddRevenue} disabled={addingRevenue}>{addingRevenue ? 'Adding…' : 'Yes, add it'}</button>
                        <button type="button" className="ui-btn ui-btn-ghost" onClick={() => setConfirm(null)} disabled={addingRevenue}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" className="ui-btn ui-btn-ghost" onClick={() => setConfirm('revenue')} disabled={off || addingRevenue || !revAmount}><i className="ti ti-coin" aria-hidden="true" /> Add revenue</button>
                  )}
                </div>
              </section>

              <section className="ui-card adm-card" aria-labelledby="av-seed">
                <h2 className="adm-card-title" id="av-seed">Seed $PAY</h2>
                <div className="av-form">
                  <div className="adm-field">
                    <label className="ui-label" htmlFor="av-user">Member's user ID</label>
                    <input id="av-user" className="ui-input" value={seedUserId} onChange={e => setSeedUserId(e.target.value)} placeholder="The ID from their account, not the username" />
                  </div>
                  <div className="adm-field">
                    <label className="ui-label" htmlFor="av-pay">Amount of $PAY</label>
                    <input id="av-pay" className="ui-input" type="number" inputMode="decimal" value={seedAmount} onChange={e => setSeedAmount(e.target.value)} placeholder="1000" />
                  </div>
                  {confirm === 'seed' ? (
                    <div className="adm-confirm">
                      <p>Seed <b>{Number(seedAmount).toLocaleString('en-US')} $PAY</b> to user <b style={{ overflowWrap: 'anywhere' }}>{seedUserId.trim()}</b>?</p>
                      <div className="adm-actions">
                        <button type="button" className="ui-btn ui-btn-dark" onClick={handleSeedPay} disabled={seeding}>{seeding ? 'Seeding…' : 'Yes, seed it'}</button>
                        <button type="button" className="ui-btn ui-btn-ghost" onClick={() => setConfirm(null)} disabled={seeding}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" className="ui-btn ui-btn-ghost" onClick={() => setConfirm('seed')} disabled={off || seeding || !seedUserId || !seedAmount}><i className="ti ti-droplet" aria-hidden="true" /> Seed $PAY</button>
                  )}
                </div>
              </section>

              <section className="ui-card adm-card av-run" aria-labelledby="av-run">
                <h2 className="adm-card-title" id="av-run">Run a distribution</h2>
                <p>It runs by itself at midnight UTC. Run it now only if it didn't.</p>
                {confirm === 'run' ? (
                  <div className="adm-confirm">
                    <p>Pay out <b><Money amount={poolNgn} currency="NGN" exact size={14} /></b> to <b>{holders.length.toLocaleString()} $PAY {holders.length === 1 ? 'holder' : 'holders'}</b> now? This can't be undone.</p>
                    <div className="adm-actions">
                      <button type="button" className="ui-btn adm-danger" onClick={handleDistribute} disabled={distributing}>{distributing ? 'Distributing…' : 'Yes, pay out now'}</button>
                      <button type="button" className="ui-btn ui-btn-ghost" onClick={() => setConfirm(null)} disabled={distributing}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button type="button" className="ui-btn adm-danger" style={{ width: '100%' }} onClick={() => setConfirm('run')} disabled={off || distributing}><i className="ti ti-player-play" aria-hidden="true" /> Run distribution now</button>
                )}
              </section>
            </aside>
          </div>
        </div>
      )}
    </AdminShell>
  )
}
