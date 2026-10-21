// Job descriptions. The Create form's toolbar writes **bold**, _italic_, "- "
// lists, "## " headings and [text](link); people also type "1. " steps, "*"
// for italics and paste bare links. Everything is escaped first, and links only
// accept http(s) addresses or paths on this site, so a job can't carry HTML or
// javascript: links. Lines next to each other stay one paragraph with line
// breaks; a blank line starts a new paragraph.

function escapeHtml(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}

const anchor = (url: string, text: string) =>
  url.startsWith('/')
    ? `<a href="${url}">${text}</a>`
    : `<a href="${url}" target="_blank" rel="noopener nofollow ugc" class="wjd-linkified">${text}</a>`

const emphasis = (s: string) => s
  .replace(/\*\*(?!\s)(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/(^|[^\w*])\*(?!\s)(.+?)\*(?!\w)/g, '$1<em>$2</em>')
  .replace(/(^|[^\w])_(?!\s)(.+?)_(?!\w)/g, '$1<em>$2</em>')
  .replace(/`(.+?)`/g, '<code>$1</code>')

// One line of text -> HTML. Links are set aside first so a * or _ inside an
// address (x.com/some_user) is never read as emphasis.
function inline(raw: string) {
  const links: string[] = []
  const keep = (html: string) => `\u0000${links.push(html) - 1}\u0000`
  let s = escapeHtml(raw.replace(/\u0000/g, ''))
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/(?!\/)[^\s)]*)\)/g, (_m, text: string, url: string) => keep(anchor(url, emphasis(text))))
  s = s.replace(/(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi, (m) => {
    const trail = (m.match(/[.,;:!?)]+$/) || [''])[0] // "see https://x.com." keeps the full stop outside
    const url = trail ? m.slice(0, -trail.length) : m
    return keep(anchor(url.startsWith('www.') ? `https://${url}` : url, url)) + trail
  })
  return emphasis(s).replace(/\u0000(\d+)\u0000/g, (_m, i: string) => links[Number(i)])
}

// One item (a step or a requirement): links and emphasis, no paragraphs
export const renderJobLine = (text?: string | null): string => inline(String(text || ''))

export function renderJobText(text?: string | null): string {
  if (!text) return ''
  let html = ''
  let list: 'ul' | 'ol' | null = null
  let para: string[] = []
  const closeList = () => { if (list) { html += `</${list}>`; list = null } }
  const closePara = () => { if (para.length) { html += `<p>${para.join('<br />')}</p>`; para = [] } }
  const openList = (kind: 'ul' | 'ol') => {
    closePara()
    if (list === kind) return
    closeList()
    html += `<${kind}>`
    list = kind
  }

  for (const raw of String(text).split('\n')) {
    const line = raw.replace(/\r$/, '')
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/)
    if (bullet) { openList('ul'); html += `<li>${inline(bullet[1])}</li>`; continue }
    const num = line.match(/^\s*\d+[.)]\s+(.*)$/)
    if (num) { openList('ol'); html += `<li>${inline(num[1])}</li>`; continue }
    closeList()
    if (line.trim() === '') { closePara(); continue }
    const heading = line.match(/^\s*#{1,3}\s+(.*)$/)
    if (heading) { closePara(); html += `<h3>${inline(heading[1])}</h3>`; continue }
    para.push(inline(line))
  }
  closeList()
  closePara()
  return html
}

// The same text without formatting, for job cards: [text](link) becomes text,
// and the **, _, #, list and quote marks go.
export function plainJobText(text?: string | null): string {
  return String(text || '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s*(#{1,3}|[-*•]|\d+[.)]|>)\s+/gm, '')
    .replace(/\*\*|__|`/g, '')
    .replace(/(^|[^\w])[*_](?!\s)(.+?)[*_](?!\w)/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim()
}

// A job that sends people somewhere but gives no address can't be done: a
// worker took a "complete our survey" job (2026-10-09) that had no link to the
// survey. Create job and Edit job stop until the link is in. It looks for:
// - fill / complete / answer / take / do a survey, form, questionnaire or poll
// - visit / open / download / install / sign up on a website or app
// - "click the link", "use the survey link", "the link below"
// Kept narrow so normal jobs pass: asking for a link as proof ("paste your link
// below", "follow us and send the link"), an app they already use ("open your
// bank app and screenshot it"), any app of their choice ("a VPN app"), well-known
// apps (X, WhatsApp...) and "in this form:" (meaning layout) don't count.

// Up to four words between the verb and the thing, in the same sentence
const GAP = String.raw`((?:[^\s.!?;\n]+\s+){0,4}?)`
const FILL_IN = new RegExp(String.raw`\b(?:fill(?:ing|ed)?|complet(?:e|es|ing|ed)|answer(?:ing)?|tak(?:e|ing)|do(?:ing)?|respond(?:ing)?\s+to|participat(?:e|ing)\s+in|vot(?:e|ing)\s+in|submit(?:ting)?)\s+${GAP}(survey|questionnaire|poll|form)s?\b(?!\s+(?:of|a|an|their|your)\b)`, 'gi')
const GO_TO = new RegExp(String.raw`\b(?:visit(?:ing)?|open(?:ing)?(?!\s+(?:to|for)\b)|download(?:ing)?|install(?:ing)?|sign(?:ing)?[\s-]?up|register(?:ing)?|log(?:ging)?[\s-]?in(?:to)?|go(?:ing)?\s+to|check(?:ing)?\s+out|creat(?:e|ing)\s+an?\s+account)\s+${GAP}(web\s?site|web\s?page|landing\s+page|site|app|apk)s?\b(?!\s+(?:settings|store)\b)`, 'gi')
const LINK_ASK = new RegExp(String.raw`\b(?:click(?:ing)?|open|visit|tap|follow|use|go\s+to)\s+${GAP}(links?|url)\b`, 'gi')
const LINK_HERE = /\b((?:[^\s.!?;\n]+\s+){0,3}?)(links?)\s+(?:below|above)\b/gi
const NAMED_LINK = /\b(survey|form|registration|sign[- ]?up)\s+link\b/i
// A form named by its maker, or one said to be just below or above ("your" is
// one they already have, like "your Google Forms dashboard")
const MAKER_FORM = /((?:\byour\s+)?)\b(?:google\s+|microsoft\s+|type|jot)(form)s?\b/gi
const FORM_HERE = /((?:\byour\s+)?)\b(survey|questionnaire|poll|form)s?\s+(?:below|above)\b/gi
// "Open your app", "a VPN app", "any app", or a well-known app nobody needs a link for
const NOT_A_PLACE = /\b(your|any|a|an|every|other|ogapay|x|twitter|instagram|ig|tiktok|facebook|fb|whatsapp|telegram|youtube|snapchat|linkedin|threads|discord|google|gmail|chrome|camera|gallery|settings|browser)\b/i
// The link is one they send back as proof, not one they're sent to
const PROOF = /\b(your|send|submit|share|drop|paste|post|comment|reply|provide|attach|and|with)\b/i
const HAS_ADDRESS = /(https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(com|app|ng|io|org|net|co|xyz|me|ly|gl|gle|link|site|dev|ai|tv|info|biz|africa|online|store|shop|live|page|so|to|be|gg|fun|tech|club|top|cc|us|uk)(\/\S*)?\b/i
// An @handle is enough for a poll, or when the place is on their profile ("link in bio")
const HAS_HANDLE = /(^|[^\w@])@[A-Za-z0-9_]{2,}/
const ON_PROFILE = /\b(bio|pinned|profile)\b/i
// Files added to the job become links in it, so "fill the attached form" is fine
const POINTS_TO_FILES = /\battach(ed|ment|ments)\b|\bfiles?\s+(below|above)\b/i

// The first thing the pattern finds that `skip` doesn't rule out
function firstMatch(re: RegExp, text: string, skip: (gap: string, before: string) => boolean): string {
  for (const m of text.matchAll(re)) {
    const before = text.slice(0, (m.index || 0) + m[0].lastIndexOf(m[2])) // the text up to the thing itself
    if (!skip(m[1] || '', before)) return m[2].toLowerCase().replace(/s$/, '')
  }
  return ''
}

// What the job sends people to without giving its address ('survey', 'form',
// 'questionnaire', 'poll', 'website', 'app' or 'link'), or '' when nothing is
// missing. Pass the title and brief together; `hasFiles` when files are attached.
export function missingLink(text: string, hasFiles = false): string {
  const t = String(text || '')
  if (HAS_ADDRESS.test(t)) return ''
  if (hasFiles && POINTS_TO_FILES.test(t)) return ''
  const handle = HAS_HANDLE.test(t)
  const onProfile = handle && ON_PROFILE.test(t)
  const form = firstMatch(FILL_IN, t, (gap, before) =>
    /\bany\b/i.test(gap) || /\bin\s+(this|that|the\s+following|the\s+same|this\s+exact)\s+$/i.test(before))
    || firstMatch(MAKER_FORM, t, (yours) => !!yours) || firstMatch(FORM_HERE, t, (yours) => !!yours)
  if (form && !onProfile && !(handle && form === 'poll')) return form
  const place = firstMatch(GO_TO, t, (gap) => NOT_A_PLACE.test(gap))
  if (place && !onProfile) return /app|apk/i.test(place) ? 'app' : 'website'
  const link = firstMatch(LINK_ASK, t, (gap) => PROOF.test(gap)) || firstMatch(LINK_HERE, t, (gap) => PROOF.test(gap)) || (NAMED_LINK.test(t) ? 'link' : '')
  if (link && !onProfile) return 'link'
  return ''
}

// The checklist line for missingLink's answer
export function missingLinkText(thing: string): string {
  if (!thing) return ''
  if (thing === 'link') return 'Add the link (https://...) so people can do the job.'
  if (thing === 'website' || thing === 'app') return `Add the link to the ${thing} so people can do the job.`
  return `Add the link to your ${thing} so people can do the job.`
}
