import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { openSignIn } from '../lib/signin'

/* The one navigation for the blog pages (/blog, /blog/all, /blog/my): the
   sections as underline tabs, plus the section's single Write button. Used
   only by the blog pages. */

type Where = 'home' | 'all' | 'mine'

export default function BlogNav({ active }: { active: Where }) {
  const { isAuthed } = useAuth()
  const navigate = useNavigate()
  const write = () => { if (isAuthed) navigate('/blog/write'); else openSignIn({ redirect: '/blog/write' }) }
  const tabs: { id: Where; to: string; label: string; short: string }[] = [
    { id: 'home', to: '/blog', label: 'Blog', short: 'Blog' },
    { id: 'all', to: '/blog/all', label: 'All articles', short: 'All' },
    ...(isAuthed ? [{ id: 'mine' as const, to: '/blog/my', label: 'My articles', short: 'Mine' }] : []),
  ]

  return (
    <nav className="bn" aria-label="Blog sections">
      <style>{`
        .bn{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:20px;border-bottom:1px solid var(--border)}
        .bn-tabs{display:flex;gap:20px;min-width:0;align-self:flex-end}
        .bn-tab{display:inline-flex;align-items:center;height:44px;padding:0 2px;margin-bottom:-1px;border-bottom:2px solid transparent;font:500 14px/1 var(--font);color:var(--text2);text-decoration:none;white-space:nowrap}
        .bn-tab:hover{color:var(--text)}
        .bn-tab.on{color:var(--text);font-weight:600;border-bottom-color:var(--text)}
        .bn-write{margin:4px 0 8px;flex-shrink:0}
        .bn-short{display:none}
        @media (max-width:767.98px){
          .bn-tabs{gap:18px}
          .bn-long{display:none}
          .bn-short{display:inline}
          .bn-write{padding:0 14px}
        }
      `}</style>
      <div className="bn-tabs">
        {tabs.map((t) => (
          <Link key={t.id} to={t.to} className={`bn-tab${active === t.id ? ' on' : ''}`} aria-current={active === t.id ? 'page' : undefined}>
            <span className="bn-long">{t.label}</span><span className="bn-short">{t.short}</span>
          </Link>
        ))}
      </div>
      <button type="button" className="ui-btn ui-btn-dark bn-write" onClick={write}>
        <i className="ti ti-pencil" aria-hidden="true" /> <span className="bn-long">Write an article</span><span className="bn-short">Write</span>
      </button>
    </nav>
  )
}
