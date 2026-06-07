import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { API_BASE } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import CurrencySelector from "../components/CurrencySelector";
import { useCurrency } from "../context/CurrencyContext";

// ── COLOR TOKENS ──────────────────────────────────────────────────────────
const C = {
  text: "var(--text)",
  accent: "var(--accent)",
  card: "var(--card)",
  text2: "var(--text2)",
  text3: "var(--text3)",
  border: "var(--border)",
  bg2: "var(--bg2)",
  red: "var(--red)",
  green: "var(--green)",
  accentRgb: "31,140,255",
};

// ── CONSTANTS ──────────────────────────────────────────────────────────────
const SELECTION_TIMES = ["1h", "6h", "12h", "24h", "48h", "72h", "7 days"];
const PLATFORM_FEE_PCT = 10;
const SOL_TO_USD = 145;

// fmt replaced by useCurrency

// ── SVG ICONS (no emojis) ──────────────────────────────────────────────────
const IconFile = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
  </svg>
);
const IconStar = () => (
  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
);
const IconUsers = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IconTemplate = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
);
const IconMail = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
  </svg>
);
const IconCheckCircle = () => (
  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);
const IconAlert = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const IconPlus = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IconChevronDown = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);
const IconExternalLink = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);
const IconWallet = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 8h22"/><circle cx="17" cy="14" r="1"/>
  </svg>
);
const IconGlobe = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);
const IconSettings = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);
const IconInfo = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);
const IconClose = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// ── SOCIAL PLATFORMS ───────────────────────────────────────────────────────
const PLATFORMS = [
  { id: "x", name: "X / Twitter", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>, color: "#000000", actions: ["Followers", "Reposts", "Likes", "Comments", "Bookmarks", "Raid"], pricePerAction: 100, urlPlaceholder: "https://x.com/username/status/123456789" },
  { id: "instagram", name: "Instagram", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>, color: "#e1306c", actions: ["Likes", "Comments", "Followers", "Story Views"], pricePerAction: 80, urlPlaceholder: "https://instagram.com/p/..." },
  { id: "youtube", name: "YouTube", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>, color: "#ff0000", actions: ["Subscribers", "Likes", "Comments", "Views"], pricePerAction: 120, urlPlaceholder: "https://youtube.com/watch?v=..." },
  { id: "telegram", name: "Telegram", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>, color: "#0088cc", actions: ["Members", "Post Views", "Reactions"], pricePerAction: 60, urlPlaceholder: "https://t.me/..." },
  { id: "discord", name: "Discord", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.082.116 18.1.136 18.11a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.995.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>, color: "#5865f2", actions: ["Members", "Reactions", "Messages"], pricePerAction: 70, urlPlaceholder: "https://discord.gg/..." },
  { id: "tiktok", name: "TikTok", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>, color: "#000000", actions: ["Followers", "Likes", "Comments", "Views"], pricePerAction: 90, urlPlaceholder: "https://tiktok.com/@user/video/..." },
  { id: "facebook", name: "Facebook", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>, color: "#1877f2", actions: ["Followers", "Likes", "Shares"], pricePerAction: 80, urlPlaceholder: "https://facebook.com/..." },
];

// ── SERVICE CATEGORIES (18 new quick services) ────────────────────────────
const SERVICES = [
  { id: "website_visits", name: "Website Visits", icon: <IconGlobe />, color: "#2563eb", fields: ["url", "duration", "count"], pricePerAction: 10, urlPlaceholder: "https://example.com" },
  { id: "app_downloads", name: "App Downloads", icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>, color: "#059669", fields: ["app_url", "platform", "count"], pricePerAction: 15, urlPlaceholder: "https://apps.apple.com/..." },
  { id: "survey_campaigns", name: "Survey Campaigns", icon: <IconMail />, color: "#7c3aed", fields: ["survey_url", "questions", "count"], pricePerAction: 25, urlPlaceholder: "https://forms.gle/..." },
  { id: "email_signups", name: "Email Signups", icon: <IconMail />, color: "#0891b2", fields: ["signup_url", "count"], pricePerAction: 8, urlPlaceholder: "https://example.com/signup" },
  { id: "lead_generation", name: "Lead Generation", icon: <IconUsers />, color: "#d97706", fields: ["form_url", "description", "count"], pricePerAction: 30, urlPlaceholder: "https://example.com/lead-form" },
  { id: "product_reviews", name: "Product Reviews", icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>, color: "#dc2626", fields: ["product_url", "min_words", "count"], pricePerAction: 20, urlPlaceholder: "https://example.com/product" },
  { id: "google_play_reviews", name: "Google Play Reviews", icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>, color: "#16a34a", fields: ["app_id", "min_rating", "count"], pricePerAction: 15, urlPlaceholder: "com.example.app" },
  { id: "google_maps_reviews", name: "Google Maps Reviews", icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>, color: "#ea580c", fields: ["place_id", "min_rating", "count"], pricePerAction: 15, urlPlaceholder: "Google Maps place ID" },
  { id: "influencer_campaigns", name: "Influencer Campaigns", icon: <IconUsers />, color: "#db2777", fields: ["campaign_brief", "platform", "reach"], pricePerAction: 100, urlPlaceholder: "Campaign description" },
  { id: "nft_mint_campaigns", name: "NFT Mint Campaigns", icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>, color: "#7c3aed", fields: ["nft_address", "network", "count"], pricePerAction: 50, urlPlaceholder: "Solana NFT address" },
  { id: "token_holder_campaigns", name: "Token Holder Campaigns", icon: <IconWallet />, color: "#2563eb", fields: ["token_address", "min_holdings", "network"], pricePerAction: 40, urlPlaceholder: "Token mint address" },
  { id: "beta_testing", name: "Beta Testing", icon: <IconSettings />, color: "#0891b2", fields: ["app_url", "test_instructions", "slots"], pricePerAction: 35, urlPlaceholder: "https://testflight.apple.com/..." },
  { id: "waitlist_registration", name: "Waitlist Registration", icon: <IconFile />, color: "#d97706", fields: ["waitlist_url", "count"], pricePerAction: 5, urlPlaceholder: "https://example.com/waitlist" },
  { id: "referral_campaigns", name: "Referral Campaigns", icon: <IconExternalLink />, color: "#059669", fields: ["referral_code", "referral_url", "count"], pricePerAction: 20, urlPlaceholder: "https://example.com/ref/..." },
  { id: "affiliate_campaigns", name: "Affiliate Campaigns", icon: <IconGlobe />, color: "#dc2626", fields: ["affiliate_link", "commission", "count"], pricePerAction: 25, urlPlaceholder: "https://example.com/affiliate" },
  { id: "data_entry_jobs", name: "Data Entry Jobs", icon: <IconFile />, color: "#4f46e5", fields: ["instructions", "format", "count"], pricePerAction: 10, urlPlaceholder: "Job description" },
  { id: "freelance_jobs", name: "Freelance Jobs", icon: <IconSettings />, color: "#ea580c", fields: ["job_description", "skills", "budget"], pricePerAction: 50, urlPlaceholder: "Project description" },
  { id: "escrow_projects", name: "Escrow Projects", icon: <IconWallet />, color: "#7c3aed", fields: ["project_scope", "milestones", "total_budget"], pricePerAction: 100, urlPlaceholder: "Project scope document" },
];

const CATEGORIES = {
  "Social Media": ["X / Twitter", "Instagram", "TikTok", "YouTube", "Facebook"],
  "Content Creation": ["Writing", "Video", "Design", "Photography"],
  "Development": ["Frontend", "Backend", "Smart Contract", "Mobile"],
  "Marketing": ["SEO", "Email", "Ads", "Growth"],
  "Community": ["Moderation", "Support", "Events", "Outreach"],
  "Other": ["Miscellaneous"],
};

// ── CATEGORY MAP (frontend -> backend) ─────────────────────────────────────
const CATEGORY_MAP: Record<string, string> = {
  'Social Media': 'SOCIAL_MEDIA',
  'Content Creation': 'CONTENT_WRITING',
  'Development': 'OTHER',
  'Marketing': 'OTHER',
  'Community': 'OTHER',
  'Other': 'OTHER',
  'Design': 'DESIGN',
  'Survey': 'SURVEY',
  'Data': 'DATA_ENTRY',
  'Testing': 'APP_TESTING',
  'Video': 'VIDEO_REVIEW',
  'Research': 'SURVEY',
  'Services': 'OTHER',
  'SOCIAL_MEDIA': 'SOCIAL_MEDIA',
};

// ── PUBLIC TEMPLATES ───────────────────────────────────────────────────────
const PUBLIC_TEMPLATES = [
  { title: "Follow & Repost on X", platform: "X / Twitter", bounty: 0.5, winners: 50, category: "Social Media", desc: "Follow our account and repost the pinned post for a reward." },
  { title: "Join Telegram Community", platform: "Telegram", bounty: 0.3, winners: 200, category: "Community", desc: "Join our official Telegram channel and stay active." },
  { title: "Like & Comment Instagram Post", platform: "Instagram", bounty: 0.25, winners: 100, category: "Social Media", desc: "Like and leave a genuine comment on our latest post." },
  { title: "YouTube Subscribe & Like", platform: "YouTube", bounty: 0.4, winners: 150, category: "Content Creation", desc: "Subscribe to our channel and like the latest video." },
  { title: "Discord Server Join", platform: "Discord", bounty: 0.2, winners: 300, category: "Community", desc: "Join our Discord server and introduce yourself." },
  { title: "Write a Product Review", platform: "Other", bounty: 1.0, winners: 25, category: "Content Creation", desc: "Write a genuine 100+ word review of our product." },
  { title: "Website Visit Campaign", platform: "Web", bounty: 0.5, winners: 100, category: "Marketing", desc: "Visit our website and spend at least 30 seconds browsing." },
  { title: "Beta Test Our App", platform: "Mobile", bounty: 2.0, winners: 20, category: "Development", desc: "Test our new app and provide feedback on bugs and UX." },
];

// ── TOGGLE ────────────────────────────────────────────────────────────────
function Toggle({ on, onToggle }) {
  return (
    <div onClick={onToggle} style={{
      width: 40, height: 22, borderRadius: 11,
      background: on ? C.accent : C.border,
      cursor: "pointer", position: "relative",
      transition: "background 0.2s", flexShrink: 0
    }}>
      <div style={{
        position: "absolute", top: 3, left: on ? 21 : 3,
        width: 16, height: 16, borderRadius: "50%",
        background: C.card, transition: "left 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
      }} />
    </div>
  );
}

// ── SELECT FIELD ──────────────────────────────────────────────────────────
function SelectField({ label, value, onChange, options, style = {} }) {
  return (
    <div style={style}>
      {label && <label style={{ fontSize: 12, fontWeight: 600, color: C.text2, display: "block", marginBottom: 6 }}>{label}</label>}
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{
          width: "100%", border: `1px solid ${C.border}`, borderRadius: 8,
          padding: "10px 12px", fontSize: 13, color: C.text, outline: "none",
          fontFamily: "inherit", background: C.card,
          appearance: "none", paddingRight: 32,
        }}>
        {options.map(o => typeof o === "string"
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ── INFO TOOLTIP ──────────────────────────────────────────────────────────
function InfoTip({ text }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <span onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} onClick={() => setShow(s => !s)}
        style={{ cursor: "pointer", display: "flex", color: C.text3 }}>
        <IconInfo />
      </span>
      {show && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: "50%",
          transform: "translateX(-50%)", background: C.text, color: C.card,
          fontSize: 11, lineHeight: 1.5, padding: "6px 10px", borderRadius: 8,
          whiteSpace: "normal", width: 200, zIndex: 99, pointerEvents: "none",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
        }}>
          {text}
        </div>
      )}
    </span>
  );
}

// ── EXTRA REQUIREMENTS ACCORDION ──────────────────────────────────────────
function ExtraRequirements({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const count = Object.values(value).filter(Boolean).length;
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 10 }}>
      <div onClick={() => setOpen(o => !o)} style={{
        display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
        cursor: "pointer", userSelect: "none"
      }}>
        <IconSettings />
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Extra requirements </span>
          <span style={{ fontSize: 12, color: C.accent }}>(Requirement: Rank {value.minRank || 0})</span>
          <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>Seeker, verified X accounts, holdings, sorsa score, rank...</div>
        </div>
        <span style={{ color: C.text3, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", display: "flex" }}>
          <IconChevronDown />
        </span>
      </div>
      {open && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            ["seekerOnly", "Seeker users only"],
            ["verifiedX", "Must have verified X account"],
            ["kycVerified", "KYC verified users only"],
          ].map(([key, label]) => (
            <label key={key} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input type="checkbox" checked={!!value[key]} onChange={e => onChange({ ...value, [key]: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: C.accent, cursor: "pointer" }} />
              <span style={{ fontSize: 13, color: C.text }}>{label}</span>
            </label>
          ))}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.text2, display: "block", marginBottom: 5 }}>Minimum Rank (0 = any)</label>
            <input type="number" min={0} max={100} value={value.minRank || 0}
              onChange={e => onChange({ ...value, minRank: parseInt(e.target.value) || 0 })}
              style={{ width: 100, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, color: C.text, outline: "none", fontFamily: "inherit", background: C.card }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.text2, display: "block", marginBottom: 5 }}>Min OGA Holdings (optional)</label>
            <input type="number" min={0} value={value.minHoldings || ""}
              onChange={e => onChange({ ...value, minHoldings: e.target.value })}
              placeholder="e.g. 100"
              style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, color: C.text, outline: "none", fontFamily: "inherit", background: C.card }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.text2, display: "block", marginBottom: 5 }}>Min Sorsa Score (optional)</label>
            <input type="number" min={0} max={100} value={value.minSorsa || ""}
              onChange={e => onChange({ ...value, minSorsa: e.target.value })}
              placeholder="e.g. 50"
              style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, color: C.text, outline: "none", fontFamily: "inherit", background: C.card }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── EXCLUDE USERS ──────────────────────────────────────────────────────────
function ExcludeUsers({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 10 }}>
      <div onClick={() => setOpen(o => !o)} style={{
        display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
        cursor: "pointer", userSelect: "none"
      }}>
        <IconUsers />
        <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: C.text }}>Exclude certain users</span>
        <span style={{ color: C.text3, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", display: "flex" }}>
          <IconChevronDown />
        </span>
      </div>
      {open && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.text2, display: "block", marginBottom: 5 }}>Exclude usernames (comma separated)</label>
            <input type="text" value={value.excludedUsers || ""}
              onChange={e => onChange({ ...value, excludedUsers: e.target.value })}
              placeholder="user1, user2, ..."
              style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, color: C.text, outline: "none", fontFamily: "inherit", background: C.card }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── TEMPLATES MODAL ───────────────────────────────────────────────────────
function TemplatesModal({ onClose, onUse, myTemplates = [] }) {
  const [tab, setTab] = useState("public");
  const templates = tab === "public" ? PUBLIC_TEMPLATES : myTemplates;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <div style={{ position: "relative", width: "100%", maxWidth: 560, background: C.card, borderRadius: "20px 20px 0 0", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: C.border }} />
        </div>
        <div style={{ position: "sticky", top: 0, background: C.card, zIndex: 10 }}>
          <div style={{
            padding: "12px 20px", display: "flex", justifyContent: "space-between",
            alignItems: "center", borderBottom: `1px solid ${C.border}`
          }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>Job Templates</span>
            <button onClick={onClose} style={{
              width: 28, height: 28, borderRadius: 8, border: `1px solid ${C.border}`,
              background: C.bg2, cursor: "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", color: C.text2
            }}><IconClose /></button>
          </div>
          <div style={{ display: "flex", borderBottom: `1px solid ${C.border}` }}>
            {["public", "mine"].map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{
                  flex: 1, padding: "10px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  border: "none", background: "transparent", fontFamily: "inherit",
                  color: tab === t ? C.accent : C.text2,
                  borderBottom: tab === t ? `2px solid ${C.accent}` : "2px solid transparent",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6
                }}>
                {t === "public" ? <><IconTemplate /> Public Templates</> : <><IconStar /> My Templates</>}
              </button>
            ))}
          </div>
        </div>
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {templates.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: C.text2 }}>
              <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.3 }}><IconFile /></div>
              <div style={{ fontSize: 13 }}>No saved templates yet.</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Jobs you save as templates will appear here.</div>
            </div>
          ) : templates.map((tpl, i) => (
            <div key={i} style={{
              border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, background: C.card
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{tpl.title}</div>
                  <div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>{tpl.platform} · {tpl.winners} winners · {tpl.bounty} SOL</div>
                </div>
                <span style={{
                  background: C.bg2, color: C.accent, fontSize: 10, fontWeight: 700,
                  padding: "2px 8px", borderRadius: 99, border: `1px solid ${C.border}`,
                  flexShrink: 0, marginLeft: 8
                }}>{tpl.category}</span>
              </div>
              <div style={{ fontSize: 12, color: C.text2, marginBottom: 10, lineHeight: 1.5 }}>{tpl.desc}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{
                  flex: 1, padding: "7px", fontSize: 12, fontWeight: 600,
                  border: `1px solid ${C.border}`, borderRadius: 8, background: C.card,
                  color: C.text, cursor: "pointer", fontFamily: "inherit"
                }}>Details</button>
                <button onClick={() => { onUse(tpl); onClose(); }}
                  style={{
                    flex: 1, padding: "7px", fontSize: 12, fontWeight: 700,
                    border: "none", borderRadius: 8, background: C.accent,
                    color: C.card, cursor: "pointer", fontFamily: "inherit"
                  }}>Use Template</button>
                {tab === "mine" && (
                  <button style={{
                    flex: 1, padding: "7px", fontSize: 12, fontWeight: 600,
                    border: `1px solid ${C.border}`, borderRadius: 8, background: C.card,
                    color: C.text2, cursor: "pointer", fontFamily: "inherit"
                  }}>Settings</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── CUSTOM JOB WIZARD ──────────────────────────────────────────────────────
function CustomJobWizard({ onClose, onCreate, initialTemplate = null }) {
  const navigate = useNavigate();
  const [wizardStep, setWizardStep] = useState(1);
  const [showInfo, setShowInfo] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [mode, setMode] = useState(initialTemplate?.mode || "Challenge");
  const [winnerMode, setWinnerMode] = useState("Random winner selection");
  const [challengeWinners, setChallengeWinners] = useState(initialTemplate?.winners || 25);
  const [maxEntries, setMaxEntries] = useState("");
  const [unlimitedEntries, setUnlimitedEntries] = useState(true);
  const [hideSubmissions, setHideSubmissions] = useState("No");
  const [watermarks, setWatermarks] = useState("No");
  const [screenshotProof, setScreenshotProof] = useState("No");
  const [extraReqs, setExtraReqs] = useState({ seekerOnly: false, verifiedX: false, kycVerified: false, minRank: 0, minHoldings: "", minSorsa: "" });
  const [audience, setAudience] = useState("All");
  const [selectionTime, setSelectionTime] = useState("24h");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [description, setDescription] = useState(initialTemplate?.desc || "");
  const [attachments, setAttachments] = useState([]);
  const [title, setTitle] = useState(initialTemplate?.title || "");
  const [bounty, setBounty] = useState(initialTemplate?.bounty?.toString() || "");
  const [currency, setCurrency] = useState("SOL");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const fileRef = useRef();

  const bountyNum = parseFloat(bounty) || 0;
  const platformVault = bountyNum * 0.1;
  const rewardPerCreator = bountyNum > 0 && challengeWinners > 0 ? ((bountyNum - platformVault) / challengeWinners) : 0;
  const youPay = bountyNum;

  const handleFileAdd = (e) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter(f => f.size <= 50 * 1024 * 1024);
    setAttachments(a => [...a, ...valid].slice(0, 10));
  };

  const handleCreateCustomTask = async () => {
    if (!title.trim()) { setSubmitError("Please enter a job title"); return; }
    if (!bountyNum || bountyNum <= 0) { setSubmitError("Please enter a valid reward amount"); return; }
    if (!description.trim()) { setSubmitError("Please enter a job description"); return; }

    setSubmitting(true);
    setSubmitError("");

    try {
      const token = localStorage.getItem("ogapay_access_token");
      if (!token) { setSubmitError("Please log in first"); setSubmitting(false); return; }

      // Validate reward minimum for NGN
      if (currency === 'NGN' && bountyNum < 50) {
        setSubmitError('Minimum reward is 50 NGN. Please increase the reward amount.');
        setSubmitting(false);
        return;
      }

      const body = {
        title: title.trim(),
        description: description.trim(),
        reward: bountyNum,
        maxWorkers: parseInt(challengeWinners) || 1,
        maxEntries: maxEntries ? parseInt(maxEntries) : undefined,
        category: CATEGORY_MAP[category] || CATEGORY_MAP[category || "Other"] || CATEGORY_MAP["Other"] || "OTHER",
        estimatedTime: selectionTime === "1h" ? 60 : selectionTime === "6h" ? 360 : selectionTime === "12h" ? 720 : selectionTime === "24h" ? 1440 : selectionTime === "48h" ? 2880 : selectionTime === "72h" ? 4320 : 10080,
        instructions: description.trim(),
        tags: [category || "general"].filter(Boolean),
        proofRequired: screenshotProof === "Yes" ? "Screenshot proof required" : undefined,
        currency,
        status: "OPEN",
      };

      console.log('📤 Creating task with body:', JSON.stringify(body));
      const res = await fetch(`${API_BASE}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const statusMsg = res.status === 403 ? ' (Forbidden — your account needs Poster role to create tasks)' : '';
        throw new Error((err.message || err.error || "Failed to create task") + statusMsg);
      }

      // Capture the created task and pass its ID
      const result = await res.json().catch(() => ({}));
      console.log('📥 Task creation response:', result);
      if (result.success === false) {
        throw new Error(result.message || result.error || "Failed to create task");
      }
      const createdTask = result.data || result.task || result;
      const taskId = createdTask?.id || createdTask?._id || "";
      console.log('✅ Task created with ID:', taskId);
      
      // Pass taskId to onCreate for redirect
      onCreate(taskId);
    } catch (err) {
      setSubmitError(err.message || "Failed to create task. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const stepLabel = ["Choose Type", "Job Details", "Payment"];

  return (
    <div style={{ minHeight: "100vh", background: C.bg2, fontFamily: "'DM Sans', system-ui, sans-serif", color: C.text }}>
      <div style={{ textAlign: "center", padding: "28px 16px 8px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: C.text, marginBottom: 6 }}>Create a Job</h1>
        <p style={{ fontSize: 13, color: C.text2 }}>Create social or custom jobs to boost your community's growth and engagement</p>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, padding: "16px 20px 0", maxWidth: 520, margin: "0 auto" }}>
        {[1, 2, 3].map((s, i) => (
          <div key={s} style={{ display: "flex", alignItems: "center", flex: s < 3 ? 1 : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: wizardStep >= s ? C.accent : C.border,
                color: wizardStep >= s ? C.card : C.text2,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 800, transition: "background 0.2s"
              }}>{s}</div>
              <span style={{
                fontSize: 12, fontWeight: wizardStep === s ? 700 : 500,
                color: wizardStep === s ? C.text : C.text3
              }}>{stepLabel[i]}</span>
            </div>
            {s < 3 && <div style={{
              flex: 1, height: 2, background: wizardStep > s ? C.accent : C.border,
              margin: "0 8px", transition: "background 0.2s"
            }} />}
          </div>
        ))}
      </div>

      {/* ── Back button ── */}
      <div style={{ maxWidth: 560, margin: "12px auto 0", padding: "0 14px" }}>
        <button onClick={() => { if (wizardStep > 1) setWizardStep(s => s - 1); else onClose(); }}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 13, color: C.accent, fontWeight: 600,
            display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit"
          }}>
          <IconChevronDown style={{ transform: "rotate(90deg)" }} />
          {wizardStep > 1 ? "Back" : "Cancel"}
        </button>
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "16px 14px 100px" }}>
        {wizardStep <= 2 && (
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 16, background: C.card, overflow: "hidden" }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 16px", borderBottom: `1px solid ${C.border}`, background: C.bg2
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <IconSettings />
                <span style={{ fontSize: 14, fontWeight: 800, color: C.text }}>Job Configuration</span>
              </div>
              <button onClick={() => setShowInfo(true)}
                style={{
                  display: "flex", alignItems: "center", gap: 5, background: C.card,
                  border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 12px",
                  fontSize: 12, fontWeight: 600, color: C.text2, cursor: "pointer", fontFamily: "inherit"
                }}>
                <IconInfo /> Help
              </button>
            </div>

            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Title */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: "block", marginBottom: 6 }}>Job Title *</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Follow our X account and repost"
                  style={{
                    width: "100%", border: `1px solid ${C.border}`, borderRadius: 8,
                    padding: "10px 12px", fontSize: 13, color: C.text, outline: "none",
                    fontFamily: "inherit", background: C.card, boxSizing: "border-box"
                  }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <SelectField label="Mode" value={mode} onChange={setMode} options={["Challenge", "Selection"]} />
                <SelectField label="Winner selection" value={winnerMode} onChange={setWinnerMode}
                  options={["Random winner selection", "Creator picks"]} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.text2, display: "block", marginBottom: 6 }}>
                    {mode === "Challenge" ? "Number of winners" : "Slots available"}
                  </label>
                  <input type="number" min={1} value={challengeWinners}
                    onChange={e => setChallengeWinners(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{
                      width: "100%", border: `1px solid ${C.border}`, borderRadius: 8,
                      padding: "10px 12px", fontSize: 13, color: C.text, outline: "none",
                      fontFamily: "inherit", background: C.card, boxSizing: "border-box"
                    }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.text2, display: "block", marginBottom: 6 }}>Max entries</label>
                  <input type="number" min={1} value={maxEntries}
                    onChange={e => { setMaxEntries(e.target.value); setUnlimitedEntries(false); }}
                    disabled={unlimitedEntries}
                    style={{
                      width: "100%", border: `1px solid ${C.border}`, borderRadius: 8,
                      padding: "10px 12px", fontSize: 13, color: C.text, outline: "none",
                      fontFamily: "inherit", background: unlimitedEntries ? C.bg2 : C.card,
                      boxSizing: "border-box"
                    }} />
                  <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, cursor: "pointer" }}>
                    <input type="checkbox" checked={unlimitedEntries} onChange={e => setUnlimitedEntries(e.target.checked)}
                      style={{ accentColor: C.accent }} />
                    <span style={{ fontSize: 11, color: C.text3 }}>Unlimited</span>
                  </label>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: C.text2 }}>Hide submissions</label>
                    <InfoTip text="Keep entries private until job closes" />
                  </div>
                  <SelectField value={hideSubmissions} onChange={setHideSubmissions} options={["No", "Yes"]} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: C.text2 }}>Screenshot proof</label>
                    <InfoTip text="Require at least one attachment/screenshot" />
                  </div>
                  <SelectField value={screenshotProof} onChange={setScreenshotProof} options={["No", "Yes"]} />
                </div>
              </div>

              <ExtraRequirements value={extraReqs} onChange={setExtraReqs} />

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: "block", marginBottom: 8 }}>Audience</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
                  {["All", "Community"].map(a => (
                    <button key={a} onClick={() => setAudience(a)}
                      style={{
                        padding: "12px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                        border: "none", fontFamily: "inherit",
                        background: audience === a ? C.bg2 : C.card,
                        color: audience === a ? C.accent : C.text2,
                        borderRight: a === "All" ? `1px solid ${C.border}` : "none",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6
                      }}>
                      {audience === a && <span style={{ color: C.accent }}>--</span>}{a}
                    </button>
                  ))}
                </div>
              </div>

              <ExcludeUsers value={{}} onChange={() => {}} />

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Selection time</label>
                  <InfoTip text="How long applications stay open before you must choose winners." />
                </div>
                <SelectField value={selectionTime} onChange={setSelectionTime} options={SELECTION_TIMES} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.text2, display: "block", marginBottom: 6 }}>Category</label>
                  <SelectField value={category} onChange={v => { setCategory(v); setSubcategory(""); }}
                    options={[{ value: "", label: "Select a category" }, ...Object.keys(CATEGORIES).map(c => ({ value: c, label: c }))]} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.text2, display: "block", marginBottom: 6 }}>Subcategory</label>
                  <SelectField value={subcategory} onChange={setSubcategory}
                    options={[{ value: "", label: "Select..." }, ...(CATEGORIES[category] || []).map(s => ({ value: s, label: s }))]} />
                </div>
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Description *</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => fileRef.current?.click()}
                      style={{ background: "none", border: "none", cursor: "pointer", color: C.text2, display: "flex" }}>
                      <IconFile />
                    </button>
                    <button onClick={() => setShowTemplates(true)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: C.text2, display: "flex" }}>
                      <IconTemplate />
                    </button>
                  </div>
                </div>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Describe your job in detail. Include requirements, instructions, and any links needed."
                  rows={6}
                  style={{
                    width: "100%", border: `1px solid ${C.border}`, borderRadius: 8,
                    padding: "10px 12px", fontSize: 13, color: C.text, outline: "none",
                    fontFamily: "inherit", background: C.card, resize: "vertical",
                    boxSizing: "border-box", lineHeight: 1.6
                  }} />
                <div style={{ fontSize: 11, color: C.text3, marginTop: 4, display: "flex", justifyContent: "space-between" }}>
                  <span>{description.length} / 5000 characters</span>
                  {attachments.length > 0 && <span>{attachments.length} file(s) attached</span>}
                </div>
                <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileAdd} style={{ display: "none" }} />
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: Payment ── */}
        {wizardStep === 3 && (
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 16, background: C.card, overflow: "hidden" }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 16px", borderBottom: `1px solid ${C.border}`, background: C.bg2
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <IconWallet />
                <span style={{ fontSize: 14, fontWeight: 800, color: C.text }}>Payment & Review</span>
              </div>
            </div>

            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <SelectField label="Currency" value={currency} onChange={setCurrency} options={["SOL", "USDC", "NGN"]} />
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.text2, display: "block", marginBottom: 6 }}>
                    Total Reward ({currency})
                  </label>
                  <input type="number" min={0.01} step={0.01} value={bounty}
                    onChange={e => setBounty(e.target.value)}
                    style={{
                      width: "100%", border: `1px solid ${C.border}`, borderRadius: 8,
                      padding: "10px 12px", fontSize: 13, color: C.text, outline: "none",
                      fontFamily: "inherit", background: C.card, boxSizing: "border-box"
                    }} />
                </div>
              </div>

              {bountyNum > 0 && (
                <div style={{
                  border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", background: C.bg2
                }}>
                  <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
                    <IconWallet />
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Cost Summary</span>
                  </div>
                  <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.text2 }}>
                      <span>Reward ({currency})</span>
                      <span style={{ fontWeight: 600, color: C.text }}>{bountyNum.toFixed(4)} {currency}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.text2 }}>
                      <span>Winners</span>
                      <span style={{ fontWeight: 600, color: C.text }}>{challengeWinners}</span>
                    </div>
                    {rewardPerCreator > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.text2 }}>
                        <span>Per winner</span>
                        <span style={{ fontWeight: 600, color: C.text }}>{rewardPerCreator.toFixed(4)} {currency}</span>
                      </div>
                    )}
                    <div style={{ height: 1, background: C.border, margin: "4px 0" }} />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span>Platform fee (10%)</span>
                      <span style={{ fontWeight: 600, color: C.text }}>{(bountyNum * 0.1).toFixed(4)} {currency}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 800, color: C.text }}>
                      <span>Total to pay</span>
                      <span>{bountyNum.toFixed(4)} {currency}</span>
                    </div>
                  </div>
                </div>
              )}

              <div style={{
                marginTop: 8, background: C.bg2, border: `1px solid ${C.border}`,
                borderRadius: 10, padding: 12, fontSize: 12, color: C.text2
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <IconAlert />
                  <span style={{ fontWeight: 600, color: C.text }}>Make sure your wallet has sufficient {currency} balance before proceeding.</span>
                </div>
              </div>

              {submitError && (
                <div style={{
                  padding: "10px 14px", borderRadius: 8, background: "#fef2f2",
                  border: "1px solid #fee2e2", fontSize: 13, color: "#991b1b"
                }}>{submitError}</div>
              )}

              <button onClick={handleCreateCustomTask} disabled={submitting}
                style={{
                  width: "100%", padding: "14px", borderRadius: 12, border: "none",
                  background: C.accent, color: C.card, fontSize: 15, fontWeight: 700,
                  cursor: submitting ? "wait" : "pointer", fontFamily: "inherit",
                  opacity: submitting ? 0.7 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                }}>
                {submitting ? "Creating..." : "Create Job"}
                <IconExternalLink />
              </button>
            </div>
          </div>
        )}

        {/* Step navigation */}
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          {wizardStep < 3 && (
            <button onClick={() => setWizardStep(s => s + 1)}
              style={{
                flex: 1, padding: "12px", borderRadius: 12, border: "none",
                background: C.accent, color: C.card, fontSize: 14, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit"
              }}>
              Continue
            </button>
          )}
        </div>
      </div>

      {showInfo && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={() => setShowInfo(false)} />
          <div style={{ position: "relative", background: C.card, borderRadius: 20, maxWidth: 500, width: "90%", padding: 24, maxHeight: "80vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.text }}>Understanding Job Modes</h2>
              <button onClick={() => setShowInfo(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: C.text2, display: "flex" }}>
                <IconClose />
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div style={{ borderRadius: 12, border: `1px solid ${C.accent}`, padding: 14, background: C.bg2 }}>
                <h3 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: C.accent }}>Challenge Mode</h3>
                <ul style={{ padding: "0 0 0 16px", margin: 0, fontSize: 12, color: C.text2, lineHeight: 1.8 }}>
                  <li>Multiple winners (1-1000)</li>
                  <li>You review all submissions</li>
                  <li>Select the best entries</li>
                  <li>Reward split among winners</li>
                </ul>
              </div>
              <div style={{ borderRadius: 12, border: `1px solid ${C.border}`, padding: 14, background: C.bg2 }}>
                <h3 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: C.text }}>Selection Mode</h3>
                <ul style={{ padding: "0 0 0 16px", margin: 0, fontSize: 12, color: C.text2, lineHeight: 1.8 }}>
                  <li>One winner selected</li>
                  <li>Applicants explain qualifications</li>
                  <li>Full reward to one person</li>
                </ul>
              </div>
            </div>
            <button onClick={() => setShowInfo(false)}
              style={{
                width: "100%", padding: "12px", borderRadius: 8, border: "none",
                background: C.accent, color: C.card, fontSize: 14, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit"
              }}>Got it</button>
          </div>
        </div>
      )}

      {showTemplates && <TemplatesModal onClose={() => setShowTemplates(false)} onUse={tpl => {
        setTitle(tpl.title);
        setBounty(tpl.bounty?.toString() || "");
        setChallengeWinners(tpl.winners || 25);
        setDescription(tpl.desc || "");
      }} />}
    </div>
  );
}

// ── SUCCESS MODAL ─────────────────────────────────────────────────────────
function SuccessModal({ onClose, taskId }) {
  const navigate = useNavigate();
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={onClose} />
      <div style={{
        position: "relative", background: C.card, borderRadius: 24, maxWidth: 380,
        width: "90%", padding: "32px 24px", textAlign: "center"
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%", background: C.bg2,
          border: `2px solid ${C.accent}`, display: "flex", alignItems: "center",
          justifyContent: "center", margin: "0 auto 16px", color: C.accent
        }}>
          <IconCheckCircle />
        </div>
        <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800, color: C.text }}>Job Created!</h2>
        <p style={{ margin: "0 0 20px", fontSize: 14, color: C.text2, lineHeight: 1.6 }}>
          Your job has been submitted and is now live. Workers can start completing it immediately.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => navigate(taskId ? "/tasks/" + taskId : "/tasks")}
            style={{
              flex: 1, padding: "12px", borderRadius: 10, border: `1px solid ${C.border}`,
              background: C.card, color: C.text, fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit"
            }}>View Task</button>
          <button onClick={() => navigate("/manage-jobs")}
            style={{
              flex: 1, padding: "12px", borderRadius: 10, border: "none",
              background: C.accent, color: C.card, fontSize: 13, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit"
            }}>Manage Jobs</button>
        </div>
      </div>
    </div>
  );
}

// ── MAIN CREATE TASK COMPONENT ─────────────────────────────────────────────
function CreateTask() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { fmt } = useCurrency();
  const [showCustom, setShowCustom] = useState(false);
  
  // Check for edit task data from ManageJobs
  useEffect(() => {
    try {
      const editData = sessionStorage.getItem('ogapay_edit_task');
      if (editData) {
        const task = JSON.parse(editData);
        // If we have edit data and are on the custom tab, pre-fill the wizard
        if (task.title && task.platform) {
          // Store for the CustomJobWizard to pick up
          window.__ogapay_edit_task = task;
        }
        sessionStorage.removeItem('ogapay_edit_task');
      }
    } catch(e) {}
  }, []);
  const [customTemplate, setCustomTemplate] = useState(null);
  const [activeTab, setActiveTab] = useState("socials");
  const [success, setSuccess] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [showMainTemplates, setShowMainTemplates] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);

  const tabStyle = (id) => ({
    padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
    border: "none", background: "transparent", fontFamily: "inherit",
    color: activeTab === id ? C.accent : C.text2,
    borderBottom: activeTab === id ? `2px solid ${C.accent}` : "2px solid transparent",
    display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
    transition: "color 0.2s, border-color 0.2s",
  });

  const userRole = (user as any)?.role || '';
  const liveRole = (() => { try { return localStorage.getItem('ogapay_role_override') || JSON.parse(localStorage.getItem('ogapay_user') || '{}').role || ''; } catch { return ''; } })();
  const effectiveRole = userRole || liveRole;
  // Block if role is explicitly set and not poster/admin
  // State for upgrade flow
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState('');
  const [upgraded, setUpgraded] = useState(false);

  if (!upgraded && effectiveRole !== "POSTER" && effectiveRole !== "ADMIN") {
    const handleUpgrade = async () => {
      setUpgrading(true);
      setUpgradeMsg('');
      try {
        const token = localStorage.getItem("ogapay_access_token");
        if (!token) { setUpgradeMsg('Please log in first'); setUpgrading(false); return; }
        const res = await fetch('https://ogapay-production.up.railway.app/api/v1/users/me', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({ role: 'POSTER' }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Upgrade failed');
        }
        // Write POSTER role to localStorage — set a flag so refreshUser can't overwrite it
        try {
          const stored = JSON.parse(localStorage.getItem('ogapay_user') || '{}');
          stored.role = 'POSTER';
          localStorage.setItem('ogapay_user', JSON.stringify(stored));
          localStorage.setItem('ogapay_role_override', 'POSTER');
        } catch(e) {}
        setUpgradeMsg('Account upgraded! You can now create jobs.');
        setTimeout(() => setUpgraded(true), 800);
      } catch (e) {
        setUpgradeMsg(e.message || 'Failed to upgrade. Contact support.');
      } finally {
        setUpgrading(false);
      }
    };

    return (
      <Layout>
        <div style={{ maxWidth: 500, margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="28" height="28" fill="none" stroke="#F59E0B" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: '0 0 8px' }}>Poster Account Required</h2>
          <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6, margin: '0 0 20px' }}>You need a Poster account to create jobs. Your current role does not have permission to post tasks.</p>
          <button onClick={handleUpgrade} disabled={upgrading}
            style={{
              padding: '12px 32px', borderRadius: 10, border: 'none',
              background: upgrading ? 'var(--border)' : '#121566', color: '#fff',
              fontSize: 14, fontWeight: 700, cursor: upgrading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit'
            }}>
            {upgrading ? 'Upgrading...' : 'Upgrade to Poster Account'}
          </button>
          {upgradeMsg && (
            <p style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: upgradeMsg.includes('upgraded') ? '#16a34a' : '#DC2626' }}>{upgradeMsg}</p>
          )}
        </div>
      </Layout>
    );
  }

  if (showCustom) {
    return <CustomJobWizard
      initialTemplate={customTemplate}
      onClose={() => { setShowCustom(false); setCustomTemplate(null); }}
      onCreate={(taskId) => { setShowCustom(false); setCustomTemplate(null); setSuccess(taskId || true); }}
    />;
  }

  return (
    <Layout>
      <div style={{
        maxWidth: 900, margin: "0 auto", padding: "24px 16px",
        fontFamily: "'DM Sans', system-ui, sans-serif", color: C.text
      }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 4px", color: C.text, letterSpacing: "-0.03em" }}>
            Create Task
          </h1>
          <p style={{ fontSize: 14, color: C.text2, margin: 0, lineHeight: 1.5 }}>
            Post social, custom, or service tasks for the OgaPay community to complete.
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, marginBottom: 20, overflowX: "auto", gap: 0 }}>
          <button style={tabStyle("socials")} onClick={() => setActiveTab("socials")}>
            <IconUsers /> Socials
          </button>
          <button style={tabStyle("services")} onClick={() => setActiveTab("services")}>
            <IconGlobe /> Services
          </button>
          <button style={tabStyle("custom")} onClick={() => setActiveTab("custom")}>
            <IconPlus /> Custom
          </button>
          <button style={tabStyle("templates")} onClick={() => setActiveTab("templates")}>
            <IconTemplate /> Templates
          </button>
        </div>

        {/* ─── SOCIALS TAB ─── */}
        {activeTab === "socials" && (
          <div>
            {!selectedPlatform ? (
              <div>
                <p style={{ fontSize: 14, color: C.text2, marginBottom: 16, lineHeight: 1.5 }}>
                  Select a social media platform to create engagement tasks for your community.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                  {PLATFORMS.map(p => (
                    <div key={p.id} onClick={() => setSelectedPlatform(p)}
                      style={{
                        border: `1px solid ${C.border}`, borderRadius: 14, padding: 16,
                        background: C.card, cursor: "pointer", transition: "all 0.2s",
                        display: "flex", alignItems: "center", gap: 12,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = "none"; }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 10,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, color: p.color
                      }}>
                        {p.icon}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>{p.actions.length} actions</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <PlatformDetail
                platform={selectedPlatform}
                onBack={() => setSelectedPlatform(null)}
                onCreated={(taskId) => setSuccess(taskId || "true")}
              />
            )}
          </div>
        )}

        {/* ─── SERVICES TAB ─── */}
        {activeTab === "services" && (
          <div>
            {!selectedService ? (
              <div>
                <p style={{ fontSize: 14, color: C.text2, marginBottom: 16, lineHeight: 1.5 }}>
                  Choose from our service categories to create quick tasks and campaigns.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                  {SERVICES.map(s => (
                    <div key={s.id} onClick={() => { setSelectedService(s); setShowServiceForm(true); }}
                      style={{
                        border: `1px solid ${C.border}`, borderRadius: 14, padding: 16,
                        background: C.card, cursor: "pointer", transition: "all 0.2s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = "none"; }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 8,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: s.color, background: C.bg2, flexShrink: 0
                        }}>
                          {s.icon}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{s.name}</div>
                      </div>
                      <div style={{ fontSize: 11, color: C.text2 }}>Starting at {s.pricePerAction} units</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <ServiceForm
                service={selectedService}
                onBack={() => { setSelectedService(null); setShowServiceForm(false); }}
                onCreated={(taskId) => { setSelectedService(null); setShowServiceForm(false); setSuccess(taskId || "true"); }}
              />
            )}
          </div>
        )}

        {/* ─── CUSTOM TAB ─── */}
        {activeTab === "custom" && (
          <div>
            <div style={{
              border: `1px solid ${C.border}`, borderRadius: 16, padding: 24,
              background: C.card, textAlign: "center"
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%", background: C.bg2,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px", color: C.accent
              }}>
                <IconSettings />
              </div>
              <div style={{ fontWeight: 800, fontSize: 18, color: C.text, marginBottom: 4 }}>
                Custom jobs
              </div>
              <p style={{ fontSize: 14, color: C.text2, margin: "0 auto 16px", maxWidth: 400, lineHeight: 1.5 }}>
                Create fully customized tasks with your own requirements, rewards, and rules.
              </p>
              <button onClick={() => setShowCustom(true)}
                style={{
                  padding: "12px 24px", borderRadius: 10, border: "none",
                  background: C.accent, color: C.card, fontSize: 14, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                  display: "inline-flex", alignItems: "center", gap: 8
                }}>
                <IconPlus /> Create Custom Job
              </button>

              <div style={{ marginTop: 20, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <button onClick={() => setShowMainTemplates(true)}
                  style={{
                    padding: "10px 16px", borderRadius: 8, border: `1px solid ${C.border}`,
                    background: C.card, color: C.text, fontSize: 13, fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit",
                    display: "flex", alignItems: "center", gap: 6
                  }}>
                  <IconTemplate /> Use Template
                </button>
              </div>
            </div>

            {showMainTemplates && (
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                  <button
                    style={{
                      flex: 1, padding: "9px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                      border: `1px solid ${C.border}`, borderRadius: 10, background: C.card,
                      color: C.text, fontFamily: "inherit",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6
                    }}
                    onClick={() => setShowMainTemplates(true)}>
                    <IconTemplate /> Public Templates
                  </button>
                  <button
                    style={{
                      flex: 1, padding: "9px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                      border: `1px solid ${C.border}`, borderRadius: 10, background: C.card,
                      color: C.text, fontFamily: "inherit",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6
                    }}>
                    <IconStar /> My Templates
                  </button>
                </div>
                {PUBLIC_TEMPLATES.slice(0, 3).map((tpl, i) => (
                  <div key={i} style={{
                    border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, background: C.card
                  }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, background: C.bg2,
                        border: `1px solid ${C.border}`, display: "flex", alignItems: "center",
                        justifyContent: "center", flexShrink: 0, color: C.accent
                      }}>
                        <IconFile />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 2 }}>{tpl.title}</div>
                        <div style={{ fontSize: 11, color: C.text2 }}>{tpl.platform} · {tpl.winners} winners · {tpl.bounty} SOL</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: C.text2, marginBottom: 10, lineHeight: 1.5 }}>{tpl.desc}</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button style={{
                        flex: 1, padding: "7px", fontSize: 12, fontWeight: 600,
                        border: `1px solid ${C.border}`, borderRadius: 8, background: C.card,
                        color: C.text, cursor: "pointer", fontFamily: "inherit"
                      }}>Details</button>
                      <button onClick={() => { setCustomTemplate(tpl); setShowCustom(true); }}
                        style={{
                          flex: 1, padding: "7px", fontSize: 12, fontWeight: 700,
                          border: "none", borderRadius: 8, background: C.accent,
                          color: C.card, cursor: "pointer", fontFamily: "inherit"
                        }}>Use Template</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TEMPLATES TAB ─── */}
        {activeTab === "templates" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
              {["public", "mine"].map(t => (
                <button key={t} style={{
                  flex: 1, padding: "9px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  border: `1px solid ${C.border}`, borderRadius: 10, background: C.card,
                  color: C.text, fontFamily: "inherit",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6
                }}
                  onClick={() => setShowMainTemplates(true)}>
                  {t === "public" ? <><IconTemplate /> Public Templates</> : <><IconStar /> My Templates</>}
                </button>
              ))}
            </div>
            {PUBLIC_TEMPLATES.map((tpl, i) => (
              <div key={i} style={{
                border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, background: C.card
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, background: C.bg2,
                    border: `1px solid ${C.border}`, display: "flex", alignItems: "center",
                    justifyContent: "center", flexShrink: 0, color: C.accent
                  }}>
                    <IconFile />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 2 }}>{tpl.title}</div>
                    <div style={{ fontSize: 11, color: C.text2 }}>{tpl.platform} · {tpl.winners} winners · {tpl.bounty} SOL</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: C.text2, marginBottom: 10, lineHeight: 1.5 }}>{tpl.desc}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{
                    flex: 1, padding: "7px", fontSize: 12, fontWeight: 600,
                    border: `1px solid ${C.border}`, borderRadius: 8, background: C.card,
                    color: C.text, cursor: "pointer", fontFamily: "inherit"
                  }}>Details</button>
                  <button onClick={() => { setCustomTemplate(tpl); setShowCustom(true); }}
                    style={{
                      flex: 1, padding: "7px", fontSize: 12, fontWeight: 700,
                      border: "none", borderRadius: 8, background: C.accent,
                      color: C.card, cursor: "pointer", fontFamily: "inherit"
                    }}>Use Template</button>
                  <button style={{
                    flex: 1, padding: "7px", fontSize: 12, fontWeight: 600,
                    border: `1px solid ${C.border}`, borderRadius: 8, background: C.card,
                    color: C.text2, cursor: "pointer", fontFamily: "inherit"
                  }}>Settings</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* HELP BANNER */}
        <div style={{
          marginTop: 24, border: `1px solid ${C.border}`, borderRadius: 14,
          padding: "14px 16px", display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: 12, background: C.card
        }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ flexShrink: 0, marginTop: 2, color: C.text2 }}><IconInfo /></span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Need help or have suggestions?</div>
              <div style={{ fontSize: 12, color: C.text2, marginTop: 2, lineHeight: 1.5 }}>
                Join the OgaPay Creators chat to get help, share feedback, and connect with other creators.
              </div>
            </div>
          </div>
          <button style={{
            flexShrink: 0, background: C.accent, color: C.card, border: "none",
            borderRadius: 10, padding: "9px 14px", fontSize: 12, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap"
          }}>
            <IconExternalLink />
            Join OgaPay Community
          </button>
        </div>
      </div>

      {showMainTemplates && <TemplatesModal onClose={() => setShowMainTemplates(false)} onUse={tpl => { setCustomTemplate(tpl); setShowCustom(true); }} />}
      {success && <SuccessModal taskId={typeof success === 'string' && success !== 'true' ? success : undefined} onClose={() => setSuccess(false)} />}
    </Layout>
  );
}

// ── PLATFORM DETAIL ────────────────────────────────────────────────────────
function PlatformDetail({ platform, onBack, onCreated }) {
  const [submitError, setSubmitError] = useState("");
  const navigate = useNavigate();
  const [action, setAction] = useState(platform.actions[0] || "");
  const [url, setUrl] = useState("");
  const [quantity, setQuantity] = useState(10);
  const [currency, setCurrency] = useState("SOL");
  const [budget, setBudget] = useState(platform.pricePerAction * 10 / 1000000);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const divisor = currency === 'NGN' ? 1 : 1000000;
    setBudget(platform.pricePerAction * quantity / divisor);
  }, [quantity, platform, currency]);

  const handleCreate = async () => {
    if (!url.trim()) { setSubmitError("Please enter a URL"); return; }
    if (currency === 'NGN' && budget < 50) { setSubmitError("Minimum reward is 50 NGN"); setSubmitting(false); return; }
    setSubmitting(true);
    setSubmitError("");
    try {
      const token = localStorage.getItem("ogapay_access_token");
      if (!token) { setSubmitError("Please log in first"); setSubmitting(false); return; }
      const body = {
        title: `${action} on ${platform.name}`,
        description: `Perform ${action.toLowerCase()} on ${platform.name}: ${url}`,
        platform: platform.id,
        action,
        url: url.trim(),
        reward: budget,
        quantity: parseInt(quantity) || 10,
        maxWorkers: parseInt(quantity) || 10,
        category: CATEGORY_MAP["Social Media"] || "SOCIAL_MEDIA",
        currency,
        status: "OPEN",
      };
      const res = await fetch(`${API_BASE}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("ogapay_access_token")}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const statusMsg = res.status === 403 ? ' (Forbidden — your account needs Poster role)' : '';
        throw new Error((err.message || err.error || "Failed to create task") + statusMsg);
      }
      const result = await res.json().catch(() => ({}));
      if (result.success === false) {
        throw new Error(result.message || result.error || "Failed to create task");
      }
      const createdTask = result.data || result.task || result;
      const taskId = createdTask?.id || createdTask?._id || "";
      onCreated(taskId);
    } catch (e) {
      setSubmitError(e?.message || "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 16, background: C.card, overflow: "hidden" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
        borderBottom: `1px solid ${C.border}`, background: C.bg2
      }}>
        <button onClick={onBack} style={{
          background: "none", border: "none", cursor: "pointer", color: C.accent,
          display: "flex", fontFamily: "inherit", fontSize: 13, fontWeight: 600
        }}>Back</button>
        <div style={{ width: 1, height: 20, background: C.border }} />
        <span style={{ fontWeight: 700, color: C.text }}>{platform.name}</span>
      </div>
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        <SelectField label="Action" value={action} onChange={setAction} options={platform.actions} />
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.text2, display: "block", marginBottom: 6 }}>Post / Profile URL</label>
          <input type="text" value={url} onChange={e => setUrl(e.target.value)}
            placeholder={platform.urlPlaceholder}
            style={{
              width: "100%", border: `1px solid ${C.border}`, borderRadius: 8,
              padding: "10px 12px", fontSize: 13, color: C.text, outline: "none",
              fontFamily: "inherit", background: C.card, boxSizing: "border-box"
            }} />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.text2, display: "block", marginBottom: 6 }}>Quantity</label>
          <input type="number" min={1} value={quantity} onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            style={{
              width: "100%", border: `1px solid ${C.border}`, borderRadius: 8,
              padding: "10px 12px", fontSize: 13, color: C.text, outline: "none",
              fontFamily: "inherit", background: C.card, boxSizing: "border-box"
            }} />
        </div>
        <div style={{
          padding: "12px 14px", borderRadius: 10, background: C.bg2,
          border: `1px solid ${C.border}`
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ color: C.text2 }}>Estimated cost</span>
          <span style={{ fontWeight: 700, color: C.text }}>{currency === 'NGN' ? `₦${budget.toFixed(2)}` : `${budget.toFixed(6)} ${currency}`}</span>
           </div>
           <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>
             {quantity} {action.toLowerCase()} x {platform.pricePerAction} units
           </div>
         </div>
         <button onClick={handleCreate} disabled={submitting || !url.trim()}
          style={{
            width: "100%", padding: "12px", borderRadius: 10, border: "none",
            background: submitting || !url.trim() ? C.border : C.accent,
            color: submitting || !url.trim() ? C.text2 : C.card,
            fontSize: 14, fontWeight: 700, cursor: submitting || !url.trim() ? "not-allowed" : "pointer",
            fontFamily: "inherit"
          }}>
          {submitting ? "Creating..." : `Create ${action} Task`}
        </button>
      </div>
    </div>
  );
}

// ── SERVICE FORM ───────────────────────────────────────────────────────────
function ServiceForm({ service, onBack, onCreated }) {
  const [submitError, setSubmitError] = useState("");
  const [url, setUrl] = useState("");
  const [quantity, setQuantity] = useState(10);
  const [currency, setCurrency] = useState("SOL");
  const [budget, setBudget] = useState(service.pricePerAction * 10 / 1000000);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const divisor = currency === 'NGN' ? 1 : 1000000;
    setBudget(service.pricePerAction * quantity / divisor);
  }, [quantity, service, currency]);

  const handleCreate = async () => {
    if (!url.trim()) { setSubmitError("Please enter a URL"); return; }
    if (currency === 'NGN' && budget < 50) { setSubmitError("Minimum reward is 50 NGN"); setSubmitting(false); return; }
    setSubmitting(true);
    setSubmitError("");
    try {
      const token = localStorage.getItem("ogapay_access_token");
      if (!token) { setSubmitError("Please log in first"); setSubmitting(false); return; }
      const body = {
        title: `${service.name} Campaign`,
        description: `${service.name} campaign targeting: ${url}`,
        platform: service.id,
        service: service.name,
        url: url.trim(),
        reward: budget,
        quantity: parseInt(quantity) || 10,
        maxWorkers: parseInt(quantity) || 10,
        category: CATEGORY_MAP["Services"] || CATEGORY_MAP["Other"] || "OTHER",
        currency,
        status: "OPEN",
      };
      const res = await fetch(`${API_BASE}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const statusMsg = res.status === 403 ? ' (Forbidden — your account needs Poster role)' : '';
        throw new Error((err.message || err.error || "Failed to create task") + statusMsg);
      }
      const result = await res.json().catch(() => ({}));
      if (result.success === false) {
        throw new Error(result.message || result.error || "Failed to create task");
      }
      const createdTask = result.data || result.task || result;
      const taskId = createdTask?.id || createdTask?._id || "";
      onCreated(taskId);
    } catch (e) {
      setSubmitError(e?.message || "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 16, background: C.card, overflow: "hidden" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
        borderBottom: `1px solid ${C.border}`, background: C.bg2
      }}>
        <button onClick={onBack} style={{
          background: "none", border: "none", cursor: "pointer", color: C.accent,
          display: "flex", fontFamily: "inherit", fontSize: 13, fontWeight: 600
        }}>Back</button>
        <div style={{ width: 1, height: 20, background: C.border }} />
        <span style={{ fontWeight: 700, color: C.text }}>{service.name}</span>
      </div>
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.text2, display: "block", marginBottom: 6 }}>Target URL / Reference</label>
          <input type="text" value={url} onChange={e => setUrl(e.target.value)}
            placeholder={service.urlPlaceholder}
            style={{
              width: "100%", border: `1px solid ${C.border}`, borderRadius: 8,
              padding: "10px 12px", fontSize: 13, color: C.text, outline: "none",
              fontFamily: "inherit", background: C.card, boxSizing: "border-box"
            }} />
        </div>
        <SelectField label="Currency" value={currency} onChange={setCurrency} options={["SOL", "USDC", "NGN"]} />
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.text2, display: "block", marginBottom: 6 }}>Quantity</label>
          <input type="number" min={1} value={quantity} onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            style={{
              width: "100%", border: `1px solid ${C.border}`, borderRadius: 8,
              padding: "10px 12px", fontSize: 13, color: C.text, outline: "none",
              fontFamily: "inherit", background: C.card, boxSizing: "border-box"
            }} />
        </div>
        <div style={{
          padding: "12px 14px", borderRadius: 10, background: C.bg2,
          border: `1px solid ${C.border}`
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ color: C.text2 }}>Estimated cost</span>
            <span style={{ fontWeight: 700, color: C.text }}>{currency === 'NGN' ? `₦${budget.toFixed(2)}` : `${budget.toFixed(6)} ${currency}`}</span>
          </div>
        </div>
        <button onClick={handleCreate} disabled={submitting || !url.trim()}
          style={{
            width: "100%", padding: "12px", borderRadius: 10, border: "none",
            background: submitting || !url.trim() ? C.border : C.accent,
            color: submitting || !url.trim() ? C.text2 : C.card,
            fontSize: 14, fontWeight: 700, cursor: submitting || !url.trim() ? "not-allowed" : "pointer",
            fontFamily: "inherit"
          }}>
          {submitting ? "Creating..." : `Create ${service.name} Campaign`}
        </button>
      </div>
    </div>
  );
}

export default CreateTask;
