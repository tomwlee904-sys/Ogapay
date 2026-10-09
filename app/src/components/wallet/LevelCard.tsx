import { Link } from 'react-router-dom'
import { levelsFor, nextStep, nextTierFor, UNLOCKS } from '../../lib/levels'
import { naira, MIN_WITHDRAW_NGN } from '../../lib/wallet'

// Wallet: your verification level, what it lets you withdraw, the three steps,
// and how to take the next one
export default function LevelCard({ tier, didit, ninInstant = false }: { tier: number; didit: boolean; ninInstant?: boolean }) {
  const levels = levelsFor(didit, ninInstant)
  const current = levels.find((l) => l.tier === tier)
  const next = nextStep(tier, didit)
  const nextTier = nextTierFor(tier, didit)
  return (
    <section className="ui-card wl-sec wl-level" aria-labelledby="wl-level">
      <div className="wl-sec-head">
        <h2 id="wl-level">Your level and limit</h2>
        {tier > 0
          ? <span className="wl-badge ok"><i className="ti ti-circle-check" /> {current?.name || `Level ${tier}`} · Verified</span>
          : <span className="wl-badge"><i className="ti ti-circle-dashed" /> Not verified</span>}
      </div>
      <p className="wl-level-head">
        {tier > 0
          ? <>You can withdraw up to <b>{naira(current?.limit ?? 0, 0)}</b> a day.</>
          : <>Verify your identity to {UNLOCKS}.</>}
      </p>
      <ol className="wl-steps" aria-label="Verification levels">
        {levels.map((l) => (
          <li key={l.tier} className={tier >= l.tier ? 'done' : l.tier === nextTier ? 'next' : ''}>
            <span className="wl-step-name">{l.name}: {l.short}</span>
            <span className="wl-step-limit">{naira(l.limit, 0)} a day</span>
          </li>
        ))}
      </ol>
      <div className="wl-level-foot">
        <span className="wl-note">Minimum withdrawal {naira(MIN_WITHDRAW_NGN, 0)}. Fee 1.5%, at least ₦100.</span>
        {next && <Link className="wl-level-next" to={next.to}>{next.label} <i className="ti ti-arrow-right" /></Link>}
      </div>
    </section>
  )
}
