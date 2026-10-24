import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../styles/my-tasks.css'

// One sub-navigation for the "your work" pages, under each page's title: jobs
// you took (/my-tasks), jobs you were picked or hired for and store orders to
// deliver (/my-work), reviews of your work (/my-reviews) and, for people who
// post jobs, reviews you still owe (/reviews-to-write). These pages used to
// link to each other with header buttons whose names nearly matched.
export default function WorkNav() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const poster = (user?._count?.tasksCreated ?? 0) > 0 || pathname === '/reviews-to-write'
  const items = [
    { to: '/my-tasks', label: 'Taken' },
    { to: '/my-work', label: 'Hired & orders' },
    { to: '/my-reviews', label: 'Reviews' },
    ...(poster ? [{ to: '/reviews-to-write', label: 'To rate' }] : []),
  ]
  return (
    <nav className="wn-nav" aria-label="Your work">
      {items.map((i) => (
        <NavLink key={i.to} to={i.to} end className={({ isActive }) => `wn-link${isActive ? ' on' : ''}`}>{i.label}</NavLink>
      ))}
    </nav>
  )
}
