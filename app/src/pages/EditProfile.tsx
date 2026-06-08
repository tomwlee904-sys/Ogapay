import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useToast } from '../components/Toast'

export default function EditProfile() {
  const navigate = useNavigate()
  const toast = useToast()
  const [avatarHover, setAvatarHover] = useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    toast.toast('Profile updated successfully')
  }

  return (
    <Layout>
      <style>{`
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

      `}</style>

      <div className="ep-page">
        {/* Breadcrumb */}
        <div className="ep-bread">
          <span onClick={() => navigate('/worker-portal')}>Worker Portal</span>
          <i className="ti ti-chevron-right" style={{ fontSize: 10, color: 'var(--border2)' }} />
          <span className="current">Edit Profile</span>
        </div>

        {/* Profile Header */}
        <div className="ep-header">
          <div className="ep-avatar-wrap" onMouseEnter={() => setAvatarHover(true)} onMouseLeave={() => setAvatarHover(false)}>
            <div className="ep-avatar-empty">
              <i className="ti ti-user" />
            </div>
            <div className="ep-avatar-overlay">
              <i className="ti ti-camera" />
            </div>
          </div>
          <div className="ep-info">
            <div className="ep-name-row">
              <div className="ep-name">
                <h2>User Name</h2>
                <span className="ep-badge"><i className="ti ti-circle-check-filled" /> Verified</span>
              </div>
            </div>
            <div className="ep-bio-section">
              <div className="ep-bio-label">Bio</div>
              <div className="ep-bio-text">Task worker & community member on OgaPay</div>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSave}>
          {/* Basic Information */}
          <div className="ep-section">
            <div className="ep-section-title"><i className="ti ti-user" /> Basic Information</div>
            <div className="ep-row">
              <div className="ep-field">
                <label>Display Name</label>
                <input type="text" defaultValue="User Name" placeholder="Your full name" />
              </div>
              <div className="ep-field">
                <label>Username</label>
                <input type="text" defaultValue="@username" placeholder="Choose a username" />
              </div>
            </div>
            <div className="ep-row">
              <div className="ep-field">
                <label>Email</label>
                <input type="email" defaultValue="user@ogapay.com" placeholder="your@email.com" />
              </div>
              <div className="ep-field">
                <label>Phone</label>
                <input type="tel" defaultValue="+234 800 000 0000" placeholder="+234 ..." />
              </div>
            </div>
            <div className="ep-field">
              <label>Location</label>
              <input type="text" defaultValue="Lagos, Nigeria" placeholder="City, Country" />
            </div>
            <div className="ep-field">
              <label>Bio</label>
              <textarea placeholder="Tell task posters what makes you the best choice..." defaultValue="Task worker & community member on OgaPay" />
            </div>
          </div>

          {/* Profile Settings */}
          <div className="ep-section">
            <div className="ep-section-title"><i className="ti ti-settings" /> Profile Settings</div>
            <div className="ep-row">
              <div className="ep-field">
                <label>Public Profile</label>
                <select defaultValue="yes">
                  <option value="yes">Visible to everyone</option>
                  <option value="no">Hidden</option>
                </select>
              </div>
              <div className="ep-field">
                <label>Show Earnings</label>
                <select defaultValue="yes">
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
                <input type="text" defaultValue="@username" placeholder="https://x.com/..." />
              </div>
              <div className="ep-field">
                <label><i className="ti ti-brand-telegram" style={{fontSize:12}} /> Telegram</label>
                <input type="text" placeholder="https://t.me/..." />
              </div>
            </div>
            <div className="ep-row">
              <div className="ep-field">
                <label><i className="ti ti-brand-discord" style={{fontSize:12}} /> Discord</label>
                <input type="text" placeholder="username#0000" />
              </div>
              <div className="ep-field">
                <label><i className="ti ti-world" style={{fontSize:12}} /> Website</label>
                <input type="text" placeholder="https://..." />
              </div>
            </div>
          </div>

          {/* Skills & Expertise */}
          <div className="ep-section">
            <div className="ep-section-title"><i className="ti ti-star" /> Skills & Expertise</div>
            <div className="ep-row">
              <div className="ep-field">
                <label>Category</label>
                <select defaultValue="">
                  <option value="">Select expertise</option>
                  <option value="design">Design</option>
                  <option value="writing">Writing</option>
                  <option value="social">Social Media</option>
                  <option value="dev">Development</option>
                  <option value="marketing">Marketing</option>
                  <option value="community">Community</option>
                </select>
              </div>
              <div className="ep-field">
                <label>Experience</label>
                <select defaultValue="">
                  <option value="">Select level</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="expert">Expert</option>
                </select>
              </div>
            </div>
            <div className="ep-field">
              <label>Skill Tags</label>
              <input type="text" defaultValue="UI Design, Social Media, Content Writing" placeholder="e.g. Design, Writing, Marketing" />
              <span style={{fontSize:10,color:'var(--text3)',marginTop:4,display:'block'}}>Separate with commas</span>
            </div>
          </div>

          <div style={{display:'flex',gap:12,alignItems:'center',marginTop:8}}>
            <button type="submit" className="ep-save-btn">
              <i className="ti ti-check" style={{fontSize:16}} /> {saved ? 'Saved!' : 'Save Changes'}
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

    </Layout>
  )
}
