import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import { useAuth } from '../context/AuthContext'

interface Participant {
  id: string; username: string; name: string; avatarUrl: string | null
}

interface Conversation {
  id: string; participants: Participant[]; lastMessage: { content: string; createdAt: string; senderId: string } | null; unread: number; updatedAt: string
}

interface Message {
  id: string; conversationId: string; senderId: string; content: string; readAt: string | null; createdAt: string; sender: { id: string; username: string; firstName: string; lastName: string; avatarUrl: string | null }
}

export default function Messages() {
  const navigate = useNavigate()
  const { isAuthed } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeConv, setActiveConv] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [msgLoading, setMsgLoading] = useState(false)
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)
  const [recipientInput, setRecipientInput] = useState('')
  const [contactResults, setContactResults] = useState<any[]>([])
  const chatEndRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<any>(null)

  const fetchConversations = useCallback(async () => {
    try {
      const data = await apiRequest<Conversation[]>('/messages')
      setConversations(Array.isArray(data) ? data : [])
    } catch {} finally { setLoading(false) }
  }, [])

  const fetchMessages = useCallback(async (convId: string) => {
    setMsgLoading(true)
    try {
      const data = await apiRequest<Message[]>('/messages/' + convId)
      setMessages(Array.isArray(data) ? data : [])
      setConversations(prev => prev.map(c => c.id === convId ? { ...c, unread: 0 } : c))
    } catch {} finally { setMsgLoading(false) }
  }, [])

  useEffect(() => { fetchConversations() }, [fetchConversations])

  // Polling for new messages in active conversation
  useEffect(() => {
    if (!activeConv) return
    pollRef.current = setInterval(() => fetchMessages(activeConv), 5000)
    return () => clearInterval(pollRef.current)
  }, [activeConv, fetchMessages])

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const openConversation = (convId: string) => {
    setActiveConv(convId)
    fetchMessages(convId)
  }

  const sendMessage = async () => {
    if (!newMsg.trim() || sending) return
    setSending(true)
    try {
      await apiRequest('/messages', {
        method: 'POST',
        body: JSON.stringify({ conversationId: activeConv, content: newMsg.trim() }),
      })
      setNewMsg('')
      if (activeConv) fetchMessages(activeConv)
      fetchConversations()
    } catch {} finally { setSending(false) }
  }

  const startNewChat = async () => {
    if (!recipientInput.trim()) return
    try {
      const { recipientId } = JSON.parse(recipientInput)
      await apiRequest('/messages', {
        method: 'POST',
        body: JSON.stringify({ recipientId, content: 'Hello!' }),
      })
      setShowNewChat(false)
      setRecipientInput('')
      fetchConversations()
    } catch {
      // Try as username
      try {
        const users = await apiRequest<any[]>('/users/search?q=' + encodeURIComponent(recipientInput.trim()))
        if (Array.isArray(users) && users.length > 0) {
          await apiRequest('/messages', {
            method: 'POST',
            body: JSON.stringify({ recipientId: users[0].id, content: 'Hello!' }),
          })
          setShowNewChat(false)
          setRecipientInput('')
          fetchConversations()
        }
      } catch {}
    }
  }

  const filtered = conversations.filter(c => {
    const q = search.toLowerCase()
    return c.participants.some(p => p.name.toLowerCase().includes(q) || p.username.toLowerCase().includes(q)) ||
      (c.lastMessage?.content || '').toLowerCase().includes(q)
  })

  const activeConvData = conversations.find(c => c.id === activeConv)
  const otherParticipant = activeConvData?.participants[0]

  return (
    <Layout>
      <style>{`
        .ms-container{display:flex;gap:0;height:calc(100vh - 140px);max-height:700px;border:1px solid var(--border);border-radius:14px;overflow:hidden;background:var(--card)}
        .ms-sidebar{width:340px;flex-shrink:0;border-right:1px solid var(--border);display:flex;flex-direction:column}
        .ms-main{flex:1;display:flex;flex-direction:column;min-width:0}
        .ms-sidebar-head{padding:14px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:8px}
        .ms-sidebar-head h2{font-size:16px;font-weight:800;margin:0;color:var(--text)}
        .ms-search{display:flex;align-items:center;gap:8px;padding:10px 16px;border-bottom:1px solid var(--border)}
        .ms-search input{flex:1;border:0;background:transparent;outline:0;color:var(--text);font-size:13px}
        .ms-search input::placeholder{color:var(--text3)}
        .ms-list{flex:1;overflow-y:auto}
        .ms-item{display:flex;gap:12px;padding:12px 16px;cursor:pointer;transition:background .15s;border-bottom:1px solid var(--border);text-decoration:none;color:inherit}
        .ms-item:hover,.ms-item.active{background:var(--bg2)}
        .ms-avatar{width:40px;height:40px;border-radius:50%;background:var(--bg2);display:grid;place-items:center;flex-shrink:0;font-size:12px;font-weight:800;color:var(--text);position:relative;overflow:hidden}
        .ms-avatar img{width:100%;height:100%;object-fit:cover}
        .ms-content{flex:1;min-width:0}
        .ms-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:2px}
        .ms-name{font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .ms-time{font-size:10px;color:var(--text3);flex-shrink:0}
        .ms-preview{font-size:12px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .ms-badge{background:var(--accent);color:#fff;font-size:10px;font-weight:800;min-width:20px;height:20px;border-radius:10px;display:grid;place-items:center;flex-shrink:0;padding:0 6px}
        .ms-chat-header{padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px}
        .ms-chat-header h3{font-size:15px;font-weight:700;margin:0;color:var(--text)}
        .ms-messages{flex:1;overflow-y:auto;padding:18px;display:flex;flex-direction:column;gap:10px}
        .ms-bubble{max-width:75%;padding:10px 14px;border-radius:14px;font-size:13px;line-height:1.5;word-wrap:break-word}
        .ms-bubble.sent{background:var(--accent);color:#fff;align-self:flex-end;border-bottom-right-radius:4px}
        .ms-bubble.received{background:var(--bg2);color:var(--text);align-self:flex-start;border-bottom-left-radius:4px}
        .ms-bubble-time{font-size:9px;opacity:.6;margin-top:4px;text-align:right}
        .ms-input-area{display:flex;align-items:center;gap:8px;padding:12px 18px;border-top:1px solid var(--border)}
        .ms-input-area input{flex:1;border:1px solid var(--border);border-radius:10px;padding:10px 14px;font-size:13px;background:var(--bg);color:var(--text);outline:0;font-family:inherit}
        .ms-input-area input:focus{border-color:var(--accent)}
        .ms-empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;color:var(--text3);text-align:center;flex:1;gap:8px}
        .ms-empty-state i{font-size:36px;opacity:.4}
        .ms-empty-state p{font-size:13px;margin:0}
        .ms-new-chat-overlay{position:fixed;inset:0;z-index:300;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.5)}
        .ms-new-chat-modal{background:var(--card);border-radius:16px;padding:24px;width:90%;max-width:400px}
        .ms-new-chat-modal h3{font-size:16px;font-weight:800;margin:0 0 12px;color:var(--text)}
        .ms-new-chat-modal input{width:100%;padding:10px 14px;border:1px solid var(--border);border-radius:10px;font-size:13px;background:var(--bg);color:var(--text);outline:0;box-sizing:border-box;font-family:inherit;margin-bottom:12px}
        .ms-new-chat-modal .actions{display:flex;gap:8px;justify-content:flex-end}
        .ms-new-chat-modal button{padding:9px 18px;border-radius:8px;border:none;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit}
        @media(max-width:700px){.ms-sidebar{width:100%;border-right:none}.ms-main{display:none}.ms-main.open{display:flex;position:fixed;inset:0;z-index:200;background:var(--card)}}
      `}</style>

      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 4px', color: 'var(--text)' }}>Messages</h1>
        <p style={{ fontSize: 13, color: 'var(--text2)', margin: 0 }}>Chat with task creators, community members, and support</p>
      </div>

      <div className="ms-container">
        {/* Sidebar */}
        <div className="ms-sidebar">
          <div className="ms-sidebar-head">
            <h2>Conversations</h2>
            <button onClick={() => setShowNewChat(true)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'none', cursor: 'pointer', color: 'var(--text2)', display: 'grid', placeItems: 'center', fontSize: 16 }}>
              <i className="ti ti-pencil" />
            </button>
          </div>
          <div className="ms-search">
            <i className="ti ti-search" style={{ color: 'var(--text3)', fontSize: 14 }} />
            <input type="text" placeholder="Search conversations..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="ms-list">
            {loading && <div className="ms-empty-state"><p>Loading...</p></div>}
            {!loading && filtered.length === 0 && (
              <div className="ms-empty-state">
                <i className="ti ti-message-off" />
                <p>No conversations yet</p>
              </div>
            )}
            {filtered.map(c => {
              const p = c.participants[0]
              return (
                <div key={c.id} className={"ms-item" + (activeConv === c.id ? ' active' : '')} onClick={() => openConversation(c.id)}>
                  <div className="ms-avatar">
                    {p?.avatarUrl ? <img src={p.avatarUrl} alt="" /> : <span>{(p?.name || '?').charAt(0)}</span>}
                  </div>
                  <div className="ms-content">
                    <div className="ms-head">
                      <span className="ms-name">{p?.name || p?.username || 'Unknown'}</span>
                      <span className="ms-time">{c.lastMessage ? new Date(c.lastMessage.createdAt).toLocaleDateString() : ''}</span>
                    </div>
                    <div className="ms-preview">{c.lastMessage?.content || 'No messages yet'}</div>
                  </div>
                  {c.unread > 0 && <span className="ms-badge">{c.unread}</span>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Chat area */}
        <div className={"ms-main" + (activeConv ? ' open' : '')}>
          {!activeConv ? (
            <div className="ms-empty-state">
              <i className="ti ti-message" />
              <p>Select a conversation to start chatting</p>
            </div>
          ) : (
            <>
              <div className="ms-chat-header">
                <button className="ms-back" onClick={() => setActiveConv(null)} style={{ display: 'none', background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 18, padding: 0 }}>
                  <i className="ti ti-arrow-left" />
                </button>
                <div className="ms-avatar" style={{ width: 36, height: 36, fontSize: 11 }}>
                  {otherParticipant?.avatarUrl ? <img src={otherParticipant.avatarUrl} alt="" /> : <span>{(otherParticipant?.name || '?').charAt(0)}</span>}
                </div>
                <h3>{otherParticipant?.name || otherParticipant?.username || 'Chat'}</h3>
              </div>
              <div className="ms-messages">
                {msgLoading && <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 12, padding: 20 }}>Loading messages...</div>}
                {!msgLoading && messages.length === 0 && <div className="ms-empty-state"><p>No messages yet. Say hello!</p></div>}
                {messages.map(m => {
                  const isMine = m.senderId === (JSON.parse(localStorage.getItem('ogapay_user') || '{}') as any)?.id
                  return (
                    <div key={m.id} className={"ms-bubble " + (isMine ? 'sent' : 'received')}>
                      {m.content}
                      <div className="ms-bubble-time">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  )
                })}
                <div ref={chatEndRef} />
              </div>
              <div className="ms-input-area">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMsg}
                  onChange={e => setNewMsg(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                />
                <button onClick={sendMessage} disabled={!newMsg.trim() || sending} style={{
                  width: 36, height: 36, borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff',
                  cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: 16, opacity: !newMsg.trim() || sending ? .5 : 1
                }}>
                  <i className="ti ti-send" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="ms-new-chat-overlay" onClick={() => setShowNewChat(false)}>
          <div className="ms-new-chat-modal" onClick={e => e.stopPropagation()}>
            <h3>New Conversation</h3>
            <input
              type="text"
              placeholder="Enter username or user ID"
              value={recipientInput}
              onChange={e => setRecipientInput(e.target.value)}
              autoFocus
            />
            <p style={{ fontSize: 11, color: 'var(--text3)', margin: '-8px 0 12px' }}>Paste a user ID or type a username to start a conversation</p>
            <div className="actions">
              <button onClick={() => setShowNewChat(false)} style={{ background: 'var(--bg2)', color: 'var(--text2)' }}>Cancel</button>
              <button onClick={startNewChat} disabled={!recipientInput.trim()} style={{ background: 'var(--accent)', color: '#fff', opacity: !recipientInput.trim() ? .5 : 1 }}>Start Chat</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
