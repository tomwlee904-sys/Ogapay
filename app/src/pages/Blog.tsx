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
  { id: 1, section: 'stories', category: 'Success Stories', title: 'From zero to ₦800k/month: Chukwudi\'s story using the OgaPay worker portal', excerpt: 'One earner\'s journey from side hustle to full-time income on OgaPay. Discover the exact strategies he used to scale his earnings.', author: 'Fatima B.', authorInitials: 'FB', authorSlug: 'fatima-b', authorBio: 'OgaPay staff writer covering earners and platform updates.', date: 'June 5, 2026', readTime: '8 min read', color: '#065F46', tags: ['success', 'earnings', 'worker-portal'], image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=450&fit=crop', content: 'Chukwudi started on OgaPay in March 2025 with zero experience in digital work. Within 6 months, he was earning ₦800,000 monthly through the Worker Portal. His secret? Focusing on high-value tasks and building a reputation system that kept task posters coming back.\n\n"At first I was doing any task I could find — surveys, social media engagement, app testing. But I quickly realized the earners making the most money were those who specialized."\n\nHe focused on content review and UI/UX testing tasks, which paid 3-5x more than basic social media tasks. He also maintained a 98% success rate, which put his profile at the top of search results.\n\nToday, Chukwudi manages a team of 5 junior earners and spends most of his time reviewing their work rather than doing tasks himself.' },
  // News
  { id: 2, section: 'news', category: 'News', title: 'OgaPay launches instant wallet-to-bank withdrawals across 12 African countries', excerpt: 'Earners can now withdraw directly to their local bank accounts in seconds with zero fees on withdrawals under ₦10,000.', author: 'OgaPay Team', authorInitials: 'OG', authorSlug: 'ogapay-team', authorBio: 'Official OgaPay announcements and platform updates.', date: 'June 4, 2026', readTime: '3 min read', color: '#185FA5', tags: ['withdrawals', 'banking', 'nigeria'], image: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=450&fit=crop', content: 'OgaPay has partnered with leading payment processors across Africa to enable instant wallet-to-bank withdrawals. The feature is now live in Nigeria, Ghana, Kenya, South Africa, and 8 other countries.\n\nWithdrawals under ₦10,000 are completely free, and larger withdrawals carry a minimal 1.5% fee — significantly lower than traditional banking channels.\n\n"We believe earners should have immediate access to their money," said the OgaPay team. "This is the first step toward our goal of becoming Africa\'s primary digital earning infrastructure."' },
  { id: 3, section: 'news', category: 'News', title: 'OgaPay communities hit 200,000 members — here\'s what\'s driving the growth', excerpt: 'How peer-to-peer communities inside OgaPay became the platform\'s fastest growing feature with localized earning groups.', author: 'OgaPay Team', authorInitials: 'OG', authorSlug: 'ogapay-team', authorBio: 'Official OgaPay announcements and platform updates.', date: 'June 2, 2026', readTime: '3 min read', color: '#185FA5', tags: ['communities', 'growth', 'social'], image: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&h=450&fit=crop', content: 'OgaPay Communities has crossed 200,000 members across 500+ active groups. The feature allows earners to form location-based and skill-based communities where they share tips, task leads, and support.\n\nThe most active communities include "Lagos Earners Hub" with 12,000 members, "Student Earners" with 8,500 members, and "Crypto Task Specialists" with 6,200 members.\n\nCommunity leaders earn a commission on tasks completed by their members, creating a powerful incentive to help others succeed.' },
  { id: 4, section: 'news', category: 'News', title: 'New partnership brings 50,000+ remote data entry tasks to OgaPay', excerpt: 'Major data annotation companies choose OgaPay as their preferred workforce platform for African talent.', author: 'OgaPay Team', authorInitials: 'OG', authorSlug: 'ogapay-team', authorBio: 'Official OgaPay announcements and platform updates.', date: 'May 29, 2026', readTime: '4 min read', color: '#185FA5', tags: ['partnerships', 'data-entry', 'remote'], image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=450&fit=crop', content: 'OgaPay has signed agreements with three major data annotation companies, bringing over 50,000 remote data entry and labeling tasks to the platform. These tasks pay between ₦500 and ₦5,000 each and require no prior experience.\n\n"This is a game-changer for our earners," said the OgaPay CEO. "Data annotation is one of the fastest-growing remote work categories globally, and African workers are perfectly positioned to capture this opportunity."' },
  // Community
  { id: 5, section: 'community', category: 'Community', title: 'How Nigerian freelancers are earning 5x more with OgaPay tasks', excerpt: 'Discover how thousands of earners across West Africa are turning micro-tasks into meaningful income streams.', author: 'OgaPay Team', authorInitials: 'OG', authorSlug: 'ogapay-team', authorBio: 'Official OgaPay announcements and platform updates.', date: 'May 27, 2026', readTime: '5 min read', color: PRIMARY, tags: ['freelancers', 'nigeria', 'earnings'], image: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&h=450&fit=crop', content: 'Across Nigeria, Ghana, and Kenya, a new generation of earners is discovering that micro-tasks on OgaPay can replace traditional part-time jobs. The average active earner on OgaPay makes ₦45,000 monthly, with top earners crossing ₦500,000.\n\nThe key categories driving these earnings are social media management (₦50-200 per task), content creation (₦200-1,000 per task), and data annotation (₦100-500 per task).\n\nWhat sets OgaPay apart is the ability to earn without special skills or equipment — just a smartphone and internet connection.' },
  { id: 6, section: 'community', category: 'Community', title: '5 businesses that scaled to 7 figures using OgaPay campaigns', excerpt: 'Real numbers, real results from brands that bet on OgaPay early and won big.', author: 'Fatima B.', authorInitials: 'FB', authorSlug: 'fatima-b', authorBio: 'OgaPay staff writer covering earners and platform updates.', date: 'May 24, 2026', readTime: '6 min read', color: PRIMARY, tags: ['business', 'scaling', 'success'], image: 'https://images.unsplash.com/photo-1553729459-afe8f2e2f7a0?w=800&h=450&fit=crop', content: 'Five businesses that started using OgaPay for customer acquisition and task outsourcing have crossed seven figures in revenue. Their common thread? They used OgaPay\'s targeted campaign tools to reach specific demographics.\n\n"My ROI on OgaPay campaigns is 8:1," says one founder. "No other platform gives me this level of targeting for the African market."\n\nThe report covers fintech, e-commerce, education, health tech, and agriculture sectors.' },
  // Web3
  { id: 7, section: 'web3', category: 'Web3', title: 'OgaPay Vault explained: how to save and grow your earnings safely', excerpt: 'Everything you need to know about putting your OgaPay earnings to work with competitive APY rates.', author: 'Ngozi A.', authorInitials: 'NA', authorSlug: 'ngozi-a', authorBio: 'Crypto and web3 writer for OgaPay. Demystifying DeFi for African earners.', date: 'May 21, 2026', readTime: '5 min read', color: '#3B6D11', tags: ['vault', 'savings', 'defi'], image: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=800&h=450&fit=crop', content: 'The OgaPay Vault is a savings feature that allows earners to earn up to 12% APY on their idle balances. Unlike traditional bank savings accounts that offer 2-4% interest, the Vault uses decentralized finance protocols to generate higher yields.\n\nFunds in the Vault are insured up to ₦500,000 through our partnership with leading web3 insurance protocols. Deposits and withdrawals are instant and free.\n\n"We want OgaPay to be more than just a place to earn — we want it to be where your money grows," said the product team.' },
  { id: 8, section: 'web3', category: 'Web3', title: 'Understanding Solana wallets: a beginner\'s guide for OgaPay earners', excerpt: 'Everything you need to know about setting up and using Solana wallets for faster, cheaper transactions.', author: 'Emeka J.', authorInitials: 'EJ', authorSlug: 'emeka-j', authorBio: 'Technical writer covering blockchain, Solana, and OgaPay integrations.', date: 'May 18, 2026', readTime: '7 min read', color: '#3B6D11', tags: ['solana', 'wallet', 'crypto'], image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&h=450&fit=crop', content: 'Solana wallets are essential for OgaPay earners who want faster transactions and lower fees. This guide covers Phantom, Backpack, and Solflare wallets — how to set them up, fund them, and connect them to your OgaPay account.\n\nSolana processes up to 65,000 transactions per second with fees under $0.01, making it ideal for micro-task payments where traditional crypto networks would be too expensive.' },
  // Guides (Earning Tips)
  { id: 9, section: 'guides', category: 'Guides', title: 'Top 10 task categories paying the most on OgaPay this month', excerpt: 'From social media tasks to crypto verification — here\'s where the money is right now.', author: 'Emeka J.', authorInitials: 'EJ', authorSlug: 'emeka-j', authorBio: 'Technical writer covering blockchain, Solana, and OgaPay integrations.', date: 'May 16, 2026', readTime: '4 min read', color: '#B45309', tags: ['tips', 'categories', 'high-paying'], image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=450&fit=crop', content: 'Our monthly analysis of task categories shows which types of work are paying the most. This month, crypto verification tasks top the list at an average of ₦2,500 per task, followed by UI/UX testing at ₦1,800, and content writing at ₦1,200.\n\nSocial media engagement tasks, while paying less per task (₦50-200), offer the highest volume with thousands of tasks available daily.\n\nFor maximum earnings, we recommend mixing high-volume social tasks with high-value specialized tasks.' },
  { id: 10, section: 'guides', category: 'Guides', title: 'How to get verified on OgaPay and unlock higher-paying tasks', excerpt: 'Complete your KYC and profile setup to access premium tasks that pay 3x more.', author: 'Ngozi A.', authorInitials: 'NA', authorSlug: 'ngozi-a', authorBio: 'Crypto and web3 writer for OgaPay. Demystifying DeFi for African earners.', date: 'May 13, 2026', readTime: '3 min read', color: '#B45309', tags: ['verification', 'kyc', 'premium'], image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=450&fit=crop', content: 'Verified earners on OgaPay earn an average of 3x more than unverified users. The verification process is simple: submit your BVN or NIN, upload a selfie, and complete your profile.\n\nTasks labeled "Verified Only" typically pay ₦500-5,000 per task compared to ₦50-500 for standard tasks. Verification also unlocks instant withdrawals and higher withdrawal limits.' },
  // Tutorials
  { id: 11, section: 'tutorials', category: 'Tutorials', title: 'Step-by-step: Complete your first OgaPay task in 10 minutes', excerpt: 'New to OgaPay? Follow this guide to sign up, browse tasks, submit your first proof of work, and get paid.', author: 'OgaPay Team', authorInitials: 'OG', authorSlug: 'ogapay-team', authorBio: 'Official OgaPay announcements and platform updates.', date: 'May 10, 2026', readTime: '10 min read', color: '#9D174D', tags: ['beginner', 'guide', 'first-task'], image: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800&h=450&fit=crop', content: 'This comprehensive tutorial walks you through your first 10 minutes on OgaPay. From creating an account to receiving your first payment, every step is explained with screenshots and tips.\n\nStep 1: Create your account\nStep 2: Complete your profile\nStep 3: Browse available tasks\nStep 4: Apply and submit proof\nStep 5: Get paid\n\nBy the end of this guide, you\'ll have earned your first money on OgaPay.' },
  // Product Updates
  { id: 12, section: 'updates', category: 'Product Updates', title: 'Introducing the OgaPay mobile app — earn on the go', excerpt: 'Our new mobile app brings the full OgaPay experience to your smartphone with push notifications for new tasks.', author: 'OgaPay Team', authorInitials: 'OG', authorSlug: 'ogapay-team', authorBio: 'Official OgaPay announcements and platform updates.', date: 'May 7, 2026', readTime: '2 min read', color: '#1E40AF', tags: ['mobile', 'app', 'update'], image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=450&fit=crop', content: 'The OgaPay mobile app is now available on iOS and Android. The app includes all the features of the web platform plus push notifications for new tasks, instant messaging, and biometric authentication.\n\n"Mobile-first was always our vision," said the product team. "Most of our earners access OgaPay from their phones, and the app delivers a much smoother experience than the mobile web version."\n\nDownload the app today from the App Store or Google Play.' },
]

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
  const [imgErr, setImgErr] = useState(false)
  return (
    <div onClick={onClick}
      style={{ background: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow .2s, transform .2s', display: 'flex', flexDirection: 'column' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }}>
      <div style={{ height: 180, background: `linear-gradient(135deg, ${post.color || PRIMARY}, ${SECONDARY})`, position: 'relative', overflow: 'hidden' }}>
        {post.image && !imgErr ? (
          <img src={post.image} alt={post.title} onError={() => setImgErr(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'absolute', inset: 0 }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          </div>
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 60%, rgba(0,0,0,0.6))' }} />
        <span style={{ position: 'absolute', bottom: 10, right: 10, fontSize: 10, fontWeight: 600, color: '#fff', background: 'rgba(0,0,0,0.4)', padding: '2px 8px', borderRadius: 20, backdropFilter: 'blur(4px)' }}>{post.readTime}</span>
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
function ArticleDetail({ post, onClose, allPosts, onAuthorClick }: { post: any; onClose: () => void; allPosts: any[]; onAuthorClick?: (author: string) => void }) {
  const related = allPosts.filter(p => p.id !== post.id && (p.category === post.category || p.section === post.section)).slice(0, 4)
  const [imgErr, setImgErr] = useState(false)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px 16px', overflowY: 'auto' }} onClick={onClose}>
      <div style={{ background: 'var(--card)', borderRadius: 16, maxWidth: 900, width: '100%', overflow: 'hidden', boxShadow: '0 25px 80px rgba(0,0,0,0.2)', margin: 'auto' }} onClick={e => e.stopPropagation()}>
        {/* Close button — always visible */}
        <button onClick={onClose} style={{ position: 'fixed', top: 24, right: 24, width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', border: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 20, backdropFilter: 'blur(6px)', zIndex: 10, boxShadow: '0 2px 12px rgba(0,0,0,0.15)' }}>
          <i className="ti ti-x" />
        </button>

        {/* Hero image */}
        <div style={{ height: 340, background: `linear-gradient(135deg, ${post.color || PRIMARY}, ${SECONDARY})`, position: 'relative', overflow: 'hidden' }}>
          {post.image && !imgErr ? (
            <img src={post.image} alt={post.title} onError={() => setImgErr(true)}
              style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
          ) : null}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 40%, rgba(0,0,0,0.7))' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '2rem 2.5rem' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#fff', background: 'rgba(18,21,102,0.85)', padding: '4px 12px', borderRadius: 20, marginBottom: 10, display: 'inline-block' }}>{post.category}</span>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: '#fff', lineHeight: 1.3, margin: '10px 0 8px', maxWidth: 700 }}>{post.title}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'rgba(255,255,255,0.8)', flexWrap: 'wrap' }}>
              <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{post.authorInitials}</span>
              <span style={{ cursor: onAuthorClick ? 'pointer' : 'default', borderBottom: onAuthorClick ? '1px dotted rgba(255,255,255,0.4)' : 'none' }}
                onClick={(e) => { e.stopPropagation(); onAuthorClick && onAuthorClick(post.author); }}>{post.author}</span>
              <span>·</span>
              <span>{post.date}</span>
              <span>·</span>
              <span>{post.readTime}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '2rem 2.5rem' }}>
          <div style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>
            {(post.content || post.excerpt).split('\n\n').map((p: string, i: number) => (
              <p key={i} style={{ margin: '0 0 18px' }}>{p}</p>
            ))}
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 24, paddingTop: 20, borderTop: '0.5px solid var(--border)' }}>
              {post.tags.map((t: string) => (
                <span key={t} style={{ fontSize: 11, fontWeight: 500, color: PRIMARY, background: '#EEEDFE', padding: '4px 12px', borderRadius: 20 }}>#{t}</span>
              ))}
            </div>
          )}

          {/* Share & Actions */}
          <div style={{ display: 'flex', gap: 10, marginTop: 24, paddingTop: 20, borderTop: '0.5px solid var(--border)', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { navigator.clipboard?.writeText(window.location.href); }}
                style={{ fontSize: 12, color: PRIMARY, background: 'none', border: '1px solid #E5E7EB', borderRadius: 8, padding: '7px 16px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 11l5 5 5-5M12 4v12"/></svg>
                Share
              </button>
              <button onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(window.location.href)}`, '_blank')}
                style={{ fontSize: 12, color: '#1DA1F2', background: 'none', border: '1px solid #E5E7EB', borderRadius: 8, padding: '7px 16px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                Post on X
              </button>
            </div>
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>{post.readTime} · {post.date}</span>
          </div>

          {/* Author Card */}
          <div style={{ marginTop: 28, padding: '18px 22px', background: 'var(--bg2)', borderRadius: 12, border: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: post.color || PRIMARY, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, flexShrink: 0 }}>{post.authorInitials}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{post.author}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>{post.authorBio || 'OgaPay Contributor'}</div>
            </div>
          </div>

          {/* Related Articles */}
          {related.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Related Articles</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                {related.map(r => (
                  <div key={r.id}
                    onClick={() => { /* click handled by parent state */ }}
                    style={{ background: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow .2s, transform .2s' }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }}>
                    <div style={{ height: 140, background: `linear-gradient(135deg, ${r.color || PRIMARY}, ${SECONDARY})`, position: 'relative', overflow: 'hidden' }}>
                      {r.image ? (
                        <img src={r.image} alt={r.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      ) : null}
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 50%, rgba(0,0,0,0.5))' }} />
                    </div>
                    <div style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: PRIMARY, background: '#EEEDFE', padding: '2px 8px', borderRadius: 12, marginBottom: 6, display: 'inline-block' }}>{r.category}</span>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '6px 0 0', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.title}</p>
                      {r.readTime && <span style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6, display: 'inline-block' }}>{r.readTime}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @media (max-width: 640px) {
          .blog-detail-modal { padding: 0 !important; align-items: stretch !important; }
          .blog-detail-modal > div { border-radius: 0 !important; max-width: 100% !important; min-height: 100vh !important; }
          .blog-detail-modal button[style*="fixed"] { top: 12px !important; right: 12px !important; }
        }
      `}</style>
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
  const [authorView, setAuthorView] = useState<string | null>(null)

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

  // Filter by category
  const catFiltered = activeCategory === 'All'
    ? allPosts
    : allPosts.filter(p => p.category === activeCategory)

  // Filter by author view
  const authorFiltered = authorView
    ? catFiltered.filter(p => p.author === authorView)
    : catFiltered

  // Search
  const searchedPosts = search.trim()
    ? authorFiltered.filter(p => {
        const q = search.toLowerCase()
        return p.title?.toLowerCase().includes(q)
          || p.category?.toLowerCase().includes(q)
          || p.excerpt?.toLowerCase().includes(q)
          || p.content?.toLowerCase().includes(q)
          || p.tags?.some((t: string) => t.toLowerCase().includes(q))
      })
    : authorFiltered

  const featuredPost = searchedPosts.find(p => p.section === 'stories') || searchedPosts[0]
  const restPosts = searchedPosts.filter(p => p.id !== featuredPost?.id)

  // Group by section for the grid view
  const getSectionPosts = (sectionId: string) => restPosts.filter(p => p.section === sectionId)

  const handleAuthorClick = (author: string) => {
    setAuthorView(prev => prev === author ? null : author)
  }

  const handleCloseDetail = () => {
    setSelectedPost(null)
  }

  // Inline CSS for mobile popup
  const modalCls = 'blog-detail-modal'

  const heroView = (
    <div data-theme={theme} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <style>{`
        .blog-nav-link:hover { color: ${PRIMARY} !important; }
        .blog-cat-btn:hover { background: #f0f0f0 !important; }
        .blog-hero { background: ${PRIMARY}; min-height: 500px; padding: 80px 40px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; position: relative; overflow: hidden; }
        @media (max-width: 768px) { .blog-hero { min-height: 360px; padding: 56px 24px; } }
        @media (max-width: 640px) {
          .${modalCls} > div:first-child { border-radius: 0 !important; max-width: 100% !important; min-height: 100vh !important; }
          .${modalCls} > div:first-child > div:first-child { height: 240px !important; }
        }
      `}</style>

      {/* Nav Bar */}
      <nav style={{ borderBottom: '1px solid #e5e5e5', padding: '0.875rem 2.5rem', display: 'flex', alignItems: 'center', gap: 20, background: 'var(--card)', position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={() => { setShowArticles(false); setAuthorView(null); setActiveCategory('All'); setSearch('') }} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><span style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>blog.</span></button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: 360, border: '1px solid #ddd', borderRadius: 6, padding: '6px 12px', background: 'var(--bg2)', flex: 1 }}>
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

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 0, padding: '0 2.5rem', borderBottom: '0.5px solid var(--border)', overflowX: 'auto', background: 'var(--card)' }}>
        {[{ id: 'All', label: 'All' }, ...sectionConfig.map(s => ({ id: s.id, label: s.label }))].map(cat => (
          <button key={cat.id} onClick={() => { setActiveCategory(cat.id === 'All' ? 'All' : cat.label); setShowArticles(true); setAuthorView(null) }}
            style={{ height: 44, padding: '0 16px', fontSize: 13, fontWeight: cat.id === activeCategory || cat.label === activeCategory ? 700 : 500, color: cat.id === activeCategory || cat.label === activeCategory ? 'var(--text)' : 'var(--text2)', border: 'none', borderBottom: '2px solid ' + (cat.id === activeCategory || cat.label === activeCategory ? 'var(--text)' : 'transparent'), background: 'none', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'color .13s, border-color .13s' }}>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Articles area */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem 2.5rem 2.5rem', width: '100%' }}>

        {/* Author view header */}
        {authorView && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem', padding: '12px 16px', background: 'var(--bg2)', borderRadius: 10, border: '0.5px solid var(--border)' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: PRIMARY, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 }}>{authorView.split(' ').map((s: string) => s[0]).join('').slice(0, 2)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Articles by {authorView}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>{searchedPosts.length} article{searchedPosts.length !== 1 ? 's' : ''}</div>
            </div>
            <button onClick={() => setAuthorView(null)} style={{ background: 'none', border: '0.5px solid var(--border)', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: 'var(--text2)', cursor: 'pointer' }}>Show all</button>
          </div>
        )}

        {/* Featured article */}
        {featuredPost && !search.trim() && !authorView && (
          <div style={{ marginBottom: '1.5rem', borderRadius: 14, overflow: 'hidden', position: 'relative', cursor: 'pointer', minHeight: 320 }} onClick={() => setSelectedPost(featuredPost)}>
            <div style={{ height: 320, background: `linear-gradient(135deg, ${featuredPost.color || PRIMARY}, ${SECONDARY})`, position: 'relative', overflow: 'hidden' }}>
              {featuredPost.image ? (
                <img src={featuredPost.image} alt={featuredPost.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
              ) : null}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 30%, rgba(0,0,0,0.75))' }} />
            </div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '2rem 2rem' }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#fff', background: PRIMARY, padding: '3px 10px', borderRadius: 20, marginBottom: 10, display: 'inline-block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Featured</span>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: '8px 0 6px', lineHeight: 1.3, maxWidth: 650 }}>{featuredPost.title}</h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', margin: '0 0 10px', maxWidth: 550, lineHeight: 1.5 }}>{featuredPost.excerpt}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{featuredPost.authorInitials}</span>
                <span>{featuredPost.author}</span>
                <span>·</span>
                <span>{featuredPost.date}</span>
                <span>·</span>
                <span>{featuredPost.readTime}</span>
              </div>
              <button style={{ marginTop: 14, background: '#fff', color: PRIMARY, border: 'none', borderRadius: 8, padding: '9px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Read Article →</button>
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
        <div style={{ background: PRIMARY, borderRadius: 14, padding: '2rem', textAlign: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Get OgaPay Updates</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: '1.25rem', maxWidth: 440, margin: '0 auto 1.25rem' }}>The latest tips, earnings stories, and platform updates delivered to your inbox.</p>
          {subscribed ? <p style={{ color: '#ADDD5A', fontWeight: 600, fontSize: 14 }}>✓ You're subscribed!</p> : (
            <div style={{ display: 'flex', gap: 8, maxWidth: 420, margin: '0 auto', flexWrap: 'wrap', justifyContent: 'center' }}>
              <input type="email" placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && email.trim() && setSubscribed(true)}
                style={{ flex: 1, minWidth: 200, padding: '9px 16px', borderRadius: 8, border: 'none', fontSize: 13, background: 'rgba(255,255,255,0.12)', color: '#fff', outline: 'none' }} />
              <button onClick={() => email.trim() && setSubscribed(true)} style={{ background: '#fff', color: PRIMARY, border: 'none', padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Subscribe</button>
            </div>
          )}
        </div>
      </div>

      {/* Article Detail Modal */}
      {selectedPost && (
        <div className={modalCls}>
          <ArticleDetail post={selectedPost} onClose={handleCloseDetail} allPosts={allPosts} onAuthorClick={(a) => { handleAuthorClick(a); handleCloseDetail(); }} />
        </div>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <Footer />
    </div>
  )
}
