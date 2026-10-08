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
