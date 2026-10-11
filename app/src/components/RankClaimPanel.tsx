import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import InfoTip from './InfoTip'
import { apiRequest } from '../lib/api'
import { useToast } from './Toast'

/* On the Rank page (/rank, pages/RankUpgrade.tsx), for signed-in people:
   - "Claim your new rank" with the rules, once you qualify (backend
     services/rank.service.js), or where your claim stands;
   - your X score and what it's made of (services/xscore.service.js).
   Progress towards the next rank is shown by the page itself. */

type Claim = { status: string; toLevelName: string; note?: string | null }
type RankStatus = {
  levelName: string; next: { name: string } | null
  canClaim: boolean; claimAgainFrom?: string | null; claim: Claim | null; rules: string[]
}
type XScore = { connected: boolean; score: number; parts: { key: string; label: string; points: number; max: number }[] }

const day = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export default function RankClaimPanel({ onRankChanged }: { onRankChanged?: () => void }) {
  const { toast } = useToast()
  const [data, setData] = useState<{ rank: RankStatus; x: XScore } | null>(null)
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const load = () => apiRequest<{ rank: RankStatus; x: XScore }>('/scores/me').then(setData).catch(() => {})
  useEffect(() => { load() }, [])

  const claim = async () => {
    setBusy(true); setMsg(null)
    try {
      const r = await apiRequest<{ status: string; message: string }>('/scores/rank/claim', { method: 'POST', body: JSON.stringify({ agree: true }) })
      setMsg({ ok: true, text: r.message })
      if (r.status === 'APPROVED') { toast(r.message, 'success'); onRankChanged?.() }
      setAgree(false); await load()
    } catch (e: any) { setMsg({ ok: false, text: e?.message || "Couldn't claim your rank" }) }
    setBusy(false)
  }

  if (!data) return null
  const { rank: r, x } = data
  const pending = r.claim?.status === 'PENDING'
  const rejected = r.claim?.status === 'REJECTED' && !!r.claimAgainFrom

  return (
    <div className="rcp">
      <style>{`
        .rcp{display:grid;gap:14px;margin:16px 0}
        .rcp-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:18px 20px}
        .rcp-card h2{margin:0 0 4px;font-size:16px;font-weight:600;display:flex;align-items:center;gap:4px}
        .rcp-sub{margin:0;font-size:13.5px;color:var(--text2);line-height:1.55}
        .rcp-claim{border-color:var(--text)}
        .rcp-rules{margin:10px 0 0;padding-left:20px;list-style:decimal;font-size:14px;line-height:1.6}
        .rcp-check{display:flex;gap:10px;align-items:flex-start;margin:14px 0;font-size:14px;cursor:pointer;line-height:1.45}
        .rcp-check input{width:18px;height:18px;margin-top:1px;flex-shrink:0}
        .rcp-note{margin:10px 0 0;padding:10px 12px;border-radius:10px;font-size:13.5px;line-height:1.5}
        .rcp-note.ok{background:color-mix(in srgb,var(--green) 10%,var(--card))}
        .rcp-note.bad{background:rgba(220,38,38,.08);color:#b91c1c}
        .rcp-note.wait{background:rgba(245,158,11,.1)}
        .rcp-big{font-size:28px;font-weight:600;letter-spacing:-.02em;margin:6px 0 4px}
        .rcp-big small{font-size:15px;color:var(--text2);font-weight:400}
        .rcp-parts{display:grid;gap:8px;margin-top:8px}
        .rcp-part{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;font-size:13.5px}
        .rcp-part small{color:var(--text2)}
        .rcp a{color:var(--text);font-weight:600}
      `}</style>

      {r.canClaim && r.next && (
        <section className="rcp-card rcp-claim" aria-labelledby="rcp-claim">
          <h2 id="rcp-claim">You qualify for {r.next.name}</h2>
          <p className="rcp-sub">Claim your new rank to unlock more jobs and better-paying ones. First, agree to the rules:</p>
          <ol className="rcp-rules">{r.rules.map((rule) => <li key={rule}>{rule}</li>)}</ol>
          <label className="rcp-check"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> I understand. Breaking these rules can cost me my rank or my account.</label>
          <button className="ui-btn ui-btn-dark" disabled={!agree || busy} onClick={claim}>{busy ? 'Claiming…' : `Claim ${r.next.name}`}</button>
        </section>
      )}
      {(pending || rejected || msg) && (
        <section className="rcp-card" aria-label="Your rank claim">
          {pending && <div className="rcp-note wait" style={{ margin: 0 }}>Your claim for <b>{r.claim!.toLevelName}</b> is being reviewed. This usually takes 24–48 hours, and we'll let you know.</div>}
          {rejected && <div className="rcp-note bad" style={{ margin: 0 }}>Your last claim wasn't approved{r.claim?.note ? `: ${r.claim.note}` : '.'} You can claim again from {day(r.claimAgainFrom!)}.</div>}
          {msg && !pending && <div className={`rcp-note ${msg.ok ? 'ok' : 'bad'}`} role="status" style={{ margin: 0 }}>{msg.text}</div>}
        </section>
      )}

      <section className="rcp-card" aria-labelledby="rcp-x">
        <h2 id="rcp-x">X score <InfoTip label="What is the X score?" title="X score">
          <p>How much job posters can trust your X account, from 0 to 100. It comes from things OgaPay checks itself: X connected (20), your followers once checked (up to 40), a blue tick (10), and your record on social-media jobs (up to 30; lots of rejected work lowers it).</p>
          <p>Some jobs need a minimum X score.</p>
        </InfoTip></h2>
        {!x.connected ? (
          <p className="rcp-sub">Connect your X account to get an X score. <Link to="/settings/connections">Connect X</Link></p>
        ) : (
          <>
            <div className="rcp-big">{x.score}<small> / 100</small></div>
            <div className="rcp-parts">{x.parts.map((p) => <div className="rcp-part" key={p.key}><span>{p.label}</span><small>{p.points} / {p.max}</small></div>)}</div>
            <p className="rcp-sub" style={{ marginTop: 10 }}>Raise it: get your followers checked in <Link to="/settings/creator">Settings → Creator</Link>, and do social-media jobs well.</p>
          </>
        )}
      </section>
    </div>
  )
}
