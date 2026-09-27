import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import Sheet from '../components/wallet/Sheet'
import { apiRequest } from '../lib/api'
import '../styles/wallet.css'

// Campaigns: a named group of your jobs with a budget. Stats come from the jobs
// in it (spent, remaining, submissions, approvals). The old page showed ad-style
// impressions and clicks from API routes that didn't exist.

type Stats = { jobs: number; openJobs: number; spent: number; remaining: number; submissions: number; approved: number; approvalRate: number }
type Campaign = { id: string; name: string; description?: string | null; platforms: string[]; budget: number; currency: 'NGN' | 'USDC'; status: 'ACTIVE' | 'PAUSED' | 'ENDED'; createdAt: string; stats: Stats }
type JobRow = { id: string; title: string; status: string; reward: number; maxWorkers: number; currency: string; submissions: number; approved: number }

const PLATFORMS = ['X/Twitter', 'Instagram', 'TikTok', 'Facebook', 'YouTube', 'WhatsApp', 'Other']
const STATUS_LABEL = { ACTIVE: 'Active', PAUSED: 'Paused', ENDED: 'Ended' } as const
const money = (n: number, c: string) => (c === 'NGN' ? `₦${Math.round(n).toLocaleString('en-US')}` : `${n.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${c}`)
const blank = { name: '', description: '', platforms: [] as string[], budget: '', currency: 'NGN' as 'NGN' | 'USDC', status: 'ACTIVE' as Campaign['status'] }

export default function Campaigns() {
  const [list, setList] = useState<Campaign[] | null>(null)
  const [err, setErr] = useState('')
  const [editing, setEditing] = useState<Campaign | 'new' | null>(null)
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)
  const [formErr, setFormErr] = useState('')
  const [viewing, setViewing] = useState<Campaign | null>(null)
  const [jobs, setJobs] = useState<JobRow[] | null>(null)

  const load = () => apiRequest<Campaign[]>('/campaigns').then((l) => setList(Array.isArray(l) ? l : [])).catch((e) => { setErr(e?.message || "Couldn't load your campaigns"); setList([]) })
  useEffect(() => { load() }, [])

  const openForm = (c: Campaign | 'new') => {
    setEditing(c); setFormErr('')
    setForm(c === 'new' ? blank : { name: c.name, description: c.description || '', platforms: c.platforms || [], budget: String(c.budget), currency: c.currency, status: c.status })
  }
  const save = async () => {
    setSaving(true); setFormErr('')
    try {
      const body: any = { name: form.name.trim(), description: form.description.trim(), platforms: form.platforms, budget: Number(form.budget || 0) }
      if (editing === 'new') await apiRequest('/campaigns', { method: 'POST', body: JSON.stringify({ ...body, currency: form.currency }) })
      else if (editing) await apiRequest(`/campaigns/${editing.id}`, { method: 'PATCH', body: JSON.stringify({ ...body, status: form.status }) })
      setEditing(null); load()
    } catch (e: any) { setFormErr(e?.message || "Couldn't save the campaign") }
    setSaving(false)
  }
  const remove = async (c: Campaign) => {
    if (!window.confirm(`Delete "${c.name}"? Its jobs stay as they are.`)) return
    try { await apiRequest(`/campaigns/${c.id}`, { method: 'DELETE' }); load() } catch (e: any) { setErr(e?.message || "Couldn't delete it") }
  }
  const view = (c: Campaign) => {
    setViewing(c); setJobs(null)
    apiRequest<{ jobsList: JobRow[] }>(`/campaigns/${c.id}/stats`).then((d) => setJobs(d?.jobsList || [])).catch(() => setJobs([]))
  }

  return (
    <Layout>
      <div className="ui-page">
        <div className="ui-head">
          <div>
            <span className="ui-eyebrow"><i className="ti ti-speakerphone" /> Campaigns</span>
            <h1 className="ui-title">Campaigns</h1>
            <p className="ui-sub">Group related jobs, give them a budget, and see their spend and results together.</p>
          </div>
          <div className="ui-actions"><button type="button" className="ui-btn ui-btn-dark" onClick={() => openForm('new')}><i className="ti ti-plus" /> New campaign</button></div>
        </div>
        {err && <p role="alert" style={{ color: 'var(--red)', fontSize: 13 }}>{err}</p>}

        {list === null ? (
          <div className="ui-grid-3" style={{ marginTop: 24 }}>{[0, 1, 2].map((i) => <div key={i} className="ui-sk" style={{ height: 200 }} />)}</div>
        ) : list.length === 0 ? (
          <div className="ui-empty" style={{ marginTop: 24 }}>
            <b style={{ display: 'block', color: 'var(--text)', marginBottom: 6 }}>No campaigns yet</b>
            Make one for a launch or a promotion, then add jobs to it when you post them.
          </div>
        ) : (
          <div className="ui-grid-3" style={{ marginTop: 24 }}>
            {list.map((c) => {
              const s = c.stats
              const pct = c.budget > 0 ? Math.min(100, (s.spent / c.budget) * 100) : 0
              return (
                <section key={c.id} className="ui-card ui-card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: '-.01em', minWidth: 0, overflowWrap: 'anywhere' }}>{c.name}</h2>
                    <span className={`wl-pill ${c.status === 'ACTIVE' ? 'hold' : c.status === 'PAUSED' ? 'wait' : 'bad'}`} style={{ marginTop: 2 }}>{STATUS_LABEL[c.status]}</span>
                  </div>
                  {c.platforms?.length > 0 && <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{c.platforms.map((p) => <span key={p} className="wl-coin" style={{ height: 24, fontSize: 11 }}>{p}</span>)}</div>}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--text2)', marginBottom: 6 }}>
                      <span>Spent <b style={{ color: 'var(--text)' }}>{money(s.spent, c.currency)}</b></span>
                      <span>of {money(c.budget, c.currency)}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 999, background: 'var(--card2)', overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', background: s.remaining < 0 ? 'var(--red)' : 'var(--green)' }} /></div>
                    <div style={{ fontSize: 12, color: s.remaining < 0 ? 'var(--red)' : 'var(--text2)', marginTop: 6 }}>{s.remaining < 0 ? `${money(-s.remaining, c.currency)} over budget` : `${money(s.remaining, c.currency)} left`}</div>
                  </div>
                  <div className="wl-stats" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                    <div className="wl-stat" style={{ padding: 10 }}><span>Jobs</span><b style={{ fontSize: 16 }}>{s.jobs}</b></div>
                    <div className="wl-stat" style={{ padding: 10 }}><span>Entries</span><b style={{ fontSize: 16 }}>{s.submissions}</b></div>
                    <div className="wl-stat" style={{ padding: 10 }}><span>Approved</span><b style={{ fontSize: 16 }}>{s.approved}</b></div>
                  </div>
                  <div className="ui-actions" style={{ marginTop: 'auto' }}>
                    {c.status !== 'ENDED' && <Link className="ui-btn ui-btn-dark" to={`/create?type=custom&campaign=${c.id}`}><i className="ti ti-plus" /> Add a job</Link>}
                    <button type="button" className="ui-btn ui-btn-ghost" onClick={() => view(c)}>View</button>
                    <button type="button" className="ui-btn ui-btn-ghost" onClick={() => openForm(c)}>Edit</button>
                    <button type="button" className="ui-btn ui-btn-ghost ui-btn-icon" aria-label={`Delete ${c.name}`} onClick={() => remove(c)}><i className="ti ti-trash" /></button>
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>

      {editing && (
        <Sheet title={editing === 'new' ? 'New campaign' : 'Edit campaign'} onClose={() => setEditing(null)}>
          <div className="wl-field">
            <label className="ui-label" htmlFor="cp-name">Name</label>
            <input id="cp-name" className="ui-input" maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. September launch" />
          </div>
          <div className="wl-field">
            <span className="ui-label">Platforms</span>
            <div className="wl-quick" style={{ marginTop: 0 }}>
              {PLATFORMS.map((p) => {
                const on = form.platforms.includes(p)
                return <button key={p} type="button" className={`ui-chip${on ? ' on' : ''}`} aria-pressed={on} onClick={() => setForm({ ...form, platforms: on ? form.platforms.filter((x) => x !== p) : [...form.platforms, p] })}>{p}</button>
              })}
            </div>
          </div>
          <div className="wl-field" style={{ display: 'grid', gridTemplateColumns: editing === 'new' ? 'minmax(0,1fr) 110px' : 'minmax(0,1fr)', gap: 8 }}>
            <div>
              <label className="ui-label" htmlFor="cp-budget">Budget</label>
              <input id="cp-budget" className="ui-input" inputMode="decimal" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value.replace(/[^\d.]/g, '') })} placeholder="0" />
            </div>
            {editing === 'new' && (
              <div>
                <label className="ui-label" htmlFor="cp-cur">Currency</label>
                <select id="cp-cur" className="ui-select" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value as 'NGN' | 'USDC' })}><option value="NGN">NGN</option><option value="USDC">USDC</option></select>
              </div>
            )}
          </div>
          {editing !== 'new' && (
            <div className="wl-field">
              <span className="ui-label">Status</span>
              <div className="wl-seg" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 0 }}>
                {(['ACTIVE', 'PAUSED', 'ENDED'] as const).map((st) => <button key={st} type="button" aria-pressed={form.status === st} onClick={() => setForm({ ...form, status: st })}>{STATUS_LABEL[st]}</button>)}
              </div>
            </div>
          )}
          <div className="wl-field">
            <label className="ui-label" htmlFor="cp-desc">Notes (optional)</label>
            <textarea id="cp-desc" className="ui-input" style={{ height: 72, padding: 10, resize: 'vertical' }} maxLength={500} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <p className="wl-note" style={{ margin: '0 0 14px' }}>The budget is for tracking: jobs are still paid from your wallet when you post them. Only jobs in {editing === 'new' ? form.currency : (editing as Campaign).currency} can join this campaign.</p>
          {formErr && <div className="wl-err" role="alert"><i className="ti ti-alert-circle" /><span>{formErr}</span></div>}
          <button type="button" className="ui-btn ui-btn-dark ui-btn-lg wl-full" disabled={saving || form.name.trim().length < 2} onClick={save}>{saving ? 'Saving…' : editing === 'new' ? 'Create campaign' : 'Save changes'}</button>
        </Sheet>
      )}

      {viewing && (
        <Sheet title={viewing.name} onClose={() => setViewing(null)}>
          <div className="wl-sum" style={{ marginTop: 0 }}>
            <div><span>Budget</span><b>{money(viewing.budget, viewing.currency)}</b></div>
            <div><span>Spent on jobs (rewards and fees)</span><b>{money(viewing.stats.spent, viewing.currency)}</b></div>
            <div><span>Approval rate</span><b>{viewing.stats.approvalRate}%</b></div>
            <div className="total"><span>{viewing.stats.remaining < 0 ? 'Over budget' : 'Left'}</span><b>{money(Math.abs(viewing.stats.remaining), viewing.currency)}</b></div>
          </div>
          <span className="ui-label">Jobs</span>
          {jobs === null ? <div className="ui-sk" style={{ height: 60, borderRadius: 12 }} /> : jobs.length === 0 ? (
            <p className="wl-note">No jobs yet. {viewing.status !== 'ENDED' && <Link to={`/create?type=custom&campaign=${viewing.id}`}>Post one in this campaign</Link>}</p>
          ) : (
            <ul className="wl-banks">
              {jobs.map((j) => (
                <li key={j.id} className="wl-bank">
                  <span className="wl-bank-main">
                    <strong><Link to={`/tasks/${j.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{j.title}</Link></strong>
                    <span>{money(j.reward, j.currency)} × {j.maxWorkers} · {j.submissions} entries · {j.approved} approved</span>
                  </span>
                  <span className="wl-tag">{j.status.replace('_', ' ').toLowerCase()}</span>
                </li>
              ))}
            </ul>
          )}
        </Sheet>
      )}
    </Layout>
  )
}
