import { useEffect, useState } from 'react'
import { apiRequest } from '../../lib/api'
import { compact, fullCount, platformOf } from '../../lib/creators'

/* A creator's verified audiences on their public profile. The server only
   returns them when the creator chose to be listed (Settings, Creator). */

interface Aud { platform: string; platformName: string; handle: string; followers: number; tier: string | null }

export default function CreatorAudiences({ userId }: { userId: string }) {
  const [list, setList] = useState<Aud[]>([])
  useEffect(() => {
    let live = true
    apiRequest<{ audiences: Aud[] }>(`/creators/${userId}/audiences`)
      .then((d) => { if (live) setList(d.audiences || []) })
      .catch(() => {})
    return () => { live = false }
  }, [userId])

  if (!list.length) return null
  const top = list[0]
  return (
    <section className="up-card up-about">
      <style>{`
        .ca-row{display:flex;flex-wrap:wrap;gap:8px}
        .ca-chip{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid var(--border);border-radius:12px;background:var(--bg2);color:var(--text);text-decoration:none}
        .ca-chip:hover{border-color:var(--text3)}
        .ca-chip i{font-size:18px}
        .ca-chip b{font-size:15px;font-weight:800;letter-spacing:-.01em}
        .ca-chip span{font-size:12px;color:var(--text2)}
        .ca-chip em{font-style:normal;font-size:11px;font-weight:700;padding:2px 7px;border-radius:999px;background:var(--text);color:var(--bg)}
        .ca-sub{margin:8px 0 0;font-size:12px;color:var(--text3);display:flex;gap:5px;align-items:baseline}
      `}</style>
      <h2>Creator{top.tier ? ` · ${top.tier}` : ''}</h2>
      <div className="ca-row">
        {list.map((a) => {
          const p = platformOf(a.platform)
          return (
            <a key={a.platform} className="ca-chip" href={p.url(a.handle)} target="_blank" rel="noopener noreferrer" title={`${fullCount(a.followers)} ${p.unit} on ${p.label}`}>
              <i className={`ti ${p.icon}`} />
              <b>{compact(a.followers)}</b>
              <span>@{a.handle}</span>
              {a.tier && <em>{a.tier}</em>}
            </a>
          )
        })}
      </div>
      <p className="ca-sub"><i className="ti ti-rosette-discount-check" /> Verified by OgaPay</p>
    </section>
  )
}
