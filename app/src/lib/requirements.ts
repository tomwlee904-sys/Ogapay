/* What a job asks of workers, in words. Same rules the server checks when
   someone applies (task.service checkWorkerRequirements). */

import { audienceRequirement, platformOf } from './creators'

export const LEVEL_NAMES = ['Beginner', 'Intermediate', 'Advanced', 'Expert', 'Legend']

/** minRank 1–5 is a worker level; anything higher counts as Legend */
export const rankName = (n: number) => LEVEL_NAMES[Math.min(5, Math.max(1, Math.round(n) || 1)) - 1]

export function jobRequirements(job: any): { icon: string; text: string }[] {
  const reqs: { icon: string; text: string }[] = []
  // Member of community (listed first: it decides who can take the job at all)
  const rc = job.requiredCommunity
  if (rc?.name) reqs.push({ icon: 'users-group', text: rc.isMember ? 'Member of ' + rc.name : 'Join ' + rc.name + ' to take this job' })
  if (job.workerRequirement === 'HUMAN') reqs.push({ icon: 'fingerprint', text: 'Human verified' })
  else if (job.workerRequirement === 'KYC2') reqs.push({ icon: 'id-badge-2', text: 'ID + selfie verified' })
  else if (job.workerRequirement === 'KYC') reqs.push({ icon: 'id-badge-2', text: 'ID verified (NIN)' })
  else if (typeof job.workerRequirement === 'string' && job.workerRequirement.trim()) reqs.push({ icon: 'user-check', text: job.workerRequirement })
  const rank = Number(job.minRank ?? job.rankRequired ?? 0)
  if (rank > 1) reqs.push({ icon: 'award', text: `${rankName(rank)} rank or higher` })
  const score = Number(job.minOgaScore ?? job.minSorsaScore ?? 0)
  if (score > 0) reqs.push({ icon: 'shield-check', text: `OgaScore ${score}+` })
  const xs = Number(job.minXScore ?? 0)
  if (xs > 0) reqs.push({ icon: 'brand-x', text: `X score ${xs}+` })
  const jobs = Number(job.minJobsDone ?? 0)
  if (jobs > 0) reqs.push({ icon: 'circle-check', text: `${jobs}+ ${jobs === 1 ? 'job' : 'jobs'} done on OgaPay` })
  if (job.requiresWallet) reqs.push({ icon: 'wallet', text: 'Solana wallet connected' })
  if (job.requiresXBlue) reqs.push({ icon: 'rosette-discount-check', text: 'Blue tick on X' })
  else if (job.requiresX) reqs.push({ icon: 'brand-x', text: 'X account connected' })
  if (job.requiresLinkedin) reqs.push({ icon: 'brand-linkedin', text: 'LinkedIn connected' })
  if (job.audiencePlatform && Number(job.minFollowers) > 0) {
    reqs.push({ icon: platformOf(job.audiencePlatform).icon.replace(/^ti-/, ''), text: `Creators: ${audienceRequirement(job.audiencePlatform, Number(job.minFollowers))}` })
  }
  return reqs
}

/** One line for a job card, without the rank (the card shows that as a badge):
    "ID verified (NIN) · Blue tick on X", or "No extra requirements" */
export function requirementLine(job: any): string {
  const rest = jobRequirements(job).filter((r) => r.icon !== 'award').map((r) => r.text)
  return rest.length ? rest.join(' · ') : 'No extra requirements'
}
