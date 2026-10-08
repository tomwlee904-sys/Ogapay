import { useCallback, useEffect, useRef, useState } from 'react'
import { IconBookmarkFilled } from '@tabler/icons-react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { apiRequest } from '../lib/api'
import { categoryLabel } from '../lib/categories'
import { savedJobIds, setSaved, onSavedJobsChange } from '../lib/bookmarks'
import { useJobAlert } from '../contexts/JobAlertContext'
import '../styles/job-monitor.css'

// Job monitor: open jobs, newest first, checked every 30 seconds while the page is
// open, with an optional pop-up and sound for new ones. "Take a slot" reserves a
// place and opens the submit page. It used to call a hard-coded production API
// address, alert on every visit, keep "applied" only in this browser and map
// categories with codes the API doesn't use.

type Job = {
  id: string; title: string; reward: number | string; currency?: string; category?: string; createdAt?: string
  maxWorkers?: number; currentWorkers?: number; posterId?: string; poster?: { username?: string | null }
}

const POLL_MS = 30000
const money = (n: number, cur = 'NGN') => cur === 'NGN' ? `₦${Math.round(n).toLocaleString('en-US')}` : `$${n.toFixed(2)}`
const ago = (d?: string) => {
  if (!d) return ''
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000)
  return m < 1 ? 'just now' : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
const readPref = (k: string) => { try { return localStorage.getItem(k) === 'true' } catch { return false } }
const writePref = (k: string, v: boolean) => { try { localStorage.setItem(k, String(v)) } catch { /* storage off */ } }

export default function JobMonitor() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  // The same chime the site-wide alert plays; switching Sound on plays it once
  const { testSound } = useJobAlert()
  const [jobs, setJobs] = useState<Job[] | null>(null)
  const [taken, setTaken] = useState<Set<string>>(new Set())
  const [saved, setSavedIds] = useState<string[]>([])
  const [fresh, setFresh] = useState<Set<string>>(new Set())
  const [tab, setTab] = useState<'open' | 'saved'>('open')
  const [alerts, setAlerts] = useState(() => readPref('ogapay_jm_alerts'))
  const [sound, setSound] = useState(() => readPref('ogapay_jm_sound'))
  const [busy, setBusy] = useState<string | null>(null)
  const [checkedAt, setCheckedAt] = useState<Date | null>(null)
  const seen = useRef<Set<string> | null>(null)

  const load = useCallback(async () => {
    try {
      const d: any = await apiRequest('/tasks?limit=50')
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
    } catch { setJobs((j) => j || []) }
  }, [user?.id])

  useEffect(() => {
    load()
    const t = setInterval(() => { if (!document.hidden) load() }, POLL_MS)
    return () => clearInterval(t)
  }, [load])

  useEffect(() => {
    apiRequest<{ submissions: { taskId: string }[] }>('/tasks/my/submissions')
      .then((d) => setTaken(new Set((d?.submissions || []).map((s) => s.taskId)))).catch(() => {})
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
    setBusy(j.id)
    try {
      await apiRequest(`/tasks/${j.id}/apply`, { method: 'POST' }).catch((e: any) => {
        if (!String(e?.message || '').toLowerCase().includes('already')) throw e
      })
      navigate(`/tasks/${j.id}/submit`)
    } catch (e: any) { toast(e?.message || "Couldn't take a slot", 'error') }
    setBusy(null)
  }

  const list = jobs || []
  const open = list.filter((j) => (j.maxWorkers || 1) > (j.currentWorkers || 0))
  const shown = (tab === 'saved' ? list.filter((j) => saved.includes(j.id)) : open)
    .slice().sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())

  return (
    <Layout>
      <div className="ui-page jm2-page">
        <div className="ui-head">
          <div>
            <span className="ui-eyebrow">Working</span>
            <h1 className="ui-title">Job monitor</h1>
            <p className="ui-sub">New jobs show up here as they're posted. Keep this page open to hear about them first.</p>
          </div>
          <div className="jm2-prefs">
            <label className="ui-switch"><input type="checkbox" checked={alerts} onChange={(e) => { setAlerts(e.target.checked); writePref('ogapay_jm_alerts', e.target.checked) }} /><span className="ui-switch-track" /> Pop-up alerts</label>
            <label className="ui-switch"><input type="checkbox" checked={sound} onChange={(e) => { setSound(e.target.checked); writePref('ogapay_jm_sound', e.target.checked); if (e.target.checked) testSound() }} /><span className="ui-switch-track" /> Sound</label>
            {(alerts || sound) && <p className="jm2-prefs-note">Works on every OgaPay page while it's open. Your browser plays sound only after you've tapped the page once. Your own jobs don't alert you.</p>}
          </div>
        </div>

        <div className="jm2-bar">
          <div className="jm2-tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'open'} className={`ui-chip${tab === 'open' ? ' on' : ''}`} onClick={() => setTab('open')}>Open now<em>{open.length}</em></button>
            <button role="tab" aria-selected={tab === 'saved'} className={`ui-chip${tab === 'saved' ? ' on' : ''}`} onClick={() => setTab('saved')}>Saved<em>{list.filter((j) => saved.includes(j.id)).length}</em></button>
          </div>
          <span className="jm2-live"><i /> {checkedAt ? `Checked ${checkedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : 'Checking…'}</span>
        </div>

        {jobs === null ? <div className="ui-sk" style={{ height: 240 }} /> : shown.length === 0 ? (
          <div className="ui-empty">{tab === 'saved' ? 'You haven\'t saved any open jobs.' : 'No open jobs right now. New ones will appear here.'}</div>
        ) : (
          <ul className="ui-card jm2-list">
            {shown.map((j) => {
              const left = Math.max(0, (j.maxWorkers || 1) - (j.currentWorkers || 0))
              const mine = taken.has(j.id)
              return (
                <li key={j.id} className={fresh.has(j.id) ? 'new' : ''}>
                  <div className="jm2-t">
                    <Link to={`/tasks/${j.id}`}>{fresh.has(j.id) && <span className="jm2-new">New</span>}{j.title}</Link>
                    <span>{categoryLabel(j.category)}{j.poster?.username ? ` · @${j.poster.username}` : ''} · {ago(j.createdAt)} · {left === 0 ? 'full' : `${left} ${left === 1 ? 'slot' : 'slots'} left`}</span>
                  </div>
                  <b>{money(Number(j.reward || 0), j.currency)}</b>
                  <div className="jm2-acts">
                    <button className="ui-btn ui-btn-ghost ui-btn-icon" aria-label={saved.includes(j.id) ? 'Unsave' : 'Save'} onClick={() => toggleSave(j.id)}>{saved.includes(j.id) ? <IconBookmarkFilled size={16} aria-hidden="true" /> : <i className="ti ti-bookmark" />}</button>
                    {mine
                      ? <Link className="ui-btn ui-btn-ghost" to={`/tasks/${j.id}/submit`}>Open</Link>
                      : <button className="ui-btn ui-btn-dark" disabled={busy === j.id || left === 0} onClick={() => takeSlot(j)}>{busy === j.id ? 'Taking…' : 'Take a slot'}</button>}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Layout>
  )
}
