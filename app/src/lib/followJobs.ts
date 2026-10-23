/* X follow jobs: the jobs that get follower analytics (/manage-jobs/:id/followers).
   The same rule as the server (services/followerAnalytics.service.js): a social
   job whose action is "follow" and whose brief points at an X account. */

const NOT_ACCOUNTS = new Set(['i', 'home', 'intent', 'search', 'explore', 'hashtag', 'share', 'messages', 'notifications', 'settings', 'compose', 'login', 'signup', 'tos', 'privacy'])

// The job's action from its tags, like payoutCheck.service actionOf: a like comes before a follow
function isFollowAction(tags: string[]): boolean {
  const t = tags.map((x) => String(x).toLowerCase())
  const has = (...words: string[]) => t.some((x) => words.some((w) => x === w || x.includes(w)))
  if (has('like', 'reaction')) return false
  return has('follow', 'subscriber', 'member')
}

export function followTarget(task: any): string | null {
  const text = [task?.title, task?.description, task?.instructions].filter(Boolean).join('\n')
  const re = /https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})(?![A-Za-z0-9_])/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) if (!NOT_ACCOUNTS.has(m[1].toLowerCase())) return m[1]
  const onX = (task?.tags || []).some((t: string) => ['x', 'twitter', 'x-campaign'].includes(String(t).toLowerCase())) || /\b(on x|twitter)\b/i.test(text)
  const at = onX ? text.match(/(?:^|[^\w@])@([A-Za-z0-9_]{1,15})(?![\w@])/) : null
  return at ? at[1] : null
}

export const isXFollowJob = (task: any): boolean =>
  !!task && task.category === 'SOCIAL_MEDIA' && isFollowAction(task.tags || []) && !!followTarget(task)
