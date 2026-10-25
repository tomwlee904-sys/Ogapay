import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest, getAccessToken } from '../lib/api'
import '../styles/profile-public.css'
import '../styles/writer.css'

// Ported from the June writer workspace, which listed the ten newest jobs of any
// kind and pointed every "resource" at the FAQ. It now shows open writing and
// translation jobs and links to the blog editor.

type Job = { id: string; title: string; reward: number | string; currency: string; category: string; maxWorkers: number; currentWorkers: number; createdAt: string; deadline: string | null }

const KINDS = [
  { id: 'CONTENT_WRITING', label: 'Writing', icon: 'ti-writing', tasksLabel: 'Content writing' },
  { id: 'TRANSLATION', label: 'Translation', icon: 'ti-language', tasksLabel: 'Translation' },
] as const

const money = (n: number | string, c: string) => (c === 'NGN' ? '₦' + Number(n).toLocaleString('en-US') : `${Number(n).toLocaleString('en-US')} ${c}`)
const ago = (d: string) => {
  const h = Math.floor((Date.now() - new Date(d).getTime()) / 3600000)
  return h < 1 ? 'just now' : h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`
}

export default function Writer() {
  const [kind, setKind] = useState<(typeof KINDS)[number]['id']>('CONTENT_WRITING')
  const [jobs, setJobs] = useState<Job[] | null>(null)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const signedIn = !!getAccessToken()

  useEffect(() => {
    let live = true
    setJobs(null)
    apiRequest<any>(`/tasks?category=${kind}&status=OPEN&limit=20`, { auth: false })
      .then((d) => { if (live) setJobs(Array.isArray(d) ? d : d?.data || d?.tasks || []) })
      .catch(() => { if (live) setJobs([]) })
    return () => { live = false }
  }, [kind])

  // Open job counts for the tabs
  useEffect(() => {
    KINDS.forEach((k) => {
      apiRequest<any>(`/tasks?category=${k.id}&status=OPEN&limit=100`, { auth: false })
        .then((d) => setCounts((c) => ({ ...c, [k.id]: (Array.isArray(d) ? d : d?.data || []).length })))
        .catch(() => {})
    })
  }, [])

  return (
    <Layout>
      <div className="up-wrap">
        <div className="wr2-head">
          <div>
            <h1>Writer workspace</h1>
            <p>Paid writing and translation jobs, and a place to publish your own articles.</p>
          </div>
          <Link className="up-btn" to="/create"><i className="ti ti-plus" /> Hire a writer</Link>
        </div>

        <div className="wr2-cards">
          <Link to={signedIn ? '/blog/write' : '/blog'} className="up-card wr2-card">
            <i className="ti ti-pencil" />
            <div><strong>Write for the OgaPay blog</strong><span>Share tips and stories. Articles are reviewed before they go live.</span></div>
          </Link>
          <Link to="/faq#earning" className="up-card wr2-card">
            <i className="ti ti-help-circle" />
            <div><strong>How paid jobs work</strong><span>Applying, submitting proof and getting paid from escrow.</span></div>
          </Link>
          <Link to="/workers?category=writing" className="up-card wr2-card">
            <i className="ti ti-users" />
            <div><strong>Find writers</strong><span>Browse people who list writing as a skill.</span></div>
          </Link>
        </div>

        <div className="up-tabs-row">
          <div className="up-tabs" role="tablist" aria-label="Job type">
            {KINDS.map((k) => (
              <button key={k.id} role="tab" aria-selected={kind === k.id} className={`up-tab${kind === k.id ? ' on' : ''}`} onClick={() => setKind(k.id)}>
                <i className={`ti ${k.icon}`} /> {k.label}{counts[k.id] != null && <em>{counts[k.id] >= 100 ? '100+' : counts[k.id]}</em>}
              </button>
            ))}
          </div>
          <Link to={`/tasks?category=${encodeURIComponent(KINDS.find((k) => k.id === kind)!.tasksLabel)}`} className="wr2-all">All jobs <i className="ti ti-arrow-right" /></Link>
        </div>

        {jobs === null ? (
          <div className="up-empty"><i className="ti ti-loader-2" />Loading…</div>
        ) : jobs.length === 0 ? (
          <div className="up-empty"><i className="ti ti-briefcase-off" />No open {kind === 'TRANSLATION' ? 'translation' : 'writing'} jobs right now. Check back soon.</div>
        ) : (
          <section className="up-card wr2-list">
            {jobs.map((j) => {
              const left = Math.max(0, (j.maxWorkers || 1) - (j.currentWorkers || 0))
              return (
                <Link key={j.id} to={`/tasks/${j.id}`} className="wr2-job">
                  <div className="wr2-job-main">
                    <strong>{j.title}</strong>
                    <span>{left} of {j.maxWorkers || 1} slot{(j.maxWorkers || 1) === 1 ? '' : 's'} left · posted {ago(j.createdAt)}{j.deadline ? ` · due ${new Date(j.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}</span>
                  </div>
                  <span className="wr2-pay">{money(j.reward, j.currency)}</span>
                  <i className="ti ti-chevron-right wr2-go" />
                </Link>
              )
            })}
          </section>
        )}
      </div>
    </Layout>
  )
}
