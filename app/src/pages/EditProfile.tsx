import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../lib/api'

export default function EditProfile() {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  // Form state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [bio, setBio] = useState('')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [timezone, setTimezone] = useState('')
  const [publicProfile, setPublicProfile] = useState('yes')
  const [showEarnings, setShowEarnings] = useState('yes')
  const [twitter, setTwitter] = useState('')
  const [telegram, setTelegram] = useState('')
  const [discord, setDiscord] = useState('')
  const [website, setWebsite] = useState('')
  const [category, setCategory] = useState('')
  const [experience, setExperience] = useState('')
  const [skills, setSkills] = useState('')

  // Load existing data
  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    ;(async () => {
      try {
        const data: any = await apiRequest('/users/me')
        if (data) {
          setFirstName(data.firstName || user.firstName || '')
          setLastName(data.lastName || user.lastName || '')
          setUsername(data.username || user.username || '')
          setEmail(data.email || user.email || '')
          setPhone(data.phone || '')
          setBio(data.bio || '')
          setCountry(data.country || '')
          setCity(data.city || '')
          setTimezone(data.timezone || '')
          setPublicProfile(data.isPublic !== false ? 'yes' : 'no')
          setShowEarnings(data.showEarnings !== false ? 'yes' : 'no')
          setTwitter(data.twitter || '')
          setTelegram(data.telegram || '')
          setDiscord(data.discord || '')
          setWebsite(data.website || '')
          setCategory(data.category || '')
          setExperience(data.experience || '')
          setSkills(data.skills || '')
        } else {
          // Fall back to auth user
          setFirstName(user.firstName || '')
          setLastName(user.lastName || '')
          setUsername(user.username || '')
          setEmail(user.email || '')
        }
      } catch {
        if (user) {
          setFirstName(user.firstName || '')
          setLastName(user.lastName || '')
          setUsername(user.username || '')
          setEmail(user.email || '')
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [user])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await apiRequest('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          username: username.trim(),
          phone: phone.trim(),
          bio: bio.trim(),
          country: country.trim(),
          city: city.trim(),
          timezone: timezone.trim(),
          isPublic: publicProfile === 'yes',
          showEarnings: showEarnings === 'yes',
          twitter: twitter.trim(),
          telegram: telegram.trim(),
          discord: discord.trim(),
          website: website.trim(),
          category,
          experience,
          skills: skills.trim(),
        }),
      })
      await refreshUser()
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err: any) {
      setError(err.message || 'Failed to save profile. Please try again.')
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

        .ep-header{display:flex;gap:2rem;margin-bottom:2rem}
        .ep-avatar-wrap{width:120px;height:120px;border-radius:16px;overflow:hidden;flex-shrink:0;position:relative;border:3px solid var(--card);box-shadow:0 4px 12px rgba(0,0,0,0.08);transition:all .3s ease;cursor:pointer}
        .ep-avatar-wrap:hover{transform:scale(1.03);box-shadow:0 8px 20px rgba(0,0,0,0.12)}
        .ep-avatar-wrap img{width:100%;height:100%;object-fit:cover;transition:transform .3s ease}
        .ep-avatar-wrap:hover img{transform:scale(1.1)}
        .ep-avatar-empty{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--bg2),var(--border))}
        .ep-avatar-empty i{font-size:40px;color:var(--text3)}
        .ep-avatar-overlay{
          position:absolute;inset:0;background:rgba(0,0,0,0.5);
          display:flex;align-items:center;justify-content:center;
          opacity:0;transition:opacity .3s;border-radius:13px;
        }
        .ep-avatar-wrap:hover .ep-avatar-overlay{opacity:1}
        .ep-avatar-overlay i{color:#fff;font-size:24px}
        .ep-info{flex:1;display:flex;flex-direction:column;gap:.75rem;justify-content:center}
        .ep-name-row{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem}
        .ep-name{display:flex;align-items:center;gap:.75rem}
        .ep-name h2{font-size:1.75rem;font-weight:800;color:var(--text);margin:0;letter-spacing:-.02em}
        .ep-badge{font-size:11px;font-weight:600;color:#22c55e;background:#052e16;padding:3px 10px;border-radius:20px;display:inline-flex;align-items:center;gap:4px}
        .ep-badge i{font-size:10px}

        .ep-bio-section{background:var(--bg2);border-radius:12px;padding:1.25rem;margin-top:.5rem;border:1px solid var(--border)}
        .ep-bio-label{font-size:.75rem;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:.75rem}
        .ep-bio-text{white-space:pre-wrap;color:var(--text2);line-height:1.7;font-size:.9rem}

        /* Form */
        .ep-section{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:24px;margin-bottom:16px}
        .ep-section-title{font-weight:800;font-size:14px;margin-bottom:16px;display:flex;align-items:center;gap:8px;color:var(--text)}
        .ep-section-title i{color:var(--accent)}
        .ep-field{margin-bottom:14px}
        .ep-field:last-child{margin-bottom:0}
        .ep-field label{display:block;font-size:11px;font-weight:700;color:var(--text3);margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em}
        .ep-field input,.ep-field textarea,.ep-field select{
          width:100%;padding:0 12px;border:1px solid var(--border);border-radius:8px;
          background:var(--bg2);color:var(--text);font-size:13px;
          outline:0;transition:border-color .2s;height:38px;box-sizing:border-box;
        }
        .ep-field textarea{height:80px;padding:10px 12px;resize:vertical;font-family:inherit}
        .ep-field input:focus,.ep-field textarea:focus,.ep-field select:focus{border-color:var(--accent)}
        .ep-row{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        @media(max-width:600px){
          .ep-header{flex-direction:column;align-items:center;text-align:center;gap:1rem}
          .ep-avatar-wrap{width:90px;height:90px}
          .ep-name-row{flex-direction:column;align-items:center}
          .ep-row{grid-template-columns:1fr}
        }
        .ep-save-btn{
          height:42px;padding:0 28px;border-radius:10px;border:0;
          background:var(--accent);color:#fff;font-weight:700;font-size:14px;
          display:inline-flex;align-items:center;gap:8px;cursor:pointer;
          transition:all .2s;font-family:inherit;
        }
        .ep-save-btn:hover{box-shadow:0 4px 16px rgba(31,140,255,.25);transform:translateY(-1px)}
        .ep-save-btn:disabled{opacity:.6;cursor:not-allowed;transform:none}
        .ep-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(80px);background:var(--green);color:#fff;padding:10px 24px;border-radius:10px;font-size:13px;font-weight:700;z-index:999;opacity:0;transition:all .3s;pointer-events:none}
        .ep-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
        .ep-error{background:rgba(220,38,38,.1);color:#dc2626;border:1px solid rgba(220,38,38,.2);border-radius:8px;padding:10px 14px;font-size:12px;font-weight:600;margin-bottom:12px}
      `}</style>

      <div className="ep-page">
        <div className="ep-bread">
          <span onClick={() => navigate('/worker-portal')}>Worker Portal</span>
          <i className="ti ti-chevron-right" style={{ fontSize: 10, color: 'var(--border2)' }} />
          <span className="current">Edit Profile</span>
        </div>

        {/* Header */}
        <div className="ep-header">
          <div className="ep-avatar-wrap">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="avatar" />
            ) : (
              <div className="ep-avatar-empty"><i className="ti ti-user" /></div>
            )}
            <div className="ep-avatar-overlay"><i className="ti ti-camera" /></div>
          </div>
          <div className="ep-info">
            <div className="ep-name-row">
              <div className="ep-name">
                <h2>{firstName || lastName ? `${firstName} ${lastName}` : 'Edit Profile'}</h2>
                <span className="ep-badge"><i className="ti ti-circle-check-filled" /> {user?.isEmailVerified ? 'Verified' : 'Unverified'}</span>
              </div>
            </div>
            <div className="ep-bio-section">
              <div className="ep-bio-label">Bio</div>
              <div className="ep-bio-text">{bio || 'No bio yet — tell others about yourself'}</div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave}>
          {error && <div className="ep-error"><i className="ti ti-alert-circle" style={{marginRight:6}} />{error}</div>}

          {/* Basic Information */}
          <div className="ep-section">
            <div className="ep-section-title"><i className="ti ti-user" /> Basic Information</div>
            <div className="ep-row">
              <div className="ep-field">
                <label>First Name</label>
                <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Your first name" />
              </div>
              <div className="ep-field">
                <label>Last Name</label>
                <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Your last name" />
              </div>
            </div>
            <div className="ep-row">
              <div className="ep-field">
                <label>Username</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Choose a username" />
              </div>
              <div className="ep-field">
                <label>Email</label>
                <input type="email" value={email} disabled style={{opacity:.6}} />
              </div>
            </div>
            <div className="ep-field">
              <label>Phone</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+234..." />
            </div>
          </div>

          {/* Location */}
          <div className="ep-section">
            <div className="ep-section-title"><i className="ti ti-map-pin" /> Location</div>
            <div className="ep-row">
              <div className="ep-field">
                <label>Country</label>
                <input type="text" value={country} onChange={e => setCountry(e.target.value)} placeholder="Nigeria" />
              </div>
              <div className="ep-field">
                <label>City</label>
                <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="Lagos" />
              </div>
            </div>
            <div className="ep-field">
              <label>Timezone</label>
              <select value={timezone} onChange={e => setTimezone(e.target.value)}>
                <option value="">Select timezone</option>
                <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
                <option value="Africa/Accra">Africa/Accra (GMT)</option>
                <option value="Africa/Nairobi">Africa/Nairobi (EAT)</option>
                <option value="Africa/Cairo">Africa/Cairo (EET)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
                <option value="America/New_York">America/New_York (EST/EDT)</option>
              </select>
            </div>
          </div>

          {/* Profile Settings */}
          <div className="ep-section">
            <div className="ep-section-title"><i className="ti ti-settings" /> Profile Settings</div>
            <div className="ep-field">
              <label>Bio</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell others about yourself, your skills, and what you do on OgaPay..." maxLength={500} />
              <span style={{fontSize:10,color:'var(--text3)',marginTop:4,display:'block'}}>{bio.length}/500</span>
            </div>
            <div className="ep-row">
              <div className="ep-field">
                <label>Public Profile</label>
                <select value={publicProfile} onChange={e => setPublicProfile(e.target.value)}>
                  <option value="yes">Visible to everyone</option>
                  <option value="no">Hidden</option>
                </select>
              </div>
              <div className="ep-field">
                <label>Show Earnings</label>
                <select value={showEarnings} onChange={e => setShowEarnings(e.target.value)}>
                  <option value="yes">Visible on profile</option>
                  <option value="no">Hidden</option>
                </select>
              </div>
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

          {/* Skills & Expertise */}
          <div className="ep-section">
            <div className="ep-section-title"><i className="ti ti-star" /> Skills & Expertise</div>
            <div className="ep-row">
              <div className="ep-field">
                <label>Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)}>
                  <option value="">Select expertise</option>
                  <option value="design">Design</option>
                  <option value="writing">Writing</option>
                  <option value="social">Social Media</option>
                  <option value="dev">Development</option>
                  <option value="marketing">Marketing</option>
                  <option value="community">Community</option>
                  <option value="research">Research</option>
                </select>
              </div>
              <div className="ep-field">
                <label>Experience</label>
                <select value={experience} onChange={e => setExperience(e.target.value)}>
                  <option value="">Select level</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="expert">Expert</option>
                </select>
              </div>
            </div>
            <div className="ep-field">
              <label>Skill Tags</label>
              <input type="text" value={skills} onChange={e => setSkills(e.target.value)} placeholder="e.g. Design, Writing, Marketing" />
              <span style={{fontSize:10,color:'var(--text3)',marginTop:4,display:'block'}}>Separate with commas</span>
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
