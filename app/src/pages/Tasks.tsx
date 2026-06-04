import { useState } from 'react'
import Layout from '../components/Layout'

// ─── Sample Job Data ───
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
    description: 'Join the WURK Discord server, say hi in #introductions, and react to the announcement post with an emoji. Simple and quick.',
    creator: 'WURK Community',
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
    description: 'Add product listings to the OgaPay marketplace. Each listing requires title, description, price, and category. Expect 10 listings per batch.',
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
    description: 'Write a 10-tweet thread explaining "What is a Solana Airdrop?" in simple terms. Must include images and hashtags. Original content only.',
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
    title: 'Market Research — DeFi Survey',
    description: 'Complete a 5-minute survey about your experience with DeFi platforms. Answers are anonymous. Data used to improve UX across protocols.',
    creator: 'DeFi Research Lab',
    creatorLabel: 'Research',
    platform: 'Google Forms',
    category: 'Research',
    difficulty: 'Easy',
    reward: 0.02,
    rewardCurrency: 'SOL',
    usdValue: 2.56,
    slots: 100,
    filled: 42,
    timeEstimate: '10 min',
    verificationRequired: false,
    rankRequired: 'None',
    color: '#16a34a',
    featured: false,
  },
  {
    id: 'job-010',
    title: 'Beta Testing — New DeFi Dashboard',
    description: 'Access the beta dashboard, test all features (swap, pool, stake, bridge), and submit a detailed bug report with screenshots.',
    creator: 'CrossChain Labs',
    creatorLabel: 'Protocol',
    platform: 'Web App',
    category: 'Testing',
    difficulty: 'Hard',
    reward: 0.15,
    rewardCurrency: 'SOL',
    usdValue: 19.20,
    slots: 12,
    filled: 5,
    timeEstimate: '1 hour',
    verificationRequired: true,
    rankRequired: 'Silver',
    color: '#DC2626',
    featured: false,
  },
  {
    id: 'job-011',
    title: 'Copywriting — Product Descriptions',
    description: 'Write compelling product descriptions for 5 DeFi tools. Each description should be 2-3 sentences highlighting key features and benefits.',
    creator: 'DeFi Content Hub',
    creatorLabel: 'Agency',
    platform: 'Google Docs',
    category: 'Content',
    difficulty: 'Medium',
    reward: 0.04,
    rewardCurrency: 'SOL',
    usdValue: 5.12,
    slots: 18,
    filled: 9,
    timeEstimate: '40 min',
    verificationRequired: false,
    rankRequired: 'Bronze',
    color: '#F59E0B',
    featured: false,
  },
  {
    id: 'job-012',
    title: 'Telegram Group — Moderation Shift',
    description: 'Monitor the OgaPay Telegram group for 1 hour. Remove spam, answer basic questions, and pin important announcements. Follow the moderation guide.',
    creator: 'OgaPay Community',
    creatorLabel: 'Community',
    platform: 'Telegram',
    category: 'Social',
    difficulty: 'Easy',
    reward: 0.02,
    rewardCurrency: 'SOL',
    usdValue: 2.56,
    slots: 60,
    filled: 15,
    timeEstimate: '1 hour',
    verificationRequired: false,
    rankRequired: 'None',
    color: '#16a34a',
    featured: false,
  },
]

const jobFilters = ['All', 'Trending', 'New', 'Social', 'Content', 'Testing', 'Design', 'Video', 'Data', 'Research']

const formatAddress = (name: string) => {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return initials
}

export default function Tasks() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [bookmarked, setBookmarked] = useState<string[]>([])

  const filtered = sampleJobs.filter(job => {
    const matchSearch = search === '' || job.title.toLowerCase().includes(search.toLowerCase()) || job.description.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'All' || filter === 'Trending' || filter === 'New' || job.category === filter
    return matchSearch && matchFilter
  })

  const toggleBookmark = (id: string) => {
    setBookmarked(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id])
  }

  const totalRewards = sampleJobs.reduce((sum, j) => sum + j.usdValue, 0)
  const totalSlots = sampleJobs.reduce((sum, j) => sum + j.slots, 0)
  const totalFilled = sampleJobs.reduce((sum, j) => sum + j.filled, 0)

  return (
    <Layout>
      <style>{`
        .page{max-width:100%!important;padding:0}
        .jobs-section{width:100%;max-width:1280px;margin:0 auto}
        .jobs-section .page-head{margin-bottom:1.25rem}
        .jobs-section .page-head h1{font-family:Outfit;font-size:1.75rem;font-weight:900;margin:0;letter-spacing:-.02em}
        .jobs-section .page-head p{color:var(--text2);font-size:.875rem;margin:.25rem 0 0;line-height:1.5}

        /* ── Stats Row ── */
        .jobs-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:.75rem;margin-bottom:1.5rem}
        .jobs-stat{background:var(--card);border:1px solid var(--border);border-radius:.75rem;padding:1rem 1.125rem;text-align:center;transition:all .2s}
        .jobs-stat:hover{box-shadow:var(--shadow-md);transform:translateY(-1px)}
        .jobs-stat .stat-val{font-family:Outfit;font-size:1.35rem;font-weight:900;letter-spacing:-.02em;line-height:1.2}
        .jobs-stat .stat-val.green{color:var(--green)}
        .jobs-stat .stat-val.accent{color:#1F8CFF}
        .jobs-stat .stat-val.gold{color:var(--gold)}
        .jobs-stat .stat-lbl{font-size:.68rem;color:var(--text2);margin-top:.15rem;font-weight:600;text-transform:uppercase;letter-spacing:.04em}

        /* ── Filter Controls ── */
        .filter-controls{display:flex;align-items:center;gap:.75rem;margin-bottom:1.75rem;flex-wrap:wrap}
        .filter-toggle{display:flex;background:var(--bg2);border-radius:.625rem;padding:3px;border:1px solid var(--border);overflow-x:auto;flex-shrink:0}
        .filter-tab{padding:.5rem 1rem;border:0;border-radius:.5rem;background:transparent;color:var(--text2);font-size:.8125rem;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap}
        .filter-tab:hover{color:var(--text);background:var(--card)}
        .filter-tab.active{background:var(--card);color:var(--text);box-shadow:0 1px 3px rgba(0,0,0,.06)}
        .filter-tab.active:after{content:'';display:block;height:2px;width:20px;background:#1F8CFF;border-radius:999px;margin:2px auto 0}
        .search-wrap{flex:1;min-width:180px;position:relative}
        .search-wrap input{width:100%;height:38px;padding:0 14px 0 38px;border:1.5px solid var(--border);border-radius:.625rem;background:var(--card);color:var(--text);font-size:.8125rem;outline:none;transition:border-color .2s}
        .search-wrap input:focus{border-color:#1F8CFF}
        .search-wrap input::placeholder{color:var(--text3)}
        .search-wrap .search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text3);font-size:16px;pointer-events:none}

        .btn-create{display:inline-flex;align-items:center;gap:.5rem;padding:.625rem 1.125rem;background:linear-gradient(135deg,#1F8CFF,#1F8CFF);color:#fff;border:0;border-radius:.625rem;font-size:.8125rem;font-weight:700;cursor:pointer;transition:all .2s;white-space:nowrap;box-shadow:0 4px 14px rgba(31,140,255,.25)}
        .btn-create:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(31,140,255,.3)}

        /* ── Jobs Grid ── */
        .jobs-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:1.25rem}

        .job-card{background:var(--card);border:1px solid var(--border);border-radius:.875rem;overflow:hidden;transition:all .25s cubic-bezier(.4,0,.2,1);display:flex;flex-direction:column;position:relative}
        .job-card:hover{transform:translateY(-3px);box-shadow:0 8px 30px rgba(0,0,0,.08),0 0 40px rgba(31,140,255,.04);border-color:rgba(31,140,255,.2)}
        [data-theme="dark"] .job-card:hover{border-color:rgba(167,139,250,.2);box-shadow:0 8px 30px rgba(0,0,0,.3),0 0 40px rgba(167,139,250,.04)}

        /* Creator row */
        .job-creator{display:flex;align-items:center;gap:.75rem;padding:.875rem 1rem .75rem;background:linear-gradient(135deg,var(--bg2),var(--card));border-bottom:1px solid var(--border);position:relative}
        .job-creator:after{content:'';position:absolute;bottom:-1px;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#1F8CFF,transparent);opacity:.4}
        .jc-avatar{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font-size:.65rem;font-weight:800;color:#fff;flex-shrink:0;background:linear-gradient(135deg,#1F8CFF,#1F8CFF)}
        .jc-info{flex:1;min-width:0}
        .jc-name{font-size:.8125rem;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .jc-label{font-size:.625rem;color:var(--text3);text-transform:uppercase;letter-spacing:.04em}
        .jc-bookmark{width:30px;height:30px;border-radius:.5rem;border:1px solid var(--border);background:var(--card);display:grid;place-items:center;color:var(--text3);cursor:pointer;transition:all .2s;flex-shrink:0;font-size:16px}
        .jc-bookmark:hover{border-color:#1F8CFF;color:#1F8CFF}
        .jc-bookmark.saved{background:#1F8CFF;color:#fff;border-color:#1F8CFF}

        /* Meta row */
        .job-meta{display:flex;align-items:center;gap:.5rem;padding:.5rem 1rem;border-bottom:1px solid var(--border);background:var(--bg2);font-size:.75rem;font-weight:600;color:var(--text2)}
        .job-meta .cat-pill{display:inline-flex;align-items:center;gap:.25rem;padding:2px 8px;border-radius:999px;font-size:.625rem;font-weight:800;background:rgba(31,140,255,.08);color:#1F8CFF}
        .job-meta .platform{display:flex;align-items:center;gap:.25rem;color:var(--text2)}

        /* Description */
        .job-desc-wrap{padding:.75rem 1rem;flex:1;display:flex;flex-direction:column}
        .job-desc-wrap h3{margin:0 0 .35rem;font-family:Outfit;font-size:.9375rem;font-weight:800;line-height:1.3}
        .job-desc{font-size:.8125rem;color:var(--text2);line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin:0}

        /* Reward section */
        .job-reward{position:relative;margin:.5rem 1rem .75rem;padding:.875rem;border-radius:.75rem;background:linear-gradient(135deg,rgba(22,163,74,.06),rgba(22,163,74,.03));border:1px solid rgba(22,163,74,.12);text-align:center;overflow:hidden;transition:all .2s}
        .job-reward:before{content:'';position:absolute;top:0;left:-100%;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(22,163,74,.3),transparent);animation:rewardShimmer 4s ease-in-out infinite}
        [data-theme="dark"] .job-reward{background:linear-gradient(135deg,rgba(74,222,128,.08),rgba(74,222,128,.04));border-color:rgba(74,222,128,.12)}
        .job-reward .rw-primary{display:flex;align-items:baseline;justify-content:center;gap:.35rem}
        .job-reward .rw-amount{font-family:Outfit;font-size:1.25rem;font-weight:900;color:var(--text);letter-spacing:-.02em}
        .job-reward .rw-sym{font-size:.875rem;font-weight:700;color:var(--green)}
        .job-reward .rw-usd{font-size:.8125rem;color:var(--text2);font-weight:600}
        .job-reward .rw-secondary{display:flex;align-items:center;justify-content:center;gap:.35rem;margin-top:.1rem;font-size:.75rem;color:var(--text2);font-weight:600}
        .job-reward .rw-label{font-size:.625rem;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;font-weight:700;margin-bottom:.15rem}

        /* Badges */
        .job-badges{display:flex;align-items:center;gap:.35rem;margin:0 1rem .625rem;flex-wrap:wrap}
        .job-badge{display:inline-flex;align-items:center;gap:.15rem;padding:2px 8px;border-radius:999px;font-size:.5625rem;font-weight:800;text-transform:uppercase;letter-spacing:.03em}
        .job-badge.featured{background:rgba(245,179,1,.1);color:var(--gold);border:1px solid rgba(245,179,1,.18)}
        .job-badge.verified{background:rgba(22,163,74,.08);color:var(--green);border:1px solid rgba(22,163,74,.15)}
        [data-theme="dark"] .job-badge.featured{background:rgba(251,191,36,.08);color:#fbbf24;border-color:rgba(251,191,36,.18)}
        [data-theme="dark"] .job-badge.verified{background:rgba(52,211,153,.08);color:#34d399;border-color:rgba(52,211,153,.15)}

        /* Progress */
        .job-progress{margin:0 1rem .625rem}
        .job-progress .pr-bar{height:5px;border-radius:999px;background:var(--bg2);overflow:hidden;border:1px solid var(--border)}
        .job-progress .pr-fill{height:100%;border-radius:inherit;background:linear-gradient(90deg,#1F8CFF,#1F8CFF);transition:width .5s}
        .job-progress .pr-stats{display:flex;justify-content:space-between;font-size:.625rem;color:var(--text3);margin-top:2px;font-weight:600}

        /* Footer actions */
        .job-foot{margin-top:auto;display:flex;align-items:center;gap:.5rem;padding:.75rem 1rem;border-top:1px solid var(--border);background:var(--bg2)}
        .job-foot .btn{height:34px;font-size:.75rem;flex:1;border:1.5px solid var(--border);background:var(--card);color:var(--text);border-radius:.5rem;padding:0 .75rem;display:inline-flex;align-items:center;justify-content:center;gap:.35rem;font-weight:700;transition:all .15s;cursor:pointer}
        .job-foot .btn:hover{background:var(--bg2);border-color:var(--text2)}
        .job-foot .btn.primary{background:#1F8CFF;color:#fff;border-color:#1F8CFF}
        .job-foot .btn.primary:hover{opacity:.9}

        /* Empty state */
        .empty-state{text-align:center;padding:4rem 1rem;color:var(--text3)}
        .empty-state i{font-size:2.25rem;display:block;margin-bottom:.75rem}
        .empty-state h3{font-family:Outfit;font-weight:800;margin:0 0 .25rem;color:var(--text);font-size:1.125rem}
        .empty-state p{font-size:.875rem;margin:0;color:var(--text2);line-height:1.5}

        @keyframes rewardShimmer{0%{left:-100%}50%{left:100%}100%{left:100%}}

        @media(max-width:1024px){.jobs-grid{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:768px){
          .jobs-grid{grid-template-columns:1fr}
          .jobs-stats{grid-template-columns:repeat(2,1fr)}
          .filter-controls{flex-direction:column;align-items:stretch}
          .filter-toggle{overflow-x:auto;-webkit-overflow-scrolling:touch}
          .search-wrap{min-width:0}
          .btn-create{width:100%;justify-content:center}
          .jobs-section .page-head h1{font-size:1.375rem}
          .jobs-stat .stat-val{font-size:1.125rem}
          .job-reward .rw-amount{font-size:1.125rem}
        }
      `}</style>

      <div className="jobs-section">
        {/* Page Header */}
        <div className="page-head">
          <div>
            <h1>Jobs</h1>
            <p>Browse available microtasks and earn crypto rewards. Complete tasks and get paid instantly.</p>
          </div>
          <button className="btn-create">
            <i className="ti ti-plus" />
            Create Job
          </button>
        </div>

        {/* Stats Row */}
        <div className="jobs-stats">
          <div className="jobs-stat">
            <div className="stat-val green">${totalRewards.toFixed(0)}+</div>
            <div className="stat-lbl">Total Rewards</div>
          </div>
          <div className="jobs-stat">
            <div className="stat-val accent">{sampleJobs.length}</div>
            <div className="stat-lbl">Active Jobs</div>
          </div>
          <div className="jobs-stat">
            <div className="stat-val gold">{totalSlots}</div>
            <div className="stat-lbl">Total Slots</div>
          </div>
          <div className="jobs-stat">
            <div className="stat-val" style={{ color: 'var(--green)' }}>{totalFilled}</div>
            <div className="stat-lbl">Filled</div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="filter-controls">
          <div className="filter-toggle">
            {jobFilters.map(f => (
              <button key={f} className={`filter-tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {f}
              </button>
            ))}
          </div>
          <div className="search-wrap">
            <i className="ti ti-search search-icon" />
            <input type="text" placeholder="Search jobs..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {/* Jobs Grid */}
        {filtered.length === 0 ? (
          <div className="empty-state">
            <i className="ti ti-search-off" />
            <h3>No jobs found</h3>
            <p>Try adjusting your search or filter to find what you're looking for.</p>
          </div>
        ) : (
          <div className="jobs-grid">
            {filtered.map(job => (
              <div className="job-card" key={job.id}>
                {/* Creator */}
                <div className="job-creator">
                  <div className="jc-avatar">{formatAddress(job.creator)}</div>
                  <div className="jc-info">
                    <div className="jc-name">{job.creator}</div>
                    <div className="jc-label">{job.creatorLabel}</div>
                  </div>
                  <button
                    className={`jc-bookmark ${bookmarked.includes(job.id) ? 'saved' : ''}`}
                    onClick={() => toggleBookmark(job.id)}
                    aria-label={bookmarked.includes(job.id) ? 'Remove bookmark' : 'Bookmark job'}
                  >
                    <i className={`ti ${bookmarked.includes(job.id) ? 'ti-bookmark-filled' : 'ti-bookmark'}`} />
                  </button>
                </div>

                {/* Meta */}
                <div className="job-meta">
                  <span className="cat-pill">
                    <i className="ti ti-tag" />
                    {job.category}
                  </span>
                  <span className="platform">
                    <i className="ti ti-device-laptop" />
                    {job.platform}
                  </span>
                  <span className="platform" style={{ marginLeft: 'auto' }}>
                    <i className="ti ti-clock" />
                    {job.timeEstimate}
                  </span>
                </div>

                {/* Description */}
                <div className="job-desc-wrap">
                  <h3>{job.title}</h3>
                  <p className="job-desc">{job.description}</p>
                </div>

                {/* Reward */}
                <div className="job-reward">
                  <div className="rw-label">Reward</div>
                  <div className="rw-primary">
                    <span className="rw-sym">◎</span>
                    <span className="rw-amount">{job.reward}</span>
                    <span className="rw-usd">(${job.usdValue.toFixed(2)})</span>
                  </div>
                  <div className="rw-secondary">
                    <span>{job.rewardCurrency}</span>
                    <span>·</span>
                    <span>{job.slots - job.filled} slots left</span>
                  </div>
                </div>

                {/* Badges */}
                <div className="job-badges">
                  {job.featured && <span className="job-badge featured"><i className="ti ti-star" /> Featured</span>}
                  {job.verificationRequired && <span className="job-badge verified"><i className="ti ti-shield-check" /> Verified</span>}
                  <span className="job-badge" style={{ background: `${job.color}12`, color: job.color, border: `1px solid ${job.color}25` }}>
                    <i className="ti ti-speedometer" />
                    {job.difficulty}
                  </span>
                  {job.rankRequired !== 'None' && (
                    <span className="job-badge" style={{ background: 'rgba(31,140,255,.08)', color: '#1F8CFF', border: '1px solid rgba(31,140,255,.15)' }}>
                      <i className="ti ti-medal" />
                      {job.rankRequired}
                    </span>
                  )}
                </div>

                {/* Progress */}
                <div className="job-progress">
                  <div className="pr-bar">
                    <div className="pr-fill" style={{ width: `${(job.filled / job.slots) * 100}%` }} />
                  </div>
                  <div className="pr-stats">
                    <span>{job.filled} filled</span>
                    <span>{job.slots} total</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="job-foot">
                  <button className="btn"><i className="ti ti-eye" /> View</button>
                  <button className="btn primary"><i className="ti ti-send" /> Apply Now</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
