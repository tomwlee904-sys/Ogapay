// A list that failed to load. Shown instead of the empty state, so a failed
// request never tells someone they have no jobs, orders or products.
export default function LoadError({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <div className="ui-empty" role="alert">
      <strong>We couldn't load {what}</strong>
      Check your connection and try again. Nothing has changed on your account.
      <div style={{ marginTop: 14 }}>
        <button type="button" className="ui-btn ui-btn-dark" onClick={onRetry}><i className="ti ti-refresh" aria-hidden="true" /> Try again</button>
      </div>
    </div>
  )
}
