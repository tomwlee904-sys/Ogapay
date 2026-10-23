// The blog's small markdown, shared by the article page and the editor preview.
// Lines: "## " / "### " headings, "- " and "1. " lists, "> " quotes, and on a line
// of its own "![caption](image link)" for a picture, "- [ ] " / "- [x] " checklists,
// tables ("| a | b |" rows with a "| --- | --- |" line under the header) and code
// blocks between ``` lines. Inline: **bold**, *italic*, ~~struck out~~, `code` and
// [text](link). Everything is escaped first, and links and pictures
// only accept https:// addresses or paths on this site, so a post can't carry
// HTML or javascript: links.

function escapeHtml(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}

const SAFE_URL = /^(https:\/\/[^\s"'<>]+|\/(?!\/)[^\s"'<>]*)$/

function inline(escaped: string) {
  return escaped
    .replace(/\[([^\]]+)\]\((https:\/\/[^\s)]+|\/(?!\/)[^\s)]*)\)/g, (_m, text: string, url: string) =>
      url.startsWith('/') ? `<a href="${url}">${text}</a>` : `<a href="${url}" target="_blank" rel="noopener nofollow ugc">${text}</a>`)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^\w*])\*(?!\s)(.+?)\*(?!\w)/g, '$1<em>$2</em>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
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
