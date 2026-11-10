import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import '../styles/messages.css'
import { sized } from '../lib/img'
import { shrinkImage } from '../lib/shrinkImage'
import { ChatOfferCard, ChatOrderCard, type ChatOffer, type ChatOrder } from '../components/ChatCards'
import OfferSheet from '../components/OfferSheet'

type Person = { id: string; username: string | null; name: string; avatarUrl: string | null }
// The store product a chat is about ("Contact seller" on a product page)
type ChatProduct = { id: string; name: string; image: string; price: number; currency: string; priceOnRequest?: boolean; removed?: boolean; sellerId?: string | null }
type Conv = { id: string; participants: Person[]; lastMessage: { content: string; createdAt: string; senderId: string } | null; unread: number; updatedAt: string; product?: ChatProduct | null
  // A private job chat (Selection jobs): the job it's about
  job?: { id: string; title: string } | null }
// Files sent with a message: links from private storage that last an hour
type MsgFile = { name: string; type: string; size: number; isImage: boolean; url: string | null }
// 2026-11-10: a message about a store order carries an order card (kind ORDER:
// the automatic "order placed" message), and a seller's private offer an offer card
type Msg = { id: string; content: string; createdAt: string; senderId: string; files?: MsgFile[]; kind?: string | null; order?: ChatOrder | null; offer?: ChatOffer | null }
type Typing = { id: string; name: string }

// What can be sent (backend chatFiles.service): photos, PDF, Word, Excel, text; 4 files of 10 MB
const MAX_FILES = 4
const MAX_FILE_BYTES = 10 * 1024 * 1024
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,.doc,.docx,.xls,.xlsx,.txt,.pdf'
const fileSize = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)
const fileIcon = (type: string) => (type === 'application/pdf' ? 'ti-file-type-pdf' : /sheet|excel/.test(type) ? 'ti-file-spreadsheet' : 'ti-file-text')

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
  // The seller's "Send an offer" form (F13), and what it said after sending
  const [offering, setOffering] = useState(false)
  const [offerNote, setOfferNote] = useState('')
  const threadRef = useRef<HTMLDivElement>(null)
  const stick = useRef(true)
  // Files picked to send with the next message, and the other person typing
  const [files, setFiles] = useState<File[]>([])
  const [typing, setTyping] = useState<Typing[]>([])
  const fileInput = useRef<HTMLInputElement>(null)
  const lastTypingSent = useRef(0)
  const lastMsgId = useRef<string | null>(null)
  const previews = useMemo(() => files.map((f) => (f.type.startsWith('image/') ? URL.createObjectURL(f) : '')), [files])
  useEffect(() => () => previews.forEach((u) => u && URL.revokeObjectURL(u)), [previews])

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
    setMsgs(null); setErr(''); setOfferNote(''); setTyping([]); setFiles([]); stick.current = true; lastMsgId.current = null
    if (!openId) return
    loadThread(openId)
    // Every few seconds a light check: who's typing, and whether a new message
    // arrived (only then is the whole chat loaded again). A full reload every
    // 30 seconds as a backstop.
    const check = () => {
      if (document.hidden) return
      apiRequest<{ typing: Typing[]; lastMessageId: string | null }>(`/messages/${openId}/status`)
        .then((d) => {
          setTyping(Array.isArray(d?.typing) ? d.typing : [])
          if (d?.lastMessageId && d.lastMessageId !== lastMsgId.current) loadThread(openId)
        })
        .catch(() => setTyping([]))
    }
    const t = setInterval(check, 3000)
    const full = setInterval(() => { if (!document.hidden) loadThread(openId) }, 30000)
    return () => { clearInterval(t); clearInterval(full) }
  }, [openId, loadThread])

  // Keep the newest message in view unless the reader scrolled up
  useEffect(() => {
    lastMsgId.current = msgs?.length ? msgs[msgs.length - 1].id : null
    const el = threadRef.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [msgs, typing.length])

  // Tell the other person we're typing, at most every 3 seconds
  const onDraft = (value: string) => {
    setDraft(value)
    if (!openId || !value.trim() || Date.now() - lastTypingSent.current < 3000) return
    lastTypingSent.current = Date.now()
    apiRequest(`/messages/${openId}/typing`, { method: 'POST' }).catch(() => {})
  }

  const pickFiles = (list: FileList | null) => {
    if (!list?.length) return
    const picked = Array.from(list)
    const tooBig = picked.find((f) => f.size > MAX_FILE_BYTES && !f.type.startsWith('image/'))
    if (tooBig) { setErr(`${tooBig.name} is over 10 MB.`); return }
    setErr('')
    setFiles((cur) => {
      const next = [...cur, ...picked]
      if (next.length > MAX_FILES) setErr(`You can send up to ${MAX_FILES} files at a time.`)
      return next.slice(0, MAX_FILES)
    })
  }

  useEffect(() => {
    if (!productParam) { setPendingProduct(null); return }
    apiRequest<any>('/store/' + encodeURIComponent(productParam), { auth: false })
      .then((d) => setPendingProduct(d?.id ? { id: d.id, name: d.title || d.name, image: d.image || '', price: Number(d.price), currency: d.currency, priceOnRequest: !!d.priceOnRequest, sellerId: d.sellerId || null } : null))
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
  // The seller can send the other person a private offer for their own product (F13)
  const canOffer = !!openId && !active?.job && !!chatProduct && !chatProduct.removed && !!user?.id && chatProduct.sellerId === user.id
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!convs) return []
    return s ? convs.filter((c) => c.participants.some((p) => (p.name + ' ' + (p.username || '')).toLowerCase().includes(s))) : convs
  }, [convs, q])

  const send = async () => {
    const content = draft.trim()
    if ((!content && !files.length) || (!openId && !newTo) || sending) return
    setSending(true); setErr('')
    try {
      const about = productParam ? { productId: productParam } : {}
      let sent: { conversationId?: string } | undefined
      if (files.length) {
        // Big phone photos are made smaller first (other files go as they are)
        const ready = await Promise.all(files.map((f) => (f.type.startsWith('image/') && f.type !== 'image/gif'
          ? shrinkImage(f, { maxBytes: MAX_FILE_BYTES, label: f.name }).catch(() => f) : Promise.resolve(f))))
        const big = ready.find((f) => f.size > MAX_FILE_BYTES)
        if (big) throw new Error(`${big.name} is over 10 MB.`)
        const fd = new FormData()
        if (openId) fd.append('conversationId', openId); else fd.append('recipientId', newTo!.id)
        fd.append('content', content)
        if (productParam) fd.append('productId', productParam)
        ready.forEach((f) => fd.append('files', f, f.name))
        sent = await apiRequest<{ conversationId?: string }>('/messages', { method: 'POST', body: fd, timeoutMs: 180000 })
      } else {
        sent = await apiRequest<{ conversationId?: string }>('/messages', { method: 'POST', body: JSON.stringify(openId ? { conversationId: openId, content, ...about } : { recipientId: newTo!.id, content, ...about }) })
      }
      setDraft(''); setFiles([]); lastTypingSent.current = 0
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

  let lastDay = ''
  return (
    <Layout>
      <div className="ms-wrap">
        <div className={`ms-shell ${composing ? 'open' : ''}`}>
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
              <div className="ms-empty"><div><i className="ti ti-messages" />{err || 'Pick a conversation'}</div></div>
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
                {chatProduct && (
                  <div className="ms-product">
                    <span className="ms-product-img">{chatProduct.image ? <img src={sized(chatProduct.image, 56)} alt="" /> : <i className="ti ti-package" />}</span>
                    <span className="ms-product-mid">
                      <small>About this product</small>
                      <b>{chatProduct.name}</b>
                      <small>{chatProduct.removed ? 'No longer listed' : chatProduct.priceOnRequest ? 'Price on request' : chatProduct.currency === 'NGN' ? '₦' + chatProduct.price.toLocaleString('en-US', { maximumFractionDigits: 2 }) : `${chatProduct.price} ${chatProduct.currency}`}</small>
                    </span>
                    {canOffer
                      ? <button type="button" className="ms-offer-btn" onClick={() => { setOfferNote(''); setOffering(true) }}><i className="ti ti-receipt" aria-hidden="true" /> Send an offer</button>
                      : !chatProduct.removed && <Link className="ms-product-btn" to={`/store/${chatProduct.id}`}>View product</Link>}
                  </div>
                )}
                {offerNote && <div className="ms-err" role="status" style={{ color: 'var(--text2)' }}>{offerNote}</div>}
                <div className="ms-thread" ref={threadRef} onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60 }}>
                  {msgs === null ? <div className="ms-empty">Loading…</div>
                    : msgs.length === 0 ? <div className="ms-empty">{newTo ? `Start a conversation with @${newTo.username}.` : 'No messages yet. Say hello.'}</div>
                    : msgs.map((m) => {
                      const day = new Date(m.createdAt).toDateString()
                      const showDay = day !== lastDay
                      lastDay = day
                      return (
                        <div key={m.id} style={{ display: 'contents' }}>
                          {showDay && <div className="ms-day">{new Date(m.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>}
                          <div className={`ms-msg ${m.senderId === user?.id ? 'me' : ''}`}>
                            {m.offer && <ChatOfferCard offer={m.offer} onChanged={() => openId && loadThread(openId)} />}
                            {m.order && <ChatOrderCard order={m.order} auto={m.kind === 'ORDER'} />}
                            {!!m.files?.length && (
                              <div className="ms-files">
                                {m.files.map((f, i) => (f.isImage && f.url
                                  ? <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"><img className="ms-file-img" src={f.url} alt={f.name} loading="lazy" /></a>
                                  : <a key={i} className="ms-file" href={f.url || undefined} target="_blank" rel="noopener noreferrer" download={f.name}>
                                      <i className={`ti ${fileIcon(f.type)}`} aria-hidden="true" /><span>{f.name}</span><small>{fileSize(f.size)}</small>
                                    </a>))}
                              </div>
                            )}
                            {/* An offer card already says what the offer text says */}
                            {m.content && !m.offer && <Linkified text={m.content} />}
                            <time>{new Date(m.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</time>
                          </div>
                        </div>
                      )
                    })}
                  {typing.length > 0 && (
                    <div className="ms-typing" aria-live="polite">
                      <span className="ms-dots" aria-hidden="true"><i /><i /><i /></span>
                      {typing[0].name} is typing…
                    </div>
                  )}
                </div>
                {err && <div className="ms-err" role="alert">{err}</div>}
                {files.length > 0 && (
                  <div className="ms-pending">
                    {files.map((f, i) => (
                      <span key={i} className="ms-chip">
                        {previews[i] ? <img src={previews[i]} alt="" /> : <i className={`ti ${fileIcon(f.type)}`} aria-hidden="true" />}
                        <span>{f.name}</span>
                        <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles((l) => l.filter((_, j) => j !== i))}><i className="ti ti-x" /></button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="ms-compose">
                  <input ref={fileInput} type="file" multiple accept={ACCEPT} hidden onChange={(e) => { pickFiles(e.target.files); e.target.value = '' }} />
                  <button type="button" className="ms-attach" onClick={() => fileInput.current?.click()} disabled={sending || files.length >= MAX_FILES} aria-label="Attach photos or files" title="Attach photos or files"><i className="ti ti-paperclip" /></button>
                  <textarea
                    value={draft}
                    maxLength={5000}
                    rows={1}
                    placeholder={files.length ? 'Add a message (optional)' : 'Write a message'}
                    aria-label="Message"
                    onChange={(e) => onDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                  />
                  <button className="ms-send" onClick={send} disabled={(!draft.trim() && !files.length) || sending}><i className="ti ti-send" /> {sending ? 'Sending…' : 'Send'}</button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
      {offering && chatProduct && openId && (
        <OfferSheet product={{ id: chatProduct.id, name: chatProduct.name, currency: chatProduct.currency, price: chatProduct.price, priceOnRequest: chatProduct.priceOnRequest }}
          conversationId={openId} buyer={other?.username || undefined}
          onClose={() => setOffering(false)}
          onSent={(msg) => { setOffering(false); setOfferNote(msg); stick.current = true; loadThread(openId); loadConvs() }} />
      )}
    </Layout>
  )
}
