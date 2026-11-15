import { Link } from 'react-router-dom'
import type { ReviewFlag } from '../lib/types'
import '../styles/copy-flag.css'

/* Possible duplicates across accounts (server dupFlags.service): the same
   screenshot file, the same phone file name, the same phone or browser as
   someone else who did this job, or the same text. Nothing is rejected: the
   poster decides, and flagged work is never approved and paid automatically.
   Workers never get reviewFlags, so this only shows to posters and admins. */

const Names = ({ names }: { names: string[] }) => {
  const list = names.slice(0, 5)
  if (!list.length) return <>another account</>
  return (
    <>
      {list.map((u, i) => (
        <span key={u}>
          {i > 0 && (i === list.length - 1 ? ' and ' : ', ')}
          <Link to={`/user/${encodeURIComponent(u)}`} onClick={(e) => e.stopPropagation()}>@{u}</Link>
        </span>
      ))}
      {names.length > list.length && ` and ${names.length - list.length} more`}
    </>
  )
}

function line(f: ReviewFlag) {
  const n = <Names names={f.usernames || []} />
  switch (f.type) {
    case 'SAME_FILE':
      return <>Same screenshot file as {n}{f.otherJob ? ' (also sent for another job)' : ''}</>
    case 'SAME_FILENAME':
      return <>Same phone file name as {n}{f.otherJob ? ' (sent for another job)' : ''}. Weaker sign: compare the pictures</>
    case 'SAME_DEVICE':
      return <>Same {f.pairedDevice ? 'paired phone' : 'phone/browser and network'} as {n}, who also did this job</>
    case 'SAME_TEXT':
      return <>Same text as {n}</>
    default:
      return <>{f.detail || 'Looks like another account\'s work'}</>
  }
}

export default function DupFlags({ flags, compact = false }: { flags?: ReviewFlag[] | null; compact?: boolean }) {
  const list = Array.isArray(flags) ? flags.filter((f) => f && f.type) : []
  if (!list.length) return null
  if (compact) {
    return (
      <p className="copy-flag copy-flag-compact">
        <span className="copy-flag-b"><i className="ti ti-users" aria-hidden="true" /> Possible duplicate</span>
      </p>
    )
  }
  return (
    <div className="copy-flag dup-flag" role="note">
      <span className="copy-flag-b"><i className="ti ti-users" aria-hidden="true" /> Possible duplicate</span>
      <ul className="dup-flag-list">
        {list.map((f) => <li key={f.type}>{line(f)}.</li>)}
      </ul>
      <span className="dup-flag-foot">Check it before you approve. It won't be paid automatically.</span>
    </div>
  )
}
