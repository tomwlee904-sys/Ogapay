import { useState, useEffect, useRef } from 'react'
import { apiRequest } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { SkeletonStats, SkeletonPage, injectSkeletonStyles } from "../components/SkeletonLoader";

function InfoBtn({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  return (
    <span ref={ref} style={{ position: "relative", display: "inline-flex", marginLeft: 4, verticalAlign: "middle" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={(e) => { e.stopPropagation(); setShow(s => !s) }}>
      <i className="ti ti-info-circle" style={{ fontSize: 12, color: "var(--text3)", cursor: "pointer" }} />
      {show && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: "50%",
          transform: "translateX(-50%)", background: "var(--text)", color: "var(--card)",
          fontSize: 11, lineHeight: 1.5, padding: "6px 10px", borderRadius: 8,
          whiteSpace: "normal", width: 240, zIndex: 99, pointerEvents: "none",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
        }}>
          {text}
        </div>
      )}
    </span>
  );
}

function formatTimeAgo(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return '1 week ago'
  return date.toLocaleDateString()
}

export default function TabReferralsContent() {
  const { user } = useAuth()
  const { user: authUser } = useAuth()
  const [copied, setCopied] = useState(false)
  const [stats, setStats] = useState<any>(null)
  const [referrals, setReferrals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, txData] = await Promise.all([
          apiRequest<any>('/users/referrals/stats').catch(() => null),
          apiRequest<any>('/users/transactions/history?type=REFERRAL_BONUS').catch(() => null),
        ])
        if (statsData) setStats(statsData)
        if (txData) {
          const list = Array.isArray(txData) ? txData : txData?.data ?? txData?.transactions ?? []
          setReferrals(list.filter((t: any) => t.type === 'REFERRAL_BONUS'))
        }
      } catch (e: any) { console.error(e) }
      setLoading(false)
    }
    fetchData()
    const onFocus = () => fetchData()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [authUser?.id])


  const totalReferrals = stats?.totalReferrals ?? stats?.total ?? referrals.length
  const rewardedReferrals = stats?.rewardedReferrals ?? 0
  const referralTier = stats?.referralTier ?? null
  const totalEarned = stats?.totalEarnings ?? stats?.earnings ?? 0
  const monthEarned = stats?.monthEarnings ?? stats?.month ?? 0
  const refCode = user?.referralCode || stats?.referralCode || ''
  const refUrl = refCode ? `${window.location.origin}/ref/${refCode}` : `${window.location.origin}/ref/your-code`

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(refUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e: any) { console.error(e) }
  }

  return (
    <>
      <style>{`
        .rf-hero{margin-bottom:20px}
        .rf-hero .rf-greeting{color:var(--text2);font-size:13px;font-weight:600;margin-bottom:2px}
        .rf-hero h1{font-family:Outfit;font-size:28px;font-weight:900;margin:0 0 4px}
        .rf-hero p{color:var(--text2);font-size:14px;margin:0}
        .rf-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px}
        @media(max-width:500px){.rf-stats{grid-template-columns:1fr}}
        .rf-stat{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center;transition:all .25s}
        .rf-stat:hover{transform:translateY(-2px);border-color:var(--accent)}
        .rf-stat i{font-size:24px;margin-bottom:6px;display:block}
        .rf-stat .rf-num{font-family:Outfit;font-size:24px;font-weight:900}
        .rf-stat .rf-label{font-size:12px;color:var(--text2);margin-top:2px}
        .rf-ref-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:20px 24px;margin-bottom:20px;transition:all .25s}
        .rf-ref-card:hover{border-color:var(--border2)}
        .rf-ref-title{font-weight:700;font-size:15px;margin-bottom:4px}
        .rf-ref-desc{font-size:13px;color:var(--text2);margin-bottom:12px}
        .rf-ref-row{display:flex;gap:8px}
        .rf-ref-row input{flex:1;height:38px;padding:0 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg2);color:var(--text);font-size:13px;outline:0}
        .rf-ref-row input:focus{border-color:var(--accent)}
        .rf-ref-row button{height:38px;padding:0 16px;border-radius:8px;font-weight:700;font-size:12px;display:inline-flex;align-items:center;gap:5px;cursor:pointer;border:0;background:var(--accent);color:#fff;transition:all .2s}
        .rf-ref-row button:hover{box-shadow:0 4px 16px rgba(var(--accent-rgb),.25)}
        .rf-list{display:grid;gap:6px}
        .rf-item{display:flex;align-items:center;gap:14px;padding:12px 16px;background:var(--card);border:1px solid var(--border);border-radius:10px;transition:all .2s}
        .rf-item:hover{border-color:var(--border2)}
        .rf-avatar{width:36px;height:36px;border-radius:50%;background:var(--bg2);display:grid;place-items:center;flex-shrink:0;font-size:16px;color:var(--text3)}
        .rf-info{flex:1;min-width:0}
        .rf-name{font-weight:700;font-size:13px;margin-bottom:1px}
        .rf-date{font-size:11px;color:var(--text3)}
        .rf-earn{font-weight:700;font-size:13px;color:var(--green);white-space:nowrap}
        .rf-empty{text-align:center;padding:48px 20px;color:var(--text2)}
        .rf-empty i{font-size:36px;color:var(--text3);margin-bottom:12px;display:block}
      `}</style>

      <div className="rf-hero">
        <div className="rf-greeting">Earn by sharing</div>
        <h1>Referrals</h1>
        <p>Invite friends and earn rewards when they join OgaPay</p>
      </div>

      
      {/* Referral Tier Badge */}
      {!loading && (() => {
        const tierConfigs = {
          bronze: { icon: "ti ti-medal", label: "Bronze", color: "#CD7F32", bg: "rgba(205,127,50,0.08)", border: "rgba(205,127,50,0.2)" },
          silver: { icon: "ti ti-medal-2", label: "Silver", color: "#A8A8A8", bg: "rgba(168,168,168,0.08)", border: "rgba(168,168,168,0.2)" },
          gold:   { icon: "ti ti-medal", label: "Gold", color: "#F5A623", bg: "rgba(245,166,35,0.08)", border: "rgba(245,166,35,0.2)" },
        };
        const tc = referralTier ? tierConfigs[referralTier as keyof typeof tierConfigs] : null;

        let nextLabel = "";
        let progress = 0;
        if (!referralTier) {
          progress = Math.min(rewardedReferrals / 5, 1);
          nextLabel = rewardedReferrals >= 5 ? "" : rewardedReferrals + "/5 to Bronze";
        } else if (referralTier === "bronze") {
          progress = Math.min((rewardedReferrals - 5) / 5, 1);
          nextLabel = rewardedReferrals >= 10 ? "" : rewardedReferrals + "/10 to Silver";
        } else if (referralTier === "silver") {
          progress = Math.min((rewardedReferrals - 10) / 10, 1);
          nextLabel = rewardedReferrals >= 20 ? "" : rewardedReferrals + "/20 to Gold";
        } else if (referralTier === "gold") {
          progress = 1;
          nextLabel = "Max tier reached!";
        }

        return (
          <div style={{
            background: "var(--card)", border: "1px solid var(--border)",
            borderRadius: 14, padding: "16px 20px", marginBottom: 20,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: tc?.bg || "var(--bg2)",
                display: "grid", placeItems: "center", fontSize: 20, flexShrink: 0,
              }}>
                {tc?.icon || "ti ti-clipboard-list"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
                  {tc ? tc.icon + " " + tc.label + " Referrer" : "Referral Tier"}<InfoBtn text="Your referral tier is based on how many of your referred users have completed their first task. Bronze: 5+ paid referrals, Silver: 10+, Gold: 20 (max)." />
                </div>
                <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 2 }}>
                  {nextLabel || "Earn paid referrals to unlock tiers"}
                </div>
              </div>
              {tc && (
                <div style={{
                  fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 20,
                  background: tc.bg, color: tc.color, border: "1px solid " + tc.border,
                }}>
                  {tc.label}
                </div>
              )}
            </div>
            {referralTier !== "gold" && (
              <div style={{
                width: "100%", height: 6, borderRadius: 3,
                background: "var(--bg2)", overflow: "hidden",
              }}>
                <div style={{
                  width: (progress * 100) + "%", height: "100%", borderRadius: 3,
                  background: tc?.color || "var(--accent)",
                  transition: "width 0.4s ease",
                }} />
              </div>
            )}
            {referralTier === "gold" && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["Bronze", "Silver", "Gold"].map((t, i) => (
                  <div key={t} style={{
                    fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 12,
                    background: i < 2 ? "rgba(34,197,94,0.1)" : tc!.bg,
                    color: i < 2 ? "#16A34A" : tc!.color,
                    border: "1px solid " + (i < 2 ? "rgba(34,197,94,0.2)" : tc!.border),
                  }}>
                    {<i className={["ti ti-medal","ti ti-medal-2","ti ti-medal"][i]} />} {t}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

<div className="rf-stats">
        {[
          { icon: 'ti ti-users', color: 'var(--accent)', count: String(totalReferrals), label: 'Total Referrals' },
          { icon: 'ti ti-coin', color: 'var(--green)', count: `₦${Number(totalEarned).toLocaleString()}`, label: 'Total Earned' },
          { icon: 'ti ti-trending-up', color: 'var(--accent)', count: `₦${Number(monthEarned).toLocaleString()}`, label: 'This Month' },
        ].map((s, i) => (
          <div className="rf-stat" key={i}>
            <i className={s.icon} style={{color: s.color}} />
            <div className="rf-num" style={{color: s.color}}>{s.count}</div>
            <div className="rf-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="rf-ref-card">
        <div className="rf-ref-title"><i className="ti ti-link" style={{color:'var(--accent)',marginRight:6}} />Your Referral Link</div>
        <div className="rf-ref-desc">Share this link with friends — you earn when they sign up and complete tasks</div>
        <div className="rf-ref-row">
          <input type="text" value={refUrl} readOnly />
          <button onClick={copyLink}>{copied ? 'Copied!' : 'Copy Link'}</button>
        </div>
      </div>

      <div style={{fontFamily:'Outfit',fontSize:15,fontWeight:800,marginBottom:12}}>
        <i className="ti ti-list" style={{color:'var(--accent)',marginRight:6}} />Referral History
      </div>

      {loading ? (
        <SkeletonPage />
      ) : referrals.length === 0 ? (
        <div className="rf-empty">
          <i className="ti ti-users" />
          <h3 style={{fontFamily:'Outfit',fontWeight:800,margin:'0 0 4px',color:'var(--text)'}}>No referrals yet</h3>
          <p style={{fontSize:13,margin:0}}>Share your link to start earning</p>
        </div>
      ) : (
        <div className="rf-list">
          {referrals.map((r, i) => (
            <div className="rf-item" key={i}>
              <div className="rf-avatar"><i className="ti ti-user" /></div>
              <div className="rf-info">
                <div className="rf-name">{r.description || 'Referred User'}</div>
                <div className="rf-date">{formatTimeAgo(r.createdAt || r.date)}</div>
              </div>
              <div className="rf-earn">+₦{Number(r.amount || 0).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
