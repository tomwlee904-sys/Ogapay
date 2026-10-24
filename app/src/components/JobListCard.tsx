import { Link } from 'react-router-dom'
import Money from './Money'
import { BoostedTag, PremiumMark } from './Perks'
import { jobRequirements } from '../lib/requirements'
import { CATEGORY_LABELS } from '../lib/categories'
import { jobDeadline, deadlineLabel } from '../lib/deadline'
import { plainJobText } from '../lib/jobText'
import { spokenMoney } from '../lib/money'
import '../styles/jobs.css'

type Convert = (amount: number, from: any, to: any) => number

// A job in the Jobs list: the title first, the pay on the right, one line of
// facts and one line of chips, so 3-4 jobs fit on a phone screen. (The taller
// HomeJobCard stays on the homepage carousel.) Tablet and desktop add a 2-line
// brief so cards in a row line up.
export default function JobListCard({ task, convert, myStatus }: { task: any; convert: Convert; myStatus?: string }) {
  const poster = task.poster || task.creator || {}
  const name = poster.username || poster.firstName || task.creatorName || 'OgaPay'
  const amount = Number(task.reward ?? task.amount ?? 0)
  const cur = task.currency || 'NGN'
  const deadline = jobDeadline(task)
  const contest = !!task.isContest
  const max = contest ? Number(task.entryTarget || 0) : Number(task.maxWorkers ?? task.slots ?? 0)
  const done = Number(task.submissionsCount ?? task._count?.submissions ?? task.currentWorkers ?? 0)
  // Places still free: a contest counts entries against its target; other jobs
  // count places taken (currentWorkers), since a released place opens again
  const taken = contest ? done : Number(task.currentWorkers ?? done)
  const left = Math.max(0, max - taken)
  const category = CATEGORY_LABELS[task.category] || 'General'
  const reqs = jobRequirements(task)
  const brief = plainJobText(task.description)
  const showBrief = brief && brief.toLowerCase() !== String(task.title || '').trim().toLowerCase()

  const places = contest
    ? `${done} ${done === 1 ? 'entry' : 'entries'}${max ? (left > 0 ? ` · ${left} to target` : ' · target reached') : ''}`
    : task.isSelection
      ? 'Poster picks 1 person'
      : max ? (left > 0 ? `${left} of ${max} ${max === 1 ? 'place' : 'places'} left` : 'All places taken') : 'Unlimited places'

  // Your place on this job, if you took one
  const status = myStatus === 'APPROVED' ? { cls: 'ok', icon: 'circle-check', text: 'Approved' }
    : myStatus === 'SUBMITTED' || myStatus === 'DISPUTED' ? { cls: 'ok', icon: 'circle-check', text: 'Work sent' }
    : myStatus === 'PENDING' ? { cls: 'todo', icon: 'hourglass', text: 'Send your work' }
    : myStatus === 'REJECTED' ? { cls: 'bad', icon: 'circle-x', text: 'Not approved' }
    : null

  return (
    <Link to={`/tasks/${task.id}`} className="jl-card"
      aria-label={`${task.title}. ${contest ? `Contest, 1st place prize ${spokenMoney(amount, cur)}` : `${spokenMoney(amount, cur)} per person`}. Posted by ${name}. ${places}.${status ? ` ${status.text}.` : ''}`}>
      <div className="jl-head">
        <h3 className="jl-title">{task.title}</h3>
        <span className="jl-pay"><Money amount={amount} currency={cur} convert={convert} size={17} positive note={contest ? '1st prize' : undefined} /></span>
      </div>
      <p className="jl-meta">
        <span className="jl-who">@{name}</span>{poster.premium && <PremiumMark />}
        <span aria-hidden="true">·</span><span>{category}</span>
        <span aria-hidden="true">·</span><span className={deadline.state === 'ended' ? 'jl-ended' : undefined}><i className="ti ti-clock" aria-hidden="true" />{deadlineLabel(deadline)}</span>
      </p>
      {showBrief && <p className="jl-brief">{brief}</p>}
      <div className="jl-chips">
        {task.isBoosted ? <BoostedTag /> : task.featured && <span className="jl-chip hl"><i className="ti ti-star" aria-hidden="true" /><span>Highlighted</span></span>}
        {status && <span className={`jl-chip ${status.cls}`}><i className={`ti ti-${status.icon}`} aria-hidden="true" /><span>{status.text}</span></span>}
        <span className="jl-chip"><i className={`ti ti-${contest ? 'award' : 'users'}`} aria-hidden="true" /><span>{places}</span></span>
        <span className="jl-chip">
          <i className={`ti ti-${reqs[0]?.icon || 'circle-check'}`} aria-hidden="true" />
          <span>{reqs.length ? reqs[0].text + (reqs.length > 1 ? ` +${reqs.length - 1}` : '') : 'Open to everyone'}</span>
        </span>
      </div>
    </Link>
  )
}
