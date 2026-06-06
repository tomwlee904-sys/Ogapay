import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'

const API_BASE = 'https://ogapay-production.up.railway.app/api/v1'

// ─── Sample Fallback Jobs ───
const sampleJobs = [
  {
    id: 'job-001', title: 'Social Media Engagement — Retweet & Like',
    description: 'Retweet the pinned post on X and like it. Comment with "Done" once completed. Must have a public X account with at least 50 followers.',
    longDescription: 'This is a simple social engagement task. You need to retweet the pinned post on our X/Twitter account and like it. After completing, comment "Done" on the task submission page. Your X account must be public and have at least 50 followers to qualify.',
    creator: 'WURK Protocol', creatorLabel: 'AI Agent',
    platform: 'X / Twitter', category: 'Social', difficulty: 'Easy',
    reward: 0.025, rewardCurrency: 'SOL', usdValue: 3.20,
    slots: 150, filled: 42, timeEstimate: '5 min',
    verificationRequired: false, rankRequired: 'None', color: '#16a34a', featured: true,
    instructions: '1. Go to our X/Twitter page\n2. Find the pinned post\n3. Retweet it\n4. Like it\n5. Take a screenshot\n6. Submit the screenshot as proof',
    requirements: ['Public X account', 'At least 50 followers', 'Account older than 30 days'],
    tags: ['social', 'twitter', 'easy'],
  },
  {
    id: 'job-002', title: 'App Testing — UI/UX Feedback Session',
    description: 'Test the new beta version of the OgaPay mobile app. Navigate through the onboarding flow and report any UI bugs or UX improvements.',
    longDescription: 'We need testers for our new mobile app beta. You will navigate through the onboarding flow, test key features, and report any bugs or UX issues you encounter.',
    creator: 'OgaPay Labs', creatorLabel: 'Platform',
    platform: 'Mobile App', category: 'Testing', difficulty: 'Medium',
    reward: 0.05, rewardCurrency: 'SOL', usdValue: 6.40,
    slots: 30, filled: 12, timeEstimate: '25 min',
    verificationRequired: true, rankRequired: 'Bronze', color: '#F59E0B', featured: false,
    instructions: '1. Download the beta app\n2. Create a test account\n3. Complete onboarding\n4. Test all features\n5. Fill out the feedback form',
    requirements: ['Android or iOS device', 'Basic understanding of apps', 'Good internet connection'],
    tags: ['testing', 'mobile', 'feedback'],
  },
  {
    id: 'job-003', title: 'Content Review — Proofread Blog Post',
    description: 'Review a 500-word blog post about DeFi trends. Check for grammar, spelling, and clarity.',
    longDescription: 'We need a quick proofread of a blog post about DeFi trends. Check for grammar, spelling, punctuation, and clarity. Provide your suggestions in the feedback form.',
    creator: 'Crypto Writers DAO', creatorLabel: 'Community',
    platform: 'Google Docs', category: 'Content', difficulty: 'Easy',
    reward: 0.015, rewardCurrency: 'SOL', usdValue: 1.92,
    slots: 40, filled: 18, timeEstimate: '15 min',
    verificationRequired: false, rankRequired: 'None', color: '#16a34a', featured: false,
    instructions: '1. Open the Google Doc link\n2. Read the blog post\n3. Check for errors\n4. Add comments for suggestions\n5. Submit the feedback form',
    requirements: ['Good English skills', 'Basic grammar knowledge', 'Google account'],
    tags: ['writing', 'proofreading', 'content'],
  },
  {
    id: 'job-004', title: 'Video Reaction — Product Review',
    description: 'Watch a 2-minute product demo video and record a 30-second reaction video with your honest feedback.',
    longDescription: 'Watch our 2-minute product demo video and record a 30-second reaction video sharing your honest thoughts.',
    creator: 'DeFi Product XYZ', creatorLabel: 'Protocol',
    platform: 'YouTube', category: 'Video', difficulty: 'Medium',
    reward: 0.08, rewardCurrency: 'SOL', usdValue: 10.24,
    slots: 15, filled: 7, timeEstimate: '30 min',
    verificationRequired: true, rankRequired: 'Silver', color: '#F59E0B', featured: false,
    instructions: '1. Watch the product demo video\n2. Record a 30-sec reaction video\n3. Share your honest feedback\n4. Upload to the submission portal',
    requirements: ['Camera or webcam', 'Microphone', 'YouTube or Google account'],
    tags: ['video', 'review', 'feedback'],
  },
  {
    id: 'job-005', title: 'Community Engagement — Discord Raid',
    description: 'Join the WURK Discord server, say hi in #introductions, and react to the announcement post.',
    longDescription: 'Join our Discord community! Simply join the server, say hi in the #introductions channel, and react to the latest announcement post.',
    creator: 'WURK Community', creatorLabel: 'Community',
    platform: 'Discord', category: 'Social', difficulty: 'Easy',
    reward: 0.01, rewardCurrency: 'SOL', usdValue: 1.28,
    slots: 200, filled: 88, timeEstimate: '5 min',
    verificationRequired: false, rankRequired: 'None', color: '#16a34a', featured: false,
    instructions: '1. Join the Discord server\n2. Go to #introductions\n3. Say hi\n4. React to the announcement\n5. Submit your Discord username',
    requirements: ['Discord account', 'Not already in the server'],
    tags: ['discord', 'community', 'easy'],
  },
  {
    id: 'job-006', title: 'Data Entry — Product Listing',
    description: 'Add product listings to the marketplace. Each requires title, description, price, and category.',
    longDescription: 'Help us populate our marketplace with product listings. Each batch contains 10 products.',
    creator: 'OgaPay Market', creatorLabel: 'Platform',
    platform: 'Web App', category: 'Data', difficulty: 'Hard',
    reward: 0.12, rewardCurrency: 'SOL', usdValue: 15.36,
    slots: 20, filled: 3, timeEstimate: '45 min',
    verificationRequired: true, rankRequired: 'Gold', color: '#DC2626', featured: true,
    instructions: '1. Login to the marketplace dashboard\n2. Open the product listing tool\n3. Add title, description, price, category\n4. Submit for review',
    requirements: ['Attention to detail', 'Basic computer skills'],
    tags: ['data', 'entry', 'listing'],
  },
  {
    id: 'job-007', title: 'Logo Design Contest — AI Agent Brand',
    description: 'Design a logo for an AI agent startup focused on DeFi analytics.',
    longDescription: 'We are looking for a talented designer to create a logo for our AI agent startup.',
    creator: 'Agentic Analytics', creatorLabel: 'Startup',
    platform: 'Figma / PNG', category: 'Design', difficulty: 'Hard',
    reward: 0.25, rewardCurrency: 'SOL', usdValue: 32.00,
    slots: 10, filled: 4, timeEstimate: '2 hours',
    verificationRequired: true, rankRequired: 'Gold', color: '#DC2626', featured: true,
    instructions: '1. Design a logo (Figma, Illustrator, etc.)\n2. Export as PNG/SVG\n3. Write a short description of your design',
    requirements: ['Graphic design skills', 'Figma or Adobe Illustrator'],
    tags: ['design', 'logo', 'contest'],
  },
  {
    id: 'job-008', title: 'Twitter Thread — Crypto Education',
    description: 'Write a 10-tweet thread explaining "What is a Solana Airdrop?" in simple terms.',
    longDescription: 'Write an educational Twitter thread explaining Solana airdrops in simple terms.',
    creator: 'Solana Edu DAO', creatorLabel: 'DAO',
    platform: 'X / Twitter', category: 'Content', difficulty: 'Medium',
    reward: 0.035, rewardCurrency: 'SOL', usdValue: 4.48,
    slots: 25, filled: 11, timeEstimate: '30 min',
    verificationRequired: true, rankRequired: 'Bronze', color: '#F59E0B', featured: false,
    instructions: '1. Research Solana airdrops\n2. Write 10 tweets\n3. Include images and hashtags\n4. Submit the thread link',
    requirements: ['X/Twitter account', 'Good writing skills'],
    tags: ['twitter', 'writing', 'crypto'],
  },
]

const formatAddress = (addr: string) => {
  const initials = addr.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  return initials || '?'
}

// ─── API Fetch ───
async function fetchJobById(id: string) {
  try {
    const token = localStorage.getItem('ogapay_access_token')
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = 'Bearer ' + token

    const res = await fetch(API_BASE + '/tasks/' + id, { headers })
    const json = await res.json()
    if (json.success && json.data) return json.data
    // Try alternative endpoint
    const res2 = await fetch(API_BASE + '/jobs/' + id, { headers })
    const json2 = await res2.json()
    if (json2.success && json2.data) return json2.data
    return null
  } catch {
    return null
  }
}

export default function JobDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [job, setJob] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }

    setLoading(true)
    setApplied(false)
    setApplying(false)

    // Try API first, fallback to sample data
    fetchJobById(id).then(apiJob => {
      if (apiJob) {
        // Map API job to our format
        const mapped = {
          id: apiJob.id || id,
          title: apiJob.title || 'Untitled Job',
          description: apiJob.description || '',
          longDescription: apiJob.longDescription || apiJob.description || '',
          creator: apiJob.poster?.username || apiJob.creator || 'OgaPay',
          creatorLabel: apiJob.poster?.posterProfile?.isVerified ? 'Verified' : 'User',
          platform: apiJob.tags?.[0] || apiJob.platform || 'Web',
          category: apiJob.category || 'General',
          difficulty: apiJob.difficulty || 'Medium',
          reward: Number(apiJob.reward) || 0,
          rewardCurrency: apiJob.currency || 'SOL',
          usdValue: Number(apiJob.usdValue) || 0,
          slots: apiJob.maxWorkers || apiJob.slots || 1,
          filled: apiJob.currentWorkers || apiJob.filled || 0,
          timeEstimate: apiJob.estimatedTime ? apiJob.estimatedTime + ' min' : apiJob.timeEstimate || '—',
          verificationRequired: !!apiJob.proofRequired,
          rankRequired: apiJob.rankRequired || 'None',
          color: apiJob.color || '#7C3AED',
          featured: !!apiJob.featured,
          instructions: apiJob.instructions || '1. Read the task carefully\n2. Complete the required actions\n3. Submit proof of completion',
          requirements: apiJob.requirements || ['Active account'],
          tags: apiJob.tags || [],
        }
        setJob(mapped)
        setLoading(false)
      } else {
        // Fallback to sample data
        const found = sampleJobs.find(j => j.id === id)
        if (found) {
          setJob(found)
        } else {
          // Try finding by title match
          const fuzzy = sampleJobs.find(j =>
            j.title.toLowerCase().includes(id.toLowerCase()) ||
            j.title.toLowerCase().replace(/[^a-z0-9]/g, '-').includes(id.toLowerCase())
          )
          if (fuzzy) {
            setJob(fuzzy)
          } else {
            setJob(null)
          }
        }
        setLoading(false)
      }
    })
  }, [id])

  const handleApply = () => {
    if (!job) return
    setApplying(true)
    setTimeout(() => {
      setApplying(false)
      setApplied(true)
    }, 1200)
  }

  const similarJobs = sampleJobs
    .filter(j => j.id !== id && j.category === job?.category)
    .slice(0, 3)

  if (loading) {
    return (
      <Layout>
        <div className="jd-container">
          <div className="jd-loading">
            <div className="jd-skeleton" style={{ height: 240, marginBottom: 20 }} />
            <div className="jd-skeleton" style={{ height: 80, marginBottom: 12 }} />
            <div className="jd-skeleton" style={{ height: 80, marginBottom: 12 }} />
            <div className="jd-skeleton" style={{ height: 80 }} />
          </div>
        </div>
        <style>{jdStyles}</style>
      </Layout>
    )
  }

  if (!job) {
    return (
      <Layout>
        <div className="jd-container">
          <div className="jd-not-found">
            <i className="ti ti-search-off" />
            <h2>Job Not Found</h2>
            <p>The job you're looking for doesn't exist or has been removed.</p>
            <button className="jd-btn jd-btn-primary" onClick={() => navigate('/tasks')}>
              <i className="ti ti-arrow-left" /> Browse Jobs
            </button>
          </div>
        </div>
        <style>{jdStyles}</style>
      </Layout>
    )
  }

  const progressPct = Math.min(100, Math.round((job.filled / job.slots) * 100))

  return (
    <Layout>
      <div className="jd-container">
        {/* Breadcrumb */}
        <div className="jd-breadcrumb">
          <button className="jd-breadcrumb-link" onClick={() => navigate('/tasks')}>
            <i className="ti ti-arrow-left" /> Jobs
          </button>
          <span className="jd-breadcrumb-sep">/</span>
          <span className="jd-breadcrumb-current">{job.title}</span>
        </div>

        <div className="jd-layout">
          {/* Main Content */}
          <div className="jd-main">
            {/* Hero Section */}
            <div className="jd-hero">
              <div className="jd-hero-top">
                <div className="jd-creator">
                  <div className="jd-avatar">{formatAddress(job.creator)}</div>
                  <div className="jd-creator-info">
                    <div className="jd-creator-name">{job.creator}</div>
                    <div className="jd-creator-label">{job.creatorLabel}</div>
                  </div>
                </div>
                <div className="jd-badges">
                  {job.featured && <span className="jd-badge jd-badge-featured"><i className="ti ti-star" /> Featured</span>}
                  {job.verificationRequired && <span className="jd-badge jd-badge-verified"><i className="ti ti-shield-check" /> Verified</span>}
                </div>
              </div>

              <h1 className="jd-title">{job.title}</h1>

              <div className="jd-meta-row">
                <span className="jd-meta-item"><i className="ti ti-tag" /> {job.category}</span>
                <span className="jd-meta-item"><i className="ti ti-device-laptop" /> {job.platform}</span>
                <span className="jd-meta-item"><i className="ti ti-clock" /> {job.timeEstimate}</span>
                <span className="jd-meta-item"><i className="ti ti-speedometer" /> {job.difficulty}</span>
                {job.rankRequired !== 'None' && (
                  <span className="jd-meta-item"><i className="ti ti-medal" /> {job.rankRequired}</span>
                )}
              </div>

              <div className="jd-reward-card">
                <div className="jd-reward-label">Reward</div>
                <div className="jd-reward-amount">
                  <span className="jd-reward-sym">◎</span>
                  <span className="jd-reward-val">{job.reward}</span>
                  <span className="jd-reward-cur">{job.rewardCurrency}</span>
                </div>
                <div className="jd-reward-usd">≈ ${Number(job.usdValue).toFixed(2)} USD</div>
              </div>
            </div>

            {/* Description */}
            <div className="jd-section">
              <h2 className="jd-section-title">Description</h2>
              <p className="jd-description">{job.longDescription || job.description}</p>
            </div>

            {/* Instructions */}
            {job.instructions && (
              <div className="jd-section">
                <h2 className="jd-section-title">Instructions</h2>
                <div className="jd-instructions">
                  {job.instructions.split('\n').filter(Boolean).map((step: string, i: number) => (
                    <div className="jd-step" key={i}>
                      <span className="jd-step-num">{i + 1}</span>
                      <span className="jd-step-text">{step.replace(/^\d+\.\s*/, '')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Requirements */}
            {job.requirements && job.requirements.length > 0 && (
              <div className="jd-section">
                <h2 className="jd-section-title">Requirements</h2>
                <ul className="jd-req-list">
                  {job.requirements.map((req: string, i: number) => (
                    <li key={i}><i className="ti ti-check" /> {req}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tags */}
            {job.tags && job.tags.length > 0 && (
              <div className="jd-section">
                <div className="jd-tags">
                  {job.tags.map((tag: string, i: number) => (
                    <span className="jd-tag" key={i}>{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Apply Section */}
            <div className="jd-apply-section">
              {applied ? (
                <div className="jd-applied-msg">
                  <i className="ti ti-circle-check" />
                  <div>
                    <strong>Application Submitted!</strong>
                    <p>You will be notified when the creator reviews your application.</p>
                  </div>
                  <button className="jd-btn jd-btn-outline" onClick={() => navigate('/my-tasks')}>
                    View My Tasks
                  </button>
                </div>
              ) : (
                <>
                  <button
                    className={`jd-btn jd-btn-primary jd-btn-apply ${applying ? 'loading' : ''}`}
                    onClick={handleApply}
                    disabled={applying}
                  >
                    {applying ? (
                      <><span className="jd-spinner" /> Applying...</>
                    ) : (
                      <><i className="ti ti-send" /> Apply Now</>
                    )}
                  </button>
                  <p className="jd-apply-note">You'll need to complete the task and submit proof to earn the reward.</p>
                </>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="jd-sidebar">
            <div className="jd-side-card">
              <div className="jd-side-card-title">Progress</div>
              <div className="jd-progress-bar">
                <div className="jd-progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
              <div className="jd-progress-stats">
                <span>{job.filled} filled</span>
                <span>{job.slots} total</span>
                <span>{job.slots - job.filled} left</span>
              </div>
            </div>

            <div className="jd-side-card">
              <div className="jd-side-card-title">Job Info</div>
              <div className="jd-side-stats">
                <div className="jd-side-stat">
                  <span className="jd-side-stat-lbl">Difficulty</span>
                  <span className="jd-side-stat-val" style={{ color: job.color }}>{job.difficulty}</span>
                </div>
                <div className="jd-side-stat">
                  <span className="jd-side-stat-lbl">Category</span>
                  <span className="jd-side-stat-val">{job.category}</span>
                </div>
                <div className="jd-side-stat">
                  <span className="jd-side-stat-lbl">Platform</span>
                  <span className="jd-side-stat-val">{job.platform}</span>
                </div>
                <div className="jd-side-stat">
                  <span className="jd-side-stat-lbl">Time</span>
                  <span className="jd-side-stat-val">{job.timeEstimate}</span>
                </div>
                {job.rankRequired !== 'None' && (
                  <div className="jd-side-stat">
                    <span className="jd-side-stat-lbl">Rank Required</span>
                    <span className="jd-side-stat-val">{job.rankRequired}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="jd-side-card">
              <div className="jd-side-card-title">Creator</div>
              <div className="jd-creator-card">
                <div className="jd-creator-avatar-large">{formatAddress(job.creator)}</div>
                <div>
                  <div className="jd-creator-name-lg">{job.creator}</div>
                  <div className="jd-creator-label-sm">{job.creatorLabel}</div>
                </div>
              </div>
              <button className="jd-btn jd-btn-outline jd-btn-sm jd-btn-full" onClick={() => navigate('/tasks')}>
                <i className="ti ti-user" /> View Profile
              </button>
            </div>

            {similarJobs.length > 0 && (
              <div className="jd-side-card">
                <div className="jd-side-card-title">Similar Jobs</div>
                {similarJobs.map(sj => (
                  <div className="jd-similar-item" key={sj.id} onClick={() => navigate(`/tasks/${sj.id}`)}>
                    <div className="jd-similar-title">{sj.title}</div>
                    <div className="jd-similar-meta">
                      <span>◎ {sj.reward} {sj.rewardCurrency}</span>
                      <span>{sj.timeEstimate}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{jdStyles}</style>
    </Layout>
  )
}

const jdStyles = `
.jd-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px;
}

.jd-breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  font-size: 13px;
}

.jd-breadcrumb-link {
  background: none;
  border: none;
  color: var(--text2);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
  padding: 4px 0;
  transition: color .13s;
}

.jd-breadcrumb-link:hover { color: var(--text); }
.jd-breadcrumb-sep { color: var(--text3); }
.jd-breadcrumb-current {
  color: var(--text);
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 300px;
}

.jd-layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 24px;
  align-items: start;
}

@media (max-width: 900px) {
  .jd-layout { grid-template-columns: 1fr; }
}

.jd-hero {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 24px;
  margin-bottom: 20px;
}

.jd-hero-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 10px;
}

.jd-creator {
  display: flex;
  align-items: center;
  gap: 10px;
}

.jd-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.jd-creator-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
}

.jd-creator-label {
  font-size: 11px;
  color: var(--text2);
  font-weight: 600;
}

.jd-badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.jd-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .03em;
}

.jd-badge-featured {
  background: rgba(245,179,1,.1);
  color: var(--gold, #f5b301);
  border: 1px solid rgba(245,179,1,.18);
}

.jd-badge-verified {
  background: rgba(22,163,74,.08);
  color: var(--green, #16a34a);
  border: 1px solid rgba(22,163,74,.15);
}

.jd-title {
  font-family: Outfit, sans-serif;
  font-size: 24px;
  font-weight: 900;
  margin: 0 0 14px;
  line-height: 1.25;
  color: var(--text);
}

.jd-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 18px;
}

.jd-meta-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 700;
  color: var(--text2);
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px 10px;
}

.jd-meta-item i { font-size: 14px; }

.jd-reward-card {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px 20px;
  display: inline-flex;
  flex-direction: column;
  gap: 4px;
}

.jd-reward-label {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: var(--text3);
}

.jd-reward-amount {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.jd-reward-sym {
  font-size: 20px;
  font-weight: 700;
  color: var(--green, #16a34a);
}

.jd-reward-val {
  font-size: 28px;
  font-weight: 900;
  color: var(--text);
  font-family: Outfit, sans-serif;
}

.jd-reward-cur {
  font-size: 14px;
  font-weight: 700;
  color: var(--text2);
}

.jd-reward-usd {
  font-size: 13px;
  color: var(--text2);
  font-weight: 600;
}

.jd-section {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 20px 24px;
  margin-bottom: 16px;
}

.jd-section-title {
  font-family: Outfit, sans-serif;
  font-size: 17px;
  font-weight: 800;
  margin: 0 0 12px;
  color: var(--text);
}

.jd-description {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text2);
  margin: 0;
}

.jd-instructions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.jd-step {
  display: flex;
  align-items: center;
  gap: 12px;
}

.jd-step-num {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.jd-step-text {
  font-size: 13px;
  color: var(--text2);
  line-height: 1.4;
}

.jd-req-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.jd-req-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text2);
}

.jd-req-list li i {
  color: var(--green, #16a34a);
  font-size: 15px;
  flex-shrink: 0;
}

.jd-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.jd-tag {
  display: inline-flex;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--bg2);
  border: 1px solid var(--border);
  font-size: 11px;
  font-weight: 700;
  color: var(--text2);
}

.jd-apply-section {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 24px;
  margin-bottom: 20px;
}

.jd-btn-apply {
  width: 100%;
  height: 48px;
  font-size: 15px;
}

.jd-apply-note {
  font-size: 12px;
  color: var(--text3);
  margin: 10px 0 0;
  text-align: center;
}

.jd-applied-msg {
  display: flex;
  align-items: center;
  gap: 14px;
  background: rgba(22,163,74,.06);
  border: 1px solid rgba(22,163,74,.15);
  border-radius: 10px;
  padding: 16px 20px;
}

.jd-applied-msg i {
  font-size: 28px;
  color: var(--green, #16a34a);
  flex-shrink: 0;
}

.jd-applied-msg strong {
  display: block;
  font-size: 14px;
  color: var(--text);
  margin-bottom: 2px;
}

.jd-applied-msg p {
  font-size: 12px;
  color: var(--text2);
  margin: 0;
}

.jd-applied-msg .jd-btn {
  margin-left: auto;
  flex-shrink: 0;
}

.jd-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  height: 40px;
  padding: 0 20px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  border: 1.5px solid transparent;
  cursor: pointer;
  transition: all .13s;
  text-decoration: none;
  font-family: inherit;
}

.jd-btn-primary {
  background: var(--accent, #7C3AED);
  color: #fff;
  border-color: var(--accent, #7C3AED);
}

.jd-btn-primary:hover { opacity: .9; }
.jd-btn-primary:disabled { opacity: .5; cursor: not-allowed; }

.jd-btn-outline {
  background: transparent;
  border-color: var(--border);
  color: var(--text);
}

.jd-btn-outline:hover {
  border-color: var(--text2);
  background: var(--bg2);
}

.jd-btn-sm { height: 34px; font-size: 12px; padding: 0 14px; }
.jd-btn-full { width: 100%; }
.jd-btn.loading { pointer-events: none; }

.jd-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: jd-spin .6s linear infinite;
}

@keyframes jd-spin { to { transform: rotate(360deg); } }

.jd-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.jd-side-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 18px 20px;
}

.jd-side-card-title {
  font-size: 13px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: var(--text2);
  margin-bottom: 12px;
}

.jd-progress-bar {
  height: 8px;
  border-radius: 999px;
  background: var(--bg2);
  overflow: hidden;
  border: 1px solid var(--border);
  margin-bottom: 8px;
}

.jd-progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent, #7C3AED), #9333EA);
  transition: width .5s;
}

.jd-progress-stats {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text3);
  font-weight: 600;
}

.jd-side-stats {
  display: flex;
  flex-direction: column;
}

.jd-side-stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px dashed var(--border);
}

.jd-side-stat:last-child { border-bottom: none; }

.jd-side-stat-lbl {
  font-size: 12px;
  font-weight: 600;
  color: var(--text2);
}

.jd-side-stat-val {
  font-size: 12px;
  font-weight: 800;
  color: var(--text);
}

.jd-creator-card {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.jd-creator-avatar-large {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.jd-creator-name-lg { font-size: 14px; font-weight: 800; color: var(--text); }
.jd-creator-label-sm { font-size: 11px; color: var(--text2); font-weight: 600; }

.jd-similar-item {
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: opacity .13s;
}

.jd-similar-item:last-child { border-bottom: none; padding-bottom: 0; }
.jd-similar-item:first-child { padding-top: 0; }
.jd-similar-item:hover { opacity: .75; }

.jd-similar-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.jd-similar-meta {
  display: flex;
  gap: 10px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text2);
}

.jd-loading { padding: 40px 0; }

.jd-skeleton {
  background: var(--bg2);
  border-radius: 10px;
  animation: jd-shimmer 1.5s ease-in-out infinite;
}

@keyframes jd-shimmer {
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
}

.jd-not-found {
  text-align: center;
  padding: 60px 20px;
  color: var(--text3);
}

.jd-not-found i {
  font-size: 48px;
  display: block;
  margin-bottom: 16px;
  color: var(--text3);
}

.jd-not-found h2 {
  font-family: Outfit, sans-serif;
  font-size: 22px;
  font-weight: 900;
  margin: 0 0 8px;
  color: var(--text);
}

.jd-not-found p {
  font-size: 14px;
  color: var(--text2);
  margin: 0 0 20px;
}

@media (max-width: 600px) {
  .jd-container { padding: 16px; }
  .jd-title { font-size: 20px; }
  .jd-hero { padding: 18px; }
  .jd-section { padding: 16px 18px; }
  .jd-apply-section { padding: 18px; }
  .jd-reward-val { font-size: 24px; }
  .jd-side-card { padding: 14px 16px; }
  .jd-breadcrumb-current { max-width: 180px; }
}
`
