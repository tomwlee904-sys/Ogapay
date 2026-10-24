import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import LoadError from '../components/LoadError'
import InfoTip from '../components/InfoTip'
import { apiRequest } from '../lib/api'
import { sized } from '../lib/img'
import { AUDIENCE_PLATFORMS, TIERS, compact, fullCount, platformOf } from '../lib/creators'
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
  const [reload, setReload] = useState(0)
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
  }, [platform, size, search, reload])

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
        .cr-head > div:first-child{flex:1 1 320px;min-width:0}
        .cr-trust{display:flex;gap:6px;align-items:center;margin:12px 0 0;font-size:13px;color:var(--text2)}
        .cr-trust > i{font-size:16px;color:var(--text2)}
        .cr-big{position:relative;z-index:1;display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--border);border-radius:12px;background:var(--card2);text-decoration:none}
        .cr-big i{font-size:20px;color:var(--text)}
        .cr-big b{font-size:20px;font-weight:700;letter-spacing:-.02em;color:var(--text)}
        .cr-big span{font-size:12.5px;color:var(--text2)}
        .cr-big em{margin-left:auto;font-style:normal;font-size:12px;font-weight:600;padding:3px 9px;border-radius:999px;background:var(--text);color:var(--bg)}
        .cr-more{position:relative;z-index:1;display:flex;flex-wrap:wrap;gap:6px}
        .cr-more a{display:inline-flex;align-items:center;gap:4px;min-height:32px;font-size:12.5px;color:var(--text2);text-decoration:none;padding:0 10px;border:1px solid var(--border);border-radius:999px}
        .cr-more a:hover{color:var(--text);border-color:var(--text3)}
        .cr-join{display:flex;align-items:center;justify-content:space-between;gap:12px 16px;flex-wrap:wrap;margin-top:20px;padding:16px 20px}
        .cr-join strong{display:block;font-size:14px;color:var(--text)}
        .cr-join span{display:block;font-size:13px;color:var(--text2);margin-top:2px}
        @media (min-width:768px){.cr-head{flex-wrap:nowrap}.cr-head .ui-actions{flex-shrink:0}}
        @media (max-width:767.98px){.cr-head .ui-actions,.cr-head .ui-actions .ui-btn{width:100%}}
      `}</style>
      <div className="ui-page">
        <header className="ui-head cr-head">
          <div>
            <h1 className="ui-title">Creators</h1>
            <p className="ui-sub">Hire verified creators to promote your business, course or app.</p>
          </div>
          <div className="ui-actions">
            <Link className="ui-btn ui-btn-dark" to="/create?type=custom"><i className="ti ti-plus" aria-hidden="true" /> Post a creator job</Link>
          </div>
        </header>
        <p className="cr-trust">
          <i className="ti ti-rosette-discount-check" aria-hidden="true" /> Every follower count is verified.
          <InfoTip label="How follower counts are verified" title="Verified counts">X counts are read from X itself. Other platforms are checked by our team from a profile screenshot.</InfoTip>
        </p>

        <div className="wk2-tools">
          <form className="wk2-bar" role="search" onSubmit={(e) => { e.preventDefault(); set('q', input.trim()) }}>
            <label className="wk2-search">
              <i className="ti ti-search" aria-hidden="true" />
              <input type="search" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Name or handle" aria-label="Search creators by name or handle" />
              {input && <button type="button" onClick={() => { setInput(''); set('q', '') }} aria-label="Clear search"><i className="ti ti-x" /></button>}
            </label>
          </form>
          <select className="ui-select wk2-sort" value={size} onChange={(e) => set('size', e.target.value)} aria-label="Audience size">
            <option value="">Any size</option>
            {TIERS.map((t) => <option key={t.id} value={t.id}>{t.label} ({t.range})</option>)}
          </select>
          <div className="wk2-skills" role="group" aria-label="Filter by platform">
            <button type="button" aria-pressed={!platform} className={`wk2-skill tap${!platform ? ' on' : ''}`} onClick={() => set('platform', '')}>All platforms</button>
            {AUDIENCE_PLATFORMS.map((p) => (
              <button key={p.id} type="button" aria-pressed={platform === p.id} className={`wk2-skill tap${platform === p.id ? ' on' : ''}`} onClick={() => set('platform', p.id)}><i className={`ti ${p.icon}`} aria-hidden="true" /> {p.label}</button>
            ))}
          </div>
        </div>

        {err ? (
          <LoadError what="creators" onRetry={() => setReload((r) => r + 1)} />
        ) : data === null ? (
          <div className="wk2-grid" aria-busy="true" aria-label="Loading creators">
            {[0, 1, 2].map((i) => <div key={i} className="ui-sk" style={{ height: 240 }} />)}
          </div>
        ) : list.length === 0 ? (
          <div className="ui-empty">
            <strong>{platform || size || search ? 'No verified creators match these filters yet' : 'No verified creators yet'}</strong>
            Creators appear here once their audience is checked.
          </div>
        ) : (
          <>
            <div className="wk2-grid">
              {list.map((c) => {
                const top = c.top || c.audiences[0]
                const p = platformOf(top.platform)
                return (
                  <section key={c.id} className="ui-card wk2-card">
                    <Link to={`/user/${c.username}`} className="wk2-top">
                      <span className="wk2-av">{c.avatarUrl ? <img src={sized(c.avatarUrl, 56, true)} alt="" loading="lazy" /> : initials(c.name)}</span>
                      <span className="wk2-id">
                        <strong>{c.name}</strong>
                        <small>@{c.username}{c.ogaScore > 0 ? ` · OgaScore ${c.ogaScore}` : ''}</small>
                      </span>
                    </Link>
                    <a className="cr-big" href={p.url(top.handle)} target="_blank" rel="noopener noreferrer"
                      title={`${fullCount(top.followers)} ${p.unit} on ${p.label}`}>
                      <i className={`ti ${p.icon}`} aria-hidden="true" />
                      <span><b>{compact(top.followers)}</b><br />{p.unit} · @{top.handle}</span>
                      {top.tier && <em>{top.tier}</em>}
                    </a>
                    {c.audiences.length > 1 && (
                      <div className="cr-more">
                        {c.audiences.filter((a) => a.platform !== top.platform).map((a) => {
                          const ap = platformOf(a.platform)
                          return <a key={a.platform} href={ap.url(a.handle)} target="_blank" rel="noopener noreferrer" aria-label={`${compact(a.followers)} on ${ap.label}`}><i className={`ti ${ap.icon}`} aria-hidden="true" /> {compact(a.followers)}</a>
                        })}
                      </div>
                    )}
                    {c.bio && <p className="wk2-bio">{c.bio}</p>}
                    <Link className="ui-btn ui-btn-ghost wk2-hire wk2-on-top" to={`/user/${c.username}/hire`} aria-label={`Hire ${c.name}`}>Hire</Link>
                  </section>
                )
              })}
            </div>
            {data && page < data.pages && (
              <div className="wk2-more">
                <button type="button" className="ui-btn ui-btn-ghost" onClick={loadMore} disabled={loadingMore}>{loadingMore ? 'Loading…' : 'Load more'}</button>
              </div>
            )}
          </>
        )}

        {/* For creators: after the list (and in the empty and error states) */}
        {(data !== null || err) && (
          <section className="ui-card cr-join">
            <div><strong>Are you a creator?</strong><span>Add your audience to be listed and hired.</span></div>
            <Link className="ui-btn ui-btn-ghost" to="/settings/creator"><i className="ti ti-speakerphone" aria-hidden="true" /> Get listed</Link>
          </section>
        )}
      </div>
    </Layout>
  )
}
