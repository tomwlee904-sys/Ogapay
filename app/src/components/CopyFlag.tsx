import '../styles/copy-flag.css'

/* The server compares each entry's text with the other entries on the same
   job when it's sent. If it matches or nearly matches one ("Very similar to
   @ada's entry"), or only says "done" with no link or screenshot, it sets
   spamReason. Nothing is rejected: the poster (and a moderator) decides, and
   such an entry is never approved and paid automatically after 3 days.
   Workers never get spamReason, so this only shows to posters and admins. */

export default function CopyFlag({ reason, copy, compact = false }: { reason?: string | null; copy?: boolean; compact?: boolean }) {
  if (!reason) return null
  return (
    <p className={`copy-flag${compact ? ' copy-flag-compact' : ''}`}>
      <span className="copy-flag-b"><i className={`ti ${copy ? 'ti-copy' : 'ti-alert-triangle'}`} aria-hidden="true" /> {copy ? 'Possible copy' : 'Possible spam'}</span>
      <span>{reason}.{compact ? '' : " Check it before you approve. It won't be paid automatically."}</span>
    </p>
  )
}
