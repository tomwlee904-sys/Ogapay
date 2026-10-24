import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import LoadError from '../components/LoadError'
import { apiRequest, getAccessToken } from '../lib/api'
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
  const [failed, setFailed] = useState(false)
  const [reload, setReload] = useState(0)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const signedIn = !!getAccessToken()

  // A failed load shows "couldn't load" with Try again (it used to say there
  // were no writing jobs)
  useEffect(() => {
    let live = true
    setJobs(null); setFailed(false)
    apiRequest<any>(`/tasks?category=${kind}&status=OPEN&limit=20`, { auth: false })
      .then((d) => { if (live) setJobs(Array.isArray(d) ? d : d?.data || d?.tasks || []) })
      .catch(() => { if (live) setFailed(true) })
    return () => { live = false }
  }, [kind, reload])

  // Open job counts for the tabs
  useEffect(() => {
    KINDS.forEach((k) => {
      apiRequest<any>(`/tasks?category=${k.id}&status=OPEN&limit=100`, { auth: false })
        .then((d) => setCounts((c) => ({ ...c, [k.id]: (Array.isArray(d) ? d : d?.data || []).length })))
        .catch(() => {})
    })
  }, [reload])

  const noun = kind === 'TRANSLATION' ? 'translation' : 'writing'

  return (
    <Layout>
      <div className="ui-page">
        <header className="ui-head">
          <div>
            <h1 className="ui-title">Writer workspace</h1>
            <p className="ui-sub">Paid writing and translation jobs, and a place to publish your own articles.</p>
          </div>
        </header>

        {/* Phone: the jobs first, the shortcuts after them. Tablet and desktop:
            the jobs on the left, the shortcuts in a side panel. */}
        <div className="wr2-layout">
          <div className="wr2-main">
            <div className="wr2-tabs-row">
              <div className="wr2-seg" role="group" aria-label="Job type">
                {KINDS.map((k) => (
                  <button key={k.id} type="button" aria-pressed={kind === k.id} className={kind === k.id ? 'on' : ''} onClick={() => setKind(k.id)}>
                    <i className={`ti ${k.icon}`} aria-hidden="true" /> {k.label}{!failed && counts[k.id] != null && <em>{counts[k.id] >= 100 ? '100+' : counts[k.id]}</em>}
                  </button>
                ))}
              </div>
              <Link to={`/tasks?category=${encodeURIComponent(KINDS.find((k) => k.id === kind)!.tasksLabel)}`} className="wr2-all">All jobs <i className="ti ti-arrow-right" aria-hidden="true" /></Link>
            </div>

            {failed ? (
              <LoadError what={`the ${noun} jobs`} onRetry={() => setReload((r) => r + 1)} />
            ) : jobs === null ? (
              <div className="ui-sk" style={{ height: 180 }} aria-busy="true" aria-label="Loading jobs" />
            ) : jobs.length === 0 ? (
              <div className="ui-empty">
                <strong>No open {noun} jobs right now</strong>
                New jobs are posted every day.
                <div style={{ marginTop: 14 }}><Link className="ui-btn ui-btn-ghost" to="/job-monitor"><i className="ti ti-bell" aria-hidden="true" /> Get alerts for new jobs</Link></div>
              </div>
            ) : (
              <section className="ui-card wr2-list">
                {jobs.map((j) => {
                  const left = Math.max(0, (j.maxWorkers || 1) - (j.currentWorkers || 0))
                  return (
                    <Link key={j.id} to={`/tasks/${j.id}`} className="wr2-job">
                      <div className="wr2-job-main">
                        <strong>{j.title}</strong>
                        <span>{left} of {j.maxWorkers || 1} slot{(j.maxWorkers || 1) === 1 ? '' : 's'} left · posted {ago(j.createdAt)}{j.deadline ? ` · due ${new Date(j.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}</span>
                      </div>
                      <span className="wr2-pay">{money(j.reward, j.currency)}</span>
                      <i className="ti ti-chevron-right wr2-go" aria-hidden="true" />
                    </Link>
                  )
                })}
              </section>
            )}
          </div>

          <aside className="wr2-side">
            <section className="ui-card wr2-links" aria-labelledby="wr2-more-h">
              <h2 id="wr2-more-h" className="wr2-side-h">More for writers</h2>
              <Link to={signedIn ? '/blog/write' : '/blog'} className="wr2-link">
                <i className="ti ti-pencil" aria-hidden="true" />
                <span><strong>Write for the OgaPay blog</strong><small>Articles are reviewed before they go live.</small></span>
                <i className="ti ti-chevron-right wr2-go" aria-hidden="true" />
              </Link>
              <Link to="/faq#earning" className="wr2-link">
                <i className="ti ti-help-circle" aria-hidden="true" />
                <span><strong>How paid jobs work</strong><small>Applying, proof and getting paid from escrow.</small></span>
                <i className="ti ti-chevron-right wr2-go" aria-hidden="true" />
              </Link>
              <Link to="/workers?category=writing" className="wr2-link">
                <i className="ti ti-users" aria-hidden="true" />
                <span><strong>Find writers</strong><small>People who list writing as a skill.</small></span>
                <i className="ti ti-chevron-right wr2-go" aria-hidden="true" />
              </Link>
            </section>
            <section className="ui-card wr2-hire">
              <strong>Need a writer?</strong>
              <span>Post a writing or translation job and pay only for work you approve.</span>
              <Link className="ui-btn ui-btn-ghost" to="/create"><i className="ti ti-plus" aria-hidden="true" /> Post a job</Link>
            </section>
          </aside>
        </div>
      </div>
    </Layout>
  )
}
