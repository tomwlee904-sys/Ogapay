import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import Footer from "../components/Footer"
import Drawer from "../components/Drawer"

const PRIMARY = '#121566'
const SECONDARY = '#4F46E5'
const ACCENT = '#6366F1'

const categories = ['All', 'News', 'Community', 'Web3', 'Guides', 'Tutorials', 'Product Updates', 'Success Stories']

const badgeColors: Record<string, { bg: string; color: string }> = {
  News: { bg: '#E6F1FB', color: '#185FA5' },
  Community: { bg: '#EEEDFE', color: PRIMARY },
  Web3: { bg: '#EAF3DE', color: '#3B6D11' },
  Guides: { bg: '#FEF3C7', color: '#B45309' },
  Tutorials: { bg: '#FCE7F3', color: '#9D174D' },
  'Product Updates': { bg: '#DBEAFE', color: '#1E40AF' },
  'Success Stories': { bg: '#D1FAE5', color: '#065F46' },
}

const sectionConfig = [
  { id: 'latest', label: 'Latest Articles' },
  { id: 'news', label: 'News' },
  { id: 'community', label: 'Community' },
  { id: 'web3', label: 'Web3' },
  { id: 'guides', label: 'Earning Tips' },
  { id: 'tutorials', label: 'Tutorials' },
  { id: 'updates', label: 'Product Updates' },
  { id: 'stories', label: 'Success Stories' },
]

const posts = [
  // Featured — Success Stories
  { id: 1, section: 'stories', category: 'Success Stories', title: 'From zero to ₦800k/month: Chukwudi\'s story using the OgaPay worker portal', excerpt: 'One earner\'s journey from side hustle to full-time income on OgaPay. Discover the exact strategies he used to scale his earnings.', author: 'Fatima B.', authorInitials: 'FB', date: 'June 5, 2026', readTime: '8 min read', color: '#065F46', tags: ['success', 'earnings', 'worker-portal'], content: 'Chukwudi started on OgaPay in March 2025 with zero experience in digital work. Within 6 months, he was earning ₦800,000 monthly through the Worker Portal. His secret? Focusing on high-value tasks and building a reputation system that kept task posters coming back.\n\n"At first I was doing any task I could find — surveys, social media engagement, app testing. But I quickly realized the earners making the most money were those who specialized."\n\nHe focused on content review and UI/UX testing tasks, which paid 3-5x more than basic social media tasks. He also maintained a 98% success rate, which put his profile at the top of search results.\n\nToday, Chukwudi manages a team of 5 junior earners and spends most of his time reviewing their work rather than doing tasks himself.' },
  // News
  { id: 2, section: 'news', category: 'News', title: 'OgaPay launches instant wallet-to-bank withdrawals across 12 African countries', excerpt: 'Earners can now withdraw directly to their local bank accounts in seconds with zero fees on withdrawals under ₦10,000.', author: 'OgaPay Team', authorInitials: 'OG', date: 'June 4, 2026', readTime: '3 min read', color: '#185FA5', tags: ['withdrawals', 'banking', 'nigeria'], content: 'OgaPay has partnered with leading payment processors across Africa to enable instant wallet-to-bank withdrawals. The feature is now live in Nigeria, Ghana, Kenya, South Africa, and 8 other countries.\n\nWithdrawals under ₦10,000 are completely free, and larger withdrawals carry a minimal 1.5% fee — significantly lower than traditional banking channels.\n\n"We believe earners should have immediate access to their money," said the OgaPay team. "This is the first step toward our goal of becoming Africa\'s primary digital earning infrastructure."' },
  { id: 3, section: 'news', category: 'News', title: 'OgaPay communities hit 200,000 members — here\'s what\'s driving the growth', excerpt: 'How peer-to-peer communities inside OgaPay became the platform\'s fastest growing feature with localized earning groups.', author: 'OgaPay Team', authorInitials: 'OG', date: 'June 2, 2026', readTime: '3 min read', color: '#185FA5', tags: ['communities', 'growth', 'social'], content: 'OgaPay Communities has crossed 200,000 members across 500+ active groups. The feature allows earners to form location-based and skill-based communities where they share tips, task leads, and support.\n\nThe most active communities include "Lagos Earners Hub" with 12,000 members, "Student Earners" with 8,500 members, and "Crypto Task Specialists" with 6,200 members.\n\nCommunity leaders earn a commission on tasks completed by their members, creating a powerful incentive to help others succeed.' },
  { id: 4, section: 'news', category: 'News', title: 'New partnership brings 50,000+ remote data entry tasks to OgaPay', excerpt: 'Major data annotation companies choose OgaPay as their preferred workforce platform for African talent.', author: 'OgaPay Team', authorInitials: 'OG', date: 'May 29, 2026', readTime: '4 min read', color: '#185FA5', tags: ['partnerships', 'data-entry', 'remote'], content: 'OgaPay has signed agreements with three major data annotation companies, bringing over 50,000 remote data entry and labeling tasks to the platform. These tasks pay between ₦500 and ₦5,000 each and require no prior experience.\n\n"This is a game-changer for our earners," said the OgaPay CEO. "Data annotation is one of the fastest-growing remote work categories globally, and African workers are perfectly positioned to capture this opportunity."' },
  // Community
  { id: 5, section: 'community', category: 'Community', title: 'How Nigerian freelancers are earning 5x more with OgaPay tasks', excerpt: 'Discover how thousands of earners across West Africa are turning micro-tasks into meaningful income streams.', author: 'OgaPay Team', authorInitials: 'OG', date: 'May 27, 2026', readTime: '5 min read', color: PRIMARY, tags: ['freelancers', 'nigeria', 'earnings'], content: 'Across Nigeria, Ghana, and Kenya, a new generation of earners is discovering that micro-tasks on OgaPay can replace traditional part-time jobs. The average active earner on OgaPay makes ₦45,000 monthly, with top earners crossing ₦500,000.\n\nThe key categories driving these earnings are social media management (₦50-200 per task), content creation (₦200-1,000 per task), and data annotation (₦100-500 per task).\n\nWhat sets OgaPay apart is the ability to earn without specialized skills — a working smartphone and internet connection are all you need to start.' },
  { id: 6, section: 'community', category: 'Community', title: 'Meet the OgaPay community leaders shaping Africa\'s gig economy', excerpt: 'These 5 community leaders are building the largest peer-to-peer earning networks across the continent.', author: 'Adaeze N.', authorInitials: 'AN', date: 'May 24, 2026', readTime: '6 min read', color: PRIMARY, tags: ['leaders', 'community', 'gig-economy'], content: 'Behind every thriving OgaPay community is a dedicated leader who recruits, trains, and motivates members. From Chioma in Lagos who runs a 12,000-member group, to Kevin in Nairobi who specializes in crypto tasks, these leaders are the backbone of the OgaPay ecosystem.\n\nCommunity leaders earn 5% commission on all tasks completed by their members, creating a sustainable income stream while helping others succeed.' },
  // Web3
  { id: 7, section: 'web3', category: 'Web3', title: 'OgaPay Vault explained: how to save and grow your earnings safely', excerpt: 'Everything you need to know about putting your OgaPay earnings to work with competitive APY rates.', author: 'Ngozi A.', authorInitials: 'NA', date: 'May 21, 2026', readTime: '5 min read', color: '#3B6D11', tags: ['vault', 'savings', 'defi'], content: 'The OgaPay Vault is a savings feature that allows earners to earn up to 12% APY on their idle balances. Unlike traditional bank savings accounts that offer 2-4% interest, the Vault uses decentralized finance protocols to generate higher yields.\n\nFunds in the Vault are insured up to ₦500,000 through our partnership with leading web3 insurance protocols. Deposits and withdrawals are instant and free.\n\n"We want OgaPay to be more than just a place to earn — we want it to be where your money grows," said the product team.' },
  { id: 8, section: 'web3', category: 'Web3', title: 'Understanding Solana wallets: a beginner\'s guide for OgaPay earners', excerpt: 'Everything you need to know about setting up and using Solana wallets for faster, cheaper transactions.', author: 'Emeka J.', authorInitials: 'EJ', date: 'May 18, 2026', readTime: '7 min read', color: '#3B6D11', tags: ['solana', 'wallet', 'crypto'], content: 'Solana wallets are essential for OgaPay earners who want faster transactions and lower fees. This guide covers Phantom, Backpack, and Solflare wallets — how to set them up, fund them, and connect them to your OgaPay account.\n\nSolana processes up to 65,000 transactions per second with fees under $0.01, making it ideal for micro-task payments where traditional crypto networks would be too expensive.' },
  // Guides (Earning Tips)
  { id: 9, section: 'guides', category: 'Guides', title: 'Top 10 task categories paying the most on OgaPay this month', excerpt: 'From social media tasks to crypto verification — here\'s where the money is right now.', author: 'Emeka J.', authorInitials: 'EJ', date: 'May 16, 2026', readTime: '4 min read', color: '#B45309', tags: ['tips', 'categories', 'high-paying'], content: 'Our monthly analysis of task categories shows which types of work are paying the most. This month, crypto verification tasks top the list at an average of ₦2,500 per task, followed by UI/UX testing at ₦1,800, and content writing at ₦1,200.\n\nSocial media engagement tasks, while paying less per task (₦50-200), offer the highest volume with thousands of tasks available daily.\n\nFor maximum earnings, we recommend mixing high-volume social tasks with high-value specialized tasks.' },
  { id: 10, section: 'guides', category: 'Guides', title: 'How to get verified on OgaPay and unlock higher-paying tasks', excerpt: 'Complete your KYC and profile setup to access premium tasks that pay 3x more.', author: 'Ngozi A.', authorInitials: 'NA', date: 'May 13, 2026', readTime: '3 min read', color: '#B45309', tags: ['verification', 'kyc', 'premium'], content: 'Verified earners on OgaPay earn an average of 3x more than unverified users. The verification process is simple: submit your BVN or NIN, upload a selfie, and complete your profile.\n\nTasks labeled "Verified Only" typically pay ₦500-5,000 per task compared to ₦50-500 for standard tasks. Verification also unlocks instant withdrawals and higher withdrawal limits.' },
  // Tutorials
  { id: 11, section: 'tutorials', category: 'Tutorials', title: 'Step-by-step: Complete your first OgaPay task in 10 minutes', excerpt: 'New to OgaPay? Follow this guide to sign up, browse tasks, submit your first proof of work, and get paid.', author: 'OgaPay Team', authorInitials: 'OG', date: 'May 10, 2026', readTime: '10 min read', color: '#9D174D', tags: ['beginner', 'guide', 'first-task'], content: 'This comprehensive tutorial walks you through your first 10 minutes on OgaPay. From creating an account to receiving your first payment, every step is explained with screenshots and tips.\n\nStep 1: Create your account\nStep 2: Complete your profile\nStep 3: Browse available tasks\nStep 4: Apply and submit proof\nStep 5: Get paid\n\nBy the end of this guide, you\'ll have earned your first money on OgaPay.' },
  // Product Updates
  { id: 12, section: 'updates', category: 'Product Updates', title: 'Introducing the OgaPay mobile app — earn on the go', excerpt: 'Our new mobile app brings the full OgaPay experience to your smartphone with push notifications for new tasks.', author: 'OgaPay Team', authorInitials: 'OG', date: 'May 7, 2026', readTime: '2 min read', color: '#1E40AF', tags: ['mobile', 'app', 'update'], content: 'The OgaPay mobile app is now available on iOS and Android. The app includes all the features of the web platform plus push notifications for new tasks, instant messaging, and biometric authentication.\n\n"Mobile-first was always our vision," said the product team. "Most of our earners access OgaPay from their phones, and the app delivers a much smoother experience than the mobile web version."\n\nDownload the app today from the App Store or Google Play.' },
]

// Tile components (kept from original)
// Tile 1: Join The Community — photo of woman at cozy desk
function JoinCommunityTile({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer', height: '100%', minHeight: 300 }}
    >
      <img src="/assets/join-community.jpg" alt="Join the Community" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
      <div style={{ position: 'absolute', inset: 0, background: hovered ? 'rgba(18,21,102,0.18)' : 'transparent', transition: 'background 0.3s' }} />
      <div style={{ position: 'absolute', top: 14, left: 14, opacity: hovered ? 1 : 0, transform: hovered ? 'translateY(0)' : 'translateY(-8px)', transition: 'all 0.25s ease' }}>
        <button onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--bg)', color: 'var(--text)', fontSize: 13, fontWeight: 600, padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
          Join The Community <span style={{ background: '#1a1a1a', color: '#fff', borderRadius: 4, padding: '2px 6px', fontSize: 12 }}>→</span>
        </button>
      </div>
    </div>
  )
}

// Tile 2: Start Selling — earner cards (kept from original)
function StartSellingTile({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{ background: '#4A1B3A', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', position: 'relative', overflow: 'hidden', cursor: 'pointer', height: '100%', minHeight: 280 }}
    >
      <div style={{ position: 'absolute', top: 14, left: 14, opacity: hovered ? 1 : 0, transform: hovered ? 'translateY(0)' : 'translateY(-8px)', transition: 'all 0.25s ease' }}>
        <button onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--bg)', color: 'var(--text)', fontSize: 13, fontWeight: 600, padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
          Start Selling <span style={{ background: '#1a1a1a', color: '#fff', borderRadius: 4, padding: '2px 6px', fontSize: 12 }}>→</span>
        </button>
      </div>
      {/* Card behind-left */}
      <div style={{ position: 'absolute', width: 130, height: 165, background: '#E8A0B4', borderRadius: 10, transform: hovered ? 'rotate(-12deg) translate(-60px, 10px)' : 'rotate(-6deg) translate(-20px, 4px)', transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)', border: '2px solid rgba(255,255,255,0.2)' }}>
        <div style={{ padding: '0.5rem', paddingTop: '0.75rem' }}>
          <div style={{ height: 80, background: 'rgba(255,255,255,0.2)', borderRadius: 6, marginBottom: 8 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(255,255,255,0.5)' }} /><div style={{ height: 8, background: 'rgba(255,255,255,0.4)', borderRadius: 4, flex: 1 }} /></div>
          <div style={{ marginTop: 6, fontSize: 10, color: 'rgba(80,20,40,0.8)', fontWeight: 600 }}>5 ★</div>
        </div>
      </div>
      {/* Card behind-right */}
      <div style={{ position: 'absolute', width: 130, height: 165, background: '#F2C4D0', borderRadius: 10, transform: hovered ? 'rotate(12deg) translate(60px, 10px)' : 'rotate(6deg) translate(20px, 4px)', transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)', border: '2px solid rgba(255,255,255,0.2)' }}>
        <div style={{ padding: '0.5rem', paddingTop: '0.75rem' }}>
          <div style={{ height: 80, background: 'rgba(255,255,255,0.25)', borderRadius: 6, marginBottom: 8 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(255,255,255,0.5)' }} /><div style={{ height: 8, background: 'rgba(255,255,255,0.4)', borderRadius: 4, flex: 1 }} /></div>
          <div style={{ marginTop: 6, fontSize: 10, color: 'rgba(80,20,40,0.8)', fontWeight: 600 }}>5 ★</div>
        </div>
      </div>
      {/* Front card */}
      <div style={{ position: 'relative', zIndex: 5, background: '#121566', borderRadius: 10, width: 140, height: 175, border: '3px solid #121566', transform: hovered ? 'scale(1.06) translateY(-6px)' : 'scale(1)', transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)', boxShadow: hovered ? '0 16px 40px rgba(0,0,0,0.4)' : '0 6px 20px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '0.5rem' }}>
          <div style={{ height: 90, background: '#ffffff', borderRadius: 6, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🧑🏾‍💻</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#121566', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#fff', fontWeight: 700 }}>OG</div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>Chukwudi</span>
            </div>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>5 ★</span>
          </div>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2 }}><div style={{ width: '80%', height: '100%', background: '#ffffff', borderRadius: 2 }} /></div>
        </div>
      </div>
    </div>
  )
}

// Tile 3: Grow Your Business — spinning donut on #121566
function GrowBusinessTile({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{ background: '#121566', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', cursor: 'pointer', height: '100%', minHeight: 280 }}
    >
      <div style={{ position: 'absolute', top: 14, left: 14, opacity: hovered ? 1 : 0, transform: hovered ? 'translateY(0)' : 'translateY(-8px)', transition: 'all 0.25s ease' }}>
        <button onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--bg)', color: 'var(--text)', fontSize: 13, fontWeight: 600, padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
          Grow Your Business <span style={{ background: '#1a1a1a', color: '#fff', borderRadius: 4, padding: '2px 6px', fontSize: 12 }}>→</span>
        </button>
      </div>
      <div style={{ position: 'relative', width: 180, height: 180 }}>
        <svg
          width="180" height="180" viewBox="0 0 180 180"
          style={{ transform: hovered ? 'rotate(360deg)' : 'rotate(0deg)', transition: hovered ? 'transform 1.2s cubic-bezier(0.4,0,0.2,1)' : 'transform 0.6s ease' }}
        >
          <circle cx="90" cy="90" r="72" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="28" />
          <circle cx="90" cy="90" r="72" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="28"
            strokeDasharray="340 452" strokeDashoffset="113" strokeLinecap="round" />
          <circle cx="90" cy="90" r="72" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="28"
            strokeDasharray="68 452" strokeDashoffset="-227" strokeLinecap="round" />
          <circle cx="90" cy="90" r="44" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="18" />
          <circle cx="90" cy="90" r="44" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="18"
            strokeDasharray="220 276" strokeDashoffset="69" strokeLinecap="round" />
          <circle cx="90" cy="90" r="24" fill="rgba(255,255,255,0.15)" />
          <text x="90" y="96" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">↗</text>
        </svg>
      </div>
    </div>
  )
}

// Tile 4: Get Inspired — adventure illustration (kept from original)
function GetInspiredTile({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer', background: '#FFD6D6', height: '100%', minHeight: 300 }}
    >
      <img src="/assets/get-inspired.png" alt="Get Inspired" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(18,21,102,0.1)', opacity: hovered ? 1 : 0, transition: 'opacity 0.3s' }} />
      <div style={{ position: 'absolute', top: 14, left: 14, opacity: hovered ? 1 : 0, transform: hovered ? 'translateY(0)' : 'translateY(-8px)', transition: 'all 0.25s ease' }}>
        <button onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--bg)', color: 'var(--text)', fontSize: 13, fontWeight: 600, padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
          Get Inspired <span style={{ background: '#1a1a1a', color: '#fff', borderRadius: 4, padding: '2px 6px', fontSize: 12 }}>→</span>
        </button>
      </div>
    </div>
  )
}


/* ─── Article Card Component ─── */
function ArticleCard({ post, onClick }: { post: any; onClick: () => void }) {
  const badge = badgeColors[post.category] || { bg: '#EEEDFE', color: PRIMARY }
  return (
    <div onClick={onClick}
      style={{ background: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow .2s, transform .2s', display: 'flex', flexDirection: 'column' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }}>
      <div style={{ height: 180, background: `linear-gradient(135deg, ${post.color || PRIMARY}, ${SECONDARY})`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        <span style={{ position: 'absolute', bottom: 10, right: 10, fontSize: 10, fontWeight: 600, color: '#fff', background: 'rgba(0,0,0,0.25)', padding: '2px 8px', borderRadius: 20, backdropFilter: 'blur(4px)' }}>{post.readTime}</span>
      </div>
      <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, background: badge.bg, color: badge.color, padding: '2px 8px', borderRadius: 20, marginBottom: 8, alignSelf: 'flex-start' }}>{post.category}</span>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4, margin: '0 0 6px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{post.title}</h3>
        <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, margin: '0 0 auto', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{post.excerpt}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text3)', marginTop: 12, paddingTop: 10, borderTop: '0.5px solid var(--border)' }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: post.color || PRIMARY, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{post.authorInitials}</div>
          <span style={{ fontWeight: 500, color: 'var(--text2)' }}>{post.author}</span>
          <span style={{ color: 'var(--border2)' }}>·</span>
          <span>{post.date}</span>
        </div>
      </div>
    </div>
  )
}

/* ─── Article Detail Modal ─── */
function ArticleDetail({ post, onClose, allPosts }: { post: any; onClose: () => void; allPosts: any[] }) {
  const related = allPosts.filter(p => p.id !== post.id && (p.category === post.category || p.section === post.section)).slice(0, 4)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '30px 16px', overflowY: 'auto' }} onClick={onClose}>
      <div style={{ background: 'var(--card)', borderRadius: 16, maxWidth: 760, width: '100%', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', margin: 'auto' }} onClick={e => e.stopPropagation()}>
        {/* Hero image */}
        <div style={{ height: 280, background: `linear-gradient(135deg, ${post.color || PRIMARY}, ${SECONDARY})`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 16, left: 16, width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.3)', border: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 18, backdropFilter: 'blur(4px)' }}>
            <i className="ti ti-x" />
          </button>
          <div style={{ textAlign: 'center', padding: '0 40px', maxWidth: 600 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: 20, backdropFilter: 'blur(4px)', marginBottom: 12, display: 'inline-block' }}>{post.category}</span>
            <h2 style={{ fontSize: 26, fontWeight: 700, color: '#fff', lineHeight: 1.3, margin: '12px 0 8px' }}>{post.title}</h2>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.75)', flexWrap: 'wrap' }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>{post.authorInitials}</span>
              <span>{post.author}</span>
              <span>·</span>
              <span>{post.date}</span>
              <span>·</span>
              <span>{post.readTime}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '1.75rem 2rem' }}>
          <div style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
            {(post.content || post.excerpt).split('\n\n').map((p: string, i: number) => (
              <p key={i} style={{ margin: '0 0 16px' }}>{p}</p>
            ))}
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 20, paddingTop: 16, borderTop: '0.5px solid var(--border)' }}>
              {post.tags.map((t: string) => (
                <span key={t} style={{ fontSize: 11, fontWeight: 500, color: PRIMARY, background: '#EEEDFE', padding: '3px 10px', borderRadius: 20 }}>#{t}</span>
              ))}
            </div>
          )}

          {/* Share & Actions */}
          <div style={{ display: 'flex', gap: 10, marginTop: 20, paddingTop: 16, borderTop: '0.5px solid var(--border)', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { navigator.clipboard?.writeText(window.location.href); }}
                style={{ fontSize: 12, color: PRIMARY, background: 'none', border: '1px solid #E5E7EB', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 11l5 5 5-5M12 4v12"/></svg>
                Share
              </button>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>{post.readTime} · {post.date}</span>
          </div>

          {/* Author Card */}
          <div style={{ marginTop: 24, padding: '16px 20px', background: 'var(--bg2)', borderRadius: 12, border: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: post.color || PRIMARY, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, flexShrink: 0 }}>{post.authorInitials}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{post.author}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>OgaPay Contributor</div>
            </div>
          </div>

          {/* Related Articles */}
          {related.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>Related Articles</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                {related.map(r => (
                  <div key={r.id} onClick={() => { /* close and reopen - handled by parent state change */ }}
                    style={{ background: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: 10, overflow: 'hidden', cursor: 'pointer' }}>
                    <div style={{ height: 100, background: `linear-gradient(135deg, ${r.color || PRIMARY}, ${SECONDARY})` }} />
                    <div style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: 9, fontWeight: 600, color: PRIMARY, background: '#EEEDFE', padding: '1px 6px', borderRadius: 10, marginBottom: 4, display: 'inline-block' }}>{r.category}</span>
                      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', margin: '4px 0 0', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

}
export default function Blog() {
  const navigate = useNavigate()
  const { isAuthed } = useAuth()
  const { theme, toggle } = useTheme()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [showArticles, setShowArticles] = useState(false)
  const [selectedPost, setSelectedPost] = useState<any>(null)
  const [activeCategory, setActiveCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  // Merge localStorage user posts with default posts
  const [allPosts, setAllPosts] = useState(posts)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('ogapay_user_posts')
      if (stored) {
        const userPosts = JSON.parse(stored).map((p: any, i: number) => ({
          ...p,
          id: 1000 + i,
          section: p.section || 'community',
          isUserPost: true,
          color: p.coverColor || SECONDARY,
          tags: p.tags ? p.tags.split(',').map((t: string) => t.trim()) : [],
          content: p.body || '',
        }))
        setAllPosts([...userPosts, ...posts])
      }
    } catch {}
  }, [])

  const filteredPosts = activeCategory === 'All'
    ? allPosts
    : allPosts.filter(p => p.category === activeCategory)

  const searchedPosts = search.trim()
    ? filteredPosts.filter(p => {
        const q = search.toLowerCase()
        return p.title?.toLowerCase().includes(q)
          || p.category?.toLowerCase().includes(q)
          || p.excerpt?.toLowerCase().includes(q)
          || p.content?.toLowerCase().includes(q)
          || p.tags?.some((t: string) => t.toLowerCase().includes(q))
      })
    : filteredPosts

  const featuredPost = searchedPosts[0]
  const restPosts = searchedPosts.slice(1)

  // Group by section for the grid view
  const getSectionPosts = (sectionId: string) => restPosts.filter(p => p.section === sectionId)

  const heroView = (
    <div data-theme={theme} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <style>{`
        .blog-nav-link:hover { color: ${PRIMARY} !important; }
        .blog-cat-btn:hover { background: #f0f0f0 !important; }
        .blog-hero { background: ${PRIMARY}; min-height: 500px; padding: 80px 40px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; position: relative; overflow: hidden; }
        @media (max-width: 768px) { .blog-hero { min-height: 360px; padding: 56px 24px; } }
      `}</style>
      <nav style={{ borderBottom: '1px solid #e5e5e5', padding: '0.875rem 2.5rem', display: 'flex', alignItems: 'center', gap: 20, background: 'var(--card)', position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={() => setShowArticles(false)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><span style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>blog.</span></button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: 360, border: '1px solid #ddd', borderRadius: 6, padding: '6px 12px', background: 'var(--bg2)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input placeholder="Search by topic or keyword" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && setShowArticles(true)}
            style={{ border: 'none', background: 'none', outline: 'none', fontSize: 13, color: '#333', width: '100%' }} />
        </div>
        <button onClick={() => { setShowArticles(true); if (search.trim()) setActiveCategory('All') }} style={{ background: PRIMARY, color: '#fff', border: 'none', borderRadius: 6, padding: '7px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Search</button>
        <button onClick={toggle} style={{ background: 'none', border: '1.5px solid #ddd', borderRadius: 8, width: 36, height: 36, display: 'grid', placeItems: 'center', cursor: 'pointer', color: '#333', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {theme === "dark" ? <><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></> : <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>}
          </svg>
        </button>
        <div style={{ marginLeft: 'auto' }}><button onClick={() => setDrawerOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button></div>
      </nav>
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className="blog-hero">
        <div style={{ position: 'absolute', top: -80, right: -80, width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
        <h1 style={{ fontSize: 56, fontWeight: 700, color: '#fff', lineHeight: 1.15, maxWidth: 900, margin: '0 auto 32px' }}>Spark Your Next <span style={{ color: '#fff', fontStyle: 'italic' }}>Breakthrough</span></h1>
        <button onClick={() => setShowArticles(true)} style={{ background: PRIMARY, color: '#fff', border: '2px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '16px 48px', fontSize: 16, fontWeight: 700, cursor: 'pointer', position: 'relative' }}>View All Articles</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 500, position: 'relative' }}><JoinCommunityTile onClick={() => { setActiveCategory('Community'); setShowArticles(true) }} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: 420 }}>
          <StartSellingTile onClick={() => { setActiveCategory('Guides'); setShowArticles(true) }} />
          <GrowBusinessTile onClick={() => { setActiveCategory('News'); setShowArticles(true) }} />
        </div>
        <div style={{ height: 460, position: 'relative' }}><GetInspiredTile onClick={() => { setActiveCategory('Success Stories'); setShowArticles(true) }} /></div>
      </div>
      <Footer />
    </div>
  )

  if (!showArticles) return heroView

  return (
    <div data-theme={theme} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Articles Nav */}
      <nav style={{ background: 'var(--card)', borderBottom: '0.5px solid var(--border)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <button onClick={() => setShowArticles(false)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer' }}><span style={{ fontSize: 15, fontWeight: 700, color: PRIMARY }}>blog.</span></button>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', overflowX: 'auto' }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, border: '0.5px solid', borderColor: activeCategory === cat ? PRIMARY : 'transparent', background: activeCategory === cat ? '#EEEDFE' : 'transparent', color: activeCategory === cat ? PRIMARY : '#888', cursor: 'pointer', fontWeight: activeCategory === cat ? 600 : 400, whiteSpace: 'nowrap' }}>{cat}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: '0.5px solid #ddd', borderRadius: 6, padding: '4px 10px', background: 'var(--bg2)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <input placeholder="Search articles..." value={search} onChange={e => setSearch(e.target.value)} style={{ border: 'none', background: 'none', outline: 'none', fontSize: 12, color: 'var(--text)', width: 120 }} />
            </div>
            {isAuthed && <button onClick={() => navigate('/blog/write')} style={{ fontSize: 12, background: PRIMARY, color: '#fff', padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}>+ Write</button>}
            <button onClick={() => setDrawerOpen(true)} style={{ background: 'none', border: '1px solid #ddd', borderRadius: 6, width: 32, height: 32, display: 'grid', placeItems: 'center', cursor: 'pointer', padding: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '1.5rem 1.5rem 0', width: '100%' }}>
        {/* Results Info */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)' }}>
            {activeCategory === 'All' ? 'All articles' : activeCategory}
            <span style={{ color: 'var(--text3)', marginLeft: 6 }}>({searchedPosts.length})</span>
          </span>
          <button onClick={() => setShowArticles(false)} style={{ fontSize: 12, color: PRIMARY, background: 'none', border: 'none', cursor: 'pointer' }}>← Back</button>
        </div>

        {/* Featured Hero Article */}
        {featuredPost && !search.trim() && activeCategory === 'All' && (
          <div onClick={() => setSelectedPost(featuredPost)} style={{ background: `linear-gradient(135deg, ${featuredPost.color || PRIMARY}, ${SECONDARY})`, borderRadius: 14, overflow: 'hidden', cursor: 'pointer', marginBottom: '1.5rem', position: 'relative' }}>
            <div style={{ padding: '2.5rem 2rem', color: '#fff' }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', background: 'rgba(255,255,255,0.15)', padding: '3px 10px', borderRadius: 20, marginBottom: 12, display: 'inline-block' }}>Featured Article</span>
              <h2 style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.3, margin: '10px 0', maxWidth: 600 }}>{featuredPost.title}</h2>
              <p style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.85, maxWidth: 550, margin: '0 0 16px' }}>{featuredPost.excerpt}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, opacity: 0.75 }}>
                <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{featuredPost.authorInitials}</span>
                <span>{featuredPost.author}</span>
                <span>·</span>
                <span>{featuredPost.date}</span>
                <span>·</span>
                <span>{featuredPost.readTime}</span>
              </div>
              <button style={{ marginTop: 16, background: '#fff', color: PRIMARY, border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Read Article →</button>
            </div>
          </div>
        )}

        {/* Search results or section-based grid */}
        {search.trim() ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              {searchedPosts.map(post => <ArticleCard key={post.id} post={post} onClick={() => setSelectedPost(post)} />)}
            </div>
            {searchedPosts.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text3)' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 12, opacity: 0.4 }}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                <p style={{ fontSize: 14, fontWeight: 500 }}>No articles found for "{search}"</p>
                <p style={{ fontSize: 12, marginTop: 4 }}>Try a different search term or browse categories</p>
              </div>
            )}
          </>
        ) : (
          /* Section-based grid */
          <>
            {sectionConfig.filter(s => s.id !== 'latest' || getSectionPosts('latest').length > 0 || true).map(section => {
              const sectionPosts = getSectionPosts(section.id)
              if (sectionPosts.length === 0) return null
              // Latest section shows all non-sectioned posts too
              const displayPosts = section.id === 'latest'
                ? restPosts.filter(p => !p.section || p.section === 'latest').length > 0
                  ? restPosts.filter(p => !p.section || p.section === 'latest')
                  : restPosts.slice(0, 6)
                : sectionPosts

              if (displayPosts.length === 0 && section.id !== 'latest') return null

              return (
                <div key={section.id} style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.75rem' }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{section.label}</h2>
                    <div style={{ flex: 1, height: '0.5px', background: 'var(--border)' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                    {displayPosts.map(post => <ArticleCard key={post.id} post={post} onClick={() => setSelectedPost(post)} />)}
                  </div>
                </div>
              )
            })}
          </>
        )}

        {/* Newsletter */}
        <div style={{ background: PRIMARY, borderRadius: 14, padding: '1.75rem', textAlign: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 6 }}>Stay in the loop</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: '1rem' }}>Get the latest OgaPay tips, earnings stories, and platform updates.</p>
          {subscribed ? <p style={{ color: '#ADDD5A', fontWeight: 600, fontSize: 13 }}>✓ You're subscribed!</p> : (
            <div style={{ display: 'flex', gap: 8, maxWidth: 400, margin: '0 auto', flexWrap: 'wrap', justifyContent: 'center' }}>
              <input type="email" placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && email.trim() && setSubscribed(true)}
                style={{ flex: 1, minWidth: 180, padding: '7px 14px', borderRadius: 20, border: 'none', fontSize: 12, background: 'rgba(255,255,255,0.15)', color: '#fff', outline: 'none' }} />
              <button onClick={() => email.trim() && setSubscribed(true)} style={{ background: '#fff', color: PRIMARY, border: 'none', padding: '7px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Subscribe</button>
            </div>
          )}
        </div>
      </div>

      {/* Article Detail Modal */}
      {selectedPost && <ArticleDetail post={selectedPost} onClose={() => setSelectedPost(null)} allPosts={allPosts} />}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <Footer />
    </div>
  )
}
