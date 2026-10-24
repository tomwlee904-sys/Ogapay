import { useCallback, useEffect, useRef, useState } from 'react'
import { IconBookmarkFilled } from '@tabler/icons-react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { apiRequest } from '../lib/api'
import { categoryLabel } from '../lib/categories'
import { jobRequirements } from '../lib/requirements'
import { savedJobIds, setSaved, onSavedJobsChange } from '../lib/bookmarks'
import { useJobAlert } from '../contexts/JobAlertContext'
import InfoTip from '../components/InfoTip'
import PhoneJobAlerts from '../components/PhoneJobAlerts'
import JobsNav from '../components/JobsNav'
import LoadError from '../components/LoadError'
import Money from '../components/Money'
import { useMedia, DESKTOP } from '../hooks/useMedia'
import '../styles/job-monitor.css'

// Job monitor: open jobs, newest first, checked every 30 seconds while the page is
// open, with an optional pop-up and sound for new ones. "Take a place" reserves a
// place and opens the submit page. It used to call a hard-coded production API
// address, alert on every visit, keep "applied" only in this browser and map
// categories with codes the API doesn't use. "Available for me" hides jobs you've
// taken and jobs the server says you can't take (the list's "eligible" flag).
// Layout: the list first; the alert settings are one fold-out row on phone and
// tablet and a side panel on desktop. Saved jobs have their own page (Jobs nav).

type Job = {
  id: string; title: string; reward: number | string; currency?: string; category?: string; createdAt?: string
  maxWorkers?: number; currentWorkers?: number; posterId?: string; poster?: { username?: string | null }
  isSelection?: boolean
  eligible?: boolean // sent only when signed in: false when applying would be refused
  // Requirements (lib/requirements reads these)
  [k: string]: any
}

const POLL_MS = 30000
const ago = (d?: string) => {
  if (!d) return ''
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000)
  return m < 1 ? 'just now' : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
const hhmm = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
const readPref = (k: string) => { try { return localStorage.getItem(k) === 'true' } catch { return false } }
const writePref = (k: string, v: boolean) => { try { localStorage.setItem(k, String(v)) } catch { /* storage off */ } }

export default function JobMonitor() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  // The same chime the site-wide alert plays; switching Sound on plays it once
  const { testSound } = useJobAlert()
  const desktop = useMedia(DESKTOP)
  const [jobs, setJobs] = useState<Job[] | null>(null)
  // Jobs you hold a place on. An expired place (no work sent in time) can be taken again, so it's left out.
  const [taken, setTaken] = useState<Set<string>>(new Set())
  const [saved, setSavedIds] = useState<string[]>([])
  const [fresh, setFresh] = useState<Set<string>>(new Set())
  const [alerts, setAlerts] = useState(() => readPref('ogapay_jm_alerts'))
  const [sound, setSound] = useState(() => readPref('ogapay_jm_sound'))
  const [availableOnly, setAvailableOnly] = useState(() => readPref('ogapay_jm_available'))
  const [busy, setBusy] = useState<string | null>(null)
  const [checkedAt, setCheckedAt] = useState<Date | null>(null)
  // The last check failed: the list (if any) is from an earlier check
  const [failed, setFailed] = useState(false)
  const [checking, setChecking] = useState(false)
  const [alertsOpen, setAlertsOpen] = useState(false)
  const seen = useRef<Set<string> | null>(null)

  const load = useCallback(async () => {
    setChecking(true)
    try {
      // ?eligible=1: each job says whether you can take it (the "Available for me" switch)
      const d: any = await apiRequest('/tasks?limit=50&eligible=1')
      const list: Job[] = (Array.isArray(d) ? d : d?.tasks || []).filter((j: Job) => j.posterId !== user?.id)
      if (seen.current) {
        // Only jobs that appear after the page opened count as new
        const added = list.filter((j) => !seen.current!.has(j.id))
        // (the pop-up and sound come from the site-wide job alert, which uses these switches)
        if (added.length) setFresh((f) => new Set([...f, ...added.map((j) => j.id)]))
      }
      seen.current = new Set(list.map((j) => j.id))
      setJobs(list)
      setCheckedAt(new Date())
      setFailed(false)
    } catch {
      // Keep whatever list is on screen; never turn a failed check into "no jobs"
      setFailed(true)
    }
    setChecking(false)
  }, [user?.id])

  useEffect(() => {
    load()
    const t = setInterval(() => { if (!document.hidden) load() }, POLL_MS)
    return () => clearInterval(t)
  }, [load])

  useEffect(() => {
    apiRequest<{ submissions: { taskId: string; status: string }[] }>('/tasks/my/submissions')
      .then((d) => setTaken(new Set((d?.submissions || []).filter((s) => s.status !== 'EXPIRED').map((s) => s.taskId)))).catch(() => {})
    let live = true
    savedJobIds().then((ids) => { if (live) setSavedIds([...ids]) })
    const off = onSavedJobsChange((ids) => setSavedIds([...ids]))
    return () => { live = false; off() }
  }, [])

  const toggleSave = (id: string) => {
    const on = !saved.includes(id)
    setSavedIds((s) => on ? [...s, id] : s.filter((x) => x !== id))
    setSaved(id, on).catch(() => { setSavedIds((s) => on ? s.filter((x) => x !== id) : [...s, id]); toast("Couldn't update your saved jobs", 'error') })
  }
  const takeSlot = async (j: Job) => {
    // A Selection job takes an application with a note (on the submit page), not a place
    if (j.isSelection) { navigate(`/tasks/${j.id}/submit`); return }
    setBusy(j.id)
    try {
      await apiRequest(`/tasks/${j.id}/apply`, { method: 'POST' }).catch((e: any) => {
        if (!/already applied/i.test(String(e?.message || ''))) throw e // other refusals (e.g. a similar job done) must show
      })
      navigate(`/tasks/${j.id}/submit`)
    } catch (e: any) { toast(e?.message || "Couldn't take a place", 'error') }
    setBusy(null)
  }

  const list = jobs || []
  const open = list.filter((j) => (j.maxWorkers || 1) > (j.currentWorkers || 0)
    && (!availableOnly || (!taken.has(j.id) && j.eligible !== false)))
  const shown = open.slice().sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())

  const alertSwitches = (
    <div className="jm2-alerts-body" id="jm2-alerts-body">
      <label className="ui-switch jm2-sw"><span><b>Pop-up alerts</b><small>A note on screen when a new job is posted</small></span><input type="checkbox" checked={alerts} onChange={(e) => { setAlerts(e.target.checked); writePref('ogapay_jm_alerts', e.target.checked) }} /><span className="ui-switch-track" aria-hidden="true" /></label>
      <label className="ui-switch jm2-sw"><span><b>Sound</b><small>A short chime with each new job</small></span><input type="checkbox" checked={sound} onChange={(e) => { setSound(e.target.checked); writePref('ogapay_jm_sound', e.target.checked); if (e.target.checked) testSound() }} /><span className="ui-switch-track" aria-hidden="true" /></label>
      {(alerts || sound) && <p className="jm2-prefs-note">Works on every OgaPay page while it's open. Your browser plays sound only after you've tapped the page once. Your own jobs don't alert you{availableOnly ? ", and with Available for me on, neither do jobs you can't take" : ''}.</p>}
      {user && <PhoneJobAlerts />}
    </div>
  )
  const alertSummary = `Pop-up ${alerts ? 'on' : 'off'} · Sound ${sound ? 'on' : 'off'}`

  return (
    <Layout>
      <div className="ui-page jm2-page">
        <div className="ui-head">
          <div>
            <h1 className="ui-title" style={{ marginTop: 0 }}>Job monitor</h1>
            <p className="ui-sub">New jobs show up here as they're posted. The list checks again every 30 seconds.</p>
          </div>
        </div>
        <JobsNav />

        <div className="ui-split jm2-layout">
          <div className="jm2-main">
            <div className="jm2-bar">
              <span className="jm2-avail">
                <label className="ui-switch"><input type="checkbox" checked={availableOnly} onChange={(e) => { setAvailableOnly(e.target.checked); writePref('ogapay_jm_available', e.target.checked) }} /><span className="ui-switch-track" aria-hidden="true" /> Available for me</label>
                <InfoTip label="What does Available for me show?" title="Available for me">
                  <p>Only open jobs you can take right now: a place is free, you haven't taken it already, and you meet what the poster asked for (like OgaScore, rank or a connected account).</p>
                </InfoTip>
              </span>
              <span className={`jm2-live${failed ? ' is-down' : ''}`} role="status">
                <i aria-hidden="true" />
                {failed
                  ? <>Can't reach OgaPay{checkedAt ? ` · last checked ${hhmm(checkedAt)}` : ''} <button type="button" className="jm2-retry tap" onClick={load} disabled={checking}>{checking ? 'Trying…' : 'Try now'}</button></>
                  : checkedAt ? <>{jobs ? `${open.length} open · ` : ''}checked {hhmm(checkedAt)}</> : 'Checking…'}
              </span>
            </div>

            {jobs === null && failed ? <LoadError what="new jobs" onRetry={load} />
              : jobs === null ? <div className="ui-sk" style={{ height: 240 }} />
              : shown.length === 0 ? (
                <div className="ui-empty">
                  <strong>{availableOnly ? 'No open jobs you can take right now' : 'No open jobs right now'}</strong>
                  {availableOnly ? 'Turn off "Available for me" to see them all.' : 'New ones appear here as soon as they are posted. Turn on alerts to hear about them.'}
                  {availableOnly && <div style={{ marginTop: 14 }}><button type="button" className="ui-btn ui-btn-ghost" onClick={() => { setAvailableOnly(false); writePref('ogapay_jm_available', false) }}>Show all open jobs</button></div>}
                </div>
              ) : (
                <ul className="ui-card jm2-list">
                  {shown.map((j) => {
                    const left = Math.max(0, (j.maxWorkers || 1) - (j.currentWorkers || 0))
                    const mine = taken.has(j.id)
                    const reqs = jobRequirements(j)
                    const isSaved = saved.includes(j.id)
                    return (
                      <li key={j.id} className={fresh.has(j.id) ? 'new' : ''}>
                        <div className="jm2-t">
                          <Link to={`/tasks/${j.id}`}>{fresh.has(j.id) && <span className="jm2-new">New</span>}{j.title}</Link>
                          <span>{categoryLabel(j.category)}{j.poster?.username ? ` · @${j.poster.username}` : ''} · {ago(j.createdAt)} · {left === 0 ? 'full' : `${left} ${left === 1 ? 'place' : 'places'} left`}</span>
                          {/* What the job asks for, like wurk's "Requires Rank 2 · Human verification" line */}
                          <span className={`jm2-req${reqs.length ? '' : ' none'}`}><i className={`ti ti-${reqs.length ? 'shield-check' : 'circle-check'}`} aria-hidden="true" />{reqs.length ? 'Requires ' + reqs.map((r) => r.text).join(' · ') : 'No extra requirements'}</span>
                        </div>
                        <b className="jm2-pay"><Money amount={Number(j.reward || 0)} currency={j.currency || 'NGN'} size={15} positive /></b>
                        <div className="jm2-acts">
                          <button type="button" className="ui-btn ui-btn-ghost ui-btn-icon" aria-pressed={isSaved} aria-label={isSaved ? `Remove ${j.title} from saved jobs` : `Save ${j.title}`} onClick={() => toggleSave(j.id)}>{isSaved ? <IconBookmarkFilled size={16} aria-hidden="true" /> : <i className="ti ti-bookmark" aria-hidden="true" />}</button>
                          {mine
                            ? <Link className="ui-btn ui-btn-ghost" to={`/tasks/${j.id}/submit`}>Open</Link>
                            // A Selection job is applied to with a note (on the next page), not taken
                            : j.isSelection
                              ? <button type="button" className="ui-btn ui-btn-dark" disabled={left === 0} onClick={() => takeSlot(j)}>Apply</button>
                              : <button type="button" className="ui-btn ui-btn-dark" disabled={busy === j.id || left === 0} onClick={() => takeSlot(j)}>{busy === j.id ? 'Taking…' : 'Take a place'}</button>}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
          </div>

          {/* Alerts: a side panel on desktop; one fold-out row above the list on phone and tablet */}
          <aside className="ui-split-side ui-split-side-first jm2-side">
            {desktop ? (
              <section className="ui-card jm2-alerts" aria-labelledby="jm2-alerts-h">
                <h2 className="jm2-alerts-h" id="jm2-alerts-h"><i className="ti ti-bell-ringing" aria-hidden="true" /> Alerts</h2>
                {alertSwitches}
              </section>
            ) : (
              <section className="ui-card jm2-alerts">
                <button type="button" className="jm2-alerts-toggle" aria-expanded={alertsOpen} aria-controls="jm2-alerts-body" onClick={() => setAlertsOpen((o) => !o)}>
                  <i className="ti ti-bell-ringing" aria-hidden="true" />
                  <span><b>Alerts</b><small>{alertSummary}</small></span>
                  <span className="jm2-change">{alertsOpen ? 'Done' : 'Change'}<i className={`ti ti-chevron-${alertsOpen ? 'up' : 'down'}`} aria-hidden="true" /></span>
                </button>
                {alertsOpen && alertSwitches}
              </section>
            )}
          </aside>
        </div>
      </div>
    </Layout>
  )
}
