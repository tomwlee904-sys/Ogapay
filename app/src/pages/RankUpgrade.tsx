import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../lib/api";
import RankClaimPanel from "../components/RankClaimPanel";
import LoadError from "../components/LoadError";
import { openSignIn } from "../lib/signin";
import "../styles/legal.css";

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
// raters: how many different job posters must have rated your work (the
// server's rank rules), so a few friendly ratings can't lift a rank
const TIERS = [
  { level: "BEGINNER", label: "Beginner", icon: "seedling", color: "#9CA3AF", tasks: 0, rating: 0, raters: 0, unlocks: ["Every job without a rank requirement", "Earn in Naira or USDC"] },
  { level: "INTERMEDIATE", label: "Intermediate", icon: "star", color: "#52525b", tasks: 10, rating: 0, raters: 0, unlocks: ["Jobs that need Intermediate rank"] },
  { level: "ADVANCED", label: "Advanced", icon: "flame", color: "#8B5CF6", tasks: 50, rating: 4.0, raters: 5, unlocks: ["Jobs that need Advanced rank or lower"] },
  { level: "EXPERT", label: "Expert", icon: "diamond", color: "#F59E0B", tasks: 200, rating: 4.5, raters: 20, unlocks: ["Jobs that need Expert rank or lower"] },
  { level: "LEGEND", label: "Legend", icon: "crown", color: "#EF4444", tasks: 500, rating: 4.8, raters: 50, unlocks: ["Every job, whatever rank it needs"] },
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
  // A failed load is not "Beginner with 0 tasks": say so and offer Try again
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    // Your rank needs an account; visitors see the tiers
    if (!user) { setLoading(false); return; }
    setFailed(false);
    (async () => {
      try {
        const data = await apiRequest<any>('/leaderboard/me');
        if (data?.profile) {
          setProfile(data.profile);
        }
        if (data?.rank != null) setLeaderRank(data.rank);
      } catch (_) { setFailed(true); }
      setLoading(false);
    })();
  }, [user, reload]);

  const currentLevel = profile?.level || 'BEGINNER';
  const currentIdx = getTierIndex(currentLevel);
  const nextTier = TIERS[currentIdx + 1];
  const tasksCompleted = profile?.tasksCompleted || 0;
  const avgRating = profile?.avgRating || 0;
  // The rating the ranks check: each poster's ratings averaged first, so one
  // poster who rated many jobs counts once (older servers don't send it)
  const rankRating = Number(profile?.rankRating ?? avgRating);
  // Different job posters who rated your work
  const ratedBy = Number(profile?.ratedBy || 0);
  // The real OgaScore (verified checks), not the internal reputation figure
  const ogaScore = profile?.ogaScore ?? 0;

  // Share of what the next rank needs, kept between 0 and 100 (a negative
  // width used to be ignored by the browser, so the bars looked full)
  const pct = (have: number, need: number) => (need > 0 ? Math.max(0, Math.min(100, Math.round((have / need) * 100))) : 100);
  const progressToNext = nextTier ? pct(tasksCompleted, nextTier.tasks) : 100;
  const ratingProgressToNext = nextTier && nextTier.rating > 0 ? pct(rankRating, nextTier.rating) : 100;
  const ratersProgressToNext = nextTier && nextTier.raters > 0 ? pct(ratedBy, nextTier.raters) : 100;

  const tier = TIERS[currentIdx] || TIERS[0];

  const yourRank = !user ? (
    <div className="ui-card rank-card rank-signin">
      <h2>See your rank</h2>
      <p>Ranks open better-paid jobs. Sign in to see your rank, track your progress and claim the next one.</p>
      <button type="button" className="ui-btn ui-btn-dark" onClick={() => openSignIn({ redirect: "/rank" })}>Sign in</button>
    </div>
  ) : loading ? (
    <div className="ui-card rank-card"><div className="ui-sk" style={{ height: 140 }} /></div>
  ) : failed ? (
    <LoadError what="your rank" onRetry={() => { setLoading(true); setReload((n) => n + 1); }} />
  ) : (
    <>
      <div className="ui-card rank-card">
        <div className="rank-current-top">
          <span className="rank-tile" style={{ ["--tier" as any]: tier.color }}><Icon n={tier.icon} s={20} /></span>
          <div>
            <div className="rank-current-name">{tier.label}</div>
            {leaderRank && <div className="rank-position">#{leaderRank} on the leaderboard</div>}
          </div>
        </div>
        <div className="rank-stats-row">
          <div className="rank-stat"><span className="rank-stat-val">{tasksCompleted}</span><span className="rank-stat-lbl">Tasks done</span></div>
          <div className="rank-stat"><span className="rank-stat-val">{avgRating.toFixed(1)}</span><span className="rank-stat-lbl">Avg rating</span></div>
          <div className="rank-stat"><span className="rank-stat-val">{ogaScore}</span><span className="rank-stat-lbl">OgaScore</span></div>
        </div>

        {nextTier && (
          <div className="rank-next-section">
            <div className="rank-next-label">Next: <strong><Icon n={nextTier.icon} s={14} /> {nextTier.label}</strong></div>
            <div className="rank-progress-group">
              <div className="rank-progress-row">
                <span className="rank-progress-label">Tasks ({tasksCompleted}/{nextTier.tasks})</span>
                <div className="rank-progress-bar"><div className="rank-progress-fill" style={{ width: `${Math.min(progressToNext, 100)}%` }} /></div>
              </div>
              {nextTier.rating > 0 && (
                <div className="rank-progress-row">
                  <span className="rank-progress-label">Rating ({rankRating.toFixed(1)}/{nextTier.rating})</span>
                  <div className="rank-progress-bar"><div className="rank-progress-fill" style={{ width: `${Math.min(ratingProgressToNext, 100)}%` }} /></div>
                </div>
              )}
              {nextTier.raters > 0 && (
                <div className="rank-progress-row">
                  <span className="rank-progress-label">Rated by {nextTier.raters} different job posters (you have {ratedBy})</span>
                  <div className="rank-progress-bar"><div className="rank-progress-fill" style={{ width: `${Math.min(ratersProgressToNext, 100)}%` }} /></div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {/* Claim a new rank (rules, review) and the X score */}
      <RankClaimPanel onRankChanged={() => setReload((n) => n + 1)} />
    </>
  );

  // Visitors (and a failed load) see the ladder without a "Current" tag
  const known = !!user && !loading && !failed;

  return (
    <Layout>
      <style>{rankStyles}</style>
      <div className="ui-page">
        <header>
          <span className="ui-eyebrow"><i className="ti ti-trophy" /> Ranks</span>
          <h1 className="ui-title">Ranks</h1>
          <p className="ui-sub">Do good work and get rated to move up. Higher ranks open jobs that only experienced people can take.</p>
        </header>

        <div className="rank-grid">
          <aside className="rank-side">{yourRank}</aside>

          <div className="rank-main">
            <h2 className="rank-tiers-title">All ranks</h2>
            <div className="ui-card rank-tiers-list">
              {TIERS.map((t, i) => {
                const isCurrent = known && i === currentIdx;
                const isUnlocked = known && i <= currentIdx;
                return (
                  <div key={t.level} className={`rank-tier${isCurrent ? " current" : ""}`}>
                    <span className="rank-tile" style={{ ["--tier" as any]: t.color }}><Icon n={t.icon} s={18} /></span>
                    <div className="rank-tier-body">
                      <div className="rank-tier-name">
                        {t.label}
                        {isCurrent && <span className="rank-tag current">Your rank</span>}
                        {isUnlocked && !isCurrent && <span className="rank-tag ok">Unlocked</span>}
                        {known && !isUnlocked && <span className="rank-tag"><Icon n="lock" s={12} /> Locked</span>}
                      </div>
                      <div className="rank-tier-reqs">
                        {t.tasks > 0 ? `${t.tasks}+ tasks` : "No minimum tasks"}
                        {t.rating > 0 ? ` \u2022 ${t.rating}+ avg rating` : ""}
                        {t.raters > 0 ? ` \u2022 rated by ${t.raters}+ different job posters` : ""}
                      </div>
                      <div className="rank-tier-unlocks">Unlocks: {t.unlocks.join(" \u00b7 ")}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="ui-card rank-info-card lg-prose">
              <h2>How ranking works</h2>
              <p>Do good work, get rated, and when you meet the next rank's needs, claim it on this page. You agree to the rules when you claim; most people get their new rank at once, and some accounts are checked by our team first (usually within 24–48 hours). You move up one rank at a time.</p>
              <ul>
                <li><strong>Tasks done</strong>: jobs you were paid for</li>
                <li><strong>Avg rating</strong>: the average of the stars posters gave you (1–5)</li>
                <li><strong>Different job posters</strong>: higher ranks need ratings from a number of different posters (Advanced 5, Expert 20, Legend 50), not just one or two</li>
                <li><strong>OgaScore</strong>: your trust score from checks we verified (connected accounts, ID and Human verification), out of 66</li>
              </ul>
              <p className="rank-info-note">Job posters can choose the rank a job needs, so higher ranks open up jobs that only experienced people can take.</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

const rankStyles = `
/* Mobile and tablet: your rank first, then the ladder. Desktop: the ladder on the
   left and your rank in a side panel that stays in view. */
.rank-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; margin-top: 28px; align-items: start; }
.rank-side { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.rank-main { min-width: 0; }
@media (min-width: 1024px) {
  .rank-grid { grid-template-columns: minmax(0, 1fr) 380px; gap: 24px; }
  .rank-side { order: 2; position: sticky; top: calc(var(--nav-h) + 16px); }
}
.rank-card { padding: 20px; }
.rank-signin h2 { margin: 0 0 6px; font-size: 17px; font-weight: 600; color: var(--text); }
.rank-signin p { margin: 0 0 14px; font-size: 14px; line-height: 1.6; color: var(--text2); }
/* tier colour only on the icon tile, never as text */
.rank-tile { width: 40px; height: 40px; border-radius: 11px; display: grid; place-items: center; flex-shrink: 0; color: var(--text); background: color-mix(in srgb, var(--tier) 20%, var(--card)); border: 1px solid color-mix(in srgb, var(--tier) 45%, var(--border)); }
.rank-current-top { display: flex; align-items: center; gap: 12px; }
.rank-current-name { font-size: 18px; font-weight: 600; color: var(--text); }
.rank-position { font-size: 13px; color: var(--text2); margin-top: 2px; }
.rank-stats-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); margin-top: 16px; border: 1px solid var(--border); border-radius: var(--r-md); overflow: hidden; }
.rank-stat { padding: 10px 12px; border-left: 1px solid var(--border); }
.rank-stat:first-child { border-left: 0; }
.rank-stat-val { display: block; font-size: 20px; font-weight: 600; color: var(--text); }
.rank-stat-lbl { font-size: 12px; color: var(--text2); }
.rank-next-section { margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--border); }
.rank-next-label { font-size: 13.5px; color: var(--text2); margin-bottom: 12px; }
.rank-next-label strong { color: var(--text); }
.rank-progress-group { display: flex; flex-direction: column; gap: 12px; }
.rank-progress-row { display: flex; flex-direction: column; gap: 6px; }
.rank-progress-label { font-size: 12.5px; color: var(--text2); line-height: 1.4; }
.rank-progress-bar { height: 6px; background: var(--card2); border: 1px solid var(--border); border-radius: 99px; overflow: hidden; }
.rank-progress-fill { height: 100%; border-radius: 99px; background: var(--green); transition: width 0.6s ease; }

.rank-tiers-title { margin: 0 0 12px; font: 500 var(--fs-label)/1.4 var(--font-mono); letter-spacing: .08em; text-transform: uppercase; color: var(--text2); }
.rank-tiers-list { overflow: hidden; margin-bottom: 20px; }
.rank-tier { display: flex; gap: 14px; padding: 16px 18px; border-top: 1px solid var(--border); }
.rank-tier:first-child { border-top: 0; }
.rank-tier.current { background: var(--card2); }
.rank-tier-body { min-width: 0; flex: 1; }
.rank-tier-name { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 15.5px; font-weight: 600; color: var(--text); }
.rank-tag { display: inline-flex; align-items: center; gap: 4px; height: 22px; padding: 0 8px; border-radius: var(--r-pill); font-size: 12px; font-weight: 500; color: var(--text2); border: 1px solid var(--border); }
.rank-tag.current { background: var(--text); color: var(--bg); border-color: var(--text); }
.rank-tag.ok { color: var(--green); border-color: color-mix(in srgb, var(--green) 40%, var(--border)); }
.rank-tier-reqs { margin-top: 4px; font-size: 13px; line-height: 1.5; color: var(--text2); }
.rank-tier-unlocks { margin-top: 4px; font-size: 13px; line-height: 1.5; color: var(--text); }

.rank-info-card { padding: 20px; }
.rank-info-card h2 { font-size: 16px; font-weight: 600; margin: 0 0 10px; color: var(--text); }
.rank-info-card p, .rank-info-card li { font-size: 14px; color: var(--text2); line-height: 1.6; }
.rank-info-card p { margin: 0 0 10px; }
.rank-info-card li strong { color: var(--text); }
.rank-info-note { font-size: 13px !important; margin: 0 !important; }
@media (max-width: 767.98px) {
  .rank-grid { margin-top: 20px; }
  .rank-card, .rank-info-card { padding: 16px; }
  .rank-tier { padding: 14px 16px; }
}
`;
