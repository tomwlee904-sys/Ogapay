// The blog's small markdown, shared by the article page and the editor preview.
// Lines: "## " / "### " headings, "- " and "1. " lists, "> " quotes, and on a line
// of its own "![caption](image link)" for a picture, "- [ ] " / "- [x] " checklists,
// tables ("| a | b |" rows with a "| --- | --- |" line under the header) and code
// blocks between ``` lines. Inline: **bold**, *italic*, ~~struck out~~, `code` and
// [text](link). A pasted https:// link, and the way many writers paste one,
// "Name" (https://link), become links too (2026-10-31). Everything is escaped
// first, and links and pictures only accept https:// addresses or paths on this
// site, so a post can't carry HTML or javascript: links.

function escapeHtml(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}

const SAFE_URL = /^(https:\/\/[^\s"'<>\x5c]+|\/(?![/\x5c])[^\s"'<>\x5c]*)$/

const link = (text: string, url: string) =>
  url.startsWith('/') ? `<a href="${url}">${text}</a>` : `<a href="${url}" target="_blank" rel="noopener nofollow ugc">${text}</a>`

const format = (text: string) => text
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/(^|[^\w*])\*(?!\s)(.+?)\*(?!\w)/g, '$1<em>$2</em>')
  .replace(/~~(.+?)~~/g, '<del>$1</del>')

// A pasted https:// address, in escaped text. "&amp;" and an escaped apostrophe
// are part of it, and so is a (bracketed part); a space, any other entity (a
// quote or < >), a backslash, a lone bracket, curly quotes, dashes, "…", an
// emoji or a set-aside piece ends it.
const STOP = String.raw`\s&\x5c\[\]()‘’“”–—…\u0000\p{Extended_Pictographic}\p{Regional_Indicator}`
const URL_CHARS = String.raw`(?:&amp;|&#039;|[^${STOP}]|\((?:&amp;|[^${STOP}])*\))`
const BARE_URL = new RegExp(String.raw`https:\/\/${URL_CHARS}+`, 'gu')
const NAMED_URL = new RegExp(String.raw`(?:&quot;|“)((?:&amp;|&#039;|\u0000\d+\u0000|[^&\n“”\u0000]){1,160}?)(?:&quot;|”)\s?\((https:\/\/${URL_CHARS}+)\)`, 'gu')

// What ends a sentence isn't part of the address: . , ; : ! ? * ~ and a closing
// quote ("&amp;" keeps its ";"). One pass from the end, so it's quick on any length.
const trimUrl = (url: string) => {
  let end = url.length
  for (;;) {
    if (url.endsWith('&#039;', end)) { end -= 6; continue }
    const ch = url[end - 1]
    if (ch === ';' && url.endsWith('&amp;', end)) break
    if ('.,;:!?*~'.includes(ch)) { end--; continue }
    break
  }
  return [url.slice(0, end), url.slice(end)]
}

// Code, links and pasted addresses are set aside first (so formatting can't
// reach inside them, and an address isn't linked twice), then put back.
function inline(escaped: string) {
  const kept: string[] = []
  const keep = (html: string) => `\u0000${kept.push(html) - 1}\u0000`
  const text = escaped.replace(/\u0000/g, '')
    .replace(/`(.+?)`/g, (_m, code: string) => keep(`<code>${code}</code>`))
    .replace(/\[([^\]]+)\]\((https:\/\/[^\s)\x5c]+|\/(?![/\x5c])[^\s)\x5c]*)\)/g, (_m, t: string, url: string) => keep(link(format(t), url)))
    .replace(NAMED_URL, (_m, t: string, url: string) => keep(link(format(t), url)))
    .replace(BARE_URL, (url) => {
      const [href, after] = trimUrl(url)
      // "https://" on its own (or followed by dots) is a word about links, not a link
      return /^https:\/\/[\p{L}\p{N}]/u.test(href) ? keep(link(href, href)) + after : url
    })
  // A kept piece can hold earlier ones (code inside a link's text), so put back until none are left
  const restore = (s: string): string => s.replace(/\u0000(\d+)\u0000/g, (_m, i: string) => restore(kept[Number(i)] ?? ''))
  return restore(format(text))
}

// "| a | b |" -> ["a", "b"]
const cells = (line: string) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim())
const isTableRow = (line: string) => /^\s*\|.*\|\s*$/.test(line)
const isTableRule = (line: string) => /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(line)

export function renderBlog(text: string): string {
  if (!text) return ''
  let html = ''
  let list: 'ul' | 'ol' | null = null
  const openList = (kind: 'ul' | 'ol') => {
    if (list === kind) return
    if (list) html += `</${list}>`
    html += `<${kind}>`
    list = kind
  }
  const closeList = () => { if (list) { html += `</${list}>`; list = null } }

  const lines = text.split('\n').map((l) => l.replace(/\r$/, ''))
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // Code block: everything up to the closing ``` is shown exactly as written
    if (line.trim().startsWith('```')) {
      closeList()
      const code: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) { code.push(lines[i]); i++ }
      html += `<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`
      continue
    }
    // Table: a header row, a "---" rule, then body rows
    if (isTableRow(line) && i + 1 < lines.length && isTableRule(lines[i + 1])) {
      closeList()
      html += '<div class="md-table"><table><thead><tr>' + cells(line).map((c) => `<th>${inline(escapeHtml(c))}</th>`).join('') + '</tr></thead><tbody>'
      i += 2
      while (i < lines.length && isTableRow(lines[i])) {
        html += '<tr>' + cells(lines[i]).map((c) => `<td>${inline(escapeHtml(c))}</td>`).join('') + '</tr>'
        i++
      }
      i--
      html += '</tbody></table></div>'
      continue
    }
    // Checklist item
    const task = line.match(/^- \[( |x|X)\] (.*)$/)
    if (task) {
      openList('ul')
      const done = task[1] !== ' '
      html += `<li class="md-task"><input type="checkbox" disabled${done ? ' checked' : ''} aria-label="${done ? 'Done' : 'Not done'}" /> ${inline(escapeHtml(task[2]))}</li>`
      continue
    }
    if (line.startsWith('- ')) { openList('ul'); html += `<li>${inline(escapeHtml(line.slice(2)))}</li>`; continue }
    const num = line.match(/^\d+\. (.*)$/)
    if (num) { openList('ol'); html += `<li>${inline(escapeHtml(num[1]))}</li>`; continue }
    closeList()
    if (line.trim() === '') continue
    const img = line.trim().match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/)
    if (img && SAFE_URL.test(img[2])) {
      const caption = img[1].trim()
      html += `<figure><img src="${escapeHtml(img[2])}" alt="${escapeHtml(caption)}" loading="lazy" decoding="async" />${caption ? `<figcaption>${inline(escapeHtml(caption))}</figcaption>` : ''}</figure>`
      continue
    }
    if (line.startsWith('### ')) { html += `<h3>${inline(escapeHtml(line.slice(4)))}</h3>`; continue }
    if (line.startsWith('## '))  { html += `<h2>${inline(escapeHtml(line.slice(3)))}</h2>`; continue }
    if (line.startsWith('# '))   { html += `<h2>${inline(escapeHtml(line.slice(2)))}</h2>`; continue }
    if (line.startsWith('> '))   { html += `<blockquote>${inline(escapeHtml(line.slice(2)))}</blockquote>`; continue }
    html += `<p>${inline(escapeHtml(line))}</p>`
  }
  closeList()
  return html
}
