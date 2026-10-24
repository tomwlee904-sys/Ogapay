import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useCurrency } from '../context/CurrencyContext'
import { useAuth } from '../context/AuthContext'
import { SkeletonPage, injectSkeletonStyles } from '../components/SkeletonLoader'
import { useToast } from '../components/Toast'
import { API_BASE, apiRequest, getAccessToken } from '../lib/api'
import { savedJobIds, setSaved } from '../lib/bookmarks'
import { jobRequirements, rankName } from '../lib/requirements'
import { BoostedTag, PremiumMark, VerifiedBusinessLine } from '../components/Perks'
import Money from '../components/Money'
import ContestPanel, { type ContestInfo } from '../components/ContestPanel'
import JobActivity from '../components/JobActivity'
import RateWork, { RatedStars, ratedByTeam } from '../components/RateWork'
import CopyFlag from '../components/CopyFlag'
import { formatMoney } from '../lib/money'
import { jobDeadline, deadlineLabel, deadlineDate } from '../lib/deadline'
import { categoryLabel } from '../lib/categories'
import { sized } from '../lib/img'
import { renderJobText, renderJobLine } from '../lib/jobText'
import { PayoutCheckStatus, checkBlocksApprove, anyWaiting, useNow } from '../components/PayoutCheck'
import SocialJobPanel, { type SocialInfo } from '../components/SocialJobPanel'
import InfoTip from '../components/InfoTip'
import { useMedia, DESKTOP } from '../hooks/useMedia'
import '../styles/job-detail.css'

const BRAND = 'var(--accent)'
const BRAND_LIGHT = 'rgba(var(--accent-rgb),0.10)'
function pad(n: number) { return String(n).padStart(2, '0') }

function toArray<T>(val: T | T[] | undefined | null, fallback: T[]): T[] {
  if (Array.isArray(val)) return val
  if (val !== undefined && val !== null && val !== '') return [val as T]
  return fallback
}

function useCountdown(deadline: number) {
  const calc = () => {
    const diff = deadline - Date.now()
    if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0 }
    return {
      d: Math.floor(diff / 86400000),
      h: Math.floor((diff % 86400000) / 3600000),
      m: Math.floor((diff % 3600000) / 60000),
      s: Math.floor((diff % 60000) / 1000),
    }
  }
  const [t, setT] = useState(calc)
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 1000)
    return () => clearInterval(id)
  }, [deadline])
  return t
}

interface JobData {
  id: string
  title: string
  description: string
  creatorId: string
  brand: string
  brandHandle: string
  brandAvatar: string
  brandVerified: boolean
  brandVerifiedName?: string | null
  brandPremium?: boolean
  boosted?: boolean
  category: string
  type: string
  platform: string
  reward: number
  currency: string
  usdEquiv: string
  slots: number
  slotsLeft: number
  currentWorkers?: number
  completions: number
  deadline: number
  posted: string
  status: string
  difficulty: string
  estimatedTime: string
  steps: string[]
  requirements: string[]
  proofRequired: string[]
  // Social jobs: the payout check, in words from the server (null when none)
  payoutCheck?: { minutes: number; checkable: boolean; note: string } | null
  // Quick social jobs on X: action, price, target post, place hold, batches, progress
  social?: SocialInfo | null
  tags: string[]
  approvalTime: string
  payoutDay: string
  totalPool: string
  similarJobs: any[]
  instructions: string
  posterId: string
  featured: boolean
  selectionType: string
  // Selection job: people apply with a note and the poster picks one person
  isSelection?: boolean
  applicationsCount?: number
  capacity: string
  potentialWinners: number
  winnersSelected: number
  maxEntries: number
  community: string
  submitted: number
  requirementKey: string
  // What workers need; lib/requirements reads these (they were dropped here, so the
  // page always said "No extra requirements" and "Minimum rank: None")
  workerRequirement: string
  minRank: number
  rankRequired?: number
  minSorsaScore: number
  minXScore: number
  minJobsDone: number
  requiresWallet: boolean
  requiresX: boolean
  requiresXBlue: boolean
  requiresLinkedin: boolean
  audiencePlatform: string | null
  minFollowers: number
  // "Member of community": public job only that community's members can take
  requiredCommunity: { id: string; name: string; slug: string; isMember: boolean } | null
}

export default function JobDetail() {
  const { fmt, preferredCurrency, convert } = useCurrency()
  const { toast: showToast } = useToast()
  const { user } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()
  const [job, setJob] = useState<JobData | null>(null)
  // Your own place on this job, if you took one (GET /tasks/:id sends it when signed in)
  const [mySub, setMySub] = useState<{ status: string; holdEndsAt?: string | null; payoutCheck?: string | null; payoutCheckDueAt?: string | null; payoutCheckReason?: string | null } | null>(null)
  // Selection jobs: your application (WAITING, PICKED or NOT_PICKED)
  const [myApp, setMyApp] = useState<{ status: string } | null>(null)
  // Why you can't take this job, each reason with a code (server: task.service eligibilityFor)
  const [eligibility, setEligibility] = useState<{ eligible: boolean; reasons: { code: string; text: string }[] } | null>(null)
  // Selection job or private hire: who was picked (opens the workspace for them and the poster)
  const [hiredId, setHiredId] = useState<string | null>(null)
  // The poster's similar jobs: people who did one of them can't take this one
  const [linkedJobs, setLinkedJobs] = useState<{ id: string; title: string }[]>([])
  // Name the job in the browser tab (PageTitle sets the generic one first)
  useEffect(() => { if (job?.title) document.title = `${job.title} | OgaPay Jobs` }, [job?.title])
  // Contests: prizes, entries and winners (from GET /tasks/:id); reloaded after the poster pays the winners
  const [contest, setContest] = useState<ContestInfo | null>(null)
  // Members-only job: the community whose members can take it
  const [community, setCommunity] = useState<{ id: string; name: string; slug: string } | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showSubs, setShowSubs] = useState(false)
  const [showApplyWarning, setShowApplyWarning] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  useEffect(() => {
    if (!id) return
    let live = true
    savedJobIds().then((ids) => { if (live) setBookmarked(ids.has(id)) })
    return () => { live = false }
  }, [id])
  const [cancelling, setCancelling] = useState(false)
  const [highlighting, setHighlighting] = useState(false)
  const [error, setError] = useState('')
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportCategory, setReportCategory] = useState('')
  const [reportDesc, setReportDesc] = useState('')
  const [reportMsg, setReportMsg] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)

  const { user: authUser, refreshUser } = useAuth()
  const [submissions, setSubmissions] = useState<any[]>([])
  const [subsLoading, setSubsLoading] = useState(false)
  const countdown = useCountdown(job?.deadline || 0)
  // The job last loaded. Reloading the same job (after the poster awards or pays
  // contest places) keeps the page up instead of the loading skeleton, so any
  // message on it (like an award that failed) stays readable.
  const loadedId = useRef<string | null>(null)

  useEffect(() => {
    if (!id) return
    const quiet = loadedId.current === id
    if (!quiet) {
      setLoading(true)
      setError('')
    }
    const fetchJob = async () => {
      try {
        // Signed in: send the token so private direct-hire jobs load for the poster and hired worker
        const token = getAccessToken()
        const res = await fetch(`${API_BASE}/tasks/${id}`, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined)
        if (res.status >= 500) throw new Error('server error')
        const json = await res.json()
        if (json.success && json.data) {
          const t = json.data.task || json.data
          setJob({ ...formatTask(t), applicationsCount: Number(json.data.applicationsCount || 0) })
          setMySub(json.data.userSubmission || null)
          setMyApp(json.data.userApplication || null)
          setEligibility(json.data.eligibility || null)
          setHiredId(t?.hiredWorkerId || null)
          setLinkedJobs(Array.isArray(json.data.similarJobs) ? json.data.similarJobs : [])
          setContest(json.data.contest || null)
          setCommunity(json.data.community || null)
          loadedId.current = id
        } else if (!quiet) {
          const res2 = await fetch(`${API_BASE}/jobs/${id}`)
          const json2 = await res2.json()
          if (json2.success && json2.data) {
            setJob(formatTask(json2.data))
            loadedId.current = id
          } else {
            setError('Task not found')
          }
        }
      } catch {
        // A reload that fails keeps the page as it was
        if (!quiet) setError('Failed to load task')
      }
      setLoading(false)
    }
    fetchJob()
  }, [id, reloadKey])

  useEffect(() => { injectSkeletonStyles() }, [])

  useEffect(() => {
    if (!showSubs || !job?.id || !authUser) return
    const token = localStorage.getItem('ogapay_access_token')
    if (!token) return
    setSubsLoading(true)
    fetch(API_BASE + '/tasks/' + job.id + '/submissions', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then(r => r.json())
      .then(json => {
        const data = json?.data || json?.submissions || []
        setSubmissions(Array.isArray(data) ? data : [])
      })
      .catch(() => setSubmissions([]))
      .finally(() => setSubsLoading(false))
  }, [showSubs, job?.id, authUser?.id])

  const [approving, setApproving] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<string | null>(null)

  // Optional 1-5 stars and a short note go with the approval (components/RateWork.tsx)
  const handleApprove = async (subId: string, rating = 0, note = '') => {
    setApproving(subId)
    try {
      const token = localStorage.getItem('ogapay_access_token')
      if (!token) return
      const feedback = note.trim()
      const res = await fetch(API_BASE + '/tasks/submissions/' + subId + '/review', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ status: 'APPROVED', ...(rating ? { rating, ...(feedback ? { feedback } : {}) } : {}) }),
      })
      const json = await res.json()
      if (json.success) {
        const apiApprovedAt = json.data?.approvedAt || json.approvedAt
        setSubmissions(prev => prev.map(s => s.id === subId ? { ...s, status: 'APPROVED', rating: rating || null, feedback: rating && feedback ? feedback : null, ratedById: rating ? job?.posterId ?? null : null, _approvedAt: apiApprovedAt || Date.now() } : s))
        showToast(rating ? `Approved and paid. You gave ${rating}/5.` : 'Approved and paid.', 'success')
        refreshUser()
      } else {
        showToast(json.message || 'Failed to approve submission', 'error')
      }
    } catch (e: any) { showToast(e?.message || 'Failed to approve submission', 'error') }
    setApproving(null)
  }

  const handleReject = async (subId: string) => {
    setRejecting(subId)
    try {
      const token = localStorage.getItem('ogapay_access_token')
      if (!token) return
      const res = await fetch(API_BASE + '/tasks/submissions/' + subId + '/reject', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ posterNotes: '' }),
      })
      const json = await res.json()
      if (json.success) {
        setSubmissions(prev => prev.map(s => s.id === subId ? { ...s, status: 'REJECTED' } : s))
        refreshUser()
      }
    } catch (e: any) { showToast(e?.message || 'Failed to reject submission', 'error') }
    setRejecting(null)
  }

  function timeAgo(dateStr: string | Date) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return mins + 'm ago'
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return hrs + 'h ago'
    return Math.floor(hrs / 24) + 'd ago'
  }

  function formatTask(t: any): JobData {
    const now = Date.now()
    // The same deadline as the job list (lib/deadline): none, invalid or a real date.
    // It used to invent one 7 days out when there was none.
    const dl = jobDeadline(t, now)
    const parsedDeadline = dl.state === 'open' || dl.state === 'ended' ? dl.at : 0
    const difficultyMap: Record<string, string> = {
      easy: 'Easy', medium: 'Medium', hard: 'Hard', expert: 'Expert',
      beginner: 'Easy', intermediate: 'Medium', advanced: 'Hard',
    }
    // Places come from maxWorkers / currentWorkers (the old fields didn't exist, so every job showed 0 / 100)
    const slots = Number(t.maxWorkers) || Number(t.maxParticipants) || 1
    const filled = Number(t.currentWorkers ?? 0) || 0
    const slotsLeft = Math.max(0, slots - filled)
    return {
      id: t.id || t._id || '',
      creatorId: t.posterId || t.creatorId || t.creator?.id || '',
      title: t.title || 'Untitled Task',
      description: t.description || t.instructions || '',
      brand: t.poster?.username || t.creatorName || t.brand || t.creator?.name || '',
      brandHandle: t.poster?.username || t.creatorHandle || t.brandHandle || '',
      brandAvatar: t.poster?.avatarUrl || t.creatorAvatar || t.brandAvatar || '',
      brandVerified: !!(t.poster?.posterProfile?.isVerified && t.poster?.posterProfile?.verifiedName),
      brandVerifiedName: t.poster?.posterProfile?.verifiedName || null,
      brandPremium: !!t.poster?.premium,
      boosted: !!t.isBoosted,
      category: t.category || 'Others / General',
      type: t.type || t.mode || 'challenge',
      platform: t.platform || 'OgaPay',
      reward: Number(t.reward) || Number(t.bounty) || Number(t.maxBudget) || 0,
      currency: t.currency || 'NGN',
      usdEquiv: t.usdEquiv || '',
      slots,
      slotsLeft,
      completions: filled,
      deadline: parsedDeadline,
      posted: t.createdAt || t.posted || new Date().toISOString(),
      status: t.status || 'open',
      difficulty: difficultyMap[t.difficulty?.toLowerCase()] || t.difficulty || 'Medium',
      estimatedTime: Number(t.estimatedTime) > 0 ? (Number(t.estimatedTime) >= 60 ? `About ${Math.round(Number(t.estimatedTime) / 60)} h` : `About ${Number(t.estimatedTime)} min`) : '',
      steps: toArray(t.steps, []),
      requirements: toArray(t.requirements || t.qualifications, []),
      proofRequired: toArray(t.proofRequired || t.proofInstructions, []),
      // Social jobs: the payout check, in words from the server (null when none)
      payoutCheck: t.payoutCheck || null,
      social: t.social || null,
      tags: toArray(t.tags || t.searchTags, []),
      approvalTime: t.approvalTime || '48 hours',
      payoutDay: t.payoutDay || 'Daily',
      totalPool: t.totalPool || 'N/A',
      similarJobs: Array.isArray(t.similarJobs) ? t.similarJobs.slice(0, 4) : [],
      instructions: t.instructions || t.description || '',
      posterId: t.poster?.id || '',
      featured: !!t.featured,
      currentWorkers: Number(t.currentWorkers ?? 0),
      selectionType: t.selectionType || t.selection || 'Random',
      isSelection: !!t.isSelection,
      capacity: `${filled} of ${slots}`,
      potentialWinners: slots,
      winnersSelected: filled,
      maxEntries: slots,
      community: t.community || 'All',
      submitted: Number(t.submissionsCount ?? 0) || 0,
      requirementKey: t.workerRequirement || '',
      workerRequirement: t.workerRequirement || '',
      minRank: Number(t.minRank) || 0,
      minSorsaScore: Number(t.minSorsaScore ?? t.minOgaScore) || 0,
      minXScore: Number(t.minXScore) || 0,
      minJobsDone: Number(t.minJobsDone) || 0,
      requiresWallet: !!t.requiresWallet,
      requiresX: !!t.requiresX,
      requiresXBlue: !!t.requiresXBlue,
      requiresLinkedin: !!t.requiresLinkedin,
      audiencePlatform: t.audiencePlatform || null,
      minFollowers: Number(t.minFollowers) || 0,
      requiredCommunity: t.requiredCommunity || null,
    }
  }

  const handleBookmark = async () => {
    if (!authUser) { navigate('/login?redirect=' + encodeURIComponent('/tasks/' + id)); return }
    const newState = !bookmarked
    setBookmarked(newState)
    try { await setSaved(job!.id, newState) } catch { setBookmarked(!newState) }
  }

  // Poster cancels an open job nobody has joined: the escrow goes back to their wallet
  // Admins: highlight the job (badge, shown first on the homepage and the jobs page)
  const toggleHighlight = async () => {
    if (!job || highlighting) return
    setHighlighting(true)
    try {
      await apiRequest(`/tasks/${job.id}/feature`, { method: 'PATCH', body: JSON.stringify({ featured: !job.featured }) })
      setJob({ ...job, featured: !job.featured })
    } catch (e: any) {
      window.alert(e?.message || "Couldn't change the highlight.")
    }
    setHighlighting(false)
  }

  const handleCancelJob = async () => {
    if (!job || cancelling) return
    // Admins can cancel someone else's untouched job (spam, tests): the money goes back to the poster
    const forPoster = job.posterId !== authUser?.id
    if (!window.confirm(forPoster
      ? 'Cancel this job as an admin? Nobody has taken it. The money held for it, including the fee, goes back to the poster\'s wallet. This can\'t be undone.'
      : 'Cancel this job? The money held for it, including the fee, goes back to your wallet. This can\'t be undone.')) return
    setCancelling(true)
    try {
      await apiRequest(`/escrow/refund/${job.id}`, { method: 'POST' })
      setJob({ ...job, status: 'cancelled' })
      refreshUser?.()
      window.alert(forPoster ? 'Job cancelled. The money is back in the poster\'s wallet.' : 'Job cancelled. The money is back in your wallet.')
    } catch (e: any) {
      window.alert(e?.message || 'Could not cancel this job.')
    }
    setCancelling(false)
  }

  const isMyTask = user?.id && job?.posterId === user.id

  const handleSubmitReport = async () => {
    if (!reportCategory) { setReportMsg('Please select a category'); return }
    if (!reportDesc.trim()) { setReportMsg('Please describe the issue'); return }
    setReportMsg('')
    setReportSubmitting(true)
    try {
      await fetch(`${API_BASE}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (localStorage.getItem('ogapay_access_token') || '') },
        body: JSON.stringify({ category: reportCategory, description: reportDesc, targetType: 'task', targetId: job?.id }),
      })
      setReportMsg('Report submitted. Our team will review it within 24 hours.')
      setReportCategory('')
      setReportDesc('')
      setTimeout(() => { setShowReportModal(false); setReportMsg('') }, 2500)
    } catch {
      setReportMsg('Failed to submit report')
    }
    setReportSubmitting(false)
  }

  if (loading) return <Layout><SkeletonPage /></Layout>
  // Not found and couldn't load are different: only the second offers Try again. Both stay on this link.
  if (error || !job) return <ErrorState notFound={error !== 'Failed to load task'} onRetry={() => setReloadKey((k) => k + 1)} />

  const isOpen = ['open', 'active', 'published'].includes(String(job.status || '').toLowerCase())
  const canManage = Boolean(authUser && (job.creatorId === authUser.id || job.posterId === authUser.id || isMyTask))
  // Already took a place: say where you are instead of offering "Take a place" again.
  // The submit page shows the details (your work, the poster's note, payout time).
  const mine = !canManage && authUser && mySub && mySub.status !== 'EXPIRED' ? mySub.status : null
  const myLabel = mine === 'PENDING' ? 'Continue your work'
    : mine === 'SUBMITTED' || mine === 'DISPUTED' ? 'Sent · waiting for review'
    : mine === 'APPROVED' ? 'Approved · see your work'
    : mine === 'REJECTED' ? 'Not approved · see why'
    // Selection job, applied but no place (yet)
    // (once the job has closed nobody will be picked, so don't keep promising a pick)
    : !canManage && authUser && !mine && myApp?.status === 'WAITING' ? (isOpen ? 'Applied · waiting for the pick' : 'Job closed')
    : !canManage && authUser && !mine && myApp?.status === 'NOT_PICKED' ? 'Not picked'
    : null
  const openMine = () => navigate(`/tasks/${job.id}/submit`)
  // Not a member of the community this job needs: the button sends them to join it
  const needJoin = !!job.requiredCommunity && !job.requiredCommunity.isMember && !canManage && !myLabel
  const joinPath = job.requiredCommunity ? `/communities/${job.requiredCommunity.slug}/request` : ''

  return (
    <WurkJobDetailView
      job={job}
      fmt={fmt}
      convert={convert}
      navigate={navigate}
      countdown={countdown}
      showSubs={showSubs}
      setShowSubs={setShowSubs}
      isOpen={isOpen}
      canManage={canManage}
      myLabel={myLabel}
      mySub={mine ? mySub : null}
      needJoin={needJoin}
      joinPath={joinPath}
      linkedJobs={linkedJobs}
      openMine={openMine}
      bookmarked={bookmarked}
      handleBookmark={handleBookmark}
      handleCancelJob={handleCancelJob}
      cancelling={cancelling}
      toggleHighlight={toggleHighlight}
      highlighting={highlighting}
      showApplyWarning={showApplyWarning}
      setShowApplyWarning={setShowApplyWarning}
      showShare={showShare}
      setShowShare={setShowShare}
      showInfo={showInfo}
      setShowInfo={setShowInfo}
      showReportModal={showReportModal}
      setShowReportModal={setShowReportModal}
      reportCategory={reportCategory}
      setReportCategory={setReportCategory}
      reportDesc={reportDesc}
      setReportDesc={setReportDesc}
      reportMsg={reportMsg}
      setReportMsg={setReportMsg}
      reportSubmitting={reportSubmitting}
      handleSubmitReport={handleSubmitReport}
      submissions={submissions}
      subsLoading={subsLoading}
      approving={approving}
      rejecting={rejecting}
      handleApprove={handleApprove}
      handleReject={handleReject}
      timeAgo={timeAgo}
      authUser={authUser}
      contest={contest}
      onContestPaid={() => setReloadKey((k) => k + 1)}
      onReload={() => setReloadKey((k) => k + 1)}
      community={community}
      eligibility={!canManage && !myLabel ? eligibility : null}
      workspaceLink={hiredId && (canManage || hiredId === authUser?.id) ? `/work/${job.id}` : null}
    />
  )
}

// Where each "why you can't take this job" reason is fixed
const FIXES: Record<string, { label: string; to: string }> = {
  KYC: { label: 'Verify your ID', to: '/settings/verification' },
  KYC2: { label: 'Verify your ID with a selfie', to: '/settings/verification' },
  HUMAN: { label: 'Verify you are human', to: '/settings/verification' },
  OGASCORE: { label: 'Raise your OgaScore', to: '/settings/verification' },
  WALLET: { label: 'Connect a wallet', to: '/settings/connections' },
  X: { label: 'Connect X', to: '/settings/connections' },
  X_BLUE: { label: 'Refresh your X profile', to: '/settings/connections' },
  X_SCORE: { label: 'Connect X', to: '/settings/connections' },
  AUDIENCE: { label: 'Add your audience', to: '/settings/creator' },
  RANK: { label: 'How ranks work', to: '/rank' },
  JOBS: { label: 'Find a starter job', to: '/tasks' },
  SIMILAR: { label: 'Find other jobs', to: '/tasks?available=1' },
  EXCLUDED: { label: 'Find other jobs', to: '/tasks?available=1' },
  CLOSED: { label: 'Find other jobs', to: '/tasks?available=1' },
  BLOCKED: { label: 'Find other jobs', to: '/tasks?available=1' },
  SUSPENDED: { label: 'See your warnings', to: '/warnings' },
  VERIFIED_PERSON: { label: 'Verify your ID', to: '/settings/verification' },
}

// The red "Eligibility requirements" box: what you're missing and how to fix it
function EligibilityBanner({ eligibility, joinPath }: { eligibility: { eligible: boolean; reasons: { code: string; text: string }[] } | null; joinPath?: string }) {
  if (!eligibility || eligibility.eligible || !eligibility.reasons?.length) return null
  return (
    <section className="wjd-elig" role="alert" aria-label="Why you can't take this job">
      <b><i className="ti ti-lock" aria-hidden="true" /> You can't take this job yet</b>
      <ul>
        {eligibility.reasons.map((r) => {
          const fix = r.code === 'COMMUNITY' && joinPath ? { label: 'Join the community', to: joinPath } : FIXES[r.code]
          return (
            <li key={r.code + r.text}>
              <span>{r.text}</span>
              {fix && <Link to={fix.to}>{fix.label} <i className="ti ti-arrow-right" aria-hidden="true" /></Link>}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/* ── Not found / couldn't load ── */
function ErrorState({ notFound, onRetry }: { notFound: boolean; onRetry: () => void }) {
  return (
    <Layout>
      <div className="ui-page">
        <div className="ui-empty wjd-state" role={notFound ? undefined : 'alert'}>
          <i className={`ti ${notFound ? 'ti-briefcase' : 'ti-wifi-off'}`} aria-hidden="true" />
          <h1>{notFound ? "This job isn't available" : "We couldn't load this job"}</h1>
          <p>{notFound ? 'It was removed by the poster, or the link is wrong.' : 'Check your connection and try again. Nothing has changed on your account.'}</p>
          <div className="ui-actions">
            {!notFound && <button type="button" className="ui-btn ui-btn-dark" onClick={onRetry}><i className="ti ti-refresh" aria-hidden="true" /> Try again</button>}
            <Link className={`ui-btn ${notFound ? 'ui-btn-dark' : 'ui-btn-ghost'}`} to="/tasks">Browse jobs</Link>
          </div>
        </div>
      </div>
    </Layout>
  )
}

/* ── Main View ── */
function WurkJobDetailView(props: any) {
  const {
    job, fmt, convert, navigate, countdown, showSubs, setShowSubs, isOpen, canManage, myLabel, mySub, openMine, linkedJobs, needJoin, joinPath,
    bookmarked, handleBookmark, handleCancelJob, cancelling, toggleHighlight, highlighting, showApplyWarning, setShowApplyWarning,
    showShare, setShowShare, showInfo, setShowInfo,
    showReportModal, setShowReportModal, reportCategory, setReportCategory,
    reportDesc, setReportDesc, reportMsg, setReportMsg, reportSubmitting, handleSubmitReport,
    submissions, subsLoading, approving, rejecting, handleApprove, handleReject, timeAgo, authUser,
    contest, onContestPaid, community, onReload, eligibility, workspaceLink,
  } = props
  // Re-render while a payout check runs, so Approve opens when its window ends
  const clock = useNow(anyWaiting(submissions))

  const agentName = job.brand || 'OgaPay'
  const agentInitial = agentName.slice(0, 2).toUpperCase()
  const currencyMap: Record<string, string> = { USD: 'USDC', USDC: 'USDC', NGN: 'NGN', SOL: 'SOL' }
  const rewardCurrency = currencyMap[job.currency] || 'NGN'
  const description = job.description || job.instructions || 'No description provided.'
  // Older jobs (and ones made through the API) keep instructions apart from the
  // description; show them when they say something the description doesn't.
  // The create forms send the same text twice, so those show it once.
  const same = (s: string) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase()
  const extraInstructions = job.instructions && job.description && !same(job.description).includes(same(job.instructions)) ? job.instructions : ''
  const proofText = job.proofRequired.filter((p: string) => p && !same(description).includes(same(p))).join(' · ')
  const profileHandle = (job.brandHandle || job.brand || '').replace('@', '')
  const handleText = job.brandHandle ? `@${job.brandHandle}` : 'Review the instructions carefully and only apply if you can add real value.'

  const [translatedText, setTranslatedText] = useState<string | null>(null)
  const [targetLang, setTargetLang] = useState('es')
  const [translating, setTranslating] = useState(false)
  const [transError, setTransError] = useState('')
  const [showTranslatePicker, setShowTranslatePicker] = useState(false)
  const [selectedSub, setSelectedSub] = useState<any | null>(null)
  // Stars and a note for the work open in the detail window; cleared for each new one
  const [rateStars, setRateStars] = useState(0)
  const [rateNote, setRateNote] = useState('')
  useEffect(() => { setRateStars(0); setRateNote('') }, [selectedSub?.id])
  const desktop = useMedia(DESKTOP)
  const [moreOpen, setMoreOpen] = useState(false)
  // The bar above the dock shows only while the reward card's button is off screen
  const ctaBox = useRef<HTMLDivElement>(null)
  const [ctaSeen, setCtaSeen] = useState(true)
  useEffect(() => {
    const el = ctaBox.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setCtaSeen(e.isIntersecting), { rootMargin: '-64px 0px -96px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const LANGUAGES = [
    { code: 'es', label: 'Spanish' }, { code: 'fr', label: 'French' },
    { code: 'de', label: 'German' }, { code: 'pt', label: 'Portuguese' },
    { code: 'it', label: 'Italian' }, { code: 'nl', label: 'Dutch' },
    { code: 'ja', label: 'Japanese' }, { code: 'ko', label: 'Korean' },
    { code: 'zh', label: 'Chinese' }, { code: 'ar', label: 'Arabic' },
    { code: 'hi', label: 'Hindi' }, { code: 'tr', label: 'Turkish' },
    { code: 'ru', label: 'Russian' }, { code: 'pl', label: 'Polish' },
    { code: 'sv', label: 'Swedish' }, { code: 'da', label: 'Danish' },
    { code: 'fi', label: 'Finnish' }, { code: 'th', label: 'Thai' },
    { code: 'vi', label: 'Vietnamese' }, { code: 'id', label: 'Indonesian' },
  ]

  const translateDescription = async (lang: string) => {
    setTargetLang(lang)
    if (translatedText && targetLang === lang) return
    const reqText = job.requirements.length > 0 ? '\n\nRequirements:\n' + job.requirements.join('\n') : ''
    const text = description + '\n\n' + job.steps.join('\n') + reqText
    if (!text.trim()) return
    setTranslating(true)
    setTransError('')
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(text)}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Translation failed')
      const data = await res.json()
      setTranslatedText(data[0].map((s: any) => s[0]).join(''))
    } catch {
      setTransError('Translation unavailable. Try again later.')
    }
    setTranslating(false)
  }

  const deadline = jobDeadline({ expiresAt: job.deadline || null })
  // A job that finished before its closing date (a contest with every place
  // awarded, a job with every place filled, or a cancelled one) stops counting down
  const jobStatus = String(job.status || '').toLowerCase()
  // A contest whose every place was awarded before its closing date. Its entries
  // closed then, so it says so even once that date has passed.
  const deadlineAt = deadline.state === 'open' || deadline.state === 'ended' ? deadline.at : null
  const awardedEarly = !!contest?.winnersPaidAt
    && (deadline.state === 'open' || deadlineAt == null || new Date(contest.winnersPaidAt).getTime() < deadlineAt)
  const closedEarly = awardedEarly || (deadline.state === 'open' && ['completed', 'cancelled', 'expired'].includes(jobStatus))
  const closedEarlyText = awardedEarly ? 'Closed early: every place awarded'
    : jobStatus === 'cancelled' ? 'Cancelled before it closed'
    : jobStatus === 'completed' ? 'Closed early: every place filled'
    : 'Closed'
  // The headline already says "Cancelled" next to the clock, so there it gives the date it was to close
  const clockText = closedEarly
    ? (!awardedEarly && jobStatus === 'cancelled' ? `Was to close ${deadlineDate(deadline)}` : closedEarlyText)
    : deadline.state === 'open' ? `Closes ${deadlineDate(deadline)}` : deadlineLabel(deadline)
  // Contests where every place pays the same prize: places can be awarded before entries close
  const equalPrizes = !!contest && contest.prizes.length > 0 && new Set(contest.prizes).size === 1
  const earlyAwardText = !contest || !equalPrizes ? ''
    : contest.prizes.length === 1
    ? ' The poster can also award the place to an entry before entries close; the contest then ends early.'
    : ' Every place in this contest pays the same prize, so the poster can also award places before entries close; once every place is awarded, the contest ends early.'
  const countdownStr = closedEarly
    ? closedEarlyText
    : deadline.state !== 'open'
    ? deadlineLabel(deadline)
    : countdown.d > 0
      ? `${countdown.d}d ${countdown.h}h ${pad(countdown.m)}m ${pad(countdown.s)}s`
      : `${countdown.h}h ${pad(countdown.m)}m ${pad(countdown.s)}s`
  const statusText = ({ open: 'Open', cooling_down: 'Full: waiting for work', completed: 'Completed', cancelled: 'Cancelled', draft: 'Paused', disputed: 'In dispute' } as Record<string, string>)[String(job.status || '').toLowerCase()] || (isOpen ? 'Open' : 'Closed')

  // Back: to the page you came from inside OgaPay, or to Jobs when the job was
  // opened from a shared link (going "back" then would leave OgaPay)
  const goBack = () => ((window.history.state?.idx ?? 0) > 0 ? navigate(-1) : navigate('/tasks'))
  const reqList = jobRequirements(job)
  const blocked = !!eligibility && !eligibility.eligible && eligibility.reasons?.length > 0
  // The one main action, built once for the reward card and the bar above the dock
  const ctaText = !authUser ? 'Sign in to take a place'
    : myLabel ? myLabel
    : needJoin && isOpen ? `Join ${job.requiredCommunity!.name} to take this job`
    : canManage ? 'Manage submissions'
    : isOpen ? (contest ? 'Enter contest' : job.isSelection ? 'Apply' : 'Take a place')
    : (contest ? 'Entries closed' : 'Job closed')
  const cta = (extra = '') => {
    const cls = `ui-btn ui-btn-dark ui-btn-lg wjd-cta${extra ? ' ' + extra : ''}`
    if (!authUser) return <button className={cls} type="button" onClick={() => navigate('/login?redirect=' + encodeURIComponent('/tasks/' + job.id))}>{ctaText}</button>
    if (myLabel) return <button className={cls} type="button" onClick={openMine}>{ctaText}</button>
    if (needJoin && isOpen) return <Link className={cls} to={joinPath}>{ctaText}</Link>
    return <button className={cls} type="button" disabled={!canManage && !isOpen} onClick={() => canManage ? navigate('/manage-jobs') : setShowApplyWarning(true)}>{ctaText}</button>
  }
  const bookmarkIcon = bookmarked
    ? <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
    : <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>

  return (
    <Layout>
      <div className="ui-page wjd">
        <button className="wjd-back tap" type="button" onClick={goBack}>
          <i className="ti ti-arrow-left" aria-hidden="true" /> Back
        </button>

        <div className="wjd-layout">
          <div className="wjd-main">
            {/* ── Title: what the job is and where it stands ── */}
            <header className="wjd-headline">
              <span className="ui-eyebrow"><i className={`ti ${contest ? 'ti-award' : 'ti-briefcase'}`} aria-hidden="true" />{contest ? `Contest · ${categoryLabel(job.category)}` : categoryLabel(job.category)}</span>
              <h1 className="ui-title wjd-h1">{job.title}</h1>
              <ul className="wjd-facts" aria-label="Job status">
                <li className={isOpen ? 'is-open' : ''}><span className="wjd-dot" aria-hidden="true" />{statusText}</li>
                <li><i className="ti ti-clock" aria-hidden="true" />{clockText}</li>
                {job.requiredCommunity && (
                  <li><i className="ti ti-users-group" aria-hidden="true" />{job.requiredCommunity.isMember ? 'For members of ' : 'Join '}<Link to={job.requiredCommunity.isMember ? `/communities/${job.requiredCommunity.slug}` : joinPath}>{job.requiredCommunity.name}</Link>{job.requiredCommunity.isMember ? ' (you are one)' : ' to take this job'}</li>
                )}
                {community && (
                  <li><i className="ti ti-lock" aria-hidden="true" />Members of <Link to={`/communities/${community.slug || community.id}`}>{community.name}</Link> only</li>
                )}
                {contest
                  ? <li><i className="ti ti-users" aria-hidden="true" />{contest.entries} {contest.entries === 1 ? 'entry' : 'entries'}{contest.entryTarget ? ` of ${contest.entryTarget} target` : ''}</li>
                  : job.isSelection
                  ? <li><i className="ti ti-user-check" aria-hidden="true" />{job.applicationsCount || 0} applied · the poster picks one person</li>
                  : <li><i className="ti ti-users" aria-hidden="true" />{job.slotsLeft} of {job.slots} {job.slots === 1 ? 'place' : 'places'} left
                      <InfoTip label="How places work" title="Places">
                        <p>Taking a place reserves it for you. Once every place is taken, people who haven't sent their work within 24 hours lose their place to someone else.</p>
                      </InfoTip></li>}
              </ul>
            </header>

            {blocked && <EligibilityBanner eligibility={eligibility} joinPath={joinPath} />}
            {workspaceLink && (
              <Link to={workspaceLink} className="wjd-workspace"><i className="ti ti-messages" aria-hidden="true" /><span><b>{canManage ? 'Job chat and workspace' : 'Your workspace'}</b><small>{canManage ? 'Talk to the person you picked and see their work.' : 'The brief, your work and the private job chat with the poster.'}</small></span><i className="ti ti-arrow-right" aria-hidden="true" /></Link>
            )}
            {mySub?.payoutCheck && <div className="wjd-paycheck"><PayoutCheckStatus sub={mySub} who="worker" /></div>}
            {job.social && <SocialJobPanel jobId={job.id} social={job.social} holdEndsAt={mySub?.holdEndsAt} signedIn={!!authUser} onTimeUp={onReload} />}

            {/* ── What to do: the brief, proof, steps and who can take it ── */}
            <section className="wjd-panel wjd-desc" aria-labelledby="wjd-what">
              <h2 className="wjd-desc-title" id="wjd-what"><i className="ti ti-file-text" aria-hidden="true" /> What to do</h2>
              <div className="wjd-body" dangerouslySetInnerHTML={{ __html: renderJobText(description) }} />

              {extraInstructions && (
                <>
                  <h3 className="wjd-sub-title">More instructions</h3>
                  <div className="wjd-body" dangerouslySetInnerHTML={{ __html: renderJobText(extraInstructions) }} />
                </>
              )}
              {proofText && (
                <>
                  <h3 className="wjd-sub-title">Proof to send</h3>
                  <div className="wjd-body"><p>{proofText}</p></div>
                </>
              )}
              {job.steps.length > 0 && (
                <>
                  <h3 className="wjd-sub-title">Steps</h3>
                  <ol className="wjd-list">{job.steps.map((step: string, i: number) => <li key={i} dangerouslySetInnerHTML={{ __html: renderJobLine(step) }} />)}</ol>
                </>
              )}

              <h3 className="wjd-sub-title">Requirements</h3>
              {reqList.length > 0 && <ul className="wjd-reqs">{reqList.map((r) => <li key={r.text}><i className={`ti ti-${r.icon}`} aria-hidden="true" />{r.text}</li>)}</ul>}
              {job.requirements.length > 0 && <ul className="wjd-list">{job.requirements.map((item: string, i: number) => <li key={i} dangerouslySetInnerHTML={{ __html: renderJobLine(item) }} />)}</ul>}
              {reqList.length === 0 && job.requirements.length === 0 && <p className="wjd-anyone">No extra requirements: anyone on OgaPay can take it.</p>}

              {translatedText && (
                <div className="wjd-translated">
                  <div className="wjd-translated-head">
                    <span>{LANGUAGES.find(l => l.code === targetLang)?.label || targetLang.toUpperCase()} translation</span>
                    <button type="button" className="wjd-translate-btn" onClick={() => setTranslatedText(null)}>Show original</button>
                  </div>
                  <div className="wjd-body" dangerouslySetInnerHTML={{ __html: renderJobText(translatedText) }} />
                </div>
              )}

              <div className="wjd-translate-row">
                <button type="button" className="wjd-translate-btn" aria-expanded={showTranslatePicker} onClick={() => setShowTranslatePicker(!showTranslatePicker)}>
                  Translate {showTranslatePicker ? '▲' : '▼'}
                </button>
                {showTranslatePicker && (
                  <>
                    <select className="ui-select wjd-tr-select" aria-label="Translate to" value={targetLang} onChange={e => { setTargetLang(e.target.value); translateDescription(e.target.value) }} disabled={translating}>
                      {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                    </select>
                    {translating && <span className="wjd-tr-note">Translating…</span>}
                    {transError && <span className="wjd-tr-note bad">{transError}</span>}
                  </>
                )}
              </div>
            </section>

            {contest && (
              <ContestPanel jobId={job.id} contest={contest} currency={rewardCurrency} endsAt={job.deadline || null}
                canManage={canManage} cancelled={jobStatus === 'cancelled'} convert={convert} onPaid={onContestPaid} />
            )}

            {/* ── Poster: the work sent in ── */}
            {showSubs && (
              <section className="wjd-panel wjd-subs-panel" aria-labelledby="wjd-subs-h">
                <h2 className="wjd-title" id="wjd-subs-h"><i className="ti ti-users" aria-hidden="true" /> Work sent in</h2>
                {canManage ? (
                  subsLoading
                    ? <div className="wjd-empty">Loading the work sent in…</div>
                    : submissions.length === 0
                      ? <div className="wjd-empty">Nothing sent in yet. Work appears here as people send it.</div>
                      : (
                        <div className="wjd-sub-list">
                          {submissions.map((sub: any) => (
                            <div className="wjd-sub-item" key={sub.id} onClick={() => setSelectedSub(sub)}>
                              <div className="wjd-sub-avatar">
                                {sub.worker?.avatarUrl ? <img src={sized(sub.worker.avatarUrl, 32, true)} alt="" /> : (sub.worker?.username || 'U')[0].toUpperCase()}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ color: 'var(--text)', fontSize: 14, fontWeight: 600 }}>{sub.worker?.username || sub.worker?.firstName || 'Anonymous'}</div>
                                <div style={{ color: 'var(--text2)', fontSize: 13 }}>{sub.workerNotes || 'No message'}</div>
                                <CopyFlag reason={sub.spamReason} copy={!!sub.similarToId} compact />
                                {sub.status === 'SUBMITTED' && <PayoutCheckStatus sub={sub} who="poster" compact />}
                                {sub.proof && (
                                  sub.proof.startsWith('http://') || sub.proof.startsWith('https://')
                                    ? <a href={sub.proof} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text)', fontSize: 12.5, wordBreak: 'break-all', textDecoration: 'underline' }}>{sub.proof}</a>
                                    : <div style={{ color: 'var(--text)', fontSize: 12.5, wordBreak: 'break-all' }}>{sub.proof}</div>
                                )}
                                <div className="wjd-sub-actions" onClick={(e: any) => e.stopPropagation()}>
                                  {sub.status === 'SUBMITTED' && (
                                    <>
                                      <button className="wjd-ok" type="button" onClick={() => setSelectedSub(sub)} disabled={approving === sub.id || checkBlocksApprove(sub, clock)} title={checkBlocksApprove(sub, clock) ? 'Payout check still running' : undefined}>{approving === sub.id ? 'Approving...' : 'Approve'}</button>
                                      <button className="wjd-no" type="button" onClick={() => handleReject(sub.id)} disabled={rejecting === sub.id}>{rejecting === sub.id ? 'Rejecting...' : 'Reject'}</button>
                                    </>
                                  )}
                                  {sub.status === 'APPROVED' && (sub._approvedAt || sub.approvedAt) ? <PayoutCountdown approvedAt={sub._approvedAt || sub.approvedAt} /> : sub.status === 'APPROVED' ? <span style={{ color: 'var(--green)', fontSize: 12.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}><i className="ti ti-check" aria-hidden="true" /> Approved</span> : null}
                                  {sub.status === 'APPROVED' && sub.rating ? <span style={{ color: 'var(--text2)', fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 4 }}><RatedStars value={sub.rating} /> {sub.rating}/5</span> : null}
                                  {sub.status === 'REJECTED' && <span style={{ color: 'var(--red)', fontSize: 12.5, fontWeight: 600 }}><i className="ti ti-circle-x" aria-hidden="true" /> Rejected</span>}
                                  {sub.status === 'EXPIRED' && <span style={{ color: 'var(--text2)', fontSize: 12.5, fontWeight: 600 }}><i className="ti ti-clock-x" aria-hidden="true" /> Place released</span>}
                                  <span style={{ color: 'var(--text2)', fontSize: 12.5, marginLeft: 'auto' }}>{timeAgo(sub.createdAt)}</span>
                                </div>
                                {sub.status === 'SUBMITTED' && sub.autoApproveAt && (
                                  <div style={{ color: 'var(--text2)', fontSize: 12.5, marginTop: 6 }}>
                                    <i className="ti ti-clock-check" aria-hidden="true" /> If you don't review it, it's approved and paid automatically on{' '}
                                    {new Date(sub.autoApproveAt).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}.
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                ) : (
                  <div className="wjd-empty">Only the poster can see the work sent in.</div>
                )}
              </section>
            )}

            {/* ── Public submissions: who sent work and what was paid (no proof) ── */}
            {!canManage && <JobActivity jobId={job.id} convert={convert} isContest={!!contest} rewarded={!!job.social} />}
          </div>

          {/* ── Side panel on desktop; placed in reading order on phone and tablet ── */}
          <div className="wjd-side">
            <section className="wjd-panel wjd-act" aria-label={contest ? 'Prize and entry' : 'Reward'}>
              <div className="wjd-act-pay">
                <span className="wjd-act-lbl">{contest ? '1st place prize' : 'Reward per person'}</span>
                <Money amount={Number(job.reward || 0)} currency={rewardCurrency} convert={convert} size={desktop ? 36 : 30} positive />
              </div>
              <div ref={ctaBox}>{cta()}</div>
              {canManage && (
                <button className="ui-btn ui-btn-ghost wjd-wide" type="button" aria-expanded={showSubs} onClick={() => setShowSubs(!showSubs)}>
                  <i className="ti ti-eye" aria-hidden="true" /> {showSubs ? 'Hide the work sent in' : 'See the work sent in'}
                </button>
              )}
              <div className="wjd-tools">
                <button className="ui-btn ui-btn-ghost" type="button" aria-pressed={bookmarked} onClick={handleBookmark}>{bookmarkIcon}{bookmarked ? 'Saved' : 'Save'}</button>
                <button className="ui-btn ui-btn-ghost" type="button" onClick={() => setShowShare(true)}><i className="ti ti-share" aria-hidden="true" /> Share</button>
                <button className="ui-btn ui-btn-ghost" type="button" aria-expanded={moreOpen} aria-controls="wjd-more" onClick={() => setMoreOpen((o: boolean) => !o)}><i className="ti ti-dots" aria-hidden="true" /> More</button>
              </div>
              {moreOpen && (
                <div className="wjd-more" id="wjd-more">
                  <button type="button" className="wjd-more-item" onClick={() => { setMoreOpen(false); setShowInfo(true) }}><i className="ti ti-info-circle" aria-hidden="true" /> How this job works</button>
                  <button type="button" className="wjd-more-item" onClick={() => { setMoreOpen(false); setShowReportModal(true) }}><i className="ti ti-flag" aria-hidden="true" /> Report this job</button>
                  {authUser?.role === 'ADMIN' && (
                    // Admins: highlighted jobs get a badge and are shown first on the homepage and the jobs page
                    <button type="button" className="wjd-more-item" onClick={toggleHighlight} disabled={highlighting}
                      title="Highlighted jobs get a badge and are shown first on the homepage and the jobs page">
                      <i className={`ti ${job.featured ? 'ti-x' : 'ti-star'}`} aria-hidden="true" />
                      {highlighting ? 'Saving…' : job.featured ? 'Remove highlight' : 'Highlight this job'}
                    </button>
                  )}
                </div>
              )}
              {(canManage || authUser?.role === 'ADMIN') && isOpen && !job.currentWorkers && (
                <button className="wjd-cancel" type="button" onClick={handleCancelJob} disabled={cancelling}>
                  {cancelling ? 'Cancelling…' : 'Cancel job'}
                </button>
              )}
            </section>

            <section className="wjd-panel wjd-agent" aria-label="Listed by">
              <div className="wjd-avatar">
                {job.brandAvatar ? <img src={sized(job.brandAvatar, 56, true)} alt="" /> : agentInitial}
              </div>
              <div className="wjd-agent-txt">
                <div className="wjd-kicker">Listed by</div>
                <div className="wjd-name">
                  {agentName}
                  {job.brandPremium && <PremiumMark />}
                  {job.boosted && <BoostedTag />}
                </div>
                {job.brandVerified && <VerifiedBusinessLine name={job.brandVerifiedName} />}
                {profileHandle && <Link className="wjd-handle" to={`/user/${encodeURIComponent(profileHandle)}`}>@{profileHandle}</Link>}
              </div>
            </section>

            <details className="wjd-panel wjd-details" open={desktop || undefined}>
              <summary><span><i className="ti ti-list-details" aria-hidden="true" /> Job details</span><i className="ti ti-chevron-down wjd-chev" aria-hidden="true" /></summary>
              <dl className="wjd-dl">
                <div>
                  <dt>How you're paid
                    <InfoTip label="How you're paid" title="How you're paid">
                      <p>{contest
                        ? (contest.randomDraw
                          ? "When entries close the winners are drawn at random from the entries the poster hasn't rejected. Each place's prize is paid to your wallet at once from the money already held for this contest. The seed and the drawn order are shown on this page so anyone can check the draw."
                          : "When entries close the poster ranks the best entries and each place's prize is paid to your wallet from the money already held for this contest. If the poster doesn't pick within 3 days, the earliest entries they haven't rejected win." + earlyAwardText)
                        : 'The poster checks each submission. Approved work is paid straight to your wallet from the money already held for this job.'}</p>
                    </InfoTip>
                  </dt>
                  <dd>{contest
                    ? (contest.randomDraw
                      ? `Drawn at random: ${contest.prizes.length} ${contest.prizes.length === 1 ? 'prize' : 'prizes'}`
                      : `Prizes for the top ${contest.prizes.length === 1 ? 'entry' : `${contest.prizes.length} entries`}`)
                    : 'Poster approves each one'}</dd>
                </div>
                {job.payoutCheck && (
                  <div className="wide">
                    <dt>Payout check
                      <InfoTip label="What the payout check means" title="Payout check">
                        <p>A longer check means your payout result comes later, not that your work failed. Verified means eligible, not guaranteed paid: places are still limited.</p>
                      </InfoTip>
                    </dt>
                    <dd>{job.payoutCheck.note}</dd>
                  </div>
                )}
                <div><dt>Time to do it</dt><dd>{job.estimatedTime || 'Not given'}</dd></div>
                <div><dt>Who can take it</dt><dd>{community ? `Members of ${community.name} who meet the requirements` : 'Anyone who meets the requirements'}</dd></div>
                {contest && <div><dt>Prize places</dt><dd>{contest.prizes.length}</dd></div>}
                <div><dt>Work sent in</dt><dd>{job.submitted}</dd></div>
                {linkedJobs?.length > 0 && (
                  <div className="wide"><dt>Not for</dt><dd>People who already did {linkedJobs.map((s: any, i: number) => <span key={s.id}>{i ? ', ' : ''}<Link to={`/tasks/${s.id}`}>{s.title}</Link></span>)}. Each person is paid for only one of these.</dd></div>
                )}
              </dl>
            </details>
          </div>

          {/* ── The main button, kept above the bottom dock once the reward card scrolls away (phone and tablet) ── */}
          {!ctaSeen && (
            <div className="ui-actionbar wjd-bar">
              <span className="ui-actionbar-text">
                <Money amount={Number(job.reward || 0)} currency={rewardCurrency} convert={convert} size={17} positive />
                <span>{contest ? '1st place prize' : 'per person'}</span>
              </span>
              {cta('wjd-bar-cta')}
            </div>
          )}
        </div>
      </div>

      {/* ── Info panel: how this job works ── */}
      {showInfo && (
        <div className="wjd-info-overlay" onClick={() => setShowInfo(false)}>
          <div className="wjd-info-panel" role="dialog" aria-modal="true" aria-label="How this job works" onClick={(e: any) => e.stopPropagation()}>
            <div className="wjd-info-header">
              <div className="wjd-info-header-title">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
                How this job works
              </div>
              <button className="wjd-info-close" type="button" onClick={() => setShowInfo(false)} aria-label="Close">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="wjd-info-body">
              <div className="wjd-config-strip">
                <div className="wjd-config-cell">
                  <div className="wjd-config-cell-label">Reward</div>
                  <div className="wjd-config-cell-value">{formatMoney(Number(job.reward || 0), rewardCurrency)} each</div>
                </div>
                <div className="wjd-config-cell">
                  <div className="wjd-config-cell-label">Places</div>
                  <div className="wjd-config-cell-value">{job.slotsLeft} of {job.slots} left</div>
                </div>
                <div className="wjd-config-cell">
                  <div className="wjd-config-cell-label">{closedEarly ? 'Ended' : 'Closes'}</div>
                  <div className="wjd-config-cell-value">{closedEarly ? closedEarlyText : deadlineDate(deadline)}</div>
                </div>
              </div>

              <div className="wjd-info-section-title">This kind of job</div>
              <div className="wjd-info-row">
                <div className="wjd-info-row-label">{contest ? 'Contest' : 'Challenge'}</div>
                <div className="wjd-info-row-val">{contest
                  ? (contest.randomDraw
                    ? 'Send one entry before it closes. The winners are then drawn at random from the entries the poster hasn\'t rejected, and paid at once. Only the winners are paid.'
                    : 'Send one entry before it closes. The poster then ranks the best entries and pays a prize for each place. Only the winners are paid.' + earlyAwardText)
                  : `Everyone whose work is approved is paid ${formatMoney(Number(job.reward || 0), rewardCurrency)}, until all ${job.slots} ${job.slots === 1 ? 'place is' : 'places are'} used.`}</div>
              </div>
              <div className="wjd-info-row" style={{ marginBottom: 20 }}>
                <div className="wjd-info-row-label">Who can take it</div>
                <div className="wjd-info-row-val">{community
                  ? <>Only members of <Link to={`/communities/${community.slug || community.id}`} style={{ color: 'inherit', fontWeight: 600 }}>{community.name}</Link>. Open the community and ask to join first.</>
                  : 'Anyone on OgaPay who meets the requirements shown on this page.'}</div>
              </div>

              <div className="wjd-info-section-title">Step by step</div>
              <ol className="wjd-how-steps">
                <li><strong>Take a place.</strong> It's reserved for you{jobRequirements(job).filter(r => r.icon !== 'award').length ? `, if you meet the requirements (${jobRequirements(job).filter(r => r.icon !== 'award').map(r => r.text).join(', ')})` : ''}.</li>
                <li><strong>Do the work and send it in</strong> with the proof the poster asked for. Once every place is taken, you have 24 hours to send it, or your place goes to someone else.</li>
                <li><strong>The poster checks it.</strong> If it's approved, {formatMoney(Number(job.reward || 0), rewardCurrency)} goes straight to your OgaPay wallet.</li>
                <li><strong>If it's rejected,</strong> you'll see the reason and the place opens up again.</li>
              </ol>

              <div style={{ marginTop: 20 }}>
                <div className="wjd-info-section-title">Your money is safe</div>
                <div className="wjd-info-row">
                  <div className="wjd-info-row-label">Held for you</div>
                  <div className="wjd-info-row-val">The poster paid for every place when they posted the job. OgaPay holds that money until the work is approved.</div>
                </div>
                <div className="wjd-info-row">
                  <div className="wjd-info-row-label">If nobody reviews</div>
                  <div className="wjd-info-row-val">The poster gets a reminder after a day. Work that still isn't reviewed after 3 days is approved and paid automatically.</div>
                </div>
                <div className="wjd-info-row">
                  <div className="wjd-info-row-label">If something's wrong</div>
                  <div className="wjd-info-row-val">Use Report on this page, or contact support, and our team will look into it.</div>
                </div>
              </div>

              <div className="wjd-important-box">
                <span className="wjd-important-icon"><i className="ti ti-alert-triangle" /></span>
                <div><strong>Only take a place if you can do the work well.</strong> Low-effort or copied work gets rejected.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Before Apply Warning ── */}
      {showApplyWarning && (
        <div className="wjd-modal-bg" onClick={() => setShowApplyWarning(false)}>
          <div className="wjd-before" role="dialog" aria-modal="true" onClick={(e: any) => e.stopPropagation()}>
            <div className="wjd-modal-head">
              <div className="wjd-before-title">Before you start</div>
              <button className="wjd-close-btn" type="button" aria-label="Close" onClick={() => setShowApplyWarning(false)}><i className="ti ti-x" aria-hidden="true" /></button>
            </div>
            <div className="wjd-before-copy">Please confirm the following before continuing:</div>
            <ul className="wjd-before-list">
              <li>Do not use AI to generate the answer for this job.</li>
              <li>Only apply if your submission adds real value to the job. Do not spam.</li>
              <li>If you do not understand the job, do not apply.</li>
              <li>Spamming jobs may get your account blocked.</li>
            </ul>
            <div className="wjd-before-actions">
              {/* The submit page shows what to do and the proof, and takes the place when the work is sent */}
              <button className="ui-btn ui-btn-dark" type="button" onClick={() => { setShowApplyWarning(false); navigate(`/tasks/${job.id}/submit`) }}>I understand</button>
            </div>
          </div>
        </div>
      )}

      {showShare && <SharePanel job={job} onClose={() => setShowShare(false)} />}

      {/* ── Report Modal ── */}
      {showReportModal && (
        <div className="wjd-modal-bg" onClick={() => { if (!reportSubmitting) setShowReportModal(false) }}>
          <div className="wjd-report-modal" onClick={(e: any) => e.stopPropagation()}>
            <div className="wjd-report-head">
              <span>Report this job</span>
              <button className="wjd-close-btn" type="button" onClick={() => { if (!reportSubmitting) setShowReportModal(false) }} aria-label="Close"><i className="ti ti-x" aria-hidden="true" /></button>
            </div>
            <div className="wjd-report-body">
              {reportMsg && (
                <div role="status" style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 12, fontSize: 13, fontWeight: 600, background: reportMsg.includes('submitted') ? 'color-mix(in srgb, var(--green) 12%, transparent)' : 'color-mix(in srgb, var(--red) 10%, transparent)', color: reportMsg.includes('submitted') ? 'var(--green)' : 'var(--red)' }}>
                  {reportMsg}
                </div>
              )}
              <label className="wjd-report-label" htmlFor="wjd-rep-cat">What's wrong</label>
              <select id="wjd-rep-cat" className="ui-select wjd-report-input" value={reportCategory} onChange={(e: any) => setReportCategory(e.target.value)}>
                <option value="">Select a category</option>
                <option value="spam">Spam</option>
                <option value="scam">Scam or fraud</option>
                <option value="inappropriate">Inappropriate content</option>
                <option value="misleading">Misleading information</option>
                <option value="other">Other</option>
              </select>
              <label className="wjd-report-label" htmlFor="wjd-rep-desc">Tell us more</label>
              <textarea id="wjd-rep-desc" className="wjd-report-input" value={reportDesc} onChange={(e: any) => setReportDesc(e.target.value)} placeholder="Describe the issue in detail..." rows={4} style={{ resize: 'vertical' }} />
              <div className="wjd-report-actions">
                <button className="ui-btn ui-btn-ghost" type="button" onClick={() => { setShowReportModal(false); setReportMsg('') }}>Cancel</button>
                <button className="ui-btn ui-btn-dark" type="button" onClick={handleSubmitReport} disabled={!reportCategory || !reportDesc.trim() || reportSubmitting}>
                  {reportSubmitting ? 'Sending…' : 'Send report'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Submission Detail Modal ── */}
      {selectedSub && (
        <div className="wjd-modal-bg" onClick={() => setSelectedSub(null)}>
          <div className="wjd-report-modal" style={{ maxWidth: 480 }} onClick={(e: any) => e.stopPropagation()}>
            <div className="wjd-report-head">
              <span>Work sent in</span>
              <button className="wjd-close-btn" type="button" onClick={() => setSelectedSub(null)} aria-label="Close"><i className="ti ti-x" aria-hidden="true" /></button>
            </div>
            <div className="wjd-report-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div className="wjd-sub-avatar" style={{ width: 44, height: 44, fontSize: 18 }}>
                  {selectedSub.worker?.avatarUrl ? <img src={sized(selectedSub.worker.avatarUrl, 44, true)} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} /> : (selectedSub.worker?.username || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{selectedSub.worker?.username || selectedSub.worker?.firstName || 'Anonymous'}</div>
                  {selectedSub.worker?.email && <div style={{ fontSize: 12, color: 'var(--text2)' }}>{selectedSub.worker.email}</div>}
                </div>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text2)', marginBottom: 4 }}>Status</div>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 14, color: selectedSub.status === 'APPROVED' ? 'var(--green)' : selectedSub.status === 'REJECTED' ? 'var(--red)' : 'color-mix(in srgb, var(--gold) 55%, var(--text))' }}>{selectedSub.status}</div>
              {selectedSub.status === 'APPROVED' && (selectedSub._approvedAt || selectedSub.approvedAt) && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--text2)', marginBottom: 4 }}>Payout</div>
                  <PayoutCountdown approvedAt={selectedSub._approvedAt || selectedSub.approvedAt} />
                </div>
              )}
              {selectedSub.status === 'SUBMITTED' && selectedSub.payoutCheck && <div style={{ margin: '-4px 0 14px' }}><PayoutCheckStatus sub={selectedSub} who="poster" compact /></div>}
              {selectedSub.spamReason && <div style={{ margin: '-4px 0 14px' }}><CopyFlag reason={selectedSub.spamReason} copy={!!selectedSub.similarToId} compact={selectedSub.status !== 'SUBMITTED'} /></div>}
              <div style={{ fontSize: 12.5, color: 'var(--text2)', marginBottom: 4 }}>Notes</div>
              <div style={{ fontSize: 14, color: 'var(--text)', marginBottom: 14, lineHeight: 1.5 }}>{selectedSub.workerNotes || 'No message'}</div>
              {selectedSub.proof && (
                <>
                  <div style={{ fontSize: 12.5, color: 'var(--text2)', marginBottom: 4 }}>Proof</div>
                  <div style={{ fontSize: 13, wordBreak: 'break-all', marginBottom: 14 }}>
                    <a href={selectedSub.proof} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text)', textDecoration: 'underline' }}>{selectedSub.proof}</a>
                  </div>
                </>
              )}
              <div style={{ fontSize: 12.5, color: 'var(--text2)', marginBottom: 4 }}>Submitted</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>{timeAgo(selectedSub.createdAt)}</div>
              {selectedSub.status === 'APPROVED' && selectedSub.rating ? (
                <>
                  <div style={{ fontSize: 12.5, color: 'var(--text2)', marginBottom: 4 }}>{ratedByTeam(selectedSub, job.posterId) ? 'Rated by the OgaPay team' : 'Your rating'}</div>
                  <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <RatedStars value={selectedSub.rating} size={14} /> {selectedSub.rating}/5{selectedSub.feedback ? ` · “${selectedSub.feedback}”` : ''}
                  </div>
                </>
              ) : null}
              {selectedSub.status === 'SUBMITTED' && !contest && (
                <div style={{ marginBottom: 14 }}>
                  <RateWork who={selectedSub.worker?.username ? `@${selectedSub.worker.username}` : 'this worker'} rating={rateStars} note={rateNote}
                    onRating={setRateStars} onNote={setRateNote} disabled={approving === selectedSub.id} />
                </div>
              )}
              {selectedSub.status === 'SUBMITTED' && (
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button className="wjd-ok" type="button" onClick={() => { handleApprove(selectedSub.id, contest ? 0 : rateStars, rateNote); setSelectedSub(null) }} disabled={approving === selectedSub.id || checkBlocksApprove(selectedSub, clock)}>{approving === selectedSub.id ? 'Approving...' : contest ? 'Approve' : `Approve and pay ${formatMoney(Number(job.reward || 0), rewardCurrency)}`}</button>
                  <button className="wjd-no" type="button" onClick={() => { handleReject(selectedSub.id); setSelectedSub(null) }} disabled={rejecting === selectedSub.id}>{rejecting === selectedSub.id ? 'Rejecting...' : 'Reject'}</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

/* ── Payout Countdown ── */
function PayoutCountdown({ approvedAt }: { approvedAt: number }) {
  const endTime = Number(approvedAt) + 86400000
  const { d, h, m } = useCountdown(endTime)
  if (endTime - Date.now() <= 0) {
    return <span style={{ color: 'var(--green)', fontSize: 12.5, fontWeight: 600 }}>Payout available</span>
  }
  const parts: string[] = []
  if (d > 0) parts.push(`${d}d`)
  parts.push(`${h}h`)
  parts.push(`${m}m`)
  return <span className="wjd-amber" style={{ fontSize: 12.5, fontWeight: 600 }}>Payout in {parts.join(' ')}</span>
}

/* ── Apply Modal ── */
/* ── Share Panel ── */
function SharePanel({ job, onClose }: { job: JobData; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/tasks/${job.id}`
  const copy = () => {
    navigator.clipboard?.writeText(url).catch(e => console.error(e))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  const shares = [
    { label: 'X (Twitter)', icon: 'X', href: `https://twitter.com/intent/tweet?text=Earn+${job.currency === 'USD' ? '$' : '₦'}${job.reward}+on+OgaPay!&url=${encodeURIComponent(url)}` },
    { label: 'WhatsApp', icon: 'WA', href: `https://wa.me/?text=Earn+${job.currency === 'USD' ? '$' : '₦'}${job.reward}+on+OgaPay:+${encodeURIComponent(url)}` },
    { label: 'Telegram', icon: 'TG', href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=Earn+${job.currency === 'USD' ? '$' : '₦'}${job.reward}+on+OgaPay` },
  ]
  return (
    // zIndex 300, like the other sheets: over the bottom dock (100), which covered the copy-link row
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 420, background: 'var(--card,#fff)', border: '0.5px solid var(--border,#e5e7eb)', borderRadius: '20px 20px 0 0', padding: '20px 20px 32px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border,#e5e7eb)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontWeight: 600, color: 'var(--text)', margin: 0, fontSize: 15 }}>Share this job</p>
          <button onClick={onClose} aria-label="Close" style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--card2)', border: '0.5px solid var(--border,#e5e7eb)', color: 'var(--text2,#6b7280)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {shares.map(s => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '14px 8px', background: 'var(--card2)', border: '0.5px solid var(--border,#e5e7eb)', borderRadius: 12, textDecoration: 'none', color: 'inherit', fontSize: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: BRAND_LIGHT, display: 'grid', placeItems: 'center', color: BRAND, fontWeight: 800, fontSize: 13 }}>{s.icon}</div>
              <span style={{ fontWeight: 600, color: 'var(--text2,#6b7280)' }}>{s.label}</span>
            </a>
          ))}
        </div>
        <div>
          <p style={{ fontSize: 12.5, color: 'var(--text2)', margin: '0 0 8px' }}>Or copy the link</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input readOnly value={url} style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '0.5px solid var(--border,#e5e7eb)', background: 'var(--card2)', color: 'var(--text)', fontSize: 12, fontFamily: 'monospace', outline: 'none' }} />
            <button onClick={copy} style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: BRAND, color: 'var(--on-accent)', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
