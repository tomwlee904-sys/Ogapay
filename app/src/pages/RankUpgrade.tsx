import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../lib/api";
import RankClaimPanel from "../components/RankClaimPanel";

const C = {
  text: "var(--text)", text2: "var(--text2)", text3: "var(--text3)",
  border: "var(--border)", card: "var(--card)", bg2: "var(--bg2)",
  accent: "var(--accent)", green: "var(--green)",
};

const Icon = ({ n, s = 18, c = "currentColor", style }: { n: string; s?: number; c?: string; style?: React.CSSProperties }) => (
  <i className={`ti ti-${n}`} style={{ fontSize: s, color: c, lineHeight: 1, flexShrink: 0, ...style }} />
);

// What each rank unlocks: only what's real (jobs whose minRank needs it; the
// leaderboard shows everyone's rank). Don't promise perks that don't exist.
const TIERS = [
  { level: "BEGINNER", label: "Beginner", icon: "seedling", color: "#9CA3AF", tasks: 0, rating: 0, unlocks: ["Every job without a rank requirement", "Earn in Naira or USDC"] },
  { level: "INTERMEDIATE", label: "Intermediate", icon: "star", color: "#52525b", tasks: 10, rating: 0, unlocks: ["Jobs that need Intermediate rank"] },
  { level: "ADVANCED", label: "Advanced", icon: "flame", color: "#8B5CF6", tasks: 50, rating: 4.0, unlocks: ["Jobs that need Advanced rank or lower"] },
  { level: "EXPERT", label: "Expert", icon: "diamond", color: "#F59E0B", tasks: 200, rating: 4.5, unlocks: ["Jobs that need Expert rank or lower"] },
  { level: "LEGEND", label: "Legend", icon: "crown", color: "#EF4444", tasks: 500, rating: 4.8, unlocks: ["Every job, whatever rank it needs"] },
];

function getTierIndex(level: string) {
  return TIERS.findIndex(t => t.level === level);
}

export default function RankUpgrade() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [leaderRank, setLeaderRank] = useState<number | null>(null);

  const [reload, setReload] = useState(0);
  useEffect(() => {
    // Your rank needs an account; visitors see the tiers
    if (!user) { setLoading(false); return; }
    (async () => {
      try {
        const data = await apiRequest<any>('/leaderboard/me');
        if (data?.profile) {
          setProfile(data.profile);
        }
        if (data?.rank != null) setLeaderRank(data.rank);
      } catch (_) {}
      setLoading(false);
    })();
  }, [user, reload]);

  const currentLevel = profile?.level || 'BEGINNER';
  const currentIdx = getTierIndex(currentLevel);
  const nextTier = TIERS[currentIdx + 1];
  const tasksCompleted = profile?.tasksCompleted || 0;
  const avgRating = profile?.avgRating || 0;
  // The real OgaScore (verified checks), not the internal reputation figure
  const ogaScore = profile?.ogaScore ?? 0;

  // Share of what the next rank needs, kept between 0 and 100 (a negative
  // width used to be ignored by the browser, so the bars looked full)
  const pct = (have: number, need: number) => (need > 0 ? Math.max(0, Math.min(100, Math.round((have / need) * 100))) : 100);
  const progressToNext = nextTier ? pct(tasksCompleted, nextTier.tasks) : 100;
  const ratingProgressToNext = nextTier && nextTier.rating > 0 ? pct(avgRating, nextTier.rating) : 100;

  return (
    <Layout>
      <style>{rankStyles}</style>
      <div className="rank-wrap">
        {/* Header */}
        <div className="rank-header">
          <div className="rank-header-icon">
            <Icon n={TIERS[currentIdx]?.icon || "seedling"} s={36} />
          </div>
          <div>
            <h1 className="rank-title">Rank & Progression</h1>
            <p className="rank-subtitle">
              Complete tasks and maintain high ratings to level up and unlock exclusive opportunities.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="rank-loading">Loading rank data...</div>
        ) : (
          <>
            {/* Current Rank Card */}
            <div className="rank-current-card" style={{ borderLeftColor: TIERS[currentIdx]?.color }}>
              <div className="rank-current-top">
                <div>
                  <div className="rank-current-badge" style={{ background: TIERS[currentIdx]?.color + '20', color: TIERS[currentIdx]?.color }}>
                    <Icon n={TIERS[currentIdx]?.icon || "seedling"} s={16} /> {TIERS[currentIdx]?.label}
                  </div>
                  {leaderRank && <div className="rank-position">#{leaderRank} on Leaderboard</div>}
                </div>
                <div className="rank-stats-row">
                  <div className="rank-stat">
                    <span className="rank-stat-val">{tasksCompleted}</span>
                    <span className="rank-stat-lbl">Tasks Done</span>
                  </div>
                  <div className="rank-stat">
                    <span className="rank-stat-val">{avgRating.toFixed(1)}</span>
                    <span className="rank-stat-lbl">Avg Rating</span>
                  </div>
                  <div className="rank-stat">
                    <span className="rank-stat-val">{ogaScore}</span>
                    <span className="rank-stat-lbl">OgaScore</span>
                  </div>
                </div>
              </div>

              {nextTier && (
                <div className="rank-next-section">
                  <div className="rank-next-label">
                    Next: <strong style={{ color: nextTier.color }}><Icon n={nextTier.icon} s={14} /> {nextTier.label}</strong>
                  </div>
                  <div className="rank-progress-group">
                    <div className="rank-progress-row">
                      <span className="rank-progress-label">Tasks ({tasksCompleted}/{nextTier.tasks})</span>
                      <div className="rank-progress-bar">
                        <div className="rank-progress-fill" style={{ width: `${Math.min(progressToNext, 100)}%`, background: nextTier.color }} />
                      </div>
                    </div>
                    {nextTier.rating > 0 && (
                      <div className="rank-progress-row">
                        <span className="rank-progress-label">Rating ({avgRating.toFixed(1)}/{nextTier.rating})</span>
                        <div className="rank-progress-bar">
                          <div className="rank-progress-fill" style={{ width: `${Math.min(ratingProgressToNext, 100)}%`, background: nextTier.color }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Claim a new rank (rules, review) and the X score: signed in only */}
            {user && <RankClaimPanel onRankChanged={() => setReload((n) => n + 1)} />}

            {/* All Tiers */}
            <div className="rank-tiers-title">All Ranks</div>
            <div className="rank-tiers-list">
              {TIERS.map((tier, i) => {
                const isUnlocked = i <= currentIdx;
                const isCurrent = i === currentIdx;
                return (
                  <div key={tier.level} className={`rank-tier-card ${isCurrent ? 'current' : ''} ${isUnlocked ? 'unlocked' : 'locked'}`}
                    style={{ borderColor: isCurrent ? tier.color : 'var(--border)' }}>
                    <div className="rank-tier-left">
                      <div className="rank-tier-icon" style={{ background: isUnlocked ? tier.color + '20' : 'var(--bg2)' }}>
                        {isUnlocked ? <Icon n={tier.icon} s={20} /> : <Icon n="lock" s={20} />}
                      </div>
                      <div>
                        <div className="rank-tier-name" style={{ color: isUnlocked ? tier.color : 'var(--text3)' }}>
                          {tier.label}
                        </div>
                        <div className="rank-tier-reqs">
                          {tier.tasks > 0 ? `${tier.tasks}+ tasks` : 'No minimum tasks'}
                          {tier.rating > 0 ? `  \u2022  ${tier.rating}+ avg rating` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="rank-tier-right">
                      {isCurrent && <div className="rank-current-tag">Current</div>}
                      {isUnlocked && !isCurrent && <div className="rank-unlocked-tag">Unlocked</div>}
                      {!isUnlocked && <div className="rank-locked-tag">Locked</div>}
                    </div>
                    {isUnlocked && (
                      <div className="rank-tier-unlocks">
                        {tier.unlocks.map((u, j) => (
                          <span key={j} className="rank-unlock-item">{u}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Rank Info */}
            <div className="rank-info-card">
              <h3>How Ranking Works</h3>
              <p>Do good work, get rated, and when you meet the next rank's needs, claim it on this page. You agree to the rules when you claim; most people get their new rank at once, and some accounts are checked by our team first (usually within 24–48 hours). You move up one rank at a time.</p>
              <ul>
                <li><strong>Tasks done</strong>: jobs you were paid for</li>
                <li><strong>Avg rating</strong>: the average of the stars posters gave you (1–5)</li>
                <li><strong>OgaScore</strong>: your trust score from checks we verified (connected accounts, ID and Human verification), out of 66</li>
              </ul>
              <p className="rank-info-note">Job posters can choose the rank a job needs, so higher ranks open up jobs that only experienced people can take.</p>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

const rankStyles = `
.rank-wrap { max-width: 680px; margin: 0 auto; padding: 32px 20px 80px; }
.rank-header { display: flex; align-items: center; gap: 16px; margin-bottom: 28px; }
.rank-header-icon { width: 56px; height: 56px; display: grid; place-items: center; background: var(--bg2); border-radius: 14px; flex-shrink: 0; }
.rank-title { font-size: 24px; font-weight: 900; margin: 0 0 4px; color: var(--text); font-family: 'Inter', sans-serif; }
.rank-subtitle { font-size: 13px; color: var(--text2); margin: 0; line-height: 1.5; }
.rank-loading { text-align: center; padding: 60px 0; color: var(--text2); font-size: 14px; }

.rank-current-card { background: var(--card); border: 1px solid var(--border); border-left: 4px solid; border-radius: 14px; padding: 24px; margin-bottom: 24px; }
.rank-current-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
.rank-current-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 20px; font-size: 14px; font-weight: 800; margin-bottom: 6px; }
.rank-position { font-size: 12px; color: var(--text2); font-weight: 600; }
.rank-stats-row { display: flex; gap: 20px; }
.rank-stat { text-align: center; }
.rank-stat-val { display: block; font-size: 20px; font-weight: 900; color: var(--text); }
.rank-stat-lbl { font-size: 11px; color: var(--text3); font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }

.rank-next-section { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border); }
.rank-next-label { font-size: 13px; color: var(--text2); margin-bottom: 12px; }
.rank-progress-group { display: flex; flex-direction: column; gap: 10px; }
.rank-progress-row { display: flex; align-items: center; gap: 12px; }
.rank-progress-label { font-size: 11px; color: var(--text3); font-weight: 600; min-width: 130px; flex-shrink: 0; }
.rank-progress-bar { flex: 1; height: 6px; background: var(--border); border-radius: 99px; overflow: hidden; }
.rank-progress-fill { height: 100%; border-radius: 99px; transition: width 0.6s ease; }

.rank-tiers-title { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text2); margin-bottom: 14px; }
.rank-tiers-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px; }
.rank-tier-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 16px; display: flex; flex-wrap: wrap; align-items: center; gap: 12px; transition: all 0.2s; }
.rank-tier-card.current { border-width: 2px; }
.rank-tier-card.locked { opacity: 0.55; }
.rank-tier-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 160px; }
.rank-tier-icon { width: 40px; height: 40px; border-radius: 10px; display: grid; place-items: center; flex-shrink: 0; }
.rank-tier-name { font-size: 15px; font-weight: 800; margin-bottom: 2px; }
.rank-tier-reqs { font-size: 11px; color: var(--text3); }
.rank-tier-right { flex-shrink: 0; }
.rank-current-tag { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: var(--accent); padding: 3px 10px; border-radius: 20px; background: color-mix(in srgb, var(--accent) 8%, transparent); }
.rank-unlocked-tag { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: var(--green); padding: 3px 10px; border-radius: 20px; background: color-mix(in srgb, var(--green) 8%, transparent); }
.rank-locked-tag { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text3); }

.rank-tier-unlocks { width: 100%; display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; padding-top: 10px; border-top: 1px solid var(--border); }
.rank-unlock-item { font-size: 11px; color: var(--text2); padding: 3px 10px; border-radius: 6px; background: var(--bg2); border: 1px solid var(--border); }

.rank-info-card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 20px; }
.rank-info-card h3 { font-size: 15px; font-weight: 800; margin: 0 0 10px; color: var(--text); font-family: 'Inter', sans-serif; }
.rank-info-card p { font-size: 13px; color: var(--text2); line-height: 1.6; margin: 0 0 12px; }
.rank-info-card ul { margin: 0 0 12px; padding-left: 18px; }
.rank-info-card li { font-size: 13px; color: var(--text2); line-height: 1.8; }
.rank-info-card li strong { color: var(--text); }
.rank-info-note { font-size: 12px; color: var(--text3); font-style: italic; margin: 0 !important; }
@media(max-width:480px) {
  .rank-wrap { padding: 16px 12px 72px; }
  .rank-header-icon { width: 44px; height: 44px; }
  .rank-title { font-size: 20px; }
  .rank-stats-row { gap: 12px; }
  .rank-stat-val { font-size: 16px; }
  .rank-current-card { padding: 16px; }
  .rank-current-top { flex-direction: column; }
  .rank-progress-label { min-width: 100px; font-size: 11px; }
  .rank-tier-card { padding: 12px; }
}
`;
