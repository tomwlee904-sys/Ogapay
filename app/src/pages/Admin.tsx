import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AdminShell, { ADMIN_GROUPS } from '../components/AdminShell'

// The admin hub: every admin page, grouped. Phone: one card of rows per group;
// tablet: 2 columns; desktop: 3 columns. (Waiting counts need one admin summary
// endpoint; none exists yet, so the rows don't show counts.)
export default function Admin() {
  const { isAuthed } = useAuth()

  if (!isAuthed) return null

  return (
    <AdminShell section="hub" title="Admin" sub="Money out, identity checks, moderation and content.">
      <div className="adm-hub">
        {ADMIN_GROUPS.map((g, i) => (
          <section key={g.title} aria-labelledby={`adm-g-${i}`}>
            <h2 className="adm-hub-label" id={`adm-g-${i}`}>{g.title}</h2>
            <ul className="adm-hub-list">
              {g.items.map((c) => (
                <li key={c.to}>
                  <Link className="adm-hub-item" to={c.to}>
                    <span className="adm-hub-ic"><i className={`ti ${c.icon}`} aria-hidden="true" /></span>
                    <span>
                      <b>{c.title}</b>
                      <small>{c.desc}</small>
                    </span>
                    <i className="ti ti-chevron-right" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </AdminShell>
  )
}
