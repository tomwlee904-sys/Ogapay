import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import { sized } from '../lib/img'
import { AUDIENCE_PLATFORMS, TIERS, compact, fullCount, platformOf } from '../lib/creators'
import '../styles/profile-public.css'
import '../styles/workers.css'

/* Creators directory (/creators): people with a verified audience who chose to
   be listed. X counts come from X; the rest were checked from a screenshot. */

interface CreatorAudience { platform: string; platformName: string; handle: string; followers: number; tier: string | null }
interface Creator { id: string; username: string; name: string; avatarUrl: string | null; ogaScore: number; bio: string | null; audiences: CreatorAudience[]; top?: CreatorAudience }
interface Page { creators: Creator[]; total: number; page: number; pages: number }

const initials = (s: string) => s.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()

export default function Creators() {
  const [params, setParams] = useSearchParams()
  const platform = params.get('platform') || ''
  const size = params.get('size') || ''
  const search = params.get('q') || ''
  const [input, setInput] = useState(search)
  const [data, setData] = useState<Page | null>(null)
  const [list, setList] = useState<Creator[]>([])
  const [page, setPage] = useState(1)
  const [err, setErr] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params)
    if (v) next.set(k, v); else next.delete(k)
    setParams(next, { replace: true })
  }

  const query = (p: number) => {
    const q = new URLSearchParams({ page: String(p) })
    if (platform) q.set('platform', platform)
    const tier = TIERS.find((t) => t.id === size)
    if (tier) { q.set('min', String(tier.min)); if (tier.max) q.set('max', String(tier.max)) }
    if (search) q.set('q', search)
    return `/creators?${q}`
  }

  useEffect(() => {
    let live = true
    setData(null); setErr(false); setPage(1)
    apiRequest<Page>(query(1))
      .then((d) => { if (live) { setData(d); setList(d.creators) } })
      .catch(() => { if (live) setErr(true) })
    return () => { live = false }
  }, [platform, size, search])

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const d = await apiRequest<Page>(query(page + 1))
      setList((l) => [...l, ...d.creators]); setPage(page + 1); setData(d)
    } catch { /* keep what we have */ }
    setLoadingMore(false)
  }

  return (
    <Layout>
      <style>{`
        .cr-head{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap}
        .cr-cta{display:flex;gap:8px;flex-wrap:wrap}
        .cr-trust{display:flex;gap:6px;align-items:baseline;margin:0 0 14px;font-size:12.5px;color:var(--text3)}
        .cr-big{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--border);border-radius:12px;background:var(--bg2)}
        .cr-big i{font-size:20px;color:var(--text)}
        .cr-big b{font-size:20px;font-weight:800;letter-spacing:-.02em;color:var(--text)}
        .cr-big span{font-size:12px;color:var(--text2)}
        .cr-big em{margin-left:auto;font-style:normal;font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;background:var(--text);color:var(--bg)}
        .cr-more{display:flex;flex-wrap:wrap;gap:6px}
        .cr-more a{display:inline-flex;align-items:center;gap:4px;font-size:12px;color:var(--text2);text-decoration:none;padding:3px 9px;border:1px solid var(--border);border-radius:999px}
        .cr-more a:hover{color:var(--text);border-color:var(--text3)}
      `}</style>
      <div className="up-wrap">
        <div className="wk2-head cr-head">
          <div>
            <h1>Creators</h1>
            <p>Hire verified creators to promote your business, course or app. Pay only for work you approve.</p>
          </div>
          <div className="cr-cta">
            <Link className="up-btn" to="/settings/creator"><i className="ti ti-speakerphone" /> I'm a creator</Link>
            <Link className="up-btn primary" to="/create?type=custom"><i className="ti ti-plus" /> Post a creator job</Link>
          </div>
        </div>
        <p className="cr-trust"><i className="ti ti-rosette-discount-check" /> Every count here is verified: X is read from X itself, and the other platforms are checked by our team from a profile screenshot.</p>

        <form className="wk2-bar" onSubmit={(e) => { e.preventDefault(); set('q', input.trim()) }}>
          <label className="wk2-search">
            <i className="ti ti-search" />
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Search by name or handle" aria-label="Search creators" />
            {input && <button type="button" onClick={() => { setInput(''); set('q', '') }} aria-label="Clear search"><i className="ti ti-x" /></button>}
          </label>
          <select className="wk2-sort" value={size} onChange={(e) => set('size', e.target.value)} aria-label="Audience size">
            <option value="">Any size</option>
            {TIERS.map((t) => <option key={t.id} value={t.id}>{t.label} ({t.range})</option>)}
          </select>
        </form>

        <div className="wk2-skills" role="group" aria-label="Filter by platform">
          <button className={`wk2-skill${!platform ? ' on' : ''}`} onClick={() => set('platform', '')}>All platforms</button>
          {AUDIENCE_PLATFORMS.map((p) => (
            <button key={p.id} className={`wk2-skill${platform === p.id ? ' on' : ''}`} onClick={() => set('platform', p.id)}><i className={`ti ${p.icon}`} /> {p.label}</button>
          ))}
        </div>

        {data === null && !err ? (
          <div className="up-empty"><i className="ti ti-loader-2" />Loading…</div>
        ) : err ? (
          <div className="up-empty"><i className="ti ti-cloud-off" />Couldn't load creators. Refresh to try again.</div>
        ) : list.length === 0 ? (
          <div className="up-empty">
            <i className="ti ti-speakerphone" />
            {platform || size || search ? 'No creators match these filters yet.' : 'No creators are listed yet.'}{' '}
            <Link to="/settings/creator">Add your audience</Link> to be one of the first.
          </div>
        ) : (
          <>
            <div className="wk2-grid">
              {list.map((c) => {
                const top = c.top || c.audiences[0]
                const p = platformOf(top.platform)
                return (
                  <section key={c.id} className="up-card wk2-card">
                    <Link to={`/user/${c.username}`} className="wk2-top">
                      <span className="wk2-av">{c.avatarUrl ? <img src={sized(c.avatarUrl, 56, true)} alt="" loading="lazy" /> : initials(c.name)}</span>
                      <span className="wk2-id">
                        <strong>{c.name}</strong>
                        <small>@{c.username}{c.ogaScore > 0 ? ` · OgaScore ${c.ogaScore}` : ''}</small>
                      </span>
                    </Link>
                    <a className="cr-big" href={p.url(top.handle)} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}
                      title={`${fullCount(top.followers)} ${p.unit} on ${p.label}`}>
                      <i className={`ti ${p.icon}`} />
                      <span><b>{compact(top.followers)}</b><br />{p.unit} · @{top.handle}</span>
                      {top.tier && <em>{top.tier}</em>}
                    </a>
                    {c.audiences.length > 1 && (
                      <div className="cr-more">
                        {c.audiences.filter((a) => a.platform !== top.platform).map((a) => {
                          const ap = platformOf(a.platform)
                          return <a key={a.platform} href={ap.url(a.handle)} target="_blank" rel="noopener noreferrer"><i className={`ti ${ap.icon}`} /> {compact(a.followers)}</a>
                        })}
                      </div>
                    )}
                    {c.bio && <p className="wk2-bio">{c.bio}</p>}
                    <div className="wk2-actions">
                      <Link className="up-btn" to={`/user/${c.username}`}>Profile</Link>
                      <Link className="up-btn primary" to={`/user/${c.username}/hire`}>Hire</Link>
                    </div>
                  </section>
                )
              })}
            </div>
            {data && page < data.pages && (
              <div className="wk2-more">
                <button className="up-btn" onClick={loadMore} disabled={loadingMore}>{loadingMore ? 'Loading…' : 'Load more'}</button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
