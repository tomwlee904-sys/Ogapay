import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../lib/api'
import { uploadImage } from '../lib/upload'

const CATEGORIES = [
  'SOCIAL_MEDIA', 'DATA_ENTRY', 'CONTENT_WRITING', 'APP_TESTING',
  'SURVEY', 'DESIGN', 'TRANSLATION', 'WEB_RESEARCH', 'VIDEO_REVIEW', 'OTHER',
]
const CATEGORY_LABELS: Record<string, string> = {
  SOCIAL_MEDIA: 'Social Media', DATA_ENTRY: 'Data Entry', CONTENT_WRITING: 'Content Writing',
  APP_TESTING: 'App Testing', SURVEY: 'Survey', DESIGN: 'Design',
  TRANSLATION: 'Translation', WEB_RESEARCH: 'Web Research', VIDEO_REVIEW: 'Video Review',
  OTHER: 'Other',
}

export default function EditProfile() {
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [bio, setBio] = useState('')
  const [nickname, setNickname] = useState('')
  const [description, setDescription] = useState('')
  const [skillsInput, setSkillsInput] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [isPublic, setIsPublic] = useState(true)

  const [twitter, setTwitter] = useState('')
  const [telegram, setTelegram] = useState('')
  const [discord, setDiscord] = useState('')
  const [website, setWebsite] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const data: any = await apiRequest('/users/me')
        if (data) {
          setFirstName(data.firstName || '')
          setLastName(data.lastName || '')
          setUsername(data.username || '')
          setPhone(data.phone || '')
          setAvatarUrl(data.avatarUrl || '')
          setTwitter(data.twitter || '')
          setTelegram(data.telegram || '')
          setDiscord(data.discord || '')
          setWebsite(data.website || '')

          const wp = data.workerProfile || {}
          setBio(wp.bio || '')
          setNickname(wp.nickname || '')
          setDescription(wp.description || '')
          setSkills(wp.skills || [])
          setCategories(wp.categories || [])
          setTags(wp.tags || [])
          setIsPublic(wp.isPublic !== false)
        }
      } catch {
        setError('Failed to load profile')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const toggleCategory = (cat: string) => {
    setCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : prev.length < 3 ? [...prev, cat] : prev
    )
  }

  const addSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const val = skillsInput.trim()
      if (val && !skills.includes(val)) {
        setSkills(prev => [...prev, val])
        setSkillsInput('')
      }
    }
  }

  const removeSkill = (s: string) => setSkills(prev => prev.filter(v => v !== s))

  const addTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const val = tagInput.trim()
      if (val && !tags.includes(val)) {
        setTags(prev => [...prev, val])
        setTagInput('')
      }
    }
  }

  const removeTag = (t: string) => setTags(prev => prev.filter(v => v !== t))

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const url = await uploadImage(file, 'avatars')
      setAvatarUrl(url)
    } catch {
      setError('Avatar upload failed')
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const body: Record<string, any> = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
        phone: phone.trim(),
        avatarUrl: avatarUrl,
        bio: bio.trim(),
        nickname: nickname.trim(),
        description: description.trim(),
        skills,
        categories,
        tags,
        isPublic,
        twitter: twitter.trim(),
        telegram: telegram.trim(),
        discord: discord.trim(),
        website: website.trim(),
      }
      await apiRequest('/users/me', {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      await refreshUser()
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err: any) {
      setError(err.message || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin .6s linear infinite' }} />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .ep-page{max-width:800px;margin:0 auto;padding:0 0 40px}
        .ep-bread{font-size:12px;color:var(--text3);margin-bottom:16px;display:flex;align-items:center;gap:6px}
        .ep-bread span{cursor:pointer;color:var(--text2)}
        .ep-bread span:hover{color:var(--accent)}
        .ep-bread .current{color:var(--text2);font-weight:600}
        .ep-avatar-wrap{width:100px;height:100px;border-radius:50%;overflow:hidden;flex-shrink:0;position:relative;border:3px solid var(--card);box-shadow:0 4px 12px rgba(0,0,0,0.08);cursor:pointer}
        .ep-avatar-wrap img{width:100%;height:100%;object-fit:cover}
        .ep-avatar-empty{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--bg2);border-radius:50%}
        .ep-avatar-empty i{font-size:36px;color:var(--text3)}
        .ep-avatar-overlay{position:absolute;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .3s;border-radius:50%}
        .ep-avatar-wrap:hover .ep-avatar-overlay{opacity:1}
        .ep-avatar-overlay i{color:#fff;font-size:22px}
        .ep-section{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:24px;margin-bottom:16px}
        .ep-section-title{font-weight:800;font-size:14px;margin-bottom:16px;display:flex;align-items:center;gap:8px;color:var(--text)}
        .ep-section-title i{color:var(--accent)}
        .ep-field{margin-bottom:14px}
        .ep-field:last-child{margin-bottom:0}
        .ep-field label{display:block;font-size:11px;font-weight:700;color:var(--text3);margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em}
        .ep-field input,.ep-field textarea,.ep-field select{width:100%;padding:0 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg2);color:var(--text);font-size:13px;outline:0;transition:border-color .2s;height:38px;box-sizing:border-box;font-family:inherit}
        .ep-field textarea{height:80px;padding:10px 12px;resize:vertical}
        .ep-field input:focus,.ep-field textarea:focus,.ep-field select:focus{border-color:var(--accent)}
        .ep-row{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        @media(max-width:600px){.ep-row{grid-template-columns:1fr}}
        .ep-save-btn{height:42px;padding:0 28px;border-radius:10px;border:0;background:var(--accent);color:#fff;font-weight:700;font-size:14px;display:inline-flex;align-items:center;gap:8px;cursor:pointer;transition:all .2s;font-family:inherit}
        .ep-save-btn:hover{box-shadow:0 4px 16px rgba(31,140,255,.25);transform:translateY(-1px)}
        .ep-save-btn:disabled{opacity:.6;cursor:not-allowed;transform:none}
        .ep-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(80px);background:#16a34a;color:#fff;padding:10px 24px;border-radius:10px;font-size:13px;font-weight:700;z-index:999;opacity:0;transition:all .3s;pointer-events:none}
        .ep-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
        .ep-error{background:rgba(220,38,38,.1);color:#dc2626;border:1px solid rgba(220,38,38,.2);border-radius:8px;padding:10px 14px;font-size:12px;font-weight:600;margin-bottom:12px}
        .chip{display:inline-flex;align-items:center;gap:4px;padding:5px 12px;border-radius:99px;border:1.5px solid var(--border);font-size:12px;font-weight:600;color:var(--text2);cursor:pointer;background:var(--bg2);transition:all .13s;margin:0 6px 6px 0}
        .chip.selected{background:var(--text);color:var(--bg);border-color:var(--text)}
        .tag{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:99px;background:var(--bg2);border:1px solid var(--border);font-size:12px;font-weight:600;margin:0 6px 6px 0}
        .tag .remove{cursor:pointer;color:var(--text3);font-size:14px;line-height:1;margin-left:2px}
        .tag .remove:hover{color:var(--text)}
        .ep-toggle{display:flex;align-items:center;gap:10px;font-size:13px;font-weight:600;color:var(--text2)}
        .ep-toggle .tg-btn{width:40px;height:22px;border-radius:99px;border:none;background:var(--border);cursor:pointer;position:relative;flex-shrink:0;padding:0}
        .ep-toggle .tg-btn .knob{width:16px;height:16px;border-radius:50%;background:white;position:absolute;top:3px;left:3px;transition:all .2s;box-shadow:0 1px 3px rgba(0,0,0,.15)}
        .ep-toggle .tg-btn.on{background:rgba(31,140,255,.2)}
        .ep-toggle .tg-btn.on .knob{left:21px;background:var(--accent)}
        .ep-hint{font-size:10px;color:var(--text3);margin-top:4px;display:block}
      `}</style>

      <div className="ep-page">
        <div className="ep-bread">
          <span onClick={() => navigate('/worker-portal')}>Worker Portal</span>
          <i className="ti ti-chevron-right" style={{ fontSize: 10, color: 'var(--border2)' }} />
          <span className="current">Edit Profile</span>
        </div>

        <form onSubmit={handleSave}>
          {error && <div className="ep-error"><i className="ti ti-alert-circle" style={{marginRight:6}} />{error}</div>}

          {/* Avatar */}
          <div className="ep-section">
            <div className="ep-section-title"><i className="ti ti-camera" /> Profile Photo</div>
            <div style={{display:'flex',alignItems:'center',gap:20}}>
              <div className="ep-avatar-wrap" onClick={() => fileInputRef.current?.click()}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" />
                ) : (
                  <div className="ep-avatar-empty"><i className="ti ti-user" /></div>
                )}
                <div className="ep-avatar-overlay"><i className="ti ti-camera" /></div>
              </div>
              <div>
                <button type="button" className="ep-save-btn" style={{height:34,fontSize:12,padding:'0 14px'}} onClick={() => fileInputRef.current?.click()}>
                  <i className="ti ti-upload" /> Upload Photo
                </button>
                <div className="ep-hint">Click to upload or paste a URL below</div>
                <input type="text" placeholder="https://example.com/photo.jpg" style={{width:280,marginTop:6,padding:'6px 10px',border:'1px solid var(--border)',borderRadius:6,fontSize:12,background:'var(--bg2)',color:'var(--text)',outline:'none',fontFamily:'inherit'}}
                  value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} />
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleAvatarUpload} />
          </div>

          {/* Basic Information */}
          <div className="ep-section">
            <div className="ep-section-title"><i className="ti ti-user" /> Basic Information</div>
            <div className="ep-row">
              <div className="ep-field">
                <label>First Name</label>
                <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} />
              </div>
              <div className="ep-field">
                <label>Last Name</label>
                <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} />
              </div>
            </div>
            <div className="ep-row">
              <div className="ep-field">
                <label>Username</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} />
              </div>
              <div className="ep-field">
                <label>Phone</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+234..." />
              </div>
            </div>
            <div className="ep-row">
              <div className="ep-field">
                <label>Nickname</label>
                <input type="text" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="How others see you" />
              </div>
              <div className="ep-field">
                <label>Public Profile</label>
                <div className="ep-toggle">
                  <button type="button" className={`tg-btn ${isPublic ? 'on' : ''}`} onClick={() => setIsPublic(!isPublic)}>
                    <span className="knob" />
                  </button>
                  {isPublic ? 'Visible to everyone' : 'Hidden'}
                </div>
              </div>
            </div>
          </div>

          {/* Bio & Description */}
          <div className="ep-section">
            <div className="ep-section-title"><i className="ti ti-file-text" /> Bio & Description</div>
            <div className="ep-field">
              <label>Bio</label>
              <textarea value={bio} onChange={e => { if (e.target.value.length <= 500) setBio(e.target.value) }} placeholder="Short bio about yourself..." maxLength={500} />
              <span className="ep-hint">{bio.length}/500</span>
            </div>
            <div className="ep-field">
              <label>Description</label>
              <textarea value={description} onChange={e => { if (e.target.value.length <= 1000) setDescription(e.target.value) }} placeholder="Detailed description of your skills and experience..." maxLength={1000} style={{height:100}} />
              <span className="ep-hint">{description.length}/1000</span>
            </div>
          </div>

          {/* Categories */}
          <div className="ep-section">
            <div className="ep-section-title"><i className="ti ti-category" /> Categories (max 3)</div>
            <div>
              {CATEGORIES.map(cat => (
                <span key={cat} className={`chip ${categories.includes(cat) ? 'selected' : ''}`} onClick={() => toggleCategory(cat)}>
                  {CATEGORY_LABELS[cat] || cat}
                </span>
              ))}
            </div>
            <span className="ep-hint" style={{marginTop:8}}>{categories.length}/3 selected</span>
          </div>

          {/* Skills */}
          <div className="ep-section">
            <div className="ep-section-title"><i className="ti ti-star" /> Skills</div>
            <div className="ep-field">
              <label>Add Skill</label>
              <input type="text" value={skillsInput} onChange={e => setSkillsInput(e.target.value)} onKeyDown={addSkill} placeholder="Type a skill and press Enter" />
            </div>
            <div style={{marginTop:8}}>
              {skills.map(s => (
                <span key={s} className="tag">{s} <span className="remove" onClick={() => removeSkill(s)}>&times;</span></span>
              ))}
              {!skills.length && <span className="ep-hint">No skills added yet</span>}
            </div>
          </div>

          {/* Tags */}
          <div className="ep-section">
            <div className="ep-section-title"><i className="ti ti-tags" /> Tags</div>
            <div className="ep-field">
              <label>Add Tag</label>
              <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={addTag} placeholder="Type a tag and press Enter" />
            </div>
            <div style={{marginTop:8}}>
              {tags.map(t => (
                <span key={t} className="tag">{t} <span className="remove" onClick={() => removeTag(t)}>&times;</span></span>
              ))}
              {!tags.length && <span className="ep-hint">No tags added yet</span>}
            </div>
          </div>

          {/* Social Links */}
          <div className="ep-section">
            <div className="ep-section-title"><i className="ti ti-link" /> Social Links</div>
            <div className="ep-row">
              <div className="ep-field">
                <label><i className="ti ti-brand-x" style={{fontSize:12}} /> X / Twitter</label>
                <input type="text" value={twitter} onChange={e => setTwitter(e.target.value)} placeholder="https://x.com/..." />
              </div>
              <div className="ep-field">
                <label><i className="ti ti-brand-telegram" style={{fontSize:12}} /> Telegram</label>
                <input type="text" value={telegram} onChange={e => setTelegram(e.target.value)} placeholder="https://t.me/..." />
              </div>
            </div>
            <div className="ep-row">
              <div className="ep-field">
                <label><i className="ti ti-brand-discord" style={{fontSize:12}} /> Discord</label>
                <input type="text" value={discord} onChange={e => setDiscord(e.target.value)} placeholder="username#0000" />
              </div>
              <div className="ep-field">
                <label><i className="ti ti-world" style={{fontSize:12}} /> Website</label>
                <input type="text" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..." />
              </div>
            </div>
          </div>

          <div style={{display:'flex',gap:12,alignItems:'center',marginTop:8}}>
            <button type="submit" className="ep-save-btn" disabled={saving}>
              {saving ? (
                <><i className="ti ti-loader" style={{animation:'spin .6s linear infinite'}} /> Saving...</>
              ) : (
                <><i className="ti ti-check" style={{fontSize:16}} /> {saved ? 'Saved!' : 'Save Changes'}</>
              )}
            </button>
            <button type="button" onClick={() => navigate('/worker-portal')} style={{
              height:42,padding:'0 20px',borderRadius:10,border:'1px solid var(--border)',
              background:'transparent',color:'var(--text2)',fontWeight:600,fontSize:13,
              cursor:'pointer',fontFamily:'inherit',display:'inline-flex',alignItems:'center',gap:6,
            }}>
              Cancel
            </button>
          </div>
        </form>
      </div>

      <div className={`ep-toast ${saved ? 'show' : ''}`}>Profile updated successfully</div>
    </Layout>
  )
}
