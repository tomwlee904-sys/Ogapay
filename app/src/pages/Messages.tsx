import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import LoadError from '../components/LoadError'
import { apiRequest } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import '../styles/messages.css'
import { sized } from '../lib/img'

type Person = { id: string; username: string | null; name: string; avatarUrl: string | null }
// The store product a chat is about ("Contact seller" on a product page)
type ChatProduct = { id: string; name: string; image: string; price: number; currency: string; priceOnRequest?: boolean; removed?: boolean }
type Conv = { id: string; participants: Person[]; lastMessage: { content: string; createdAt: string; senderId: string } | null; unread: number; updatedAt: string; product?: ChatProduct | null
  // A private job chat (Selection jobs): the job it's about
  job?: { id: string; title: string } | null }
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
  return <span className="ms-av">{p?.avatarUrl ? <img src={sized(p.avatarUrl, 40, true)} alt="" /> : (p?.name?.trim()?.[0] || p?.username?.[0] || '?').toUpperCase()}</span>
}

export default function Messages() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const openId = params.get('c')
  // /messages?user=<username> (e.g. "Contact seller"): open your chat with them, or start one
  const toUser = params.get('user')
  // &product=<id>: the chat is about this product; it's sent with the next message
  const productParam = params.get('product')
  const [pendingProduct, setPendingProduct] = useState<ChatProduct | null>(null)
  const [newTo, setNewTo] = useState<Person | null>(null)
  const [convs, setConvs] = useState<Conv[] | null>(null)
  const [msgs, setMsgs] = useState<Msg[] | null>(null)
  const [q, setQ] = useState('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState('')
  // The list or the open chat didn't load (never shown as "no conversations")
  const [convsFailed, setConvsFailed] = useState(false)
  const [threadFailed, setThreadFailed] = useState(false)
  // New message: type a username, then the chat opens (?user=, below)
  const [newOpen, setNewOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const threadRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const stick = useRef(true)

  const loadConvs = useCallback(() => {
    apiRequest<Conv[]>('/messages').then((d) => { setConvs(Array.isArray(d) ? d : []); setConvsFailed(false) }).catch(() => setConvsFailed(true))
  }, [])

  const loadThread = useCallback((id: string) => {
    apiRequest<Msg[]>('/messages/' + id)
      .then((d) => { setMsgs(Array.isArray(d) ? d : []); setThreadFailed(false); setConvs((cs) => cs?.map((c) => (c.id === id ? { ...c, unread: 0 } : c)) || cs) })
      .catch(() => setThreadFailed(true))
  }, [])

  useEffect(() => {
    loadConvs()
    const t = setInterval(loadConvs, 30000)
    return () => clearInterval(t)
  }, [loadConvs])

  useEffect(() => {
    setMsgs(null); setErr(''); setThreadFailed(false); stick.current = true
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

  useEffect(() => {
    if (!productParam) { setPendingProduct(null); return }
    apiRequest<any>('/store/' + encodeURIComponent(productParam), { auth: false })
      .then((d) => setPendingProduct(d?.id ? { id: d.id, name: d.title || d.name, image: d.image || '', price: Number(d.price), currency: d.currency, priceOnRequest: !!d.priceOnRequest } : null))
      .catch(() => setPendingProduct(null))
  }, [productParam])

  useEffect(() => {
    if (!toUser || convs === null) return
    const name = toUser.replace(/^@/, '').toLowerCase()
    const hit = convs.find((c) => !c.job && c.participants.some((p) => p.username?.toLowerCase() === name))
    if (hit) { setParams(productParam ? { c: hit.id, product: productParam } : { c: hit.id }, { replace: true }); return }
    if (name === user?.username?.toLowerCase()) { setParams({}, { replace: true }); return }
    apiRequest<any>('/users/' + encodeURIComponent(name))
      .then((u) => { setNewTo({ id: u.id, username: u.username, name: [u.firstName, u.lastName].filter(Boolean).join(' '), avatarUrl: u.avatarUrl || null }); setMsgs([]) })
      .catch(() => { setErr(`No one on OgaPay is called @${name}`); setParams({}, { replace: true }) })
  }, [toUser, convs, user?.username])

  const active = convs?.find((c) => c.id === openId)
  const other = active?.participants[0] || (!openId ? newTo || undefined : undefined)
  const composing = !!openId || !!newTo
  const chatProduct = pendingProduct || active?.product || null
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!convs) return []
    return s ? convs.filter((c) => c.participants.some((p) => (p.name + ' ' + (p.username || '')).toLowerCase().includes(s))) : convs
  }, [convs, q])

  const send = async () => {
    const content = draft.trim()
    if (!content || (!openId && !newTo) || sending) return
    setSending(true); setErr('')
    try {
      const about = productParam ? { productId: productParam } : {}
      const sent = await apiRequest<{ conversationId?: string }>('/messages', { method: 'POST', body: JSON.stringify(openId ? { conversationId: openId, content, ...about } : { recipientId: newTo!.id, content, ...about }) })
      setDraft('')
      stick.current = true
      if (!openId && sent?.conversationId) { setNewTo(null); setParams({ c: sent.conversationId }, { replace: true }) }
      else if (productParam && openId) setParams({ c: openId }, { replace: true })
      else if (openId) loadThread(openId)
      loadConvs()
    } catch (e: any) {
      setErr(e?.message || 'Message not sent')
    }
    setSending(false)
  }

  const open = (id: string | null) => { setNewTo(null); setParams(id ? { c: id } : {}, { replace: false }) }
  const startNew = (e: React.FormEvent) => {
    e.preventDefault()
    const name = newName.trim().replace(/^@/, '')
    if (!name) return
    setNewOpen(false); setNewName(''); setErr('')
    setParams({ user: name })
  }

  // Phones: an open chat is a full-screen view. The class lets the layout hide
  // the bottom bar while a chat is open (shared change, see messages.css)
  useEffect(() => {
    document.body.classList.toggle('ms-chat-open', composing)
    return () => document.body.classList.remove('ms-chat-open')
  }, [composing])

  // The message box grows with what you type, up to about 5 lines
  const grow = (el: HTMLTextAreaElement) => { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 140) + 'px' }
  useEffect(() => { if (!draft && taRef.current) taRef.current.style.height = '' }, [draft])

  // No chats at all: one message across the whole box, with somewhere to go
  const noChats = convs !== null && convs.length === 0 && !q && !composing

  let lastDay = ''
  return (
    <Layout>
      <div className="ms-wrap">
        <div className={`ms-shell ${composing ? 'open' : ''} ${noChats ? 'solo' : ''}`}>
          <aside className="ms-side">
            <div className="ms-side-h">
              <div className="ms-title-row">
                <h1>Messages</h1>
                <button type="button" className="ui-btn ui-btn-ghost ui-btn-icon ms-new" aria-label="New message" aria-expanded={newOpen} onClick={() => setNewOpen((o) => !o)}><i className={`ti ${newOpen ? 'ti-x' : 'ti-pencil'}`} /></button>
              </div>
              {newOpen && (
                <form className="ms-newform" onSubmit={startNew}>
                  <label className="ms-search"><span aria-hidden="true">@</span><input autoFocus autoCapitalize="off" spellCheck={false} placeholder="Their username" value={newName} onChange={(e) => setNewName(e.target.value)} aria-label="Username to message" /></label>
                  <button type="submit" className="ui-btn ui-btn-dark" disabled={!newName.trim()}>Start</button>
                </form>
              )}
              {err && !composing && <div className="ms-err" role="alert" style={{ margin: '8px 0 0' }}>{err}</div>}
              {!noChats && <label className="ms-search"><i className="ti ti-search" /><input placeholder="Search chats" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search chats" /></label>}
            </div>
            <div className="ms-list">
              {convs === null ? (
                convsFailed ? <div className="ms-pad"><LoadError what="your messages" onRetry={loadConvs} /></div> : <div className="ms-empty">Loading…</div>
              ) : noChats ? (
                <div className="ms-empty"><div>
                  <i className="ti ti-messages" />
                  <b className="ms-empty-t">No messages yet</b>
                  Chats start when you hire someone, take a private job or contact a seller.
                  <div className="ms-empty-acts">
                    <Link className="ui-btn ui-btn-dark" to="/tasks">Find jobs</Link>
                    <Link className="ui-btn ui-btn-ghost" to="/store">Browse the store</Link>
                  </div>
                </div></div>
              ) : shown.length === 0 ? (
                <div className="ms-empty"><div><i className="ti ti-search" />No chats match “{q}”</div></div>
              ) : shown.map((c) => {
                const p = c.participants[0]
                const mine = c.lastMessage?.senderId === user?.id
                return (
                  <button key={c.id} className={`ms-conv ${c.id === openId ? 'on' : ''} ${c.unread ? 'unread' : ''}`} onClick={() => open(c.id)}>
                    <Avatar p={p} />
                    <span className="mid">
                      <b>{p?.name?.trim() || p?.username || 'OgaPay user'}</b>
                      {c.job && <small className="ms-job"><i className="ti ti-briefcase" aria-hidden="true" /> Job chat: {c.job.title}</small>}
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
            {!composing ? (
              <div className="ms-empty"><div><i className="ti ti-messages" />Pick a conversation</div></div>
            ) : (
              <>
                <div className="ms-main-h">
                  <button className="ms-back tap" onClick={() => open(null)} aria-label="Back to conversations"><i className="ti ti-arrow-left" /></button>
                  <Avatar p={other} />
                  <div style={{ minWidth: 0 }}>
                    {other?.username ? <Link to={`/user/${other.username}`}>{other.name?.trim() || other.username}</Link> : <b>{other?.name || 'Conversation'}</b>}
                    {other?.username && <small>@{other.username}</small>}
                  </div>
                </div>
                {chatProduct && (
                  <div className="ms-product">
                    <span className="ms-product-img">{chatProduct.image ? <img src={sized(chatProduct.image, 56)} alt="" /> : <i className="ti ti-package" />}</span>
                    <span className="ms-product-mid">
                      <small>About this product</small>
                      <b>{chatProduct.name}</b>
                      <small>{chatProduct.removed ? 'No longer listed' : chatProduct.priceOnRequest ? 'Price on request' : chatProduct.currency === 'NGN' ? '₦' + chatProduct.price.toLocaleString('en-US', { maximumFractionDigits: 2 }) : `${chatProduct.price} ${chatProduct.currency}`}</small>
                    </span>
                    {!chatProduct.removed && <Link className="ms-product-btn" to={`/store/${chatProduct.id}`}>View product</Link>}
                  </div>
                )}
                <div className="ms-thread" ref={threadRef} onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60 }}>
                  {msgs === null ? (threadFailed ? <LoadError what="this conversation" onRetry={() => openId && loadThread(openId)} /> : <div className="ms-empty">Loading…</div>)
                    : msgs.length === 0 ? <div className="ms-empty">{newTo ? `Start a conversation with @${newTo.username}.` : 'No messages yet. Say hello.'}</div>
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
                    ref={taRef}
                    value={draft}
                    maxLength={5000}
                    rows={1}
                    placeholder="Write a message"
                    aria-label="Message"
                    onChange={(e) => { setDraft(e.target.value); grow(e.currentTarget) }}
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
