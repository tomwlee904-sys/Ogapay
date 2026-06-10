interface Props {
  text: string
}

export default function DescriptionRenderer({ text }: Props) {
  const lines = text.split('\n').filter(Boolean)
  const elements: JSX.Element[] = []
  let listBuffer: { type: 'ol' | 'ul'; items: JSX.Element[] } | null = null

  function flushList(key: number) {
    if (!listBuffer) return
    const Tag = listBuffer.type === 'ol' ? 'ol' : 'ul'
    elements.push(
      <Tag key={key} style={{ margin: '8px 0', paddingLeft: 22, color: 'var(--text2)', fontSize: 13, lineHeight: 1.8 }}>
        {listBuffer.items}
      </Tag>
    )
    listBuffer = null
  }

  lines.forEach((line, i) => {
    const trimmed = line.trim()

    // Ordered list
    if (/^\d+[\.\)]\s/.test(trimmed)) {
      if (listBuffer?.type === 'ol') {
        listBuffer.items.push(<li key={listBuffer.items.length}>{trimmed.replace(/^\d+[\.\)]\s/, '')}</li>)
      } else {
        flushList(i)
        listBuffer = { type: 'ol', items: [<li key={0}>{trimmed.replace(/^\d+[\.\)]\s/, '')}</li>] }
      }
      return
    }

    // Unordered list
    if (/^[•\-\*]\s/.test(trimmed)) {
      if (listBuffer?.type === 'ul') {
        listBuffer.items.push(<li key={listBuffer.items.length}>{trimmed.replace(/^[•\-\*]\s/, '')}</li>)
      } else {
        flushList(i)
        listBuffer = { type: 'ul', items: [<li key={0}>{trimmed.replace(/^[•\-\*]\s/, '')}</li>] }
      }
      return
    }

    flushList(i)

    // Emoji-start line → section header
    if (/^[\u{1F000}-\u{1FFFF}]/u.test(trimmed) || /^[\u2600-\u27BF]/.test(trimmed)) {
      elements.push(
        <div key={i} style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginTop: i > 0 ? 14 : 0, marginBottom: 4 }}>
          {trimmed}
        </div>
      )
      return
    }

    // Regular paragraph
    elements.push(
      <p key={i} style={{ margin: '6px 0', lineHeight: 1.7, color: 'var(--text2)', fontSize: 13 }}>
        {trimmed}
      </p>
    )
  })

  flushList(lines.length)

  return <>{elements}</>
}
