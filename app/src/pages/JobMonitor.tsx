import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'

// ─── Sample Job Data (same as Tasks.tsx) ───
const sampleJobs = [
  {
    id: 'job-001',
    title: 'Social Media Engagement — Retweet & Like',
    description: 'Retweet the pinned post on X and like it. Comment with "Done" once completed. Must have a public X account with at least 50 followers.',
    creator: 'WURK Protocol',
    creatorLabel: 'AI Agent',
    platform: 'X / Twitter',
    category: 'Social',
    difficulty: 'Easy',
    reward: 0.025,
    rewardCurrency: 'SOL',
    usdValue: 3.20,
    slots: 150,
    filled: 42,
    timeEstimate: '5 min',
    verificationRequired: false,
    rankRequired: 'None',
    color: '#16a34a',
    featured: true,
  },
  {
    id: 'job-002',
    title: 'App Testing — UI/UX Feedback Session',
    description: 'Test the new beta version of the OgaPay mobile app. Navigate through the onboarding flow and report any UI bugs or UX improvements.',
    creator: 'OgaPay Labs',
    creatorLabel: 'Platform',
    platform: 'Mobile App',
    category: 'Testing',
    difficulty: 'Medium',
    reward: 0.05,
    rewardCurrency: 'SOL',
    usdValue: 6.40,
    slots: 30,
    filled: 12,
    timeEstimate: '25 min',
    verificationRequired: true,
    rankRequired: 'Bronze',
    color: '#F59E0B',
    featured: false,
  },
  {
    id: 'job-003',
    title: 'Content Review — Proofread Blog Post',
    description: 'Review a 500-word blog post about DeFi trends. Check for grammar, spelling, and clarity. Suggest improvements in a short feedback form.',
    creator: 'Crypto Writers DAO',
    creatorLabel: 'Community',
    platform: 'Google Docs',
    category: 'Content',
    difficulty: 'Easy',
    reward: 0.015,
    rewardCurrency: 'SOL',
    usdValue: 1.92,
    slots: 40,
    filled: 18,
    timeEstimate: '15 min',
    verificationRequired: false,
    rankRequired: 'None',
    color: '#16a34a',
    featured: false,
  },
  {
    id: 'job-004',
    title: 'Video Reaction — Product Review',
    description: 'Watch a 2-minute product demo video and record a 30-second reaction video with your honest feedback. Upload to the submission portal.',
    creator: 'DeFi Product XYZ',
    creatorLabel: 'Protocol',
    platform: 'YouTube',
    category: 'Video',
    difficulty: 'Medium',
    reward: 0.08,
    rewardCurrency: 'SOL',
    usdValue: 10.24,
    slots: 15,
    filled: 7,
    timeEstimate: '30 min',
    verificationRequired: true,
    rankRequired: 'Silver',
    color: '#F59E0B',
    featured: false,
  },
  {
    id: 'job-005',
    title: 'Community Engagement — Discord Raid',
    description: 'Join the OgaPay Discord server, say hi in #introductions, and react to the announcement post. Simple and quick.',
    creator: 'OgaPay Community',
    creatorLabel: 'Community',
    platform: 'Discord',
    category: 'Social',
    difficulty: 'Easy',
    reward: 0.01,
    rewardCurrency: 'SOL',
    usdValue: 1.28,
    slots: 200,
    filled: 88,
    timeEstimate: '5 min',
    verificationRequired: false,
    rankRequired: 'None',
    color: '#16a34a',
    featured: false,
  },
  {
    id: 'job-006',
    title: 'Data Entry — Product Listing',
    description: 'Add product listings to the OgaPay marketplace. Each listing requires title, description, price, and category.',
    creator: 'OgaPay Market',
    creatorLabel: 'Platform',
    platform: 'Web App',
    category: 'Data',
    difficulty: 'Hard',
    reward: 0.12,
    rewardCurrency: 'SOL',
    usdValue: 15.36,
    slots: 20,
    filled: 3,
    timeEstimate: '45 min',
    verificationRequired: true,
    rankRequired: 'Gold',
    color: '#DC2626',
    featured: true,
  },
  {
    id: 'job-007',
    title: 'Logo Design Contest — AI Agent Brand',
    description: 'Design a logo for an AI agent startup focused on DeFi analytics. Submit your best design. Winner receives the full reward.',
    creator: 'Agentic Analytics',
    creatorLabel: 'Startup',
    platform: 'Figma / PNG',
    category: 'Design',
    difficulty: 'Hard',
    reward: 0.25,
    rewardCurrency: 'SOL',
    usdValue: 32.00,
    slots: 10,
    filled: 4,
    timeEstimate: '2 hours',
    verificationRequired: true,
    rankRequired: 'Gold',
    color: '#DC2626',
    featured: true,
  },
  {
    id: 'job-008',
    title: 'Twitter Thread — Crypto Education',
    description: 'Write a 10-tweet thread explaining "What is a Solana Airdrop?" in simple terms. Original content only.',
    creator: 'Solana Edu DAO',
    creatorLabel: 'DAO',
    platform: 'X / Twitter',
    category: 'Content',
    difficulty: 'Medium',
    reward: 0.035,
    rewardCurrency: 'SOL',
    usdValue: 4.48,
    slots: 25,
    filled: 11,
    timeEstimate: '30 min',
    verificationRequired: true,
    rankRequired: 'Bronze',
    color: '#F59E0B',
    featured: false,
  },
  {
    id: 'job-009',
    title: 'Telegram Group — Join & Verify',
    description: 'Join the OgaPay Telegram group and type /verify to complete. Must be a real account.',
    creator: 'OgaPay Team',
    creatorLabel: 'Platform',
    platform: 'Telegram',
    category: 'Social',
    difficulty: 'Easy',
    reward: 0.008,
    rewardCurrency: 'SOL',
    usdValue: 1.02,
    slots: 500,
    filled: 234,
    timeEstimate: '3 min',
    verificationRequired: false,
    rankRequired: 'None',
    color: '#16a34a',
    featured: false,
  },
]

// ─── Helpers ───
function formatCreator(name: string) {
  const words = name.split(' ').filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return (name[0] || '?').toUpperCase()
}

function timeAgo(date: Date) {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

// ─── Tab config ───
const TABS = [
  { key: 'all', label: 'All Jobs', icon: 'ti ti-list' },
  { key: 'applied', label: 'My Applications', icon: 'ti ti-send' },
  { key: 'saved', label: 'Saved', icon: 'ti ti-bookmark' },
  { key: 'activity', label: 'Activity', icon: 'ti ti-activity' },
] as const

type TabKey = (typeof TABS)[number]['key']

// ─── Format address/wallet ───
function formatAddress(str: string) {
  if (str.length <= 8) return str
  return str.slice(0, 5) + '...' + str.slice(-3)
}

export default function JobMonitor() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [search, setSearch] = useState('')
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [appliedJobs, setAppliedJobs] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('ogapay_applied_jobs')
      return stored ? JSON.parse(stored) : []
    } catch { return [] }
  })
  const [bookmarked, setBookmarked] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('ogapay_bookmarked_jobs')
      return stored ? JSON.parse(stored) : []
    } catch { return [] }
  })

  // ─── Persist applied jobs ───
  useEffect(() => {
    try { localStorage.setItem('ogapay_applied_jobs', JSON.stringify(appliedJobs)) } catch {}
  }, [appliedJobs])

  useEffect(() => {
    try { localStorage.setItem('ogapay_bookmarked_jobs', JSON.stringify(bookmarked)) } catch {}
  }, [bookmarked])

  // ─── Simulate activity feed ───
  const [activityFeed, setActivityFeed] = useState<Array<{ type: string; jobId: string; jobTitle: string; time: Date }>>([])

  // ─── Filter jobs based on tab ───
  const filteredJobs = sampleJobs.filter(job => {
    const matchSearch = search === '' || 
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      job.description.toLowerCase().includes(search.toLowerCase()) ||
      job.creator.toLowerCase().includes(search.toLowerCase())

    if (!matchSearch) return false

    if (activeTab === 'applied') return appliedJobs.includes(job.id)
    if (activeTab === 'saved') return bookmarked.includes(job.id)
    return true // 'all' and 'activity' show all
  })

  // ─── Stats ───
  const totalJobs = sampleJobs.length
  const totalApplied = appliedJobs.length
  const completedJobs = appliedJobs.filter(id => {
    // Simulate some as completed
    const job = sampleJobs.find(j => j.id === id)
    return job ? job.filled >= job.slots / 2 : false
  }).length
  const totalSaved = bookmarked.length
  const totalRewards = sampleJobs.reduce((sum, j) => sum + j.usdValue, 0)

  // ─── Handlers ───
  const toggleBookmark = (id: string) => {
    setBookmarked(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id])
  }

  const handleApply = (job: typeof sampleJobs[0]) => {
    if (!appliedJobs.includes(job.id)) {
      setAppliedJobs(prev => [...prev, job.id])
      setActivityFeed(prev => [{
        type: 'applied',
        jobId: job.id,
        jobTitle: job.title,
        time: new Date()
      }, ...prev])
    }
    navigate(`/tasks/${job.id}`)
  }

  const handleNotificationToggle = async () => {
    if (!notificationsEnabled) {
      if ('Notification' in window && Notification.permission === 'default') {
        const result = await Notification.requestPermission()
        if (result === 'granted') {
          setNotificationsEnabled(true)
          new Notification('OgaPay Job Monitor', {
            body: 'You will now receive alerts for new jobs and updates.',
            icon: '/favicon.ico'
          })
        }
      } else if ('Notification' in window && Notification.permission === 'granted') {
        setNotificationsEnabled(true)
      } else {
        alert('Notifications are blocked. Enable them in your browser settings.')
      }
    } else {
      setNotificationsEnabled(false)
    }
  }

  return (
    <Layout>
      <style>{`
        /* ── Page Layout ── */
        .jm-page{max-width:1100px;margin:0 auto;padding:0 0 50px}
        .jm-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:24px;flex-wrap:wrap}
        .jm-head-left{}
        .jm-head-left h1{font-size:24px;font-weight:900;margin:0;color:var(--text);letter-spacing:-.03em}
        .jm-head-left p{font-size:13px;color:var(--text2);margin:4px 0 0}

        /* ── Notification Toggle ── */
        .jm-notif-toggle{display:flex;align-items:center;gap:10px;padding:10px 16px;background:var(--card);border:1px solid var(--border);border-radius:12px;cursor:pointer;transition:all .15s;flex-shrink:0}
        .jm-notif-toggle:hover{border-color:var(--text3)}
        .jm-notif-toggle .toggle-info{}
        .jm-notif-toggle .toggle-info .ti-label{font-size:12px;font-weight:700;color:var(--text)}
        .jm-notif-toggle .toggle-info .ti-sub{font-size:10px;color:var(--text3);margin-top:1px}
        .jm-switch{width:38px;height:22px;border-radius:99px;border:2px solid var(--border);background:var(--bg2);position:relative;transition:all .2s;flex-shrink:0;cursor:pointer}
        .jm-switch.active{border-color:#1F8CFF;background:#1F8CFF}
        .jm-switch .jm-switch-knob{width:16px;height:16px;border-radius:50%;background:var(--text);position:absolute;top:1px;left:1px;transition:all .2s}
        .jm-switch.active .jm-switch-knob{left:17px;background:#fff}

        /* ── Stats Row ── */
        .jm-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
        .jm-stat{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px 18px;transition:all .2s}
        .jm-stat:hover{border-color:rgba(31,140,255,.2);transform:translateY(-1px)}
        .jm-stat-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
        .jm-stat-icon{width:32px;height:32px;border-radius:8px;display:grid;place-items:center;font-size:14px}
        .jm-stat-count{font-size:22px;font-weight:900;color:var(--text);letter-spacing:-.02em}
        .jm-stat-label{font-size:11px;color:var(--text2);font-weight:600;text-transform:uppercase;letter-spacing:.04em}

        /* ── Tabs ── */
        .jm-tabs{display:flex;background:var(--bg2);border-radius:10px;padding:3px;border:1px solid var(--border);margin-bottom:20px;overflow-x:auto;flex-shrink:0}
        .jm-tab{padding:8px 16px;border:0;border-radius:8px;background:transparent;color:var(--text2);font-size:12px;font-weight:700;cursor:pointer;transition:all .15s;white-space:nowrap;display:flex;align-items:center;gap:6px;font-family:inherit}
        .jm-tab:hover{color:var(--text);background:var(--card)}
        .jm-tab.active{background:var(--card);color:var(--text);box-shadow:0 1px 3px rgba(0,0,0,.06)}
        .jm-tab .tab-count{font-size:10px;padding:1px 6px;border-radius:99px;background:var(--bg2);color:var(--text3);font-weight:700}
        .jm-tab.active .tab-count{background:#1F8CFF15;color:#1F8CFF}

        /* ── Controls ── */
        .jm-controls{display:flex;align-items:center;gap:12px;margin-bottom:24px;flex-wrap:wrap}
        .jm-search-wrap{flex:1;min-width:200px;position:relative}
        .jm-search-wrap input{width:100%;height:40px;padding:0 14px 0 38px;border:1.5px solid var(--border);border-radius:10px;background:var(--card);color:var(--text);font-size:13px;outline:none;transition:border-color .2s;font-family:inherit}
        .jm-search-wrap input:focus{border-color:#1F8CFF}
        .jm-search-wrap input::placeholder{color:var(--text3)}
        .jm-search-wrap .search-icn{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text3);font-size:16px;pointer-events:none}
        .jm-filter-select{height:40px;padding:0 32px 0 12px;border:1.5px solid var(--border);border-radius:10px;background:var(--card);color:var(--text);font-size:12px;font-weight:600;outline:none;cursor:pointer;font-family:inherit;appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23737373' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center}

        /* ── Jobs Grid ── */
        .jm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px}
        .jm-grid.single{grid-template-columns:1fr;max-width:600px}

        .jm-card{background:var(--card);border:1px solid var(--border);border-radius:14px;overflow:hidden;transition:all .25s;display:flex;flex-direction:column;position:relative}
        .jm-card:hover{border-color:rgba(31,140,255,.2);transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.06)}
        [data-theme="dark"] .jm-card:hover{border-color:rgba(167,139,250,.15)}

        /* ── Card: Creator Row ── */
        .jm-creator{display:flex;align-items:center;gap:10px;padding:12px 16px 10px;border-bottom:1px solid var(--border);position:relative}
        .jm-creator-avatar{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font-size:10px;font-weight:800;color:#fff;flex-shrink:0;background:linear-gradient(135deg,#1F8CFF,#1F8CFF)}
        .jm-creator-info{flex:1;min-width:0}
        .jm-creator-name{font-size:12px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .jm-creator-label{font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.04em}
        .jm-creator-actions{display:flex;align-items:center;gap:6px}

        /* ── Status Badges ── */
        .jm-status{display:inline-flex;align-items:center;gap:4px;font-size:9px;font-weight:700;padding:3px 8px;border-radius:99px;letter-spacing:.02em}
        .jm-status.applied{background:rgba(31,140,255,.1);color:#1F8CFF;border:1px solid rgba(31,140,255,.15)}
        .jm-status.saved{background:rgba(245,158,11,.1);color:#f59e0b;border:1px solid rgba(245,158,11,.15)}

        /* ── Card Meta ── */
        .jm-meta{display:flex;gap:8px;padding:10px 16px 4px;flex-wrap:wrap}
        .jm-meta span{display:inline-flex;align-items:center;gap:4px;font-size:10px;color:var(--text3);font-weight:600}
        .jm-meta span i{font-size:11px}

        /* ── Card Body ── */
        .jm-body{padding:8px 16px 12px;flex:1}
        .jm-body h3{font-size:14px;font-weight:800;margin:0 0 4px;color:var(--text);line-height:1.3}
        .jm-body p{font-size:12px;color:var(--text2);line-height:1.5;margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}

        /* ── Card Reward ── */
        .jm-reward{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-top:1px solid var(--border);background:var(--bg2)}
        .jm-reward-left{}
        .jm-reward-label{font-size:9px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.05em}
        .jm-reward-amount{font-size:16px;font-weight:900;color:var(--text)}
        .jm-reward-amount span{font-size:11px;font-weight:600;color:var(--text2);margin-left:4px}
        .jm-reward-usd{font-size:10px;color:var(--text3);font-weight:600}
        .jm-reward-right{text-align:right}
        .jm-slots{font-size:11px;font-weight:700;color:var(--text2)}
        .jm-slots span{color:var(--text)}

        /* ── Card Badges ── */
        .jm-badges{display:flex;gap:5px;padding:0 16px 10px;flex-wrap:wrap}
        .jm-badge{display:inline-flex;align-items:center;gap:3px;font-size:9px;font-weight:700;padding:3px 8px;border-radius:99px;background:var(--bg2);color:var(--text3);border:1px solid var(--border)}
        .jm-badge.featured{background:rgba(31,140,255,.08);color:#1F8CFF;border:1px solid rgba(31,140,255,.12)}
        .jm-badge.verified{background:rgba(22,163,74,.08);color:#16a34a;border:1px solid rgba(22,163,74,.12)}
        .jm-badge.difficulty{background:rgba(245,158,11,.08);color:#f59e0b;border:1px solid rgba(245,158,11,.12)}

        /* ── Card Actions ── */
        .jm-actions{display:flex;gap:8px;padding:10px 16px 14px}
        .jm-actions button{flex:1;height:34px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text2);font-size:11px;font-weight:700;cursor:pointer;transition:all .13s;display:flex;align-items:center;justify-content:center;gap:5px;font-family:inherit}
        .jm-actions button:hover{border-color:var(--text3);color:var(--text)}
        .jm-actions button.primary{background:linear-gradient(135deg,#1F8CFF,#1F8CFF);color:#fff;border-color:#1F8CFF}
        .jm-actions button.primary:hover{box-shadow:0 4px 12px rgba(31,140,255,.25);transform:translateY(-1px)}

        /* ── Empty State ── */
        .jm-empty{text-align:center;padding:60px 20px;background:var(--card);border:1px solid var(--border);border-radius:14px}
        .jm-empty i{font-size:48px;color:var(--text3);margin-bottom:16px;display:block}
        .jm-empty h3{font-size:18px;font-weight:800;color:var(--text);margin:0 0 6px}
        .jm-empty p{font-size:13px;color:var(--text2);margin:0;max-width:360px;margin-inline:auto}

        /* ── Activity Tab ── */
        .jm-activity{background:var(--card);border:1px solid var(--border);border-radius:14px;overflow:hidden}
        .jm-activity-item{display:flex;align-items:flex-start;gap:12px;padding:14px 18px;border-bottom:1px solid var(--border);transition:background .13s}
        .jm-activity-item:last-child{border-bottom:none}
        .jm-activity-item:hover{background:var(--bg2)}
        .jm-activity-icon{width:32px;height:32px;border-radius:8px;display:grid;place-items:center;flex-shrink:0;font-size:14px}
        .jm-activity-icon.apply{background:rgba(31,140,255,.1);color:#1F8CFF}
        .jm-activity-icon.complete{background:rgba(22,163,74,.1);color:#16a34a}
        .jm-activity-icon.save{background:rgba(245,158,11,.1);color:#f59e0b}
        .jm-activity-info{flex:1;min-width:0}
        .jm-activity-text{font-size:13px;color:var(--text);font-weight:600}
        .jm-activity-text span{color:var(--text2);font-weight:500}
        .jm-activity-time{font-size:11px;color:var(--text3);margin-top:2px}
        .jm-activity-job{cursor:pointer;font-size:12px;color:#1F8CFF;font-weight:600;margin-top:2px;display:inline-flex;align-items:center;gap:4px}
        .jm-activity-job:hover{text-decoration:underline}

        /* ── Progress bar on cards ── */
        .jm-progress{padding:0 16px 4px}
        .jm-progress-bar{height:4px;border-radius:99px;background:var(--bg2);overflow:hidden}
        .jm-progress-fill{height:100%;border-radius:99px;background:linear-gradient(90deg,#1F8CFF,#1F8CFF);transition:width .5s}
        .jm-progress-stats{display:flex;justify-content:space-between;font-size:9px;color:var(--text3);margin-top:3px;font-weight:600}

        /* ── Notif setup banner ── */
        .jm-notif-banner{display:flex;align-items:center;gap:14px;padding:14px 18px;background:rgba(31,140,255,.06);border:1px solid rgba(31,140,255,.12);border-radius:12px;margin-bottom:20px}
        .jm-notif-banner i{font-size:20px;color:#1F8CFF;flex-shrink:0}
        .jm-notif-banner .nb-text{flex:1;font-size:12px;color:var(--text2);line-height:1.4}
        .jm-notif-banner .nb-text strong{color:var(--text)}
        .jm-notif-banner button{flex-shrink:0;height:32px;padding:0 14px;border-radius:8px;border:none;background:#1F8CFF;color:#fff;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .13s}
        .jm-notif-banner button:hover{box-shadow:0 4px 12px rgba(31,140,255,.25)}

        /* ── Responsive ── */
        @media(max-width:780px){
          .jm-stats{grid-template-columns:repeat(2,1fr)}
        }
        @media(max-width:480px){
          .jm-stats{grid-template-columns:repeat(2,1fr);gap:8px}
          .jm-stat{padding:12px 14px}
          .jm-stat-count{font-size:18px}
          .jm-head{flex-direction:column}
          .jm-grid{grid-template-columns:1fr}
          .jm-controls{flex-direction:column}
          .jm-search-wrap{min-width:0;width:100%}
          .jm-filter-select{width:100%}
          .jm-tab{padding:6px 10px;font-size:11px}
          .jm-tab .tab-count{display:none}
        }
      `}</style>

      <div className="jm-page">
        {/* ── Header ── */}
        <div className="jm-head">
          <div className="jm-head-left">
            <h1>Job Monitor</h1>
            <p>Track your jobs, applications, and activity in real time.</p>
          </div>
          <div className="jm-notif-toggle" onClick={handleNotificationToggle}>
            <div className="toggle-info">
              <div className="ti-label">Push Alerts</div>
              <div className="ti-sub">{notificationsEnabled ? 'Active' : 'Off'}</div>
            </div>
            <div className={`jm-switch ${notificationsEnabled ? 'active' : ''}`}>
              <div className="jm-switch-knob" />
            </div>
          </div>
        </div>

        {/* ── Notification Banner ── */}
        {!notificationsEnabled && 'Notification' in window && Notification.permission !== 'denied' && (
          <div className="jm-notif-banner">
            <i className="ti ti-bell-ringing" />
            <div className="nb-text">
              <strong>Get notified</strong> when new jobs are posted or your applications get updates. Enable push alerts to stay on top of opportunities.
            </div>
            <button onClick={handleNotificationToggle}>Enable Alerts</button>
          </div>
        )}

        {/* ── Stats Row ── */}
        <div className="jm-stats">
          <div className="jm-stat">
            <div className="jm-stat-top">
              <div className="jm-stat-icon" style={{ background: 'rgba(31,140,255,.1)', color: '#1F8CFF' }}>
                <i className="ti ti-briefcase" />
              </div>
            </div>
            <div className="jm-stat-count">{totalJobs}</div>
            <div className="jm-stat-label">Total Jobs</div>
          </div>
          <div className="jm-stat">
            <div className="jm-stat-top">
              <div className="jm-stat-icon" style={{ background: 'rgba(22,163,74,.1)', color: '#16a34a' }}>
                <i className="ti ti-send" />
              </div>
            </div>
            <div className="jm-stat-count">{totalApplied}</div>
            <div className="jm-stat-label">Applications</div>
          </div>
          <div className="jm-stat">
            <div className="jm-stat-top">
              <div className="jm-stat-icon" style={{ background: 'rgba(245,158,11,.1)', color: '#f59e0b' }}>
                <i className="ti ti-circle-check" />
              </div>
            </div>
            <div className="jm-stat-count">{completedJobs}</div>
            <div className="jm-stat-label">Completed</div>
          </div>
          <div className="jm-stat">
            <div className="jm-stat-top">
              <div className="jm-stat-icon" style={{ background: 'rgba(139,92,246,.1)', color: '#8b5cf6' }}>
                <i className="ti ti-bookmark" />
              </div>
            </div>
            <div className="jm-stat-count">{totalSaved}</div>
            <div className="jm-stat-label">Saved</div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="jm-tabs">
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`jm-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <i className={tab.icon} />
              {tab.label}
              {tab.key === 'applied' && totalApplied > 0 && <span className="tab-count">{totalApplied}</span>}
              {tab.key === 'saved' && totalSaved > 0 && <span className="tab-count">{totalSaved}</span>}
            </button>
          ))}
        </div>

        {/* ── Controls ── */}
        {activeTab !== 'activity' && (
          <div className="jm-controls">
            <div className="jm-search-wrap">
              <i className="ti ti-search search-icn" />
              <input
                type="text"
                placeholder="Search jobs by title, description or creator..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              className="jm-filter-select"
              onChange={e => {
                // Simple category filter
                const val = e.target.value
                if (val === 'all') setSearch('')
                else setSearch(val === 'all' ? '' : val)
              }}
            >
              <option value="all">All Categories</option>
              <option value="Social">Social</option>
              <option value="Testing">Testing</option>
              <option value="Content">Content</option>
              <option value="Video">Video</option>
              <option value="Data">Data</option>
              <option value="Design">Design</option>
            </select>
          </div>
        )}

        {/* ── Activity Tab ── */}
        {activeTab === 'activity' && (
          activityFeed.length === 0 ? (
            <div className="jm-empty">
              <i className="ti ti-activity" />
              <h3>No activity yet</h3>
              <p>Start applying to jobs and your activity will show up here. Track every application, save, and completion.</p>
            </div>
          ) : (
            <div className="jm-activity">
              {activityFeed.map((item, idx) => (
                <div key={idx} className="jm-activity-item">
                  <div className={`jm-activity-icon ${item.type}`}>
                    <i className={`ti ${item.type === 'applied' ? 'ti-send' : item.type === 'complete' ? 'ti-circle-check' : 'ti-bookmark'}`} />
                  </div>
                  <div className="jm-activity-info">
                    <div className="jm-activity-text">
                      {item.type === 'applied' ? 'You applied to ' : item.type === 'complete' ? 'You completed ' : 'You saved '}
                      <span>{item.jobTitle}</span>
                    </div>
                    <div className="jm-activity-time">{timeAgo(item.time)}</div>
                    <div className="jm-activity-job" onClick={() => navigate(`/tasks/${item.jobId}`)}>
                      View Job <i className="ti ti-arrow-right" style={{ fontSize: 10 }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ── Jobs Grid ── */}
        {activeTab !== 'activity' && (
          filteredJobs.length === 0 ? (
            <div className="jm-empty">
              <i className="ti ti-search-off" />
              <h3>{activeTab === 'applied' ? 'No applications yet' : activeTab === 'saved' ? 'No saved jobs' : 'No jobs found'}</h3>
              <p>
                {activeTab === 'applied'
                  ? 'Browse available jobs and apply to start tracking your applications here.'
                  : activeTab === 'saved'
                  ? 'Bookmark jobs you\'re interested in and they\'ll appear here for easy access.'
                  : 'Try adjusting your search or filters to find what you\'re looking for.'}
              </p>
            </div>
          ) : (
            <div className="jm-grid">
              {filteredJobs.map(job => {
                const isApplied = appliedJobs.includes(job.id)
                const isSaved = bookmarked.includes(job.id)
                const progress = Math.round((job.filled / job.slots) * 100)

                return (
                  <div className="jm-card" key={job.id}>
                    {/* Creator */}
                    <div className="jm-creator">
                      <div className="jm-creator-avatar">{formatCreator(job.creator)}</div>
                      <div className="jm-creator-info">
                        <div className="jm-creator-name">{job.creator}</div>
                        <div className="jm-creator-label">{job.creatorLabel}</div>
                      </div>
                      <div className="jm-creator-actions">
                        {isApplied && <span className="jm-status applied"><i className="ti ti-check" /> Applied</span>}
                        {isSaved && <span className="jm-status saved"><i className="ti ti-bookmark-filled" /> Saved</span>}
                        <button
                          className="jm-bookmark-btn"
                          onClick={(e) => { e.stopPropagation(); toggleBookmark(job.id) }}
                          style={{
                            width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)',
                            background: 'var(--card)', display: 'grid', placeItems: 'center',
                            color: isSaved ? '#f59e0b' : 'var(--text3)', cursor: 'pointer', fontSize: 13, flexShrink: 0,
                            transition: 'all .13s'
                          }}
                          aria-label={isSaved ? 'Remove bookmark' : 'Bookmark job'}
                        >
                          <i className={`ti ${isSaved ? 'ti-bookmark-filled' : 'ti-bookmark'}`} />
                        </button>
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="jm-meta">
                      <span><i className="ti ti-tag" /> {job.category}</span>
                      <span><i className="ti ti-device-laptop" /> {job.platform}</span>
                      <span><i className="ti ti-clock" /> {job.timeEstimate}</span>
                    </div>

                    {/* Body */}
                    <div className="jm-body" onClick={() => navigate(`/tasks/${job.id}`)} style={{ cursor: 'pointer' }}>
                      <h3>{job.title}</h3>
                      <p>{job.description}</p>
                    </div>

                    {/* Progress */}
                    <div className="jm-progress">
                      <div className="jm-progress-bar">
                        <div className="jm-progress-fill" style={{ width: `${progress}%` }} />
                      </div>
                      <div className="jm-progress-stats">
                        <span>{job.filled} filled</span>
                        <span>{job.slots} total</span>
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="jm-badges">
                      {job.featured && <span className="jm-badge featured"><i className="ti ti-star" /> Featured</span>}
                      {job.verificationRequired && <span className="jm-badge verified"><i className="ti ti-shield-check" /> Verified</span>}
                      <span className="jm-badge difficulty"><i className="ti ti-speedometer" /> {job.difficulty}</span>
                    </div>

                    {/* Reward */}
                    <div className="jm-reward">
                      <div className="jm-reward-left">
                        <div className="jm-reward-label">Reward</div>
                        <div className="jm-reward-amount">
                          {job.reward} <span>{job.rewardCurrency}</span>
                        </div>
                        <div className="jm-reward-usd">~ ${job.usdValue.toFixed(2)} USD</div>
                      </div>
                      <div className="jm-reward-right">
                        <div className="jm-slots"><span>{job.slots - job.filled}</span> left</div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="jm-actions">
                      <button onClick={() => navigate(`/tasks/${job.id}`)}>
                        <i className="ti ti-eye" /> View Details
                      </button>
                      <button
                        className={`primary ${isApplied ? 'applied' : ''}`}
                        onClick={() => handleApply(job)}
                        style={isApplied ? { background: 'rgba(22,163,74,.1)', color: '#16a34a', borderColor: 'rgba(22,163,74,.2)' } : {}}
                      >
                        <i className={`ti ${isApplied ? 'ti-check' : 'ti-send'}`} />
                        {isApplied ? 'Applied' : 'Apply Now'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}
      </div>
    </Layout>
  )
}
