// @ts-nocheck
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'

const Icon = ({ n, s = 18, c }) => (
  <i className={`ti ti-${n}`} style={{ fontSize: s, color: c || "var(--text2)", lineHeight: 1, flexShrink: 0 }} />
)

const templates = [
  { id: 1, title: 'Product Description', icon: 'shopping-cart', tasks: 12, reward: 'NGN 500-2,000' },
  { id: 2, title: 'Blog Post Writing', icon: 'article', tasks: 8, reward: 'NGN 1,000-5,000' },
  { id: 3, title: 'Social Media Copy', icon: 'messages', tasks: 15, reward: 'NGN 300-1,500' },
  { id: 4, title: 'Proofreading & Editing', icon: 'spellcheck', tasks: 6, reward: 'NGN 400-2,000' },
  { id: 5, title: 'SEO Content', icon: 'trending-up', tasks: 4, reward: 'NGN 2,000-8,000' },
  { id: 6, title: 'Script Writing', icon: 'video', tasks: 3, reward: 'NGN 3,000-10,000' },
]

const recentJobs = [
  { id: 1, title: 'Write 5 product descriptions for fashion items', budget: 'NGN 2,500', slots: 3, time: '2h ago' },
  { id: 2, title: 'Proofread 500-word DeFi article', budget: 'NGN 800', slots: 5, time: '5h ago' },
  { id: 3, title: 'Create Twitter thread about Solana ecosystem', budget: 'NGN 1,200', slots: 2, time: '1d ago' },
]

export default function Writer() {
  const navigate = useNavigate()

  return (
    <Layout>
      <style>{`
        .wr-page{max-width:900px;margin:0 auto;padding:0 0 40px}
        .wr-hero{background:linear-gradient(135deg,#121566,#1F8CFF);border-radius:16px;padding:36px 32px;margin-bottom:28px;color:#fff}
        .wr-hero h1{font-family:Outfit;font-size:28px;font-weight:900;margin:0 0 6px}
        .wr-hero p{font-size:14px;opacity:.85;margin:0;line-height:1.6;max-width:500px}
        .wr-section{margin-bottom:28px}
        .wr-section h2{font-family:Outfit;font-size:18px;font-weight:800;margin:0 0 14px;display:flex;align-items:center;gap:8px}
        .wr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}
        .wr-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:18px;transition:all .2s;cursor:pointer}
        .wr-card:hover{transform:translateY(-2px);border-color:var(--accent)}
        .wr-card-icon{width:40px;height:40px;border-radius:10px;display:grid;place-items:center;margin-bottom:10px}
        .wr-card h3{font-size:14px;font-weight:800;margin:0 0 4px}
        .wr-card p{font-size:12px;color:var(--text2);margin:0 0 8px}
        .wr-card .meta{font-size:11px;color:var(--text3);display:flex;gap:12px}
        .wr-list{display:grid;gap:10px}
        .wr-list-item{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;transition:all .2s}
        .wr-list-item:hover{border-color:var(--accent)}
        .wr-list-item .l-title{font-size:13px;font-weight:700;margin-bottom:4px}
        .wr-list-item .l-meta{font-size:11px;color:var(--text3);display:flex;gap:10px}
      `}</style>

      <div className="wr-page">
        <div className="wr-hero">
          <h1><Icon n="edit" s={24} c="#fff" /> Writer Workspace</h1>
          <p>Find writing tasks, manage your content projects, and earn from your words. Browse available writing jobs or create your own.</p>
        </div>

        <div className="wr-section">
          <h2><Icon n="template" s={18} /> Writing Templates</h2>
          <div className="wr-grid">
            {templates.map(t => (
              <div className="wr-card" key={t.id} onClick={() => navigate('/create')}>
                <div className="wr-card-icon" style={{background:`#1F8CFF18`,color:'#1F8CFF'}}><i className={`ti ti-${t.icon}`} style={{fontSize:20}} /></div>
                <h3>{t.title}</h3>
                <p>{t.tasks} tasks available</p>
                <div className="meta"><span><i className="ti ti-coin" /> {t.reward}</span></div>
              </div>
            ))}
          </div>
        </div>

        <div className="wr-section">
          <h2><Icon n="clock" s={18} /> Recent Writing Jobs</h2>
          <div className="wr-list">
            {recentJobs.map(j => (
              <div className="wr-list-item" key={j.id} onClick={() => navigate('/tasks')}>
                <div>
                  <div className="l-title">{j.title}</div>
                  <div className="l-meta">
                    <span><i className="ti ti-coin" /> {j.budget}</span>
                    <span><i className="ti ti-users" /> {j.slots} slots</span>
                    <span>{j.time}</span>
                  </div>
                </div>
                <i className="ti ti-arrow-right" style={{color:'var(--text3)',fontSize:16}} />
              </div>
            ))}
          </div>
        </div>

        <div className="wr-section">
          <h2><Icon n="book" s={18} /> Writing Resources</h2>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {[
              { icon: 'file-text', title: 'Style Guide', desc: 'OgaPay writing standards' },
              { icon: 'bookmark', title: 'Tips & Tricks', desc: 'Write better, earn more' },
              { icon: 'messages', title: 'Writer Community', desc: 'Join other writers' },
              { icon: 'help-circle', title: 'FAQ', desc: 'Common writing questions' },
            ].map(r => (
              <div className="wr-card" key={r.title} onClick={() => navigate('/faq')}>
                <div className="wr-card-icon" style={{background:'var(--bg2)',color:'var(--text2)'}}><i className={`ti ti-${r.icon}`} style={{fontSize:18}} /></div>
                <h3>{r.title}</h3>
                <p>{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}
