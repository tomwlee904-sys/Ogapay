import { NavLink } from 'react-router-dom'
import '../styles/jobs.css'

// The small row under the title of Jobs, Job monitor and Saved jobs, so the
// three pages read as one area and you can move between them without the
// drawer. Same place and look on all three.
const LINKS: [string, string, string][] = [
  ['/tasks', 'Browse', 'ti-briefcase'],
  ['/job-monitor', 'Job monitor', 'ti-activity'],
  ['/bookmarks', 'Saved jobs', 'ti-bookmark'],
]

export default function JobsNav() {
  return (
    <nav className="jb-nav" aria-label="Jobs">
      {LINKS.map(([to, label, icon]) => (
        <NavLink key={to} to={to} end className={({ isActive }) => `jb-nav-a${isActive ? ' on' : ''}`}>
          <i className={`ti ${icon}`} aria-hidden="true" />{label}
        </NavLink>
      ))}
    </nav>
  )
}
