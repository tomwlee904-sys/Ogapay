import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { API_BASE } from '../lib/api'
import TaskCard from '../components/TaskCard'

const WORKSPACES: Record<string, { label: string; icon: string; desc: string; color: string }> = {
  social: { label: 'Social Workspace', icon: 'brand-x', desc: 'Social media tasks — follows, likes, shares, comments', color: '#1F8CFF' },
  writing: { label: 'Writing Workspace', icon: 'pencil', desc: 'Content writing, copywriting, translations, articles', color: '#7c3aed' },
  design: { label: 'Design Workspace', icon: 'photo', desc: 'Graphic design, UI/UX, video editing, animations', color: '#EC4899' },
  testing: { label: 'App Testing Workspace', icon: 'device-mobile', desc: 'App testing, QA, beta testing, bug reporting', color: '#059669' },
  research: { label: 'Research Workspace', icon: 'search', desc: 'Web research, data collection, market analysis', color: '#d97706' },
  development: { label: 'Dev Workspace', icon: 'code', desc: 'Software development, smart contracts, automation', color: '#2563eb' },
}

const CATEGORY_MAP: Record<string, string> = {
  social: 'SOCIAL_MEDIA',
  writing: 'CONTENT_WRITING',
  design: 'DESIGN',
  testing: 'APP_TESTING',
  research: 'WEB_RESEARCH',
  development: 'OTHER',
}

const SUBCATEGORIES: Record<string, string[]> = {
  social: ['All', 'Twitter/X', 'Instagram', 'TikTok', 'Telegram', 'YouTube', 'Facebook'],
  writing: ['All', 'Blog Posts', 'Copywriting', 'SEO Content', 'Product Descriptions', 'Translations', 'Scripts'],
  design: ['All', 'Logo Design', 'Social Graphics', 'Banner Design', 'UI Mockups', 'Flyers', 'Brand Identity'],
  testing: ['All', 'Mobile Apps', 'Websites', 'Bug Reporting', 'UX Feedback', 'Beta Testing'],
  research: ['All', 'Market Research', 'Data Collection', 'Competitor Analysis', 'Surveys', 'Lead Gen'],
  development: ['All', 'Smart Contracts', 'Frontend', 'Backend', 'Bots', 'API Integration', 'Bug Fixes'],
}

const TIPS: Record<string, string[]> = {
  social: [
    'Always screenshot before and after completing a social task as proof',
    'Complete social tasks quickly — slots fill up fast',
    'Follow the exact instructions — wrong username means rejection',
  ],
  writing: [
    'Read the brief twice before starting to avoid rejection',
    'Use a spell checker before submitting your work',
    'Always deliver the exact word count requested',
  ],
  design: [
    'Submit in the exact file format requested (PNG, SVG, PDF)',
    'Check dimensions carefully before exporting',
    'Keep your source files in case revisions are needed',
  ],
  testing: [
    'Document every bug with a clear screenshot and steps to reproduce',
    'Test on both iOS and Android if not specified',
    'Clear app cache before testing for accurate results',
  ],
  research: [
    'Always cite your sources with direct links',
    'Organize data in the exact format requested',
    'Double-check facts before submitting — accuracy is everything',
  ],
  development: [
    'Always test your code before submitting',
    'Add comments to explain complex logic',
    'Never hardcode API keys or sensitive data',
  ],
}

function getTimeAgo(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return mins + 'm ago'
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return hrs + 'h ago'
  const days = Math.floor(hrs / 24)
  if (days < 7) return days + 'd ago'
  return d.toLocaleDateString()
}

function formatReward(reward: number | string, currency?: string): string {
  const cur = (currency || 'NGN').toUpperCase()
  const amount = Number(reward) || 0
  if (cur === 'NGN') return '₦' + amount.toLocaleString()
  if (cur === 'OGA' || cur === 'SOGA') return amount + ' $OGA'
  if (cur === 'SOL') return amount + ' SOL'
  if (cur === 'USDC') return '$' + amount
  return amount + ' ' + cur
}

export default function WorkerWorkspace() {
  const { category } = useParams()
  const navigate = useNavigate()
  const ws = category ? WORKSPACES[category] : null
  const apiCategory = category ? CATEGORY_MAP[category] : null
  const subs = category ? SUBCATEGORIES[category] || ['All'] : ['All']
  const tips = category ? TIPS[category] || [] : []
  const now = Date.now()

  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeSub, setActiveSub] = useState('All')
  const [myCompletions, setMyCompletions] = useState(0)
  const [leaders, setLeaders] = useState<any[] | null>(null)
  const [leadersLoading, setLeadersLoading] = useState(true)

  const refreshInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!ws || !apiCategory) { setLoading(false); return }

    const fetchData = async () => {
      try {
        const token = localStorage.getItem('ogapay_access_token')
        const headers: Record<string, string> = {}
        if (token) headers['Authorization'] = 'Bearer ' + token

        const [tasksRes, subRes] = await Promise.all([
          fetch(API_BASE + '/tasks?category=' + encodeURIComponent(apiCategory), { headers }),
          fetch(API_BASE + '/tasks/my/submissions', { headers }).catch(() => null),
        ])

        if (!subRes) {
          console.warn('[WorkerWorkspace] Submissions fetch failed — completions unavailable')
        }

        if (tasksRes.ok) {
          const json = await tasksRes.json()
          if (json.success) {
            setTasks(Array.isArray(json.data) ? json.data : json.data?.tasks || json.data?.data || [])
          }
        }

        // Count completions in this category
        if (subRes && subRes.ok) {
          const subJson = await subRes.json()
          const submissions = Array.isArray(subJson) ? subJson : subJson?.data || subJson?.submissions || []
          const catSubs = submissions.filter((s: any) => {
            const t = s.task || s
            const cat = t.category || ''
            return cat.toUpperCase() === apiCategory.toUpperCase() ||
       cat.toUpperCase().replace(/[_\s]/g, '') === apiCategory.toUpperCase().replace(/[_\s]/g, '')
          })
          setMyCompletions(catSubs.length)
        }
      } catch (e) {
        console.error('[WorkerWorkspace] Failed to load tasks:', e)
        setError('Failed to load tasks. Please try again.')
      }
      setLoading(false)
    }

    fetchData()

    // Poll every 30 seconds for new tasks
    refreshInterval.current = setInterval(fetchData, 30000)

    return () => {
      if (refreshInterval.current) clearInterval(refreshInterval.current)
    }
  }, [category])

  // Fetch leaderboard
  useEffect(() => {
    if (!apiCategory) return
    ;(async () => {
      try {
        const token = localStorage.getItem('ogapay_access_token')
        const headers: Record<string, string> = {}
        if (token) headers['Authorization'] = 'Bearer ' + token
        const res = await fetch(API_BASE + '/leaderboard?type=earners&category=' + encodeURIComponent(apiCategory) + '&limit=3', { headers })
        if (res.ok) {
          const json = await res.json()
          if (json.success && json.data) {
            setLeaders(Array.isArray(json.data) ? json.data : json.data.topEarners || json.data.leaders || json.data.earners || [])
          }
        }
      } catch (e) {
        console.error('[WorkerWorkspace] Leaderboard fetch failed:', e)
      }
      setLeadersLoading(false)
    })()
  }, [category])

  // Filter tasks by subcategory
  const filteredTasks = activeSub === 'All'
    ? tasks
    : tasks.filter(t => {
        const title = (t.title || '').toLowerCase()
        const desc = (t.description || '').toLowerCase()
        const sub = activeSub.toLowerCase()
        return title.includes(sub) || desc.includes(sub)
      })

  // Featured: top 3 by reward
  const featured = [...filteredTasks].sort((a, b) => (b.reward || 0) - (a.reward || 0)).slice(0, 3)

  // Stats
  const activeCount = tasks.filter(t => t.status === 'OPEN' || t.status === 'open' || !t.status).length
  const avgReward = tasks.length > 0
    ? (tasks.reduce((sum, t) => sum + (Number(t.reward) || 0), 0) / tasks.length).toFixed(2)
    : '0'

  // Related categories (3 others)
  const otherSlugs = Object.keys(WORKSPACES).filter(s => s !== category).slice(0, 3)

  const avatarColors = ['#1F8CFF', '#EC4899', '#16a34a', '#F59E0B', '#7c3aed', '#dc2626']

  if (!ws) {
    return (
      <Layout>
        <div style={{ padding: '60px 24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: '0 0 8px' }}>Workspace not found</h2>
          <p style={{ fontSize: 14, color: 'var(--text3)', margin: '0 0 20px' }}>Available: Social, Writing, Design, App Testing, Research, Dev</p>
          <button onClick={() => navigate('/worker-portal')} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Back to Worker Portal</button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <style>{`
        .ws-header{background:${ws.color};padding:36px 32px;border-radius:16px;margin-bottom:24px;color:#fff}
        .ws-header h1{font-size:28px;font-weight:900;margin:0 0 6px;word-break:break-word}
        .ws-header p{font-size:14px;opacity:.85;margin:0;word-break:break-word}
        .ws-stat-bar{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px}
        .ws-stat-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center}
        .ws-stat-num{font-size:22px;font-weight:900;color:${ws.color}}
        .ws-stat-label{font-size:12px;color:var(--text3);font-weight:600;margin-top:4px}
        .ws-pills{display:flex;gap:8px;overflow-x:auto;padding-bottom:8px;margin-bottom:20px;scrollbar-width:none}
        .ws-pills::-webkit-scrollbar{display:none}
        .ws-pill{padding:7px 14px;border-radius:20px;border:1px solid var(--border);background:var(--card);color:var(--text2);font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;transition:all .2s;flex-shrink:0;font-family:inherit}
        .ws-pill.active{background:${ws.color};color:#fff;border-color:${ws.color}}
        .ws-pill:hover:not(.active){border-color:${ws.color};color:${ws.color}}
        .ws-featured{margin-bottom:24px}
        .ws-featured-title{font-size:14px;font-weight:800;color:var(--text);margin-bottom:12px;display:flex;align-items:center;gap:8px}
        .ws-featured-card{background:var(--card);border:1px solid var(--border);border-left:4px solid ${ws.color};border-radius:12px;padding:16px 18px;margin-bottom:10px;cursor:pointer;transition:all .2s;display:flex;justify-content:space-between;align-items:center}
        .ws-featured-card:hover{box-shadow:0 4px 20px rgba(0,0,0,.08);transform:translateX(4px)}
        .ws-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}
        .ws-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:18px;cursor:pointer;transition:all .2s;display:flex;flex-direction:column;gap:8px}
        .ws-card:hover{box-shadow:0 4px 20px rgba(0,0,0,.08);transform:translateY(-2px)}
        .ws-card-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
        .ws-card-title{font-size:15px;font-weight:700;color:var(--text);margin:0;flex:1;line-height:1.3}
        .ws-card-reward{font-size:16px;font-weight:800;color:${ws.color};white-space:nowrap}
        .ws-card-meta{font-size:12px;color:var(--text3);display:flex;gap:12px;flex-wrap:wrap;align-items:center}
        .ws-card-meta span{display:inline-flex;align-items:center;gap:4px}
        .ws-card-actions{display:flex;align-items:center;justify-content:space-between;margin-top:4px}
        .ws-badge-open{font-size:11px;font-weight:700;color:#16a34a;background:rgba(22,163,74,.1);padding:2px 10px;border-radius:20px}
        .ws-badge-closed{font-size:11px;font-weight:700;color:var(--text3);background:var(--bg2);padding:2px 10px;border-radius:20px}
        .ws-apply-btn{height:32px;padding:0 14px;border-radius:8px;border:none;background:${ws.color};color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .2s;display:inline-flex;align-items:center;gap:4px}
        .ws-apply-btn:hover{box-shadow:0 2px 12px ${ws.color}40;transform:translateY(-1px)}
        .ws-tips{background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:20px;margin-top:24px}
        .ws-tips-title{font-size:14px;font-weight:800;color:var(--text);margin-bottom:12px;display:flex;align-items:center;gap:8px}
        .ws-tip{font-size:13px;color:var(--text2);padding:8px 0;border-bottom:1px solid var(--border);line-height:1.5}
        .ws-tip:last-child{border-bottom:none}
        .ws-leaders{margin-top:24px}
        .ws-leaders-title{font-size:14px;font-weight:800;color:var(--text);margin-bottom:12px;display:flex;align-items:center;gap:8px}
        .ws-leader-row{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border)}
        .ws-leader-row:last-child{border-bottom:none}
        .ws-leader-rank{font-size:13px;font-weight:800;color:var(--text3);width:20px}
        .ws-leader-avatar{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff;flex-shrink:0}
        .ws-leader-name{flex:1;font-size:13px;font-weight:600;color:var(--text)}
        .ws-leader-amount{font-size:13px;font-weight:800;color:${ws.color}}
        .ws-related{margin-top:24px}
        .ws-related-title{font-size:14px;font-weight:800;color:var(--text);margin-bottom:12px}
        .ws-related-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
        .ws-related-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px;cursor:pointer;text-align:center;transition:all .2s}
        .ws-related-card:hover{border-color:${ws.color};transform:translateY(-2px)}
        .ws-related-icon{font-size:20px;margin-bottom:6px;display:block;color:${ws.color}}
        .ws-related-label{font-size:12px;font-weight:700;color:var(--text2)}
        .ws-empty{padding:60px 24px;text-align:center;color:var(--text3)}
        @media(max-width:600px){
          .ws-header{padding:24px 20px}.ws-header h1{font-size:22px}
          .ws-stat-bar{grid-template-columns:repeat(3,1fr);gap:8px}
          .ws-stat-num{font-size:16px}
          .ws-grid{grid-template-columns:1fr}
          .ws-related-grid{grid-template-columns:repeat(2,1fr);gap:8px}
          .ws-featured-card{flex-direction:column;align-items:flex-start;gap:8px}
        }
      `}</style>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 0' }}>
        {/* ── Hero header ── */}
        <div className="ws-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <i className={`ti ti-${ws.icon}`} style={{ fontSize: 24 }} />
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', opacity: .8 }}>WORKSPACE</span>
          </div>
          <h1>{ws.label}</h1>
          <p>{ws.desc}</p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
            <div style={{ width: 28, height: 28, border: '3px solid var(--border)', borderTopColor: ws.color, borderRadius: '50%', animation: 'spin .6s linear infinite', margin: '0 auto 12px' }} />
            Loading tasks...
          </div>
        ) : error ? (
          <div className="ws-empty"><i className="ti ti-alert-circle" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />{error}</div>
        ) : (
          <>
            {/* ── Stats bar ── */}
            <div className="ws-stat-bar">
              <div className="ws-stat-card">
                <div className="ws-stat-num">{activeCount}</div>
                <div className="ws-stat-label">Tasks Available</div>
              </div>
              <div className="ws-stat-card">
                <div className="ws-stat-num">{avgReward}</div>
                <div className="ws-stat-label">Avg Reward</div>
              </div>
              <div className="ws-stat-card">
                <div className="ws-stat-num">{myCompletions}</div>
                <div className="ws-stat-label">Your Completions</div>
              </div>
            </div>

            {/* ── Subcategory pills ── */}
            <div className="ws-pills" style={{ overflowX: 'auto', whiteSpace: 'nowrap', flexWrap: 'nowrap' }}>
              {subs.map(s => (
                <button key={s} className={`ws-pill ${activeSub === s ? 'active' : ''}`} onClick={() => setActiveSub(s)}>
                  {s}
                </button>
              ))}
            </div>

            {/* ── Featured tasks ── */}
            {featured.length > 0 && (
              <div className="ws-featured">
                <div className="ws-featured-title">
                  <i className="ti ti-flame" style={{ color: ws.color }} /> Top Paying This Week
                </div>
                {featured.map(t => (
                  <TaskCard key={t.id || t._id} task={t} />
                ))}
              </div>
            )}

            {/* ── Task grid ── */}
            {filteredTasks.length === 0 ? (
              <div className="ws-empty">
                <i className="ti ti-briefcase-off" style={{ fontSize: 40, display: 'block', marginBottom: 12, color: 'var(--text3)' }} />
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text2)', margin: '0 0 4px' }}>No {ws.label} tasks yet</h3>
                <p style={{ fontSize: 13, margin: '0 0 16px' }}>Check back later or browse other categories.</p>
                <button onClick={() => navigate('/tasks?category=' + apiCategory)} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: ws.color, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Browse All Tasks</button>
              </div>
            ) : (
              <div className="ws-grid">
                {filteredTasks.map((task: any) => (
                  <TaskCard key={task.id || task._id} task={task} />
                ))}
              </div>
            )}

            {/* ── Tips ── */}
            {tips.length > 0 && (
              <div className="ws-tips">
                <div className="ws-tips-title"><i className="ti ti-bulb" style={{ color: ws.color }} /> Pro Tips</div>
                {tips.map((tip, i) => (
                  <div key={i} className="ws-tip"><i className="ti ti-check" style={{ color: ws.color, marginRight: 8, fontSize: 12 }} />{tip}</div>
                ))}
              </div>
            )}

            {/* ── Mini Leaderboard ── */}
            {!leadersLoading && leaders && leaders.length > 0 && (
              <div className="ws-leaders">
                <div className="ws-leaders-title"><i className="ti ti-trophy" style={{ color: ws.color }} /> Top Earners on OgaPay</div>
                {leaders.slice(0, 3).map((l: any, i: number) => {
                  const name = l.username || l.name || l.firstName || 'User'
                  const initial = (name[0] || 'U').toUpperCase()
                  const initials = l.firstName && l.lastName ? (l.firstName[0] + l.lastName[0]).toUpperCase() : initial
                  const amount = l.earnings || l.totalEarned || l.reward || 0
                  return (
                    <div key={l.id || i} className="ws-leader-row">
                      <div className="ws-leader-rank">#{i + 1}</div>
                      <div className="ws-leader-avatar" style={{ background: avatarColors[i] }}>{initials}</div>
                      <div className="ws-leader-name">{name}</div>
                      <div className="ws-leader-amount">{formatReward(amount, l.currency)}</div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── Related Categories ── */}
            <div className="ws-related">
              <div className="ws-related-title"><i className="ti ti-grid-dots" style={{ color: ws.color }} /> Other Workspaces</div>
              <div className="ws-related-grid">
                {otherSlugs.map(slug => {
                  const w = WORKSPACES[slug]
                  return (
                    <div key={slug} className="ws-related-card" onClick={() => navigate('/worker/' + slug)}>
                      <i className={`ti ti-${w.icon} ws-related-icon`} />
                      <div className="ws-related-label">{w.label}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
