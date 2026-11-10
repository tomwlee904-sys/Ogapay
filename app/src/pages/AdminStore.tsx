import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import Money from '../components/Money'
import { RemoveSheet } from '../components/StoreModeration'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { apiRequest } from '../lib/api'
import { sized } from '../lib/img'

// The store queue (store audit F30/F31, 2026-11-10): every product, hidden and
// removed ones too, with open reports. Admins and store moderators remove a
// product with a reason the seller sees, put it back, read reports and close
// them. Only admins delete for good and choose moderators.

type Row = {
  id: string; name: string; imageUrl: string; price: number; currency: string; priceOnRequest: boolean; category: string
  status: 'active' | 'hidden' | 'removed' | 'deleted'; official: boolean; createdAt: string
  delistedAt: string | null; delistReason: string | null; delistedBy: string | null
  orders: number; openReports: number
  seller: { id: string; username: string; avatarUrl: string | null; isBanned: boolean; isPublic: boolean; flagged?: boolean } | null
}
type Page = { items: Row[]; pagination: { page: number; limit: number; total: number; totalPages: number }; counts: { active: number; hidden: number; removed: number; reported: number } }
type ProductReport = { id: string; category: string; description: string; status: string; createdAt: string; reporter: string | null }
type Moderator = { id: string; username: string; avatarUrl: string | null; isTwoFactorEnabled: boolean; isBanned: boolean }

const STATUSES = [['all', 'All'], ['reported', 'Reported'], ['active', 'On sale'], ['hidden', 'Hidden'], ['removed', 'Removed'], ['deleted', 'Deleted']] as const
type Status = (typeof STATUSES)[number][0]
const SORTS = [['newest', 'Newest'], ['reports', 'Most reports'], ['orders', 'Most orders'], ['name', 'Name']] as const
const STATUS_LABEL: Record<Row['status'], string> = { active: 'On sale', hidden: 'Hidden', removed: 'Removed', deleted: 'Deleted' }
const REPORT_REASON: Record<string, string> = { counterfeit: 'Fake or counterfeit', scam: 'Scam', prohibited: 'Not allowed on OgaPay', misleading: 'Misleading or wrong category', offensive: 'Offensive', other: 'Something else' }
const when = (d: string) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

const CSS = `
  .as-tools{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0 12px}
  .as-tools .ui-input{flex:1;min-width:200px;height:44px}
  .as-tools select{height:44px;padding:0 10px;border:1px solid var(--border);border-radius:10px;background:var(--card);color:var(--text);font:500 13px var(--font)}
  .as-chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
  .as-chips .ui-chip{min-height:40px}
  .as-row{display:grid;grid-template-columns:64px minmax(0,1fr) auto;gap:14px;align-items:start}
  .as-thumb{width:64px;height:64px;border-radius:12px;background:var(--card2);border:1px solid var(--border);overflow:hidden;display:flex;align-items:center;justify-content:center;color:var(--text3);font-size:24px}
  .as-thumb img{width:100%;height:100%;object-fit:cover}
  .as-name{font-size:15px;font-weight:600;color:var(--text);text-decoration:none;overflow-wrap:anywhere}
  .as-meta{display:flex;flex-wrap:wrap;gap:6px 12px;margin-top:6px;font-size:12.5px;color:var(--text2);align-items:center}
  .as-meta a{color:var(--text);font-weight:600}
  .as-tag{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;border:1px solid var(--border);font-size:11.5px;color:var(--text)}
  .as-tag.bad{border-color:rgba(220,38,38,.3);background:rgba(220,38,38,.08);color:var(--red)}
  .as-tag.ok{border-color:rgba(var(--green-rgb),.3);background:rgba(var(--green-rgb),.1);color:var(--green)}
  .as-acts{display:flex;flex-direction:column;gap:6px;min-width:150px}
  .as-acts .ui-btn{min-height:40px;justify-content:center}
  .as-why{margin:8px 0 0;font-size:12.5px;line-height:1.5;color:var(--red)}
  .as-reports{list-style:none;margin:12px 0 0;padding:0;display:grid;gap:8px}
  .as-reports li{border:1px solid var(--border);border-radius:10px;padding:8px 10px;background:var(--bg2)}
  .as-reports p{margin:4px 0 0;font-size:13px;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere}
  .as-mods{margin-top:28px}
  .as-mods h2{font-size:16px;font-weight:600;margin:0 0 4px}
  .as-mod{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid var(--border);font-size:13.5px}
  .as-mod:first-of-type{border-top:0}
  @media(max-width:767px){
    .as-row{grid-template-columns:52px minmax(0,1fr)}
    .as-thumb{width:52px;height:52px}
    .as-acts{grid-column:1 / -1;flex-direction:row;flex-wrap:wrap;min-width:0}
    .as-acts .ui-btn{flex:1 1 140px}
  }
`

export default function AdminStore() {
  const { user } = useAuth()
  const { toast } = useToast()
  const isAdmin = user?.role === 'ADMIN'
  const [params, setParams] = useSearchParams()
  const status = (STATUSES.some(([k]) => k === params.get('status')) ? params.get('status') : 'all') as Status
  const sort = SORTS.some(([k]) => k === params.get('sort')) ? params.get('sort')! : 'newest'
  const q = params.get('q') || ''
  const page = Math.max(1, Number(params.get('page')) || 1)
  const [search, setSearch] = useState(q)
  const [data, setData] = useState<Page | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState('')
  const [reports, setReports] = useState<Record<string, ProductReport[] | 'loading'>>({})
  const [removing, setRemoving] = useState<Row | null>(null)

  const setParam = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(changes)) { if (v) next.set(k, v); else next.delete(k) }
    if (!('page' in changes)) next.delete('page')
    setParams(next, { replace: true })
  }

  const load = useCallback(() => {
    setErr('')
    const qs = new URLSearchParams({ status, sort, page: String(page), limit: '25', ...(q && { q }) })
    apiRequest<Page>(`/store/admin/products?${qs}`, { fresh: true })
      .then(setData)
      .catch((e: any) => { setErr(e?.message || "Couldn't load the store"); setData((d) => d || { items: [], pagination: { page: 1, limit: 25, total: 0, totalPages: 1 }, counts: { active: 0, hidden: 0, removed: 0, reported: 0 } }) })
  }, [status, sort, page, q])
  useEffect(() => { load() }, [load])
  useEffect(() => { setSearch(q) }, [q])

  const toggleReports = async (r: Row) => {
    if (reports[r.id]) { setReports((m) => { const c = { ...m }; delete c[r.id]; return c }); return }
    setReports((m) => ({ ...m, [r.id]: 'loading' }))
    try {
      const l = await apiRequest<ProductReport[]>(`/store/admin/products/${r.id}/reports`, { fresh: true })
      setReports((m) => ({ ...m, [r.id]: Array.isArray(l) ? l : [] }))
    } catch (e: any) {
      toast(e?.message || "Couldn't load the reports", 'error')
      setReports((m) => { const c = { ...m }; delete c[r.id]; return c })
    }
  }

  const act = async (r: Row, path: 'relist' | 'reports/dismiss', done: string) => {
    if (path === 'reports/dismiss' && !window.confirm(`Close the ${r.openReports} open ${r.openReports === 1 ? 'report' : 'reports'} on "${r.name}" and keep it in the store? The members who reported it are told.`)) return
    setBusy(r.id)
    try {
      await apiRequest(`/store/admin/products/${r.id}/${path}`, { method: 'POST', body: JSON.stringify({}) })
      toast(done, 'success')
      setReports((m) => { const c = { ...m }; delete c[r.id]; return c })
      load()
    } catch (e: any) { toast(e?.message || 'That didn’t work', 'error') }
    setBusy('')
  }

  const c = data?.counts
  const countOf = (k: Status) => (k === 'reported' ? c?.reported : k === 'active' ? c?.active : k === 'hidden' ? c?.hidden : k === 'removed' ? c?.removed : undefined)
  const pg = data?.pagination

  return (
    <Layout>
      <style>{CSS}</style>
      <div className="ui-page">
        {isAdmin
          ? <Link to="/admin" className="ui-eyebrow" style={{ textDecoration: 'none' }}><i className="ti ti-arrow-left" /> Admin</Link>
          : <Link to="/store" className="ui-eyebrow" style={{ textDecoration: 'none' }}><i className="ti ti-arrow-left" /> Store</Link>}
        <h1 className="ui-title">Store</h1>
        <p className="ui-sub">Every product in the store, including hidden and removed ones. Remove fakes, scams and broken listings: the seller is told your reason and can't put it back on sale. Orders already made are not affected.</p>

        <form className="as-tools" role="search" onSubmit={(e) => { e.preventDefault(); setParam({ q: search.trim() || null }) }}>
          <input className="ui-input" type="search" value={search} maxLength={80} onChange={(e) => setSearch(e.target.value)} placeholder="Search products or seller username" aria-label="Search products or seller username" />
          <select value={sort} onChange={(e) => setParam({ sort: e.target.value === 'newest' ? null : e.target.value })} aria-label="Sort">
            {SORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <button className="ui-btn ui-btn-dark" type="submit" style={{ minHeight: 44 }}><i className="ti ti-search" /> Search</button>
        </form>
        <div className="as-chips">
          {STATUSES.map(([k, l]) => {
            const n = countOf(k)
            return <button key={k} type="button" className={`ui-chip${status === k ? ' on' : ''}`} aria-pressed={status === k} onClick={() => setParam({ status: k === 'all' ? null : k })}>{l}{n !== undefined ? ` · ${n}` : ''}</button>
          })}
        </div>
        {err && <p role="alert" style={{ color: 'var(--red)', fontSize: 13 }}>{err} <button type="button" className="ui-btn ui-btn-ghost" onClick={load}>Try again</button></p>}

        {data === null ? (
          <div style={{ display: 'grid', gap: 10 }}>{[0, 1, 2].map((i) => <div key={i} className="ui-sk" style={{ height: 96 }} />)}</div>
        ) : data.items.length === 0 ? (
          <div className="ui-empty">{q ? `Nothing matches "${q}".` : status === 'reported' ? 'No products with open reports. Nice.' : 'No products here.'}</div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {data.items.map((r) => {
              const rep = reports[r.id]
              const live = r.status === 'active' || r.status === 'hidden'
              return (
                <article key={r.id} className="ui-card ui-card-pad">
                  <div className="as-row">
                    <div className="as-thumb">{r.imageUrl ? <img src={sized(r.imageUrl, 128)} alt="" loading="lazy" /> : <i className="ti ti-package" aria-hidden="true" />}</div>
                    <div style={{ minWidth: 0 }}>
                      <Link className="as-name" to={`/store/${r.id}`}>{r.name}</Link>
                      <div className="as-meta">
                        <span className={`as-tag${r.status === 'removed' || r.status === 'deleted' ? ' bad' : r.status === 'active' ? ' ok' : ''}`}>{STATUS_LABEL[r.status]}</span>
                        {r.openReports > 0 && <span className="as-tag bad"><i className="ti ti-flag" aria-hidden="true" /> {r.openReports} open {r.openReports === 1 ? 'report' : 'reports'}</span>}
                        <span>{r.priceOnRequest ? 'Price on request' : <Money amount={r.price} currency={r.currency} size={13} exact />}</span>
                        <span>{r.category}</span>
                        <span>{r.orders} {r.orders === 1 ? 'order' : 'orders'}</span>
                        {r.official ? <span>Sold by OgaPay</span> : r.seller && (
                          <span>
                            by <Link to={`/user/${encodeURIComponent(r.seller.username)}`}>@{r.seller.username}</Link>
                            {r.seller.isBanned && ' (closed)'}{!r.seller.isPublic && ' (private profile)'}{r.seller.flagged && ' (flagged account)'}
                          </span>
                        )}
                        <span>Listed {when(r.createdAt)}</span>
                      </div>
                      {r.delistedAt && <p className="as-why">Removed {when(r.delistedAt)}{r.delistedBy ? ` by @${r.delistedBy}` : ''}: {r.delistReason}</p>}
                    </div>
                    <div className="as-acts">
                      {live && (!r.official || isAdmin) && <button type="button" className="ui-btn ui-btn-dark" disabled={busy === r.id} onClick={() => setRemoving(r)}><i className="ti ti-eye-off" /> Remove</button>}
                      {r.status === 'removed' && (!r.official || isAdmin) && <button type="button" className="ui-btn ui-btn-ghost" disabled={busy === r.id} onClick={() => act(r, 'relist', 'Product is back')}><i className="ti ti-arrow-back-up" /> Put back</button>}
                      <button type="button" className="ui-btn ui-btn-ghost" aria-expanded={!!rep} onClick={() => toggleReports(r)}><i className="ti ti-flag" /> {rep ? 'Hide reports' : 'Reports'}</button>
                      {r.openReports > 0 && live && <button type="button" className="ui-btn ui-btn-ghost" disabled={busy === r.id} onClick={() => act(r, 'reports/dismiss', 'Reports closed')}><i className="ti ti-check" /> Keep it, close reports</button>}
                    </div>
                  </div>
                  {rep === 'loading' && <div className="ui-sk" style={{ height: 60, marginTop: 12 }} />}
                  {Array.isArray(rep) && (rep.length === 0
                    ? <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--text2)' }}>No reports on this product.</p>
                    : (
                      <ol className="as-reports" aria-label="Reports">
                        {rep.map((x) => (
                          <li key={x.id}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', fontSize: 12, color: 'var(--text2)' }}>
                              <strong style={{ color: 'var(--text)' }}>{REPORT_REASON[x.category] || x.category}</strong>
                              <span>{x.reporter ? `@${x.reporter}` : 'A member'} · {when(x.createdAt)} · {x.status === 'open' || x.status === 'in_review' ? 'Open' : x.status === 'resolved' ? 'Resolved' : 'Closed'}</span>
                            </div>
                            <p>{x.description}</p>
                          </li>
                        ))}
                      </ol>
                    ))}
                </article>
              )
            })}
          </div>
        )}

        {pg && pg.totalPages > 1 && (
          <div className="ui-actions" style={{ justifyContent: 'center', alignItems: 'center', marginTop: 16 }}>
            <button type="button" className="ui-btn ui-btn-ghost" disabled={pg.page <= 1} onClick={() => setParam({ page: String(pg.page - 1) })}>Previous</button>
            <span style={{ fontSize: 13, color: 'var(--text2)' }}>Page {pg.page} of {pg.totalPages} · {pg.total} products</span>
            <button type="button" className="ui-btn ui-btn-ghost" disabled={pg.page >= pg.totalPages} onClick={() => setParam({ page: String(pg.page + 1) })}>Next</button>
          </div>
        )}

        {isAdmin && <Moderators />}
      </div>

      {removing && <RemoveSheet row={removing} isAdmin={isAdmin} onClose={() => setRemoving(null)} onDone={(msg) => { setRemoving(null); toast(msg, 'success'); load() }} />}
    </Layout>
  )
}

// Admins: who can moderate the store
function Moderators() {
  const { toast } = useToast()
  const [list, setList] = useState<Moderator[] | null>(null)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const load = useCallback(() => {
    apiRequest<Moderator[]>('/store/admin/moderators', { fresh: true }).then((l) => setList(Array.isArray(l) ? l : [])).catch(() => setList([]))
  }, [])
  useEffect(() => { load() }, [load])
  const set = async (username: string, on: boolean) => {
    if (!on && !window.confirm(`Stop @${username} moderating the store?`)) return
    setBusy(true)
    try {
      const r = await apiRequest<{ username: string; isModerator: boolean }>('/store/admin/moderators', { method: 'POST', body: JSON.stringify({ username, on }) })
      toast(r.isModerator ? `@${r.username} is a store moderator` : `@${r.username} is no longer a store moderator`, 'success')
      if (on) setName('')
      load()
    } catch (e: any) { toast(e?.message || 'That didn’t work', 'error') }
    setBusy(false)
  }
  return (
    <section className="ui-card ui-card-pad as-mods" aria-labelledby="as-mods-h">
      <h2 id="as-mods-h">Store moderators</h2>
      <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text2)', lineHeight: 1.55 }}>Moderators can remove and put back products, read product reports and close them. They can't delete products, touch money or open other admin pages. They need two-factor authentication on.</p>
      {list === null ? <div className="ui-sk" style={{ height: 44 }} /> : list.length === 0 ? <p style={{ margin: 0, fontSize: 13, color: 'var(--text2)' }}>No moderators yet.</p> : list.map((m) => (
        <div key={m.id} className="as-mod">
          <span><Link to={`/user/${encodeURIComponent(m.username)}`} style={{ color: 'var(--text)', fontWeight: 600 }}>@{m.username}</Link>{!m.isTwoFactorEnabled && <span style={{ color: 'var(--text2)' }}> · needs 2FA on</span>}{m.isBanned && <span style={{ color: 'var(--text2)' }}> · closed</span>}</span>
          <button type="button" className="ui-btn ui-btn-ghost" style={{ minHeight: 40 }} disabled={busy} onClick={() => set(m.username, false)}>Remove</button>
        </div>
      ))}
      <form className="as-tools" style={{ marginBottom: 0 }} onSubmit={(e) => { e.preventDefault(); if (name.trim()) set(name.trim(), true) }}>
        <input className="ui-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Username" aria-label="Username of the new moderator" maxLength={60} />
        <button type="submit" className="ui-btn ui-btn-dark" style={{ minHeight: 44 }} disabled={busy || !name.trim()}><i className="ti ti-user-plus" /> Add moderator</button>
      </form>
    </section>
  )
}
