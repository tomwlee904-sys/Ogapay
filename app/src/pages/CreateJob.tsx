import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'

// ─── Types ───
type TabType = 'socials' | 'custom' | 'templates'
type WinnerMode = 'challenge' | 'selection' | 'creator_picks' | 'random'
type Currency = 'SOL' | 'USDC' | 'NGN'

interface ActionConfig {
  id: string; label: string; description: string
  minPer: number; maxPerComponent: number
  platformId: string
}

// ─── Platform & Action Config ───
const PLATFORMS = [
  { id: 'x', name: 'X / Twitter', color: '#000000', icon: 'ti-brand-x' },
  { id: 'instagram', name: 'Instagram', color: '#E4405F', icon: 'ti-brand-instagram' },
  { id: 'youtube', name: 'YouTube', color: '#FF0000', icon: 'ti-brand-youtube' },
  { id: 'telegram', name: 'Telegram', color: '#0088cc', icon: 'ti-brand-telegram' },
  { id: 'discord', name: 'Discord', color: '#5865F2', icon: 'ti-brand-discord' },
  { id: 'tiktok', name: 'TikTok', color: '#000000', icon: 'ti-brand-tiktok' },
]

const ACTIONS: ActionConfig[] = [
  { id: 'x_followers', label: 'Followers', description: 'Get X followers', minPer: 0.003, maxPerComponent: 100, platformId: 'x' },
  { id: 'reposts', label: 'Reposts', description: 'Get X reposts', minPer: 0.005, maxPerComponent: 100, platformId: 'x' },
  { id: 'likes', label: 'Likes', description: 'Get X likes', minPer: 0.001, maxPerComponent: 200, platformId: 'x' },
  { id: 'comments_x', label: 'Comments', description: 'Get X comments', minPer: 0.008, maxPerComponent: 50, platformId: 'x' },
  { id: 'bookmarks', label: 'Bookmarks', description: 'Get X bookmarks', minPer: 0.002, maxPerComponent: 100, platformId: 'x' },
  { id: 'x_raid', label: 'Raid', description: 'X raid engagement', minPer: 0.006, maxPerComponent: 50, platformId: 'x' },
  { id: 'followers_insta', label: 'Followers', description: 'Get Instagram followers', minPer: 0.004, maxPerComponent: 100, platformId: 'instagram' },
  { id: 'likes_insta', label: 'Likes', description: 'Get Instagram likes', minPer: 0.001, maxPerComponent: 200, platformId: 'instagram' },
  { id: 'comments_insta', label: 'Comments', description: 'Get Instagram comments', minPer: 0.008, maxPerComponent: 50, platformId: 'instagram' },
  { id: 'subscribers_youtube', label: 'Subscribers', description: 'Get YouTube subscribers', minPer: 0.005, maxPerComponent: 50, platformId: 'youtube' },
  { id: 'likes_youtube', label: 'Likes', description: 'Get YouTube likes', minPer: 0.001, maxPerComponent: 200, platformId: 'youtube' },
  { id: 'comments_youtube', label: 'Comments', description: 'Get YouTube comments', minPer: 0.008, maxPerComponent: 50, platformId: 'youtube' },
  { id: 'members_telegram', label: 'Members', description: 'Get Telegram members', minPer: 0.002, maxPerComponent: 200, platformId: 'telegram' },
  { id: 'members_discord', label: 'Members', description: 'Get Discord members', minPer: 0.003, maxPerComponent: 100, platformId: 'discord' },
  { id: 'reactions_discord', label: 'Reactions', description: 'Get Discord reactions', minPer: 0.001, maxPerComponent: 200, platformId: 'discord' },
  { id: 'followers_tiktok', label: 'Followers', description: 'Get TikTok followers', minPer: 0.004, maxPerComponent: 100, platformId: 'tiktok' },
  { id: 'likes_tiktok', label: 'Likes', description: 'Get TikTok likes', minPer: 0.001, maxPerComponent: 200, platformId: 'tiktok' },
  { id: 'views_tiktok', label: 'Views', description: 'Get TikTok views', minPer: 0.0005, maxPerComponent: 500, platformId: 'tiktok' },
]

const CATEGORIES = [
  { id: 'social', label: 'Social Media', subcategories: ['Engagement', 'Followers', 'Content', 'Community'] },
  { id: 'creative', label: 'Creative', subcategories: ['Design', 'Writing', 'Video', 'Music'] },
  { id: 'research', label: 'Research & Feedback', subcategories: ['Survey', 'Review', 'Testing', 'Opinion'] },
  { id: 'tech', label: 'Tech & Dev', subcategories: ['Development', 'QA', 'DevOps', 'AI/ML'] },
  { id: 'other', label: 'Other', subcategories: ['Consulting', 'Services', 'Misc'] },
]

const TEMPLATE_PRESETS = [
  { id: 'design', label: 'Design Task', description: 'Logo designs, video edits, article writing, memes, social media content — post your creative brief and let the community show you their best work.' },
  { id: 'feedback', label: 'Feedback & Opinions', description: 'Share your product, design, or idea and ask the community for honest feedback. Specify what aspects you want reviewed.' },
  { id: 'social', label: 'Social Media Growth', description: 'Get followers, reposts, likes, comments, or views across X, Instagram, YouTube, Telegram, Discord, and TikTok.' },
  { id: 'content', label: 'Content Creation', description: 'Hire creators to produce blog posts, social media content, videos, graphics, or marketing materials for your brand or project.' },
  { id: 'testing', label: 'Testing & QA', description: 'Get testers for your app, website, or product. Specify platforms, devices, and what aspects to focus on.' },
]

const SELECTION_TIME_OPTIONS = [
  { value: '30', label: '30 minutes' },
  { value: '60', label: '1 hour' },
  { value: '240', label: '4 hours' },
  { value: '480', label: '8 hours' },
  { value: '720', label: '12 hours' },
  { value: '1440', label: '24 hours' },
  { value: '2880', label: '48 hours' },
  { value: '4320', label: '72 hours' },
]

const COOLDOWN_OPTIONS = [
  { value: '0', label: 'No cooldown' },
  { value: '30', label: '30 minutes' },
  { value: '60', label: '1 hour' },
  { value: '240', label: '4 hours' },
  { value: '480', label: '8 hours' },
  { value: '720', label: '12 hours' },
  { value: '1440', label: '24 hours' },
]

// ─── Helpers ───
function getActionsForPlatform(platformId: string): ActionConfig[] {
  return ACTIONS.filter(a => a.platformId === platformId)
}

function formatSol(amount: number): string {
  if (amount >= 1) return amount.toFixed(2)
  if (amount >= 0.001) return amount.toFixed(4)
  return amount.toFixed(6)
}

function detectPlatform(url: string): string | null {
  if (/x\.com|twitter\.com/i.test(url)) return 'x'
  if (/instagram\.com/i.test(url)) return 'instagram'
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube'
  if (/t\.me|telegram\./i.test(url)) return 'telegram'
  if (/discord\.gg|discord\.com/i.test(url)) return 'discord'
  if (/tiktok\.com/i.test(url)) return 'tiktok'
  return null
}

// ─── Sub-components ───
function InfoIcon({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="info-icon-btn" aria-label={label}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'inline-flex', alignItems: 'center', color: 'var(--text3)' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
      </svg>
    </button>
  )
}

function InfoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{
        background: 'var(--card)', borderRadius: 16, maxWidth: 600, width: '100%', maxHeight: '90vh', overflow: 'auto',
        border: '1px solid var(--border)', padding: 24,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>Understanding Task Modes</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 20, padding: 4 }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div style={{ borderRadius: 12, border: '1px solid var(--accent)', padding: 16, background: 'var(--bg2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--accent)' }}>Challenge Mode</h3>
            </div>
            <ul style={{ padding: '0 0 0 16px', margin: 0, fontSize: 13, color: 'var(--text2)', lineHeight: 1.8 }}>
              <li>Multiple winners (1-1000)</li>
              <li>You review all submissions</li>
              <li>Select the best entries</li>
              <li>Reward split among winners</li>
              <li>Best for: design, writing, memes, content</li>
            </ul>
          </div>
          <div style={{ borderRadius: 12, border: '1px solid var(--border)', padding: 16, background: 'var(--bg2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 12l2 2 4-4"/></svg>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Selection Mode</h3>
            </div>
            <ul style={{ padding: '0 0 0 16px', margin: 0, fontSize: 13, color: 'var(--text2)', lineHeight: 1.8 }}>
              <li>One winner selected</li>
              <li>Applicants explain qualifications</li>
              <li>Direct chat with selected worker</li>
              <li>Full reward to one person</li>
              <li>Best for: dev work, consulting, long-term</li>
            </ul>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Field Explanations</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12, color: 'var(--text2)' }}>
            {[
              ['Winners', 'Number of participants who will receive rewards'],
              ['Max Entries', 'Maximum number of people who can apply'],
              ['Selection Mode', 'How winners are chosen (creator picks or random)'],
              ['Audience', 'Target everyone or a specific community'],
              ['Selection Time', 'Deadline for accepting submissions'],
              ['Hide Submissions', 'Keep entries private until job closes'],
              ['Category', 'Type of task for better discoverability'],
              ['Search Tags', 'Keywords to help workers find your task'],
            ].map(([label, desc]) => (
              <div key={label} style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--bg)' }}>
                <strong style={{ color: 'var(--text)', display: 'block', marginBottom: 2 }}>{label}</strong>
                <span>{desc}</span>
              </div>
            ))}
          </div>
        </div>
        <button onClick={onClose} style={{
          width: '100%', padding: '12px', borderRadius: 8, border: 'none',
          background: 'linear-gradient(135deg, #1F8CFF, #1F8CFF)', color: '#fff',
          fontSize: 14, fontWeight: 700, cursor: 'pointer',
        }}>Got it</button>
      </div>
    </div>
  )
}

// ─── Styles ───
const styles = `
.create-page { max-width: 900px; margin: 0 auto; padding: 24px 16px; }
.create-header { margin-bottom: 24px; position: relative; }
.create-header h1 { font-size: 26px; font-weight: 800; margin: 0 0 4px; color: var(--text); letter-spacing: -0.03em; }
.create-header p { font-size: 14px; color: var(--text2); margin: 0; }
.create-header .balance-badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 14px; border-radius: 999px;
  background: linear-gradient(135deg, rgba(31,140,255,0.1), rgba(167,139,250,0.05));
  border: 1px solid rgba(31,140,255,0.2);
  color: var(--accent); font-size: 13px; font-weight: 700;
  margin-top: 8px;
}

/* Tabs */
.create-tabs { display: flex; gap: 0; margin-bottom: 24px; border-bottom: 1px solid var(--border); }
.create-tab {
  padding: 12px 24px; font-size: 14px; font-weight: 600; color: var(--text3); cursor: pointer;
  border-bottom: 2px solid transparent; transition: all .2s;
  display: flex; align-items: center; gap: 8px;
}
.create-tab:hover { color: var(--text); }
.create-tab.active { color: var(--accent); border-bottom-color: var(--accent); }
.create-tab svg { width: 16px; height: 16px; }

/* URL Bar */
.url-bar { display: flex; gap: 10px; margin-bottom: 20px; }
.url-bar input { flex: 1; }
@media(max-width:600px){ .url-bar { flex-direction: column; } }
.url-fetch-btn {
  padding: 10px 20px; border-radius: 8px; border: 1px solid var(--border);
  background: var(--card); color: var(--text); font-size: 13px; font-weight: 700;
  cursor: pointer; transition: all .15s; white-space: nowrap;
  display: inline-flex; align-items: center; gap: 6px;
}
.url-fetch-btn:hover { border-color: var(--accent); color: var(--accent); }
.url-fetch-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Post Preview */
.post-preview {
  border: 1px solid var(--border); border-radius: 12px; padding: 16px;
  background: var(--card); margin-bottom: 20px;
}
.post-preview-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.post-preview-avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--bg2); display: flex; align-items: center; justify-content: center; color: var(--text3); font-size: 14px; }
.post-preview-name { font-size: 14px; font-weight: 700; color: var(--text); }
.post-preview-handle { font-size: 12px; color: var(--text3); }
.post-preview-text { font-size: 13px; color: var(--text2); line-height: 1.5; margin-bottom: 10px; }
.post-preview-media { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; }
.post-preview-media img { max-height: 200px; border-radius: 8px; }

/* Platform Accordion */
.platform-block { border: 1px solid var(--border); border-radius: 10px; overflow: hidden; margin-bottom: 12px; }
.platform-block-header {
  display: flex; align-items: center; gap: 12px; padding: 14px 16px; cursor: pointer;
  background: var(--card); transition: background .15s; user-select: none;
}
.platform-block-header:hover { background: var(--bg2); }
.platform-block-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; }
.platform-block-name { font-size: 14px; font-weight: 700; color: var(--text); flex: 1; }
.platform-block-toggle { color: var(--text3); transition: transform .2s; display: flex; }
.platform-block-toggle.open { transform: rotate(180deg); }
.platform-block-body { padding: 0 16px 16px; display: flex; flex-direction: column; gap: 12px; }

/* Action Chips */
.action-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.action-chip {
  padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600;
  border: 1px solid var(--border); background: var(--bg); color: var(--text2); cursor: pointer; transition: all .15s;
}
.action-chip:hover { border-color: var(--accent); color: var(--text); }
.action-chip.active { border-color: var(--accent); background: var(--accent); color: #fff; }

/* Slider */
.slider-row { display: flex; align-items: center; gap: 16px; margin: 8px 0; }
.slider-row input[type="range"] { flex: 1; accent-color: var(--accent); height: 6px; }
.slider-value {
  min-width: 48px; text-align: center; font-size: 14px; font-weight: 700; color: var(--text);
  padding: 4px 10px; border-radius: 6px; background: var(--bg2);
}

/* Info section for custom jobs */
.custom-job-info { border-radius: 12px; padding: 16px; margin-bottom: 20px; }
.custom-job-info h3 { font-size: 15px; font-weight: 700; margin: 0 0 8px; display: flex; align-items: center; gap: 8px; color: var(--text); }
.custom-job-info p { font-size: 13px; color: var(--text2); margin: 0 0 12px; line-height: 1.5; }
.custom-job-info .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media(max-width:600px){ .custom-job-info .info-grid { grid-template-columns: 1fr; } }
.custom-job-info .info-card { border-radius: 8px; padding: 12px; }
.custom-job-info .info-card ul { margin: 0; padding: 0 0 0 14px; font-size: 12px; color: var(--text2); line-height: 1.7; }

/* Form */
.form-section { margin-bottom: 24px; }
.form-section-title { font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
@media(max-width:600px){ .form-row { grid-template-columns: 1fr; } }
.form-group { display: flex; flex-direction: column; gap: 4px; }
.form-group label { font-size: 12px; font-weight: 600; color: var(--text3); text-transform: uppercase; letter-spacing: .04em; }
.form-input, .form-textarea, .form-select {
  padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border);
  background: var(--bg); color: var(--text); font-size: 14px; width: 100%;
  transition: border-color .2s; box-sizing: border-box;
}
.form-input:focus, .form-textarea:focus, .form-select:focus { border-color: var(--accent); outline: none; }
.form-textarea { min-height: 100px; resize: vertical; font-family: inherit; }
.form-hint { font-size: 11px; color: var(--text3); margin: 4px 0 0; }
.form-error { font-size: 13px; color: var(--red); margin: 6px 0; }
.form-checkbox { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; color: var(--text); }
.form-checkbox input { width: 16px; height: 16px; accent-color: var(--accent); }

/* Summary Card */
.summary-card { border: 1px solid var(--border); border-radius: 12px; padding: 20px; background: var(--card); margin-top: 20px; }
.summary-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; font-size: 14px; color: var(--text2); }
.summary-row.total { border-top: 1px solid var(--border); margin-top: 8px; padding-top: 12px; font-size: 16px; font-weight: 700; color: var(--text); }
.summary-row.total span:last-child { color: var(--accent); }

/* Buttons */
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 10px 20px; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all .15s; border: none; }
.btn-primary { background: linear-gradient(135deg, #1F8CFF, #1F8CFF); color: #fff; }
.btn-primary:hover { opacity: .9; transform: translateY(-1px); }
.btn-secondary { background: var(--bg); border: 1px solid var(--border); color: var(--text); }
.btn-secondary:hover { border-color: var(--text2); }
.btn-full { width: 100%; justify-content: center; }
.btn:disabled { opacity: .5; cursor: not-allowed; transform: none; }

/* Templates */
.template-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media(max-width:600px){ .template-grid { grid-template-columns: 1fr; } }
.template-card {
  border: 1px solid var(--border); border-radius: 10px; padding: 16px; cursor: pointer; background: var(--card);
  transition: all .15s;
}
.template-card:hover { border-color: var(--accent); transform: translateY(-2px); }
.template-card h4 { margin: 0 0 6px; font-size: 14px; font-weight: 700; color: var(--text); }
.template-card p { margin: 0; font-size: 12px; color: var(--text2); line-height: 1.4; }

/* Extra Settings Toggle */
.extra-settings-toggle {
  width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border);
  background: var(--card); color: var(--text); font-size: 13px; font-weight: 600;
  cursor: pointer; display: flex; align-items: center; justify-content: space-between;
}
.extra-settings-toggle:hover { border-color: var(--text2); }
.extra-settings-body { margin-top: 12px; padding: 16px; border: 1px solid var(--border); border-radius: 10px; background: var(--bg2); }

/* Success Overlay */
.success-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; padding: 16px;
}
.success-card {
  background: var(--card); border-radius: 16px; padding: 32px; text-align: center;
  max-width: 420px; width: 100%; border: 1px solid var(--border);
}
.success-icon {
  width: 56px; height: 56px; border-radius: 50%; margin: 0 auto 16px;
  background: linear-gradient(135deg, #16a34a, #22c55e); display: flex; align-items: center; justify-content: center;
}
.success-icon svg { width: 28px; height: 28px; color: #fff; }
.success-card h2 { font-size: 22px; font-weight: 800; margin: 0 0 8px; color: var(--text); }
.success-card p { font-size: 14px; color: var(--text2); margin: 0 0 20px; line-height: 1.5; }

/* Templates tab */
.templates-empty { text-align: center; padding: 60px 20px; color: var(--text3); }
.templates-empty svg { width: 48px; height: 48px; margin-bottom: 16px; opacity: .4; }
.templates-empty h3 { font-size: 18px; font-weight: 700; margin: 0 0 6px; color: var(--text); }
.templates-empty p { font-size: 14px; margin: 0; }

/* Custom select dropdown like Wurk.fun */
.custom-select-wrapper { position: relative; width: 100%; }
.custom-select-trigger {
  padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border);
  background: var(--bg); color: var(--text); font-size: 14px; width: 100%;
  cursor: pointer; display: flex; align-items: center; justify-content: space-between;
  transition: border-color .2s; box-sizing: border-box;
}
.custom-select-trigger:hover { border-color: var(--accent); }
.custom-select-dropdown {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0;
  border: 1px solid var(--border); border-radius: 8px;
  background: var(--card); z-index: 50; max-height: 220px; overflow-y: auto;
  box-shadow: 0 10px 28px rgba(0,0,0,0.12);
}
.custom-select-option {
  padding: 10px 12px; font-size: 13px; color: var(--text2); cursor: pointer;
  transition: background .1s; display: flex; align-items: center; gap: 8px;
}
.custom-select-option:hover { background: var(--bg2); color: var(--text); }
.custom-select-option.selected { color: var(--accent); font-weight: 600; }

/* Let's Go btn */
.lets-go-btn {
  width: 100%; padding: 12px; border-radius: 8px; border: none;
  background: linear-gradient(135deg, #1F8CFF, #1F8CFF); color: #fff;
  font-size: 14px; font-weight: 700; cursor: pointer; transition: all .15s;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.lets-go-btn:hover { opacity: .9; transform: translateY(-1px); }
.lets-go-btn:disabled { opacity: .5; cursor: not-allowed; transform: none; }

/* Responsive */
@media(max-width:768px){
  .create-page { padding: 16px 12px; }
  .create-tab { padding: 10px 16px; font-size: 13px; }
  .platform-block-header { padding: 12px 14px; }
  .platform-block-body { padding: 0 14px 14px; }
}
`

// ─── Main Component ───
export default function CreateJob() {
  const navigate = useNavigate()
  const { isAuthed } = useAuth()

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('socials')

  // Modal
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Post URL
  const [postUrl, setPostUrl] = useState('')
  const [postPreview, setPostPreview] = useState<{ text: string; authorName: string; authorHandle: string; mediaUrls: string[] } | null>(null)
  const [fetchingPost, setFetchingPost] = useState(false)
  const [postError, setPostError] = useState('')

  // Social actions
  const [expandedPlatforms, setExpandedPlatforms] = useState<string[]>(['x'])
  const [socialConfig, setSocialConfig] = useState<Record<string, { actionId: string; amount: number }>>({
    x: { actionId: 'reposts', amount: 100 },
    instagram: { actionId: 'followers_insta', amount: 100 },
    youtube: { actionId: 'subscribers_youtube', amount: 50 },
    telegram: { actionId: 'members_telegram', amount: 100 },
    discord: { actionId: 'members_discord', amount: 100 },
    tiktok: { actionId: 'followers_tiktok', amount: 100 },
  })

  // Custom job form
  const [winnerMode, setWinnerMode] = useState<WinnerMode>('challenge')
  const [winners, setWinners] = useState(1)
  const [maxEntries, setMaxEntries] = useState(100)
  const [unlimitedEntries, setUnlimitedEntries] = useState(false)
  const [hideSubmissions, setHideSubmissions] = useState(false)
  const [screenshotProof, setScreenshotProof] = useState(true)
  const [watermark, setWatermark] = useState(true)
  const [category, setCategory] = useState('')
  const [subcategory, setSubcategory] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [budget, setBudget] = useState(0.1)
  const [ngnBudget, setNgnBudget] = useState(5000)
  const [payPerWorker, setPayPerWorker] = useState(0)
  const [currency, setCurrency] = useState<Currency>('SOL')
  const [selectionTime, setSelectionTime] = useState('1440')
  const [audience, setAudience] = useState<'all' | 'community'>('all')
  const [communityId, setCommunityId] = useState('')
  const [tags, setTags] = useState('')
  const [cooldown, setCooldown] = useState('0')
  const [showExtraSettings, setShowExtraSettings] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [humanVerified, setHumanVerified] = useState(false)

  // Computed
  const selectedAction = ACTIONS.find(a => a.id === socialConfig.x?.actionId) || ACTIONS[0]
  const pricePerUnit = selectedAction?.minPer || 0.001
  const totalCost = socialConfig.x?.amount * pricePerUnit || 0
  const platformFee = totalCost * 0.1
  const grandTotal = totalCost + platformFee

  const togglePlatform = (platformId: string) => {
    setExpandedPlatforms(prev =>
      prev.includes(platformId)
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    )
  }

  const updateAction = (platformId: string, actionId: string) => {
    setSocialConfig(prev => ({
      ...prev,
      [platformId]: { ...prev[platformId], actionId }
    }))
  }

  const updateAmount = (platformId: string, amount: number) => {
    const maxAction = getActionsForPlatform(platformId)[0]
    const max = maxAction?.maxPerComponent || 100
    setSocialConfig(prev => ({
      ...prev,
      [platformId]: { ...prev[platformId], amount: Math.min(max, Math.max(10, amount)) }
    }))
  }

  const fetchPostPreview = async () => {
    if (!postUrl.trim()) return
    setFetchingPost(true)
    setPostError('')
    setPostPreview(null)
    try {
      const platform = detectPlatform(postUrl)
      if (!platform) { setPostError('Could not detect platform from URL. Please enter a valid X, Instagram, YouTube, Telegram, Discord, or TikTok URL.'); return }
      // Simulate post fetch for now
      await new Promise(r => setTimeout(r, 800))
      setPostPreview({
        text: 'Check out this amazing post! We are excited to share this with everyone. Like, share, and follow for more content.',
        authorName: 'OgaPay',
        authorHandle: '@ogapay',
        mediaUrls: [],
      })
    } catch {
      setPostError('Failed to fetch post. Please check the URL and try again.')
    } finally {
      setFetchingPost(false)
    }
  }

  const handleCreateSocialTask = () => {
    setShowSuccess(true)
  }

  const handleCreateCustomTask = async () => {
    if (!title.trim()) { setSubmitError('Please enter a task title'); return }
    if (!description.trim()) { setSubmitError('Please enter a task description'); return }
    if (currency === 'NGN' && ngnBudget < 500) { setSubmitError('Minimum budget is NGN 500'); return }
    if (currency !== 'NGN' && budget < 0.01) { setSubmitError('Minimum budget is 0.01'); return }
    setSubmitting(true)
    setSubmitError('')
    await new Promise(r => setTimeout(r, 1000))
    setSubmitting(false)
    setShowSuccess(true)
  }

  const applyTemplate = (preset: typeof TEMPLATE_PRESETS[0]) => {
    setTitle(preset.label)
    setDescription(preset.description)
    setActiveTab('custom')
  }

  return (
    <Layout>
      <style>{styles}</style>
      <div className="create-page">

        {/* Header */}
        <div className="create-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h1>Create a Task</h1>
              <p>Post social, custom, or challenge tasks for the OgaPay community to complete.</p>
            </div>
            <button
              onClick={() => setShowInfoModal(true)}
              style={{
                marginLeft: 'auto', padding: '6px 12px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text3)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 12, fontWeight: 600,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              Info
            </button>
          </div>
          {isAuthed && (
            <div className="balance-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/><path d="M15 9l-6 6"/><path d="M9 9l6 6"/></svg>
              Balance: NGN 12,450.00
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="create-tabs">
          <div className={`create-tab ${activeTab === 'socials' ? 'active' : ''}`} onClick={() => setActiveTab('socials')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            Socials
          </div>
          <div className={`create-tab ${activeTab === 'custom' ? 'active' : ''}`} onClick={() => setActiveTab('custom')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            Custom
          </div>
          <div className={`create-tab ${activeTab === 'templates' ? 'active' : ''}`} onClick={() => setActiveTab('templates')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            Templates
          </div>
        </div>

        {/* ─── SOCIALS TAB ─── */}
        {activeTab === 'socials' && (
          <>
            {/* URL Input */}
            <div className="url-bar">
              <input
                className="form-input"
                value={postUrl}
                onChange={e => setPostUrl(e.target.value)}
                placeholder="Paste X post URL, Instagram post URL, TikTok URL..."
                onKeyDown={e => e.key === 'Enter' && fetchPostPreview()}
              />
              <button className="url-fetch-btn" onClick={fetchPostPreview} disabled={!postUrl.trim() || fetchingPost}>
                {fetchingPost ? 'Fetching...' : 'Fetch Post'}
              </button>
            </div>
            {postError && <div className="form-error">{postError}</div>}

            {/* Post Preview */}
            {postPreview && (
              <div className="post-preview">
                <div className="post-preview-header">
                  <div className="post-preview-avatar">
                    {postPreview.authorName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="post-preview-name">{postPreview.authorName}</div>
                    <div className="post-preview-handle">{postPreview.authorHandle}</div>
                  </div>
                </div>
                <div className="post-preview-text">{postPreview.text}</div>
                {postPreview.mediaUrls.length > 0 && (
                  <div className="post-preview-media">
                    {postPreview.mediaUrls.map((url, i) => (
                      <img key={i} src={url} alt="" />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Platform Accordions */}
            {PLATFORMS.map(platform => {
              const actions = getActionsForPlatform(platform.id)
              const config = socialConfig[platform.id] || { actionId: actions[0]?.id || '', amount: 100 }
              const isExpanded = expandedPlatforms.includes(platform.id)
              const currentAction = ACTIONS.find(a => a.id === config.actionId) || actions[0]
              const perPrice = currentAction?.minPer || 0.001
              const actionTotal = config.amount * perPrice
              const actionFee = actionTotal * 0.1
              const actionGrand = actionTotal + actionFee

              return (
                <div key={platform.id} className="platform-block">
                  <div className="platform-block-header" onClick={() => togglePlatform(platform.id)}>
                    <div className="platform-block-icon" style={{ background: `${platform.color}12`, color: platform.color }}>
                      <i className={platform.icon} style={{ fontSize: 16 }} />
                    </div>
                    <span className="platform-block-name">{platform.name}</span>
                    <span className={`platform-block-toggle ${isExpanded ? 'open' : ''}`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                    </span>
                  </div>
                  {isExpanded && (
                    <div className="platform-block-body">
                      {/* Action Chips */}
                      <div className="action-chips">
                        {actions.map(action => (
                          <div
                            key={action.id}
                            className={`action-chip ${config.actionId === action.id ? 'active' : ''}`}
                            onClick={() => updateAction(platform.id, action.id)}
                          >
                            {action.label}
                          </div>
                        ))}
                      </div>
                      {/* Quantity + Price */}
                      <div className="slider-row">
                        <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, whiteSpace: 'nowrap' }}>Quantity</span>
                        <input
                          type="range"
                          min={10}
                          max={currentAction?.maxPerComponent || 100}
                          step={10}
                          value={config.amount}
                          onChange={e => updateAmount(platform.id, Number(e.target.value))}
                        />
                        <span className="slider-value">{config.amount}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: 'var(--text2)' }}>
                        <span>Price: {currency === 'NGN' ? 'NGN' : ''} {perPrice} {currency !== 'NGN' ? 'SOL' : ''} per action</span>
                        <strong style={{ color: 'var(--accent)' }}>
                          Total: {currency === 'NGN' ? 'NGN ' : ''}{currency === 'NGN' ? (actionTotal * 2000).toFixed(0) : formatSol(actionTotal)} {currency !== 'NGN' ? 'SOL' : ''}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Summary + Let's Go */}
            <div className="summary-card" style={{ marginTop: 20 }}>
              <div className="summary-row">
                <span>Platform & Actions</span>
                <strong>{expandedPlatforms.length} active</strong>
              </div>
              <div className="summary-row">
                <span>Subtotal</span>
                <strong>{currency === 'NGN' ? 'NGN ' : ''}{currency === 'NGN' ? (totalCost * 2000).toFixed(0) : formatSol(totalCost)} {currency !== 'NGN' ? 'SOL' : ''}</strong>
              </div>
              <div className="summary-row">
                <span>Platform Fee (10%)</span>
                <strong>{currency === 'NGN' ? 'NGN ' : ''}{currency === 'NGN' ? (platformFee * 2000).toFixed(0) : formatSol(platformFee)} {currency !== 'NGN' ? 'SOL' : ''}</strong>
              </div>
              <div className="summary-row total">
                <span>Total</span>
                <strong>{currency === 'NGN' ? 'NGN ' : ''}{currency === 'NGN' ? (grandTotal * 2000).toFixed(0) : formatSol(grandTotal)} {currency !== 'NGN' ? 'SOL' : ''}</strong>
              </div>
              <button className="lets-go-btn" style={{ marginTop: 16 }} onClick={handleCreateSocialTask}>
                Let's Go
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </button>
            </div>
          </>
        )}

        {/* ─── CUSTOM TAB ─── */}
        {activeTab === 'custom' && (
          <>

            {/* Task Details */}
            <div className="form-section-title" style={{ marginTop: 24 }}>
              Task Details
              <InfoIcon label="Understanding Custom Tasks" onClick={() => setShowInfoModal(true)} />
            </div>

            {/* Mode Selector */}
            <div className="form-row">
              <div className="form-group">
                <label>Task Mode</label>
                <select className="form-select" value={winnerMode} onChange={e => setWinnerMode(e.target.value as WinnerMode)}>
                  <option value="challenge">Challenge Mode - Multiple winners</option>
                  <option value="selection">Selection Mode - One qualified worker</option>
                  <option value="creator_picks">Creator Picks Winners</option>
                  <option value="random">Random Selection</option>
                </select>
              </div>
              <div className="form-group">
                <label>Number of Winners</label>
                <input className="form-input" type="number" min={1} max={1000} value={winners}
                  onChange={e => setWinners(Math.min(1000, Math.max(1, Number(e.target.value) || 1)))} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Max Entries</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input className="form-input" type="number" min={1} value={unlimitedEntries ? 0 : maxEntries}
                    disabled={unlimitedEntries}
                    onChange={e => setMaxEntries(Number(e.target.value))}
                    style={{ flex: 1 }} />
                  <label className="form-checkbox" style={{ whiteSpace: 'nowrap' }}>
                    <input type="checkbox" checked={unlimitedEntries} onChange={e => setUnlimitedEntries(e.target.checked)} />
                    Unlimited
                  </label>
                </div>
              </div>
              <div className="form-group">
                <label>Selection Deadline</label>
                <select className="form-select" value={selectionTime} onChange={e => setSelectionTime(e.target.value)}>
                  {SELECTION_TIME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Category</label>
                <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
                  <option value="">Select category</option>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Subcategory</label>
                <select className="form-select" value={subcategory} onChange={e => setSubcategory(e.target.value)} disabled={!category}>
                  <option value="">Select subcategory</option>
                  {CATEGORIES.find(c => c.id === category)?.subcategories.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Title</label>
                <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Give your task a short name" />
              </div>
              <div className="form-group">
                <label>Search Tags</label>
                <input className="form-input" value={tags} onChange={e => setTags(e.target.value)} placeholder="design, logo, social" />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ marginBottom: 0 }}>Description</label>
                <button
                  onClick={() => setShowTemplates(!showTemplates)}
                  style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 4,
                    border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text3)',
                    cursor: 'pointer', fontWeight: 600,
                  }}
                >
                  Templates
                </button>
              </div>
              <textarea className="form-textarea" value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Explain what needs to be done. Include requirements, examples, and any reference materials." />
              <span className="form-hint">{description.length}/5000 characters</span>
            </div>

            {/* Templates Modal */}
            {showTemplates && (
              <div className="template-grid" style={{ marginBottom: 16 }}>
                {TEMPLATE_PRESETS.map(preset => (
                  <div key={preset.id} className="template-card" onClick={() => applyTemplate(preset)}>
                    <h4>{preset.label}</h4>
                    <p>{preset.description}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Requirements */}
            <div className="form-row">
              <div className="form-group">
                <label>Hide Submissions</label>
                <select className="form-select" value={hideSubmissions ? 'yes' : 'no'} onChange={e => setHideSubmissions(e.target.value === 'yes')}>
                  <option value="no">Visible during review</option>
                  <option value="yes">Hidden until job closes</option>
                </select>
              </div>
              <div className="form-group">
                <label>Screenshot Proof</label>
                <select className="form-select" value={screenshotProof ? 'yes' : 'no'} onChange={e => setScreenshotProof(e.target.value === 'yes')}>
                  <option value="yes">Required</option>
                  <option value="no">Not required</option>
                </select>
              </div>
            </div>

            <label className="form-checkbox" style={{ marginBottom: 16 }}>
              <input type="checkbox" checked={humanVerified} onChange={e => setHumanVerified(e.target.checked)} />
              Human Verified (participants must be human verified)
            </label>

            {/* Extra Settings */}
            <div style={{ marginBottom: 16 }}>
              <button className="extra-settings-toggle" onClick={() => setShowExtraSettings(!showExtraSettings)}>
                <span>Extra Settings</span>
                <span style={{ transform: showExtraSettings ? 'rotate(180deg)' : 'none', transition: 'transform .2s', display: 'inline-flex' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                </span>
              </button>
              {showExtraSettings && (
                <div className="extra-settings-body">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Cooldown Period</label>
                      <select className="form-select" value={cooldown} onChange={e => setCooldown(e.target.value)}>
                        {COOLDOWN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Audience</label>
                      <select className="form-select" value={audience} onChange={e => setAudience(e.target.value as 'all' | 'community')}>
                        <option value="all">All users</option>
                        <option value="community">Specific community</option>
                      </select>
                    </div>
                  </div>
                  {audience === 'community' && (
                    <div className="form-group">
                      <label>Community ID</label>
                      <input className="form-input" value={communityId} onChange={e => setCommunityId(e.target.value)} placeholder="Enter community ID..." />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Budget */}
            <div className="form-section-title">Budget & Payment</div>
            <div className="form-row">
              <div className="form-group">
                <label>Currency</label>
                <select className="form-select" value={currency} onChange={e => setCurrency(e.target.value as Currency)}>
                  <option value="SOL">SOL</option>
                  <option value="USDC">USDC</option>
                  <option value="NGN">NGN (₦)</option>
                </select>
              </div>
              {currency === 'NGN' ? (
                <div className="form-group">
                  <label>Total Budget (NGN)</label>
                  <input className="form-input" type="number" min={500} step={100} value={ngnBudget}
                    onChange={e => setNgnBudget(Math.max(500, Number(e.target.value) || 500))} />
                  <span className="form-hint">Minimum NGN 500</span>
                </div>
              ) : (
                <div className="form-group">
                  <label>Total Budget ({currency})</label>
                  <input className="form-input" type="number" min={0.01} step={0.01} value={budget}
                    onChange={e => setBudget(Math.max(0.01, Number(e.target.value) || 0.01))} />
                  <span className="form-hint">Minimum 0.01 {currency}</span>
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="summary-card">
              <div className="summary-row">
                <span>Total Budget</span>
                <strong>{currency === 'NGN' ? `NGN ${ngnBudget.toLocaleString()}` : `${formatSol(budget)} ${currency}`}</strong>
              </div>
              <div className="summary-row">
                <span>Winners</span>
                <strong>{winners}</strong>
              </div>
              <div className="summary-row">
                <span>Platform Fee (10%)</span>
                <strong>{currency === 'NGN' ? `NGN ${(ngnBudget * 0.1).toLocaleString()}` : `${formatSol(budget * 0.1)} ${currency}`}</strong>
              </div>
              <div className="summary-row total">
                <span>Total to Pay</span>
                <strong>{currency === 'NGN' ? `NGN ${ngnBudget.toLocaleString()}` : `${formatSol(budget)} ${currency}`}</strong>
              </div>
            </div>

            {submitError && <div className="form-error">{submitError}</div>}
            <button className="btn btn-primary btn-full" style={{ marginTop: 16 }} onClick={handleCreateCustomTask} disabled={submitting}>
              {submitting ? 'Creating Task...' : 'Create Task'}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>
          </>
        )}

        {/* ─── TEMPLATES TAB ─── */}
        {activeTab === 'templates' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 14, color: 'var(--text2)', margin: 0, lineHeight: 1.5 }}>
                Choose from our preset task templates to get started quickly. Each template provides a ready-made description and structure.
              </p>
            </div>
            <div className="template-grid">
              {TEMPLATE_PRESETS.map(preset => (
                <div key={preset.id} className="template-card" onClick={() => applyTemplate(preset)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(31,140,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1F8CFF' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    </div>
                    <h4 style={{ margin: 0 }}>{preset.label}</h4>
                  </div>
                  <p>{preset.description}</p>
                </div>
              ))}
            </div>

            {/* Empty saved state */}
            <div className="templates-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              <h3>No saved templates yet</h3>
              <p>Create a custom task and save it as a template to reuse later.</p>
            </div>
          </div>
        )}

        {/* Help Banner */}
        <div style={{
          marginTop: 32, padding: '16px 20px', borderRadius: 12,
          background: 'var(--bg2)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap'
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>Need help or have suggestions?</div>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>Join the OgaPay Creators chat to get help, share feedback, and connect with other creators.</div>
          </div>
          <a href="https://t.me/ogapay" target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Join OgaPay Community
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/><polyline points="12 5 19 12 12 19"/></svg>
          </a>
        </div>
      </div>

      {/* Info Modal */}
      <InfoModal open={showInfoModal} onClose={() => setShowInfoModal(false)} />

      {/* Success Modal */}
      {showSuccess && (
        <div className="success-overlay" onClick={() => { setShowSuccess(false); navigate('/tasks') }}>
          <div className="success-card" onClick={e => e.stopPropagation()}>
            <div className="success-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2>Task Created!</h2>
            <p>Your task has been submitted and is now live. Workers can start completing it immediately.</p>
            <button className="btn btn-primary" onClick={() => navigate('/tasks')}>
              View My Tasks
            </button>
          </div>
        </div>
      )}
    </Layout>
  )
}
