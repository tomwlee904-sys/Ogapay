/* What a job asks of workers, in words. Same rules the server checks when
   someone applies (task.service checkWorkerRequirements). */

export const LEVEL_NAMES = ['Beginner', 'Intermediate', 'Advanced', 'Expert', 'Legend']

/** minRank 1–5 is a worker level; anything higher counts as Legend */
export const rankName = (n: number) => LEVEL_NAMES[Math.min(5, Math.max(1, Math.round(n) || 1)) - 1]

export function jobRequirements(job: any): { icon: string; text: string }[] {
  const reqs: { icon: string; text: string }[] = []
  if (job.workerRequirement === 'HUMAN') reqs.push({ icon: 'fingerprint', text: 'Human verified' })
  else if (job.workerRequirement === 'KYC') reqs.push({ icon: 'id-badge-2', text: 'KYC verified' })
  else if (typeof job.workerRequirement === 'string' && job.workerRequirement.trim()) reqs.push({ icon: 'user-check', text: job.workerRequirement })
  const rank = Number(job.minRank ?? job.rankRequired ?? 0)
  if (rank > 1) reqs.push({ icon: 'award', text: `${rankName(rank)} rank or higher` })
  const score = Number(job.minOgaScore ?? job.minSorsaScore ?? 0)
  if (score > 0) reqs.push({ icon: 'shield-check', text: `OgaScore ${score}+` })
  if (job.requiresWallet) reqs.push({ icon: 'wallet', text: 'Solana wallet connected' })
  if (job.requiresX) reqs.push({ icon: 'brand-x', text: 'X account connected' })
  if (job.requiresLinkedin) reqs.push({ icon: 'brand-linkedin', text: 'LinkedIn connected' })
  return reqs
}
