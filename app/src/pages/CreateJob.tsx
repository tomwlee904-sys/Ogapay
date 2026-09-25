import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { API_BASE, apiRequest } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import CurrencySelector from "../components/CurrencySelector";
import { useCurrency } from "../context/CurrencyContext";
import { useWalletBalance } from "../context/WalletBalanceContext";
import FundJobWalletModal from "../components/FundJobWalletModal";
import { SkeletonPage, injectSkeletonStyles } from "../components/SkeletonLoader";
import FetchPost from "../components/FetchPost";
import { PlatformActionButton } from "../components/PlatformActionButton";

import CampaignWizard from "../components/CampaignWizard";
import XCampaignBuilder from "../components/create/XCampaignBuilder";
import QuickTaskForm from "../components/create/QuickTaskForm";
import { Steps, Fold, Toggle as CfToggle, OverviewCard, RequirementPicker, DURATIONS, deadlineFor, money, minReward, reqFields, reqLabel, uploadJobFile, createTask, apiErrorText } from "../components/create/shared";
import "../styles/create.css";
// -- COLOR TOKENS ----------------------------------------------------------
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
  accentRgb: "var(--accent-rgb)",
};

// -- CONSTANTS --------------------------------------------------------------
const SELECTION_TIMES = ["1h", "6h", "12h", "24h", "48h", "72h", "7 days"];
const COOLDOWN_OPTIONS = ["None", "1 hour", "6 hours", "12 hours", "24 hours", "3 days", "7 days"];
const APPROVAL_DAYS = ["1 day", "2 days", "3 days", "4 days", "5 days"];
const PLATFORM_FEE_PCT = 10;
const MODERATION_FEE_PCT = 15;
// -- MIN PAYOUT PER CATEGORY (NGN) -----------------------------------------
const CATEGORY_MIN_PAYOUT: Record<string, number> = {
  'Social Media': 15,
  'Content Creation': 50,
  'Development': 100,
  'Marketing': 20,
  'Community': 10,
  'Music Promotion': 20,
  'Article / Blog Writing': 50,
  'App / Website Review': 15,
  'Surveys': 10,
  'Lead Generation': 10,
  'App Testing & Install': 20,
  'Other': 10,
  'Design': 50,
  'Survey': 10,
  'Data': 15,
  'Testing': 20,
  'Video': 30,
  'Research': 10,
  'Services': 50,
};

const COUNTRIES = [
  'All Countries', 'Nigeria', 'Kenya', 'Ghana', 'South Africa', 'Uganda',
  'Tanzania', 'Ethiopia', 'India', 'Philippines', 'Indonesia', 'Brazil',
  'United States', 'United Kingdom', 'Canada', 'Germany', 'France',
];

// fmt replaced by useCurrency

// -- SVG ICONS (no emojis) --------------------------------------------------
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
const IconChevronDown = ({ style }: { style?: React.CSSProperties } = {}) => (
  <svg style={style} width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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

// -- SOCIAL PLATFORMS -------------------------------------------------------
const PLATFORMS = [
  { id: "x", name: "X / Twitter", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>, color: "#000000", actions: ["Followers", "Reposts", "Likes", "Comments", "Bookmarks", "Raid"], pricePerAction: 100, urlPlaceholder: "https://x.com/username/status/123456789" },
  { id: "instagram", name: "Instagram", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>, color: "#e1306c", actions: ["Likes", "Comments", "Followers", "Story Views"], pricePerAction: 80, urlPlaceholder: "https://instagram.com/p/..." },
  { id: "youtube", name: "YouTube", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>, color: "#ff0000", actions: ["Subscribers", "Likes", "Comments", "Views"], pricePerAction: 120, urlPlaceholder: "https://youtube.com/watch?v=..." },
  { id: "telegram", name: "Telegram", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>, color: "#0088cc", actions: ["Members", "Post Views", "Reactions"], pricePerAction: 60, urlPlaceholder: "https://t.me/..." },
  { id: "discord", name: "Discord", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.082.116 18.1.136 18.11a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.995.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>, color: "#5865f2", actions: ["Members", "Reactions", "Messages"], pricePerAction: 70, urlPlaceholder: "https://discord.gg/..." },
  { id: "tiktok", name: "TikTok", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>, color: "#000000", actions: ["Followers", "Likes", "Comments", "Views"], pricePerAction: 90, urlPlaceholder: "https://tiktok.com/@user/video/..." },
  { id: "facebook", name: "Facebook", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>, color: "#1877f2", actions: ["Followers", "Likes", "Shares"], pricePerAction: 80, urlPlaceholder: "https://facebook.com/..." },
];

// -- SERVICE CATEGORIES (18 new quick services) ----------------------------
const SERVICES = [
  { id: "website_visits", name: "Website Visits", icon: <IconGlobe />, color: "var(--accent)", fields: ["url", "duration", "count"], pricePerAction: 10, urlPlaceholder: "https://example.com" },
  { id: "app_downloads", name: "App Downloads", icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>, color: "#059669", fields: ["app_url", "platform", "count"], pricePerAction: 15, urlPlaceholder: "https://apps.apple.com/..." },
  { id: "survey_campaigns", name: "Survey Campaigns", icon: <IconMail />, color: "#7c3aed", fields: ["survey_url", "questions", "count"], pricePerAction: 25, urlPlaceholder: "https://forms.gle/..." },
  { id: "email_signups", name: "Email Signups", icon: <IconMail />, color: "#0891b2", fields: ["signup_url", "count"], pricePerAction: 8, urlPlaceholder: "https://example.com/signup" },
  { id: "lead_generation", name: "Lead Generation", icon: <IconUsers />, color: "#d97706", fields: ["form_url", "description", "count"], pricePerAction: 30, urlPlaceholder: "https://example.com/lead-form" },
  { id: "product_reviews", name: "Product Reviews", icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>, color: "#dc2626", fields: ["product_url", "min_words", "count"], pricePerAction: 20, urlPlaceholder: "https://example.com/product" },
  { id: "google_play_reviews", name: "Google Play Reviews", icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>, color: "var(--green)", fields: ["app_id", "min_rating", "count"], pricePerAction: 15, urlPlaceholder: "com.example.app" },
  { id: "google_maps_reviews", name: "Google Maps Reviews", icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>, color: "#ea580c", fields: ["place_id", "min_rating", "count"], pricePerAction: 15, urlPlaceholder: "Google Maps place ID" },
  { id: "influencer_campaigns", name: "Influencer Campaigns", icon: <IconUsers />, color: "#db2777", fields: ["campaign_brief", "platform", "reach"], pricePerAction: 100, urlPlaceholder: "Campaign description" },
  { id: "nft_mint_campaigns", name: "NFT Mint Campaigns", icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>, color: "#7c3aed", fields: ["nft_address", "network", "count"], pricePerAction: 50, urlPlaceholder: "Solana NFT address" },
  { id: "token_holder_campaigns", name: "Token Holder Campaigns", icon: <IconWallet />, color: "var(--accent)", fields: ["token_address", "min_holdings", "network"], pricePerAction: 40, urlPlaceholder: "Token mint address" },
  { id: "beta_testing", name: "Beta Testing", icon: <IconSettings />, color: "#0891b2", fields: ["app_url", "test_instructions", "slots"], pricePerAction: 35, urlPlaceholder: "https://testflight.apple.com/..." },
  { id: "waitlist_registration", name: "Waitlist Registration", icon: <IconFile />, color: "#d97706", fields: ["waitlist_url", "count"], pricePerAction: 5, urlPlaceholder: "https://example.com/waitlist" },
  { id: "referral_campaigns", name: "Referral Campaigns", icon: <IconExternalLink />, color: "#059669", fields: ["referral_code", "referral_url", "count"], pricePerAction: 20, urlPlaceholder: "https://example.com/ref/..." },
  { id: "affiliate_campaigns", name: "Affiliate Campaigns", icon: <IconGlobe />, color: "#dc2626", fields: ["affiliate_link", "commission", "count"], pricePerAction: 25, urlPlaceholder: "https://example.com/affiliate" },
  { id: "data_entry_jobs", name: "Data Entry Jobs", icon: <IconFile />, color: "var(--accent)", fields: ["instructions", "format", "count"], pricePerAction: 10, urlPlaceholder: "Job description" },
  { id: "freelance_jobs", name: "Freelance Jobs", icon: <IconSettings />, color: "#ea580c", fields: ["job_description", "skills", "budget"], pricePerAction: 50, urlPlaceholder: "Project description" },
  { id: "escrow_projects", name: "Escrow Projects", icon: <IconWallet />, color: "#7c3aed", fields: ["project_scope", "milestones", "total_budget"], pricePerAction: 100, urlPlaceholder: "Project scope document" },
  { id: "content_rewards", name: "Content Rewards", icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>, color: "#dc2626", fields: ["platform", "tracking_code", "instructions", "count"], pricePerAction: 50, urlPlaceholder: "TikTok / YouTube link" },
];

const CATEGORIES = {
  "Social Media": ["X / Twitter", "Instagram", "TikTok", "YouTube", "Facebook"],
  "Content Creation": ["Writing", "Video", "Design", "Photography"],
  "Development": ["Frontend", "Backend", "Smart Contract", "Mobile"],
  "Marketing": ["SEO", "Email", "Ads", "Growth"],
  "Community": ["Moderation", "Support", "Events", "Outreach"],
  "Music Promotion": ["Streaming", "Download", "Content Creation", "Sharing"],
  "Article / Blog Writing": ["Blog Posts", "Articles", "Copywriting", "Guest Posts"],
  "App / Website Review": ["App Reviews", "Website Reviews", "Video Reviews"],
  "Surveys": ["Market Research", "Product Feedback", "Opinion Polls"],
  "Lead Generation": ["Email Signups", "Form Submissions", "Referrals"],
  "App Testing & Install": ["App Download", "Beta Testing", "Install & Review"],
  "Other": ["Miscellaneous"],
};

// -- CATEGORY MAP (frontend -> backend) -------------------------------------
const CATEGORY_MAP: Record<string, string> = {
  'Social Media': 'SOCIAL_MEDIA',
  'Content Creation': 'CONTENT_WRITING',
  'Development': 'OTHER',
  'Marketing': 'OTHER',
  'Community': 'OTHER',
  'Music Promotion': 'OTHER',
  'Article / Blog Writing': 'CONTENT_WRITING',
  'App / Website Review': 'CONTENT_WRITING',
  'Surveys': 'SURVEY',
  'Lead Generation': 'OTHER',
  'App Testing & Install': 'APP_TESTING',
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

// -- PUBLIC TEMPLATES -------------------------------------------------------
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

// -- TOGGLE ----------------------------------------------------------------
function Toggle({ on, onToggle }: any) {
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

// -- SELECT FIELD ----------------------------------------------------------
function SelectField({ label, value, onChange, options, style = {} }: any) {
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
        {options.map((o: any) => typeof o === "string"
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// -- INFO TOOLTIP ----------------------------------------------------------
function InfoTip({ text }: any) {
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

// -- EXTRA REQUIREMENTS ACCORDION ------------------------------------------
// -- PER-ACTION REQUIREMENT (Wurk.fun style) --------------------------------
const REQ_MODES = [
  { value: "rank", label: "Rank" },
  { value: "kyc", label: "KYC Verified" },
  { value: "verified_x", label: "Verified X" },
  { value: "oga_score", label: "Min OgaScore" },
];

function ActionRequirement({ value, onChange, compact }: { value: any; onChange: (v: any) => void; compact?: boolean }) {
  const mode = value?.mode || "rank";
  const minRank = value?.minRank || 0;
  const minOgaScore = value?.minOgaScore || "";
  const humanVerified = value?.humanVerified || false;

  const set = (partial: any) => onChange({ ...value, ...partial });

  const modeLabel = REQ_MODES.find(m => m.value === mode)?.label || "Rank";
  const summary = mode === "rank" ? `Rank ${minRank || 1}` : mode === "oga_score" ? `OgaScore > ${minOgaScore || 0}` : mode === "kyc" ? "KYC" : "Verified X";

  if (compact) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.text2 }}>
        <SelectField value={mode} onChange={(v: any) => set({ mode: v })} options={REQ_MODES}
          style={{ minWidth: 110, height: 30, fontSize: 11 }} />
        {mode === "rank" && (
          <input type="number" min={0} max={5} value={minRank}
            onChange={e => set({ minRank: parseInt(e.target.value) || 0 })}
            placeholder="Rank"
            style={{ width: 60, border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 8px", fontSize: 11, color: C.text, outline: "none", fontFamily: "inherit", background: C.card }} />
        )}
        {mode === "oga_score" && (
          <input type="number" min={0} value={minOgaScore}
            onChange={e => set({ minOgaScore: e.target.value })}
            placeholder="Score"
            style={{ width: 70, border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 8px", fontSize: 11, color: C.text, outline: "none", fontFamily: "inherit", background: C.card }} />
        )}
        <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 11, color: C.text3, whiteSpace: "nowrap" }}>
          <input type="checkbox" checked={humanVerified} onChange={e => set({ humanVerified: e.target.checked })}
            style={{ accentColor: C.accent, cursor: "pointer" }} />
          Human
        </label>
      </div>
    );
  }

  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        Requirement
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <SelectField label="Mode" value={mode} onChange={(v: any) => set({ mode: v })} options={REQ_MODES} />
        {mode === "rank" && (
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.text2, display: "block", marginBottom: 4 }}>Minimum Rank (1-5)</label>
            <input type="number" min={0} max={5} value={minRank}
              onChange={e => set({ minRank: parseInt(e.target.value) || 0 })}
              style={{ width: 80, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, color: C.text, outline: "none", fontFamily: "inherit", background: C.card }} />
          </div>
        )}
        {mode === "oga_score" && (
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.text2, display: "block", marginBottom: 4 }}>Minimum OgaScore</label>
            <input type="number" min={0} value={minOgaScore}
              onChange={e => set({ minOgaScore: e.target.value })}
              placeholder="e.g. 50"
              style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, color: C.text, outline: "none", fontFamily: "inherit", background: C.card }} />
          </div>
        )}
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginTop: 4 }}>
          <input type="checkbox" checked={humanVerified} onChange={e => set({ humanVerified: e.target.checked })}
            style={{ width: 16, height: 16, accentColor: C.accent, cursor: "pointer" }} />
          <span style={{ fontSize: 13, color: C.text }}>Require Human Verified (VeryAI)</span>
        </label>
      </div>
    </div>
  );
}

function ExtraRequirements({ value, onChange }: any) {
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
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Extra requirements <InfoTip text="Min Worker Level: minimum experience tier (Beginner?Legend) a worker needs to apply • Min OgaScore: minimum reputation score required • KYC Verified: only identity-verified workers can apply • Verified X Account: only workers with a connected X account can apply" /></span>
          <span style={{ fontSize: 12, color: C.accent }}>(Requirement: Rank {value.minRank || 0})</span>
          <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>Seeker, verified X accounts, holdings, oga score, rank...</div>
        </div>
        <span style={{ color: C.text3, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", display: "flex" }}>
          <IconChevronDown />
        </span>
      </div>
      {open && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          {[
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
            <label style={{ fontSize: 12, fontWeight: 600, color: C.text2, display: "block", marginBottom: 5 }}>Min PAY Holdings (optional)</label>
            <input type="number" min={0} value={value.minHoldings || ""}
              onChange={e => onChange({ ...value, minHoldings: e.target.value })}
              placeholder="e.g. 100"
              style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, color: C.text, outline: "none", fontFamily: "inherit", background: C.card }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.text2, display: "block", marginBottom: 5 }}>Min OgaScore (optional)</label>
            <input type="number" min={0} max={100} value={value.minOgaScore || ""}
              onChange={e => onChange({ ...value, minOgaScore: e.target.value })}
              placeholder="e.g. 50"
              style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, color: C.text, outline: "none", fontFamily: "inherit", background: C.card }} />
          </div>
        </div>
      )}
    </div>
  );
}

// -- EXCLUDE USERS ----------------------------------------------------------
function ExcludeUsers({ value, onChange }: any) {
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

// -- TEMPLATES MODAL -------------------------------------------------------
function TemplatesModal({ onClose, onUse, myTemplates = [] }: any) {
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
          ) : templates.map((tpl: any, i: any) => (
            <div key={i} style={{
              border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, background: C.card
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{tpl.title}</div>
                  <div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>{tpl.platform} • {tpl.winners} winners • {tpl.bounty} SOL</div>
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

// -- CUSTOM JOB WIZARD ------------------------------------------------------
const CUSTOM_DRAFT_KEY = "ogapay_custom_job_draft";

function CustomJobWizard({ onClose, onCreate, initialTemplate = null }: any) {
  const navigate = useNavigate();
  const { isAuthed } = useAuth();
  const { convert } = useCurrency();
  const { balances: walletBalances, refresh: refreshWalletBal } = useWalletBalance();

  // Start from a template, else from the saved draft (survives sign-in)
  const init = (() => {
    if (initialTemplate) return { ...initialTemplate, description: initialTemplate.desc };
    try { return JSON.parse(localStorage.getItem(CUSTOM_DRAFT_KEY) || "null") || {}; } catch { return {}; }
  })();

  const [step, setStep] = useState<2 | 3>(2);
  const [mode, setMode] = useState<string>(init.mode || "Challenge");
  const [title, setTitle] = useState<string>(init.title || "");
  const [description, setDescription] = useState<string>(init.description || "");
  const [currency, setCurrency] = useState<string>(init.currency || "NGN");
  const [bounty, setBounty] = useState<string>(init.bounty?.toString() || "");
  const [winnersInput, setWinnersInput] = useState<string>(String(init.winners || 10));
  const [category, setCategory] = useState<string>(init.category || "");
  const [subcategory, setSubcategory] = useState<string>(init.subcategory || "");
  const [duration, setDuration] = useState<string>(init.duration || "7 days");
  const [reqType, setReqType] = useState<string>(init.reqType || "none");
  const [reqValue, setReqValue] = useState<string>(init.reqValue || "");
  const [screenshot, setScreenshot] = useState<boolean>(!!init.screenshot);
  const [trackingCode, setTrackingCode] = useState<string>(init.trackingCode || "");
  const [files, setFiles] = useState<File[]>([]);
  const [openReq, setOpenReq] = useState<boolean>(!!init.reqType && init.reqType !== "none");
  const [openExtra, setOpenExtra] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showFundModal, setShowFundModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const descRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(CUSTOM_DRAFT_KEY, JSON.stringify({ mode, title, description, currency, bounty, winners: winnersInput, category, subcategory, duration, reqType, reqValue, screenshot, trackingCode }));
      } catch { /* storage full or blocked */ }
    }, 400);
    return () => clearTimeout(t);
  }, [mode, title, description, currency, bounty, winnersInput, category, subcategory, duration, reqType, reqValue, screenshot, trackingCode]);

  const winners = mode === "Selection" ? 1 : Math.min(1000, Math.max(0, parseInt(winnersInput) || 0));
  const rewardPool = parseFloat(String(bounty).replace(/,/g, "")) || 0;
  const perWinner = winners > 0 ? rewardPool / winners : 0;
  const platformFee = rewardPool * 0.10;
  const totalToPay = rewardPool + platformFee;
  const floor = currency === "NGN" ? Math.max(minReward("NGN"), CATEGORY_MIN_PAYOUT[category] || 0) : minReward(currency);
  const minTotal = floor * Math.max(winners, 1);
  const deadline = deadlineFor(duration);
  const alt = currency === "USDC"
    ? `≈ ₦${Math.round(convert(totalToPay, "USDC" as any, "NGN" as any)).toLocaleString("en-US")}`
    : `≈ $${convert(totalToPay, currency as any, "USDC" as any).toFixed(2)} USD`;
  const balance = Number(walletBalances?.[currency]?.balance || 0);

  const checklist = [
    { ok: title.trim().length >= 5, label: "Give the job a short title." },
    { ok: description.trim().length >= 20, label: "Describe the task and what people should submit." },
    { ok: !!category, label: "Pick a category." },
    { ok: rewardPool > 0 && rewardPool >= minTotal, label: `Set a total budget of at least ${money(minTotal, currency)}.` },
    { ok: winners >= 1, label: "Choose how many people you will pay." },
  ];
  const ready = checklist.every(c => c.ok);

  // Markdown helpers for the toolbar
  const wrap = (before: string, after = before, placeholder = "text") => {
    const ta = descRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const sel = value.slice(s, e) || placeholder;
    const next = value.slice(0, s) + before + sel + after + value.slice(e);
    setDescription(next.slice(0, 10000));
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(s + before.length, s + before.length + sel.length); });
  };
  const linePrefix = (prefix: string) => {
    const ta = descRef.current;
    if (!ta) return;
    const { selectionStart: s, value } = ta;
    const lineStart = value.lastIndexOf("\n", s - 1) + 1;
    setDescription((value.slice(0, lineStart) + prefix + value.slice(lineStart)).slice(0, 10000));
    requestAnimationFrame(() => ta.focus());
  };

  const addFiles = (list: FileList | null) => {
    const picked = Array.from(list || []).filter(f => f.size <= 10 * 1024 * 1024);
    setFiles(prev => [...prev, ...picked].slice(0, 10));
  };

  const goToPayment = () => {
    if (!isAuthed) { navigate("/login?redirect=" + encodeURIComponent("/create?type=custom")); return; }
    if (!ready) { setSubmitError("Finish the checklist before continuing."); return; }
    setSubmitError("");
    setStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const publish = async () => {
    if (!ready) { setStep(2); return; }
    if (balance < totalToPay) { setShowFundModal(true); return; }
    setSubmitting(true);
    setSubmitError("");
    try {
      const uploaded: { name: string; url: string }[] = [];
      for (const f of files) uploaded.push({ name: f.name, url: await uploadJobFile(f) });
      // Links also go in the brief so workers see them even where attachments aren't shown
      const brief = description.trim() + (uploaded.length ? `\n\n**Attachments**\n${uploaded.map(u => `- [${u.name}](${u.url})`).join("\n")}` : "");
      const taskId = await createTask({
        title: title.trim(),
        description: brief,
        instructions: brief,
        category: CATEGORY_MAP[category] || "OTHER",
        reward: Number(perWinner.toFixed(currency === "NGN" ? 2 : 6)),
        currency,
        maxWorkers: winners,
        tags: [category, subcategory].filter(Boolean).slice(0, 5),
        ...(deadline && { deadline: deadline.toISOString() }),
        ...(screenshot && { proofRequired: "Screenshot required" }),
        ...reqFields(reqType, reqValue),
        ...(trackingCode.trim() && { trackingCode: trackingCode.trim() }),
        ...(uploaded.length && { attachments: uploaded.map(u => u.url) }),
      });
      try { localStorage.removeItem(CUSTOM_DRAFT_KEY); } catch { /* ignore */ }
      refreshWalletBal();
      onCreate(taskId);
    } catch (err: any) {
      setSubmitError(apiErrorText(err));
    } finally {
      setSubmitting(false);
    }
  };

  const rows: [string, string, string?][] = [
    ["Platform fee (10%)", money(platformFee, currency)],
    [mode === "Selection" ? "Person hired" : "Winners", String(winners || 0)],
    [mode === "Selection" ? "Paid to them" : "Reward per winner", money(perWinner, currency)],
  ];

  return (
    <Layout>
      <div className="ui-page" style={{ paddingTop: 28 }}>
        <header className="ui-head">
          <div>
            <span className="ui-eyebrow"><i className="ti ti-sparkles" /> Made for your next idea</span>
            <h1 className="ui-title">Create a custom job</h1>
            <p className="ui-sub">Describe the work, choose how people are rewarded and review your budget.</p>
          </div>
          <button className="ui-btn ui-btn-ghost" onClick={onClose}><i className="ti ti-arrow-left" /> Change job type</button>
        </header>

        <Steps labels={["Choose type", "Job details", "Payment"]} current={step} />

        <div className="cw-layout">
          <div>
            {!isAuthed && (
              <div className="cw-banner">
                <span>Prepare your brief now. Sign in when you're ready to continue; your draft is saved.</span>
                <button className="ui-btn ui-btn-dark" onClick={() => navigate("/login?redirect=" + encodeURIComponent("/create?type=custom"))}>Sign in</button>
              </div>
            )}

            {step === 2 ? (
              <section className="ui-card cf-card">
                <div className="cf-head">
                  <b><i className="ti ti-settings" /> Job configuration</b>
                  <button className="ui-btn ui-btn-ghost" onClick={() => setShowTemplates(true)}><i className="ti ti-template" /> Templates</button>
                </div>
                <div className="cf-body">
                  <div className="cf-field">
                    <span className="cf-lbl">Mode</span>
                    <div className="cf-modes" role="radiogroup" aria-label="Mode">
                      {[
                        ["Challenge", "ti-trophy", "Pay every approved entry, up to your number of winners."],
                        ["Selection", "ti-user-check", "People apply and you choose one person for the work."],
                      ].map(([m, icon, d]) => (
                        <button key={m} type="button" role="radio" aria-checked={mode === m} className={`cf-mode${mode === m ? " on" : ""}`} onClick={() => setMode(m)}>
                          <i className={`ti ${icon}`} /><span style={{ margin: 0 }}><b>{m}</b><span>{d}</span></span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="cf-field">
                    <label htmlFor="cj-title">Title</label>
                    <input id="cj-title" className="ui-input" maxLength={200} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Write a thread explaining how OgaPay works" />
                  </div>

                  <div className="cf-field">
                    <label htmlFor="cj-desc">Description</label>
                    <div className="cf-editor">
                      <div className="cf-tools" role="toolbar" aria-label="Formatting">
                        <button type="button" title="Bold" aria-label="Bold" onClick={() => wrap("**")}><i className="ti ti-bold" /></button>
                        <button type="button" title="Italic" aria-label="Italic" onClick={() => wrap("_")}><i className="ti ti-italic" /></button>
                        <button type="button" title="List" aria-label="Bulleted list" onClick={() => linePrefix("- ")}><i className="ti ti-list" /></button>
                        <button type="button" title="Heading" aria-label="Heading" onClick={() => linePrefix("## ")}><i className="ti ti-heading" /></button>
                        <button type="button" title="Link" aria-label="Link" onClick={() => wrap("[", "](https://)", "link text")}><i className="ti ti-link" /></button>
                        <span className="sep" />
                        <button type="button" title="Attach files" aria-label="Attach files" onClick={() => fileRef.current?.click()}><i className="ti ti-paperclip" /></button>
                      </div>
                      <textarea id="cj-desc" ref={descRef} value={description} maxLength={10000} onChange={e => setDescription(e.target.value)}
                        placeholder="What should people do? Describe the result, what to submit and how you'll choose winners." />
                    </div>
                    <div className="cf-count"><span>Include the task, expected result and what to submit. Markdown supported.</span><span>{description.length.toLocaleString()} / 10,000</span></div>
                  </div>

                  <div className="cf-row-3">
                    <div className="cf-field">
                      <label htmlFor="cj-cur">Currency</label>
                      <select id="cj-cur" className="ui-select" value={currency} onChange={e => setCurrency(e.target.value)}>
                        <option value="NGN">NGN</option><option value="USDC">USDC</option><option value="SOL">SOL</option>
                      </select>
                    </div>
                    <div className="cf-field">
                      <label htmlFor="cj-budget">Total budget</label>
                      <div className="cf-prefix">
                        <span>{currency === "NGN" ? "₦" : currency === "USDC" ? "$" : "◎"}</span>
                        <input id="cj-budget" className="ui-input" inputMode="decimal" value={bounty} onChange={e => setBounty(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="0" />
                      </div>
                      <p className="cf-hint">Minimum: {money(minTotal, currency)}</p>
                    </div>
                    <div className="cf-field">
                      <label htmlFor="cj-win">{mode === "Selection" ? "People hired" : "Challenge winners"}</label>
                      <input id="cj-win" className="ui-input" type="number" min={1} max={1000} disabled={mode === "Selection"}
                        value={mode === "Selection" ? "1" : winnersInput} onChange={e => setWinnersInput(e.target.value)} />
                      <p className="cf-hint">{money(perWinner, currency)} per {mode === "Selection" ? "person" : "winner"} · 1 to 1,000</p>
                    </div>
                  </div>

                  <div className="cf-row">
                    <div className="cf-field">
                      <label htmlFor="cj-cat">Category</label>
                      <select id="cj-cat" className="ui-select" value={category} onChange={e => { setCategory(e.target.value); setSubcategory(""); }}>
                        <option value="">Select a category</option>
                        {Object.keys(CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="cf-field">
                      <label htmlFor="cj-sub">Subcategory</label>
                      <select id="cj-sub" className="ui-select" value={subcategory} disabled={!category} onChange={e => setSubcategory(e.target.value)}>
                        <option value="">{category ? "Optional" : "Choose a category first"}</option>
                        {(CATEGORIES[category as keyof typeof CATEGORIES] || []).map((s: string) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="cf-field">
                    <label htmlFor="cj-dur">Job closes after</label>
                    <select id="cj-dur" className="ui-select" value={duration} onChange={e => setDuration(e.target.value)}>
                      {DURATIONS.map(([l]) => <option key={l} value={l}>{l}</option>)}
                    </select>
                    <p className="cf-hint">{deadline ? `Closes ${deadline.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}. Unused budget returns to your wallet.` : "Stays open until all places are filled or you cancel it."}</p>
                  </div>

                  <Fold title="Audience and requirements" sub="Choose who can take part" open={openReq} onToggle={() => setOpenReq(o => !o)}>
                    <RequirementPicker type={reqType} value={reqValue} onChange={(t, v) => { setReqType(t); setReqValue(v); }} />
                  </Fold>

                  <div className="cf-field">
                    <span className="cf-lbl">Attachments (up to 10 files, 10 MB each)</span>
                    <button type="button" className="cf-drop" onClick={() => fileRef.current?.click()}><i className="ti ti-upload" /> Add briefs, examples or creatives for workers</button>
                    <input ref={fileRef} type="file" multiple hidden accept="image/*,video/*,.pdf,.doc,.docx,.txt" onChange={e => { addFiles(e.target.files); e.target.value = ""; }} />
                    {files.length > 0 && (
                      <div className="cf-files">
                        {files.map((f, i) => <span key={f.name + i}>{f.name}<button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles(fs => fs.filter((_, j) => j !== i))}>×</button></span>)}
                      </div>
                    )}
                  </div>

                  <Fold title="Extra submission options" sub="Proof and tracking" open={openExtra} onToggle={() => setOpenExtra(o => !o)}>
                    <CfToggle on={screenshot} onChange={setScreenshot} label="Screenshot required" desc="People must attach at least one screenshot with their submission." />
                    <div className="cf-field">
                      <label htmlFor="cj-track">Tracking code (optional)</label>
                      <input id="cj-track" className="ui-input" maxLength={64} value={trackingCode} onChange={e => setTrackingCode(e.target.value)} placeholder="e.g. OGA-LAUNCH-24" />
                      <p className="cf-hint">Ask people to include this code in their post so you can find their content.</p>
                    </div>
                  </Fold>

                  {submitError && <div className="cf-error">{submitError}</div>}
                </div>
              </section>
            ) : (
              <section className="ui-card cf-card">
                <div className="cf-head">
                  <b><i className="ti ti-wallet" /> Review and pay</b>
                  <button className="ui-btn ui-btn-ghost" onClick={() => setStep(2)}><i className="ti ti-arrow-left" /> Edit details</button>
                </div>
                <div className="cf-body">
                  <div className="cf-review">
                    <div><span>Title</span><b>{title}</b></div>
                    <div><span>Category</span><b>{category}{subcategory ? ` / ${subcategory}` : ""}</b></div>
                    <div><span>Mode</span><b>{mode}</b></div>
                    <div><span>{mode === "Selection" ? "People hired" : "Winners"}</span><b>{winners}</b></div>
                    <div><span>Reward per {mode === "Selection" ? "person" : "winner"}</span><b>{money(perWinner, currency)}</b></div>
                    <div><span>Who can take part</span><b>{reqLabel(reqType, reqValue)}</b></div>
                    <div><span>Closes</span><b>{deadline ? deadline.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "No deadline"}</b></div>
                    {screenshot && <div><span>Proof</span><b>Screenshot required</b></div>}
                    {files.length > 0 && <div><span>Attachments</span><b>{files.length} file{files.length > 1 ? "s" : ""}</b></div>}
                    <div><span>Your {currency} balance</span><b style={{ color: balance >= totalToPay ? "var(--green)" : "var(--red)" }}>{money(balance, currency)}</b></div>
                  </div>
                  {balance < totalToPay && (
                    <div className="cw-banner" style={{ margin: 0 }}>
                      <span>You need {money(totalToPay - balance, currency)} more to publish this job.</span>
                      <button className="ui-btn ui-btn-dark" onClick={() => setShowFundModal(true)}>Top up wallet</button>
                    </div>
                  )}
                  {submitError && <div className="cf-error">{submitError}</div>}
                </div>
              </section>
            )}
          </div>

          <OverviewCard
            rows={rows}
            total={totalToPay}
            currency={currency}
            alt={alt}
            checklist={step === 2 ? checklist : []}
            primaryLabel={!isAuthed ? "Sign in to continue" : step === 2 ? "Continue to payment" : submitting ? "Publishing…" : `Pay ${money(totalToPay, currency)} and publish`}
            onPrimary={step === 2 ? goToPayment : publish}
            busy={submitting}
          />
        </div>
      </div>

      {showTemplates && <TemplatesModal onClose={() => setShowTemplates(false)} onUse={(tpl: any) => {
        setTitle(tpl.title || ""); setBounty(tpl.bounty?.toString() || ""); setWinnersInput(String(tpl.winners || 10)); setDescription(tpl.desc || "");
        setShowTemplates(false);
      }} />}
      {showFundModal && (
        <FundJobWalletModal
          currency={currency}
          shortfall={Math.max(0, totalToPay - balance)}
          totalToPay={totalToPay}
          balance={balance}
          onClose={() => setShowFundModal(false)}
          onFunded={() => { setShowFundModal(false); refreshWalletBal(); }}
        />
      )}
    </Layout>
  );
}

// -- SUCCESS MODAL ---------------------------------------------------------
function SuccessModal({ onClose, taskId }: any) {
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

// -- MAIN CREATE TASK COMPONENT ---------------------------------------------
function CreateTask() {
  const navigate = useNavigate();
  const { user, refreshUser, isAuthed } = useAuth();
  const { fmt } = useCurrency();
  const [showCustom, setShowCustom] = useState(false);
  
  const [customTemplate, setCustomTemplate] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("socials");
  const [success, setSuccess] = useState<any>(false);
  const [selectedPlatform, setSelectedPlatform] = useState<any>(null);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [showMainTemplates, setShowMainTemplates] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [openPanel, setOpenPanel] = useState<null | "x" | "quick">(null);
  const quickRef = useRef<HTMLDivElement>(null);
  const [showX, setShowX] = useState(false);
  const [xUrl, setXUrl] = useState("");

  // /create?type=custom (back from sign-in with a saved draft) or ?type=x
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("type");
    if (t === "custom") setShowCustom(true);
    if (t === "x") setShowX(true);
  }, []);

  // Edit data handed over from Manage jobs
  useEffect(() => {
    try {
      const editData = sessionStorage.getItem('ogapay_edit_task');
      if (editData) {
        const task = JSON.parse(editData);
        if (task.title && task.platform) (window as any).__ogapay_edit_task = task;
        sessionStorage.removeItem('ogapay_edit_task');
      }
    } catch { /* ignore malformed edit data */ }
  }, []);

  // Back from a Flutterwave top-up started on this page
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("fund_retry") !== "1") return;
    window.history.replaceState({}, "", window.location.pathname);
    const pending = sessionStorage.getItem("ogapay_fund_and_retry");
    if (!pending) return;
    sessionStorage.removeItem("ogapay_fund_and_retry");
    const msg = document.createElement("div");
    msg.style.cssText = "position:fixed;top:72px;left:50%;transform:translateX(-50%);z-index:500;background:#17805c;color:#fff;padding:12px 20px;border-radius:12px;font-size:13px;font-weight:600;box-shadow:0 12px 32px rgba(0,0,0,0.2)";
    msg.textContent = "Payment received. Your wallet is funded and you can post your job.";
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 5000);
  }, []);

  // Campaign handed over from the Campaign Builder
  useEffect(() => {
    const campaign = (window as any).__ogapay_campaign;
    if (!campaign) return;
    (window as any).__ogapay_campaign = null;
    setCustomTemplate({
      title: campaign.title || '',
      desc: campaign.description || campaign.instructions || '',
      bounty: campaign.budget?.toString() || campaign.reward?.toString() || '',
      mode: 'Challenge',
      winners: campaign.workerCount || 10,
    });
    setShowCustom(true);
  }, []);

  const tabStyle = (id: any) => ({
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

  if (isAuthed && !upgraded && effectiveRole !== "POSTER" && effectiveRole !== "ADMIN") {
    const handleUpgrade = async () => {
      setUpgrading(true);
      setUpgradeMsg('');
      try {
        if (!isAuthed) { setUpgradeMsg('Please log in first'); setUpgrading(false); return; }
        await apiRequest<any>('/users/me', {
          method: 'PATCH',
          body: JSON.stringify({ role: 'POSTER' }),
        });
        // Write POSTER role to localStorage — set a flag so refreshUser can't overwrite it
        try {
          const stored = JSON.parse(localStorage.getItem('ogapay_user') || '{}');
          stored.role = 'POSTER';
          localStorage.setItem('ogapay_user', JSON.stringify(stored));
          localStorage.setItem('ogapay_role_override', 'POSTER');
        } catch(e: any) {}
        setUpgradeMsg('Account upgraded! You can now create jobs.');
        setTimeout(() => setUpgraded(true), 800);
      } catch (e: any) {
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
              background: upgrading ? 'var(--border)' : 'var(--accent)', color: upgrading ? 'var(--text2)' : 'var(--on-accent)',
              fontSize: 14, fontWeight: 700, cursor: upgrading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit'
            }}>
            {upgrading ? 'Upgrading...' : 'Upgrade to Poster Account'}
          </button>
          {upgradeMsg && (
            <p style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: upgradeMsg.includes('upgraded') ? 'var(--green)' : '#DC2626' }}>{upgradeMsg}</p>
          )}
        </div>
      </Layout>
    );
  }

  if (showX) {
    return <XCampaignBuilder initialUrl={xUrl}
      onClose={() => { setShowX(false); setXUrl(""); }}
      onCreated={(taskId: any) => { setShowX(false); setXUrl(""); setSuccess(taskId || true); }} />;
  }

  if (showCustom) {
    return <CustomJobWizard
      initialTemplate={customTemplate}
      onClose={() => { setShowCustom(false); setCustomTemplate(null); }}
      onCreate={(taskId: any) => { setShowCustom(false); setCustomTemplate(null); setSuccess(taskId || true); }}
    />;
  }

  const pickPlatform = (p: any) => {
    setSelectedPlatform(p);
    setOpenPanel("quick");
    setTimeout(() => quickRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  const QUICK_ICONS = ["x", "youtube", "telegram", "instagram", "tiktok"];

  return (
    <Layout>
      <style>{`
        .cj-intro{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin:34px 0 14px;flex-wrap:wrap}
        .cj-intro b{font-size:14px;font-weight:600}
        .cj-intro span{font-size:12px;color:var(--text2)}
        .cj-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
        .cj-card{display:flex;flex-direction:column;padding:18px;min-height:300px}
        .cj-card.on{border-color:var(--text3);box-shadow:0 20px 40px -32px rgba(0,0,0,.45)}
        .cj-icon{width:40px;height:40px;border-radius:12px;border:1px solid var(--border);background:var(--card2);display:grid;place-items:center;font-size:18px;color:var(--text)}
        .cj-card h3{margin:22px 0 6px;font-size:17px;font-weight:600;letter-spacing:-.02em}
        .cj-card p{margin:0;font-size:12.5px;line-height:1.6;color:var(--text2)}
        .cj-card ul{margin:18px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px;font-size:11.5px;color:var(--text2)}
        .cj-card li{display:flex;align-items:center;gap:8px}
        .cj-card li::before{content:'';width:4px;height:4px;border-radius:50%;background:var(--text3)}
        .cj-plats{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-top:18px}
        .cj-plats button{height:40px;border-radius:10px;border:1px solid var(--border);background:var(--card);color:var(--text);display:grid;place-items:center;cursor:pointer}
        .cj-plats button:hover,.cj-plats button.on{border-color:var(--text)}
        .cj-go{margin-top:auto;padding-top:18px}
        .cj-go .ui-btn{width:100%;justify-content:space-between;height:44px}
        .cj-panel{margin-top:14px;overflow:hidden;scroll-margin-top:90px}
        .cj-panel-head{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid var(--border)}
        .cj-panel-head b{font-size:14px;font-weight:600}
        .cj-menu{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;padding:16px}
        .cj-steps{display:flex;justify-content:center;align-items:center;gap:12px;flex-wrap:wrap;margin:26px 0 0;font-size:11.5px;color:var(--text2)}
        .cj-steps span.n{display:inline-grid;place-items:center;width:20px;height:20px;border-radius:6px;border:1px solid var(--border);font:400 10px var(--font-mono);margin-right:6px}
        .cj-steps i{font-size:12px;color:var(--text3)}
        .cj-foot{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-top:24px;padding-top:18px;border-top:1px solid var(--border);font-size:12px;color:var(--text2)}
        .cj-foot a{display:inline-flex;align-items:center;gap:6px;color:var(--text);font-weight:500;text-decoration:none}
        .cj-xstart{display:flex;flex-direction:column;gap:8px;margin-top:14px;padding-top:14px;border-top:1px solid var(--border)}
        .cj-xstart b{font-size:13px;font-weight:600}
        .cj-xstart span{font-size:11.5px;color:var(--text2);margin-top:-4px}
        .cj-xstart label{font-size:11.5px;font-weight:500;margin-top:4px}
        .cj-xstart .ui-btn{width:100%}
        @media(max-width:900px){.cj-cards{grid-template-columns:1fr}.cj-card{min-height:0}}
      `}</style>
      <div className="ui-page" style={{ paddingTop: 28 }}>
        <header className="ui-head">
          <div>
            <span className="ui-eyebrow"><i className="ti ti-sparkles" /> Made for your next idea</span>
            <h1 className="ui-title">Create a job</h1>
            <p className="ui-sub">Choose a task, set your budget and put people to work.</p>
          </div>
          <button className="ui-btn ui-btn-ghost" onClick={() => setShowMainTemplates(true)}><i className="ti ti-template" /> Start from a template</button>
        </header>

        <div className="cj-intro">
          <b>What would you like to create?</b>
          <span>Choose the option that fits your goal.</span>
        </div>

        <div className="cj-cards">
          <div className="ui-card cj-card">
            <span className="cj-icon"><i className="ti ti-clipboard-text" /></span>
            <h3>Custom job</h3>
            <p>Get creative work, feedback or research from people.</p>
            <ul>
              <li>Write your brief and set the reward</li>
              <li>Pay every approved entry, or choose one person</li>
            </ul>
            <div className="cj-go">
              <button className="ui-btn ui-btn-dark" onClick={() => setShowCustom(true)}>Create custom job <i className="ti ti-arrow-right" /></button>
            </div>
          </div>

          <div className={`ui-card cj-card${openPanel === "x" ? " on" : ""}`}>
            <span className="cj-icon">{PLATFORMS[0].icon}</span>
            <h3>X campaign</h3>
            <p>Grow an X post with a campaign you configure yourself.</p>
            <ul>
              <li>Combine reposts, comments, likes and more</li>
              <li>Set the actions, audience and budget</li>
            </ul>
            <div className="cj-go">
              <button className="ui-btn ui-btn-dark" aria-expanded={openPanel === "x"} onClick={() => setOpenPanel(openPanel === "x" ? null : "x")}>
                {openPanel === "x" ? "Close X campaign setup" : "Set up X campaign"} <i className={`ti ti-chevron-${openPanel === "x" ? "up" : "down"}`} />
              </button>
            </div>
            {openPanel === "x" && (
              <form className="cj-xstart" onSubmit={e => { e.preventDefault(); setShowX(true); }}>
                <b>Start with your X post</b>
                <span>Find your post, then choose its actions and budget.</span>
                <label htmlFor="cj-xurl">X post URL</label>
                <input id="cj-xurl" className="ui-input" type="url" value={xUrl} onChange={e => setXUrl(e.target.value)} placeholder="https://x.com/username/status/…" />
                <button type="submit" className="ui-btn ui-btn-dark" disabled={!xUrl.trim()}><i className="ti ti-search" /> Find post</button>
              </form>
            )}
          </div>

          <div className={`ui-card cj-card${openPanel === "quick" ? " on" : ""}`}>
            <span className="cj-icon"><i className="ti ti-bolt" /></span>
            <h3>Quick task</h3>
            <p>Pick a ready-made social task. Just add a link and quantity.</p>
            <ul>
              <li>Likes, followers, subscribers and members</li>
              <li>Preset pricing across popular platforms</li>
            </ul>
            <div className="cj-plats">
              {PLATFORMS.filter(p => QUICK_ICONS.includes(p.id)).map(p => (
                <button key={p.id} className={selectedPlatform?.id === p.id ? "on" : ""} aria-label={p.name} title={p.name} onClick={() => pickPlatform(p)}>{p.icon}</button>
              ))}
            </div>
            <div className="cj-go">
              <button className="ui-btn ui-btn-dark" aria-expanded={openPanel === "quick"} onClick={() => { setSelectedPlatform(null); setOpenPanel(openPanel === "quick" ? null : "quick") }}>
                Choose a quick task <i className={`ti ti-chevron-${openPanel === "quick" ? "up" : "down"}`} />
              </button>
            </div>
          </div>
        </div>

        {openPanel === "quick" && (
          <section className="ui-card cj-panel" ref={quickRef}>
            {!selectedPlatform ? (
              <>
                <div className="cj-panel-head"><b>Choose a platform</b><button className="ui-btn ui-btn-ghost" onClick={() => setOpenPanel(null)}>Close</button></div>
                <div className="cj-menu">
                  {PLATFORMS.map(p => (
                    <PlatformActionButton key={p.id} icon={p.icon} label={p.name} actionCount={p.actions.length} hasDropdown={true} onClick={() => pickPlatform(p)} />
                  ))}
                </div>
              </>
            ) : (
              <QuickTaskForm platform={selectedPlatform} onBack={() => setSelectedPlatform(null)} onCreated={(taskId: any) => setSuccess(taskId || "true")} />
            )}
          </section>
        )}

        <div className="cj-steps" aria-label="How it works">
          <span><span className="n">1</span>Choose your task</span><i className="ti ti-arrow-right" />
          <span><span className="n">2</span>Set details and budget</span><i className="ti ti-arrow-right" />
          <span><span className="n">3</span>Review and pay</span>
        </div>

        <div className="cj-foot">
          <span>You'll review the payment before your job goes live.</span>
          <a href="https://t.me/OgaPayCommunity" target="_blank" rel="noopener noreferrer"><i className="ti ti-brand-telegram" /> Get help on Telegram <i className="ti ti-arrow-up-right" /></a>
        </div>
      </div>

      <CampaignWizard />
      {showMainTemplates && <TemplatesModal onClose={() => setShowMainTemplates(false)} onUse={(tpl: any) => { setCustomTemplate(tpl); setShowCustom(true); }} />}
      {success && <SuccessModal taskId={typeof success === 'string' && success !== 'true' ? success : undefined} onClose={() => setSuccess(false)} />}
    </Layout>
  );
}

// -- USE JOB BUDGET HOOK ---------------------------------------------------
function useJobBudget({ currency, quantity, pricePerUnit, category }: {
  currency: string; quantity: number; pricePerUnit?: number; category?: string;
}) {
  const divisor = currency === 'NGN' ? 1 : 1000000;
  const budget = pricePerUnit ? pricePerUnit * quantity / divisor : 0;
  const minRequired = category ? (CATEGORY_MIN_PAYOUT[category] || 0) : 0;
  const isValid = currency !== 'NGN' || budget >= minRequired;
  const errorMessage = !isValid ? `Minimum reward for ${category} is ₦${minRequired}` : '';
  return { budget, minRequired, isValid, errorMessage, divisor };
}

// -- PLATFORM DETAIL --------------------------------------------------------
function PlatformDetail({ platform, onBack, onCreated }: any) {
  const [submitError, setSubmitError] = useState("");
  const navigate = useNavigate();
  const { isAuthed } = useAuth();
  const { rates } = useCurrency();
  const [action, setAction] = useState(platform.actions[0] || "");
  const [url, setUrl] = useState("");
  const [quantity, setQuantity] = useState(10);
  const [quantityInput, setQuantityInput] = useState("10");
  const [currency, setCurrency] = useState("SOL");
  const [actionReq, setActionReq] = useState<any>({ mode: "rank", minRank: 0, minOgaScore: "", humanVerified: false });
  const { budget: computedBudget, minRequired, isValid, errorMessage: budgetError } = useJobBudget({ currency, quantity, pricePerUnit: platform.pricePerAction, category: 'Social Media' });
  const [submitting, setSubmitting] = useState(false);
  const [showFundModal, setShowFundModal] = useState(false);
  const { balances: walletBalances, refresh: refreshWalletBal } = useWalletBalance();

  // Budget computed by useJobBudget hook
  const handleCreate = async () => {
    if (!url.trim()) { setSubmitError("Please enter a URL"); return; }
    const minReq = CATEGORY_MIN_PAYOUT['Social Media'] || 0;
    if (currency === 'NGN' && minReq > 0 && computedBudget < minReq) { setSubmitError(`Minimum reward for Social Media is ₦${minReq}`); setSubmitting(false); return; }
    setSubmitting(true);
    setSubmitError("");
    try {
      if (!isAuthed) { setSubmitError("Please log in first"); setSubmitting(false); return; }
      const body = {
        title: `${action} on ${platform.name}`,
        description: `Perform ${action.toLowerCase()} on ${platform.name}: ${url}`,
        platform: platform.id,
        action,
        url: url.trim(),
        reward: computedBudget,
        quantity: quantity,
        maxWorkers: quantity,
        category: CATEGORY_MAP["Social Media"] || "SOCIAL_MEDIA",
        currency,
        status: "OPEN",
        minRank: actionReq.mode === "rank" ? (actionReq.minRank || 0) : undefined,
        workerRequirement: actionReq.mode === "kyc" ? "KYC" : actionReq.humanVerified ? "HUMAN" : undefined,
        requiresX: actionReq.mode === "verified_x" || undefined,
        minSorsaScore: actionReq.mode === "oga_score" ? (Math.min(100, parseInt(actionReq.minOgaScore)) || undefined) : undefined,
      };
      // -- Check wallet balance before submitting --
      const walletEntry = walletBalances?.[currency];
      const currentBalance = walletEntry ? (Number(walletEntry.balance) || 0) : 0;
      if (currentBalance < computedBudget) {
        setSubmitError("");
        setShowFundModal(true);
        setSubmitting(false);
        return;
      }

      const result = await apiRequest<any>('/tasks', {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!result || result.success === false) {
        throw new Error(result?.message || result?.error || "Failed to create task");
      }
      const createdTask = result.data || result.task || result;
      const taskId = createdTask?.id || createdTask?._id || "";
      onCreated(taskId);
    } catch (e: any) {
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
          <input type="number" min={1} value={quantityInput} onChange={e => {
            setQuantityInput(e.target.value);
            const parsed = parseInt(e.target.value);
            if (!isNaN(parsed)) setQuantity(Math.max(1, parsed));
          }}
          onBlur={() => {
            const parsed = parseInt(quantityInput);
            const clamped = isNaN(parsed) || parsed < 1 ? 1 : parsed;
            setQuantityInput(String(clamped));
            setQuantity(clamped);
          }}
            style={{
              width: "100%", border: `1px solid ${C.border}`, borderRadius: 8,
              padding: "10px 12px", fontSize: 13, color: C.text, outline: "none",
              fontFamily: "inherit", background: C.card, boxSizing: "border-box"
            }} />
        <SelectField label="Currency" value={currency} onChange={setCurrency} options={["SOL", "USDC", "NGN"]} />
        </div>
        <div style={{
          padding: "12px 14px", borderRadius: 10, background: C.bg2,
          border: `1px solid ${C.border}`
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ color: C.text2 }}>Estimated cost</span>
          <span style={{ fontWeight: 700, color: C.text }}>{currency === 'NGN' ? `₦${computedBudget.toFixed(2)}` : `${computedBudget.toFixed(6)} ${currency} ${computedBudget > 0 ? '(~ ₦' + (computedBudget * (rates.NGN > 0 ? 1/rates.NGN : 1500)).toLocaleString('en-US', {maximumFractionDigits: 0}) + ')' : ''}`}</span>
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
{showFundModal && (
        <FundJobWalletModal
          currency={currency}
          shortfall={Math.max(0, computedBudget - (walletBalances?.[currency] ? (Number(walletBalances[currency].balance) || 0) : 0))}
          totalToPay={computedBudget}
          balance={walletBalances?.[currency] ? (Number(walletBalances[currency].balance) || 0) : 0}
          onClose={() => setShowFundModal(false)}
          onFunded={() => {
            setShowFundModal(false);
            refreshWalletBal();
            setSubmitting(false);
            setTimeout(() => handleCreate(), 500);
          }}
        />
      )}
    </div>
  );
}

// -- SERVICE FORM -----------------------------------------------------------
function ServiceForm({ service, onBack, onCreated }: any) {
  const { isAuthed } = useAuth();
  const { rates } = useCurrency();
  const [submitError, setSubmitError] = useState("");
  const [url, setUrl] = useState("");
  const [quantity, setQuantity] = useState(10);
  const [quantityInput, setQuantityInput] = useState("10");
  const [currency, setCurrency] = useState("SOL");
  const { budget: computedBudget, minRequired, isValid, errorMessage: budgetError } = useJobBudget({ currency, quantity, pricePerUnit: service.pricePerAction, category: 'Services' });
  const [submitting, setSubmitting] = useState(false);
  const [showFundModal, setShowFundModal] = useState(false);
  const { balances: walletBalances, refresh: refreshWalletBal } = useWalletBalance();

  // Budget computed by useJobBudget hook
  const handleCreate = async () => {
    if (!url.trim()) { setSubmitError("Please enter a URL"); return; }
    const minReq = CATEGORY_MIN_PAYOUT['Services'] || CATEGORY_MIN_PAYOUT['Other'] || 0;
    if (currency === 'NGN' && minReq > 0 && computedBudget < minReq) { setSubmitError(`Minimum reward for this service is ₦${minReq}`); setSubmitting(false); return; }
    setSubmitting(true);
    setSubmitError("");
    try {
      if (!isAuthed) { setSubmitError("Please log in first"); setSubmitting(false); return; }
      const body = {
        title: `${service.name} Campaign`,
        description: `${service.name} campaign targeting: ${url}`,
        platform: service.id,
        service: service.name,
        url: url.trim(),
        reward: computedBudget,
        quantity: quantity,
        maxWorkers: quantity,
        category: CATEGORY_MAP["Services"] || CATEGORY_MAP["Other"] || "OTHER",
        currency,
        status: "OPEN",
      };
      // -- Check wallet balance before submitting --
      const walletEntry = walletBalances?.[currency];
      const currentBalance = walletEntry ? (Number(walletEntry.balance) || 0) : 0;
      if (currentBalance < computedBudget) {
        setSubmitError("");
        setShowFundModal(true);
        setSubmitting(false);
        return;
      }

      const result = await apiRequest<any>('/tasks', {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!result || result.success === false) {
        throw new Error(result?.message || result?.error || "Failed to create task");
      }
      const createdTask = result.data || result.task || result;
      const taskId = createdTask?.id || createdTask?._id || "";
      onCreated(taskId);
    } catch (e: any) {
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
          <input type="number" min={1} value={quantityInput} onChange={e => {
            setQuantityInput(e.target.value);
            const parsed = parseInt(e.target.value);
            if (!isNaN(parsed)) setQuantity(Math.max(1, parsed));
          }}
          onBlur={() => {
            const parsed = parseInt(quantityInput);
            const clamped = isNaN(parsed) || parsed < 1 ? 1 : parsed;
            setQuantityInput(String(clamped));
            setQuantity(clamped);
          }}
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
            <span style={{ fontWeight: 700, color: C.text }}>{currency === 'NGN' ? `₦${computedBudget.toFixed(2)}` : `${computedBudget.toFixed(6)} ${currency} ${computedBudget > 0 ? '(~ ₦' + (computedBudget * (rates.NGN > 0 ? 1/rates.NGN : 1500)).toLocaleString('en-US', {maximumFractionDigits: 0}) + ')' : ''}`}</span>
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
{showFundModal && (
        <FundJobWalletModal
          currency={currency}
          shortfall={Math.max(0, computedBudget - (walletBalances?.[currency] ? (Number(walletBalances[currency].balance) || 0) : 0))}
          totalToPay={computedBudget}
          balance={walletBalances?.[currency] ? (Number(walletBalances[currency].balance) || 0) : 0}
          onClose={() => setShowFundModal(false)}
          onFunded={() => {
            setShowFundModal(false);
            refreshWalletBal();
            setSubmitting(false);
            setTimeout(() => handleCreate(), 500);
          }}
        />
      )}
    </div>
  );
}

export default CreateTask;
