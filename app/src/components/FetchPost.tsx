import { useState } from 'react'
import { apiRequest } from '../lib/api'
import { useToast } from '../components/Toast'

interface PostData {
  id: string
  url: string
  authorName: string
  authorUsername: string
  avatarUrl: string | null
  verified: boolean
  text: string
  media: string[]
  likes: number
  reposts: number
  replies: number
}

const C = {
  text: "var(--text)",
  accent: "var(--accent)",
  text2: "var(--text2)",
  text3: "var(--text3)",
  border: "var(--border)",
  card: "var(--card)",
  bg2: "var(--bg2)",
}

export default function FetchPost({ onPostFetched }: { onPostFetched?: (data: PostData) => void }) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [post, setPost] = useState<PostData | null>(null)
  const [error, setError] = useState('')
  const { toast } = useToast()

  const handleFetch = async () => {
    if (!url.trim()) {
      setError('Please enter a post URL')
      return
    }
    if (!url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/\d+/i)) {
      setError('Please enter a valid X/Twitter post URL')
      return
    }

    setLoading(true)
    setError('')
    setPost(null)

    try {
      const res = await apiRequest<any>('/twitter/fetch-post', {
        method: 'POST',
        body: JSON.stringify({ url: url.trim() }),
      })
      const data = res?.data || res
      if (data && data.id) {
        setPost(data)
        if (onPostFetched) onPostFetched(data)
      } else {
        setError('Could not fetch post data')
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch post')
      toast(e?.message || "Failed to fetch post", "error")
    }
    setLoading(false)
  }

  return (
    <div style={{
      border: `1px solid ${C.border}`, borderRadius: 16,
      background: C.card, overflow: 'hidden',
    }}>
      <div style={{
        padding: '16px 20px', borderBottom: `1px solid ${C.border}`,
        background: C.bg2,
      }}>
        <h3 style={{
          fontSize: 16, fontWeight: 800, margin: 0, color: C.text,
          fontFamily: 'Outfit,sans-serif',
        }}>
          Custom Twitter Raid
        </h3>
        <p style={{ fontSize: 12, color: C.text3, margin: '4px 0 0', lineHeight: 1.5 }}>
          Enter an X/Post URL to fetch live metrics, comments, and media arrays.
        </p>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {/* URL Input */}
        <label style={{
          fontSize: 10, fontWeight: 700, color: C.text3,
          textTransform: 'uppercase', letterSpacing: '0.08em',
          display: 'block', marginBottom: 6,
        }}>
          Post URL
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <span style={{
              position: 'absolute', left: 12, top: '50%',
              transform: 'translateY(-50%)', color: C.text3,
              display: 'flex', zIndex: 1,
            }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
              </svg>
            </span>
            <input
              type="url"
              value={url}
              onChange={e => { setUrl(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleFetch()}
              placeholder="https://x.com/status/1234567890"
              style={{
                width: '100%', padding: '10px 12px 10px 36px',
                border: `1px solid ${error ? 'var(--red)' : C.border}`,
                borderRadius: 10, fontSize: 13, color: C.text,
                outline: 'none', fontFamily: 'inherit',
                background: C.bg2, boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            onClick={handleFetch}
            disabled={loading}
            style={{
              padding: '10px 18px', borderRadius: 10, border: 'none',
              background: loading ? C.border : C.text,
              color: loading ? C.text2 : '#fff',
              fontSize: 12, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all 0.15s',
            }}>
            {loading ? (
              <>
                <span style={{
                  width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff', borderRadius: '50%',
                  animation: 'spin 0.6s linear infinite',
                  display: 'inline-block',
                }} />
                Fetching...
              </>
            ) : 'Fetch Post'}
          </button>
        </div>
        {error && (
          <p style={{ fontSize: 11, color: 'var(--red)', margin: '4px 0 0' }}>{error}</p>
        )}
        <p style={{ fontSize: 10, color: C.text3, margin: '4px 0 0' }}>
          Enter the URL of the X post you want to promote.
        </p>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '32px 20px', gap: 12,
        }}>
          <span style={{
            width: 28, height: 28, border: '2.5px solid var(--border)',
            borderTopColor: C.text, borderRadius: '50%',
            animation: 'spin 0.6s linear infinite',
            display: 'inline-block',
          }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: C.text3, margin: 0 }}>
            Fetching post data...
          </p>
        </div>
      )}

      {/* Post details card */}
      {post && !loading && (
        <div style={{
          margin: '0 20px 20px',
          border: `1px solid ${C.border}`, borderRadius: 12,
          padding: 16, background: C.card,
        }}>
          {/* Author header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <img
              src={post.avatarUrl || `https://ui-avatars.com/api/?name=${post.authorName}&background=random`}
              alt={post.authorName}
              style={{
                width: 36, height: 36, borderRadius: '50%',
                objectFit: 'cover', border: `1px solid ${C.border}`,
              }}
              onError={(e: any) => { e.target.style.display = 'none' }}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{post.authorName}</span>
                {post.verified && (
                  <svg width="12" height="12" fill="#3b82f6" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                )}
              </div>
              <span style={{ fontSize: 11, color: C.text3 }}>@{post.authorUsername}</span>
            </div>
          </div>

          {/* Text body */}
          {post.text && (
            <div style={{
              fontSize: 13, color: C.text, lineHeight: 1.6, marginBottom: 12,
            }}>
              {post.text}
            </div>
          )}

          {/* Media grid */}
          {post.media.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: post.media.length === 1 ? '1fr' : 'repeat(3, 1fr)',
              gap: 4, borderRadius: 10, overflow: 'hidden', marginBottom: 12,
            }}>
              {post.media.map((mUrl, i) => (
                <div key={i} style={{ aspectRatio: '16/9', background: C.bg2, overflow: 'hidden' }}>
                  <img src={mUrl} alt={`Media ${i + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e: any) => { e.target.style.display = 'none' }} />
                </div>
              ))}
            </div>
          )}

          {/* Metrics */}
          <div style={{
            display: 'flex', gap: 20, paddingTop: 10,
            borderTop: `1px solid ${C.border}`,
            fontSize: 11, color: C.text3,
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              <strong style={{ color: C.text }}>{post.likes.toLocaleString()}</strong> Likes
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              <strong style={{ color: C.text }}>{post.reposts.toLocaleString()}</strong> Reposts
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <strong style={{ color: C.text }}>{post.replies.toLocaleString()}</strong> Replies
            </span>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
