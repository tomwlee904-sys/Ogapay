import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import '../styles/messages.css'

type Person = { id: string; username: string | null; name: string; avatarUrl: string | null }
type Conv = { id: string; participants: Person[]; lastMessage: { content: string; createdAt: string; senderId: string } | null; unread: number; updatedAt: string }
type Msg = { id: string; content: string; createdAt: string; senderId: string }

const shortTime = (d: string) => {
  const t = new Date(d)
  const now = new Date()
  if (t.toDateString() === now.toDateString()) return t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const days = Math.floor((now.getTime() - t.getTime()) / 86400000)
  if (days < 7) return t.toLocaleDateString('en-US', { weekday: 'short' })
  return t.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Plain text with http(s) links made clickable (React escapes the rest)
function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g)
  return <>{parts.map((p, i) => (/^https?:\/\//.test(p) ? <a key={i} href={p} target="_blank" rel="noopener noreferrer nofollow">{p}</a> : p))}</>
}

function Avatar({ p }: { p?: Person }) {
  return <span className="ms-av">{p?.avatarUrl ? <img src={p.avatarUrl} alt="" /> : (p?.name?.trim()?.[0] || p?.username?.[0] || '?').toUpperCase()}</span>
}

export default function Messages() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const openId = params.get('c')
  const [convs, setConvs] = useState<Conv[] | null>(null)
  const [msgs, setMsgs] = useState<Msg[] | null>(null)
  const [q, setQ] = useState('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState('')
  const threadRef = useRef<HTMLDivElement>(null)
  const stick = useRef(true)

  const loadConvs = useCallback(() => {
    apiRequest<Conv[]>('/messages').then((d) => setConvs(Array.isArray(d) ? d : [])).catch(() => setConvs((c) => c || []))
  }, [])

  const loadThread = useCallback((id: string) => {
    apiRequest<Msg[]>('/messages/' + id)
      .then((d) => { setMsgs(Array.isArray(d) ? d : []); setConvs((cs) => cs?.map((c) => (c.id === id ? { ...c, unread: 0 } : c)) || cs) })
      .catch(() => setMsgs([]))
  }, [])

  useEffect(() => {
    loadConvs()
    const t = setInterval(loadConvs, 30000)
    return () => clearInterval(t)
  }, [loadConvs])

  useEffect(() => {
    setMsgs(null); setErr(''); stick.current = true
    if (!openId) return
    loadThread(openId)
    const t = setInterval(() => loadThread(openId), 10000)
    return () => clearInterval(t)
  }, [openId, loadThread])

  // Keep the newest message in view unless the reader scrolled up
  useEffect(() => {
    const el = threadRef.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [msgs])

  const active = convs?.find((c) => c.id === openId)
  const other = active?.participants[0]
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!convs) return []
    return s ? convs.filter((c) => c.participants.some((p) => (p.name + ' ' + (p.username || '')).toLowerCase().includes(s))) : convs
  }, [convs, q])

  const send = async () => {
    const content = draft.trim()
    if (!content || !openId || sending) return
    setSending(true); setErr('')
    try {
      await apiRequest('/messages', { method: 'POST', body: JSON.stringify({ conversationId: openId, content }) })
      setDraft('')
      stick.current = true
      loadThread(openId)
      loadConvs()
    } catch (e: any) {
      setErr(e?.message || 'Message not sent')
    }
    setSending(false)
  }

  const open = (id: string | null) => setParams(id ? { c: id } : {}, { replace: false })

  let lastDay = ''
  return (
    <Layout>
      <div className="ms-wrap">
        <div className={`ms-shell ${openId ? 'open' : ''}`}>
          <aside className="ms-side">
            <div className="ms-side-h">
              <h1>Messages</h1>
              <label className="ms-search"><i className="ti ti-search" /><input placeholder="Search people" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search conversations" /></label>
            </div>
            <div className="ms-list">
              {convs === null ? (
                <div className="ms-empty">Loading…</div>
              ) : shown.length === 0 ? (
                <div className="ms-empty"><div><i className="ti ti-message-off" />{q ? 'No matches' : 'No conversations yet. Chats start when you hire someone or contact a seller.'}</div></div>
              ) : shown.map((c) => {
                const p = c.participants[0]
                const mine = c.lastMessage?.senderId === user?.id
                return (
                  <button key={c.id} className={`ms-conv ${c.id === openId ? 'on' : ''} ${c.unread ? 'unread' : ''}`} onClick={() => open(c.id)}>
                    <Avatar p={p} />
                    <span className="mid">
                      <b>{p?.name?.trim() || p?.username || 'OgaPay user'}</b>
                      <small>{c.lastMessage ? (mine ? 'You: ' : '') + c.lastMessage.content.split('\n')[0] : 'No messages yet'}</small>
                    </span>
                    <span className="end">
                      {c.lastMessage && <span>{shortTime(c.lastMessage.createdAt)}</span>}
                      {c.unread > 0 && <span className="ms-badge">{c.unread}</span>}
                    </span>
                  </button>
                )
              })}
            </div>
          </aside>

          <section className="ms-main">
            {!openId ? (
              <div className="ms-empty"><div><i className="ti ti-messages" />Pick a conversation</div></div>
            ) : (
              <>
                <div className="ms-main-h">
                  <button className="ms-back" onClick={() => open(null)} aria-label="Back to conversations"><i className="ti ti-arrow-left" /></button>
                  <Avatar p={other} />
                  <div style={{ minWidth: 0 }}>
                    {other?.username ? <Link to={`/user/${other.username}`}>{other.name?.trim() || other.username}</Link> : <b>{other?.name || 'Conversation'}</b>}
                    {other?.username && <small>@{other.username}</small>}
                  </div>
                </div>
                <div className="ms-thread" ref={threadRef} onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60 }}>
                  {msgs === null ? <div className="ms-empty">Loading…</div>
                    : msgs.length === 0 ? <div className="ms-empty">No messages yet. Say hello.</div>
                    : msgs.map((m) => {
                      const day = new Date(m.createdAt).toDateString()
                      const showDay = day !== lastDay
                      lastDay = day
                      return (
                        <div key={m.id} style={{ display: 'contents' }}>
                          {showDay && <div className="ms-day">{new Date(m.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>}
                          <div className={`ms-msg ${m.senderId === user?.id ? 'me' : ''}`}>
                            <Linkified text={m.content} />
                            <time>{new Date(m.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</time>
                          </div>
                        </div>
                      )
                    })}
                </div>
                {err && <div className="ms-err" role="alert">{err}</div>}
                <div className="ms-compose">
                  <textarea
                    value={draft}
                    maxLength={5000}
                    rows={1}
                    placeholder="Write a message"
                    aria-label="Message"
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                  />
                  <button className="ms-send" onClick={send} disabled={!draft.trim() || sending}><i className="ti ti-send" /> Send</button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </Layout>
  )
}
