import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import Navbar from "../components/Navbar"
import { Link } from "react-router-dom"
import Footer from "../components/Footer"
import BrandIcon from "../components/BrandIcon"

/* ─── ICON HELPER ────────────────────────────────────────── */
function Icon({ n, s = 16 }: { n: string; s?: number }) {
  return <i className={`ti ti-${n}`} style={{ fontSize: s }} />
}

/* ─── CATEGORY FILTERS ───────────────────────────────────── */
const categories = ["All", "Social Media", "Content & Copywriting", "Design & Visual", "Research & Data", "Testing & QA", "Audio & Video", "✨ Featured"]

const categorySlugMap: Record<string, string> = {
  "Social Media": "social",
  "Content & Copywriting": "content",
  "Design & Visual": "design",
  "Research & Data": "research",
  "Testing & QA": "testing",
  "Audio & Video": "audio-video",
}

/* ─── ECOSYSTEM DATA ─────────────────────────────────────── */
const ecosystemData: { title: string; description: string; tags: string[]; icon: string }[] = [
  { title: "X/Twitter Engagement", description: "Likes, retweets, comments, and follows to grow real engagement on X.", tags: ["social"], icon: "brand-x" },
  { title: "Instagram Growth", description: "Likes, comments, follows, and story views to build authentic Instagram presence.", tags: ["social"], icon: "brand-instagram" },
  { title: "TikTok Engagement", description: "Likes, comments, shares, and follows to boost TikTok reach and algorithm performance.", tags: ["social"], icon: "brand-tiktok" },
  { title: "YouTube Engagement", description: "Likes, comments, subscribes, and watch time to grow a YouTube channel organically.", tags: ["social"], icon: "brand-youtube" },
  { title: "Telegram Growth", description: "Group and channel joins, views, and engagement to expand Telegram presence.", tags: ["social"], icon: "brand-telegram" },
  { title: "Facebook Engagement", description: "Page likes, comments, shares, and reactions to grow Facebook presence.", tags: ["social"], icon: "brand-facebook" },
  { title: "Social Caption Writing", description: "Engaging captions and post copy tailored to a brand's unique voice and audience.", tags: ["content"], icon: "pencil" },
  { title: "Blog & Article Writing", description: "SEO-friendly long-form content written by real Nigerian writers and researchers.", tags: ["content"], icon: "article" },
  { title: "Product Descriptions", description: "Clear, persuasive e-commerce copy that converts browsers into buyers.", tags: ["content"], icon: "shopping-bag" },
  { title: "Ad Copy Writing", description: "Conversion-focused copy for paid social and search advertising campaigns.", tags: ["content"], icon: "speakerphone" },
  { title: "Email Newsletter Writing", description: "Newsletter content that keeps subscribers engaged and drives repeat traffic.", tags: ["content"], icon: "mail" },
  { title: "Social Media Graphics", description: "Custom branded banners, post templates, and visual assets for any platform.", tags: ["design"], icon: "photo" },
  { title: "Logo Design", description: "Custom logo design and brand identity development for businesses and creators.", tags: ["design"], icon: "vector-bezier" },
  { title: "Thumbnail Design", description: "Eye-catching YouTube and podcast thumbnails designed to maximise click-through rates.", tags: ["design"], icon: "layout-grid" },
  { title: "Flyer & Poster Design", description: "Professional event and promotional flyers ready for print or digital distribution.", tags: ["design"], icon: "device-floppy" },
  { title: "Web Research", description: "In-depth research compiled from real, verifiable sources across any topic.", tags: ["research"], icon: "search" },
  { title: "Data Entry", description: "Accurate, fast data entry into spreadsheets, CRMs, or internal systems.", tags: ["research"], icon: "table" },
  { title: "Lead List Building", description: "Curated contact and company lists tailored for sales outreach and prospecting.", tags: ["research"], icon: "users" },
  { title: "Market & Competitor Research", description: "Structured insights into competitors, market trends, and industry landscapes.", tags: ["research"], icon: "chart-bar" },
  { title: "App Testing", description: "Real-device manual testing to catch bugs and UX issues before public launch.", tags: ["testing"], icon: "bug" },
  { title: "Website QA Testing", description: "Manual quality assurance across browsers, devices, and screen sizes.", tags: ["testing"], icon: "checkbox" },
  { title: "Survey Completion", description: "Genuine, human-verified survey responses for market research and validation.", tags: ["testing"], icon: "clipboard-list" },
  { title: "Video Editing", description: "Cuts, transitions, captions, and polish for social clips or long-form video.", tags: ["audio-video"], icon: "movie" },
  { title: "Voiceover Recording", description: "Clear professional voiceovers in English, Pidgin, Yoruba, Igbo, and Hausa.", tags: ["audio-video"], icon: "microphone" },
  { title: "Translation & Subtitling", description: "Accurate human translation and subtitle creation across Nigerian languages and English.", tags: ["audio-video"], icon: "language" },
]/* ─── CARD COMPONENT ─────────────────────────────────────── */
function EcosystemCard({ title, description, tags, icon, index }: { title: string; description: string; tags: string[]; icon?: string; index: number }) {
  const iconMap: Record<string, string> = {
    social: "users", content: "pencil", design: "palette",
    research: "search", testing: "bug", "audio-video": "movie",
  }
  const primaryTag = tags[0]
  const resolvedIcon = icon || iconMap[primaryTag] || "box"
  const isBrand = icon && ["brand-x","brand-instagram","brand-tiktok","brand-youtube","brand-telegram","brand-facebook"].includes(icon)
  const categoryLabel: Record<string, string> = {
    social: "Social Media", content: "Content", design: "Design",
    research: "Research", testing: "Testing", "audio-video": "Audio & Video",
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: "easeOut", delay: (index % 6) * 0.06 }}
      style={{
        background: "#fff",
        borderRadius: 24,
        border: "1px solid rgba(0,0,0,.04)",
        boxShadow: "0 4px 20px rgba(0,0,0,.04)",
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        transition: "transform .2s, box-shadow .2s",
        cursor: "default",
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,.08)" }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,.04)" }}
    >
      {/* Top row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        {/* Brand icon placeholder */}
        {isBrand ? (
          <div className="eco-brand-icon-bg" style={{
            width: 44, height: 44, borderRadius: 12,
            border: "1px solid rgba(0,0,0,.06)",
            boxShadow: "0 2px 8px rgba(0,0,0,.04)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <BrandIcon name={icon!.replace("brand-", "")} size={20} />
          </div>
        ) : (
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "linear-gradient(135deg, #191C6B, #2D5BFF)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 18,
          }}>
            <Icon n={resolvedIcon} s={18} />
          </div>
        )}
        {/* Tag badge */}
        <div style={{
          padding: "3px 10px", borderRadius: 99,
          background: "#EEF0F5", fontSize: 11, fontWeight: 600,
          color: "#191C6B", textTransform: "lowercase",
        }}>
          {categoryLabel[primaryTag] || primaryTag}
        </div>
      </div>
      {/* Title */}
      <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#111827", lineHeight: 1.25 }}>{title}</h3>
      {/* Description */}
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: "#6B7280", flex: 1 }}>{description}</p>
    </motion.div>
  )
}

/* ─── PAGE ────────────────────────────────────────────────── */
export default function Ecosystem() {
  const [activeCategory, setActiveCategory] = useState("All")

  const filtered = useMemo(() => {
    if (activeCategory === "All" || activeCategory === "✨ Featured") return ecosystemData
    const cat = categorySlugMap[activeCategory] || activeCategory.toLowerCase()
    return ecosystemData.filter(item => item.tags.includes(cat))
  }, [activeCategory])

  return (
    <>
      <Link to="/" style={{ position: 'fixed', top: 80, left: 16, zIndex: 50, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 12px', fontSize: 12, fontWeight: 700, color: 'var(--text)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}><i className="ti ti-arrow-left" /> Back to OgaPay</Link>
      <Navbar onMenuToggle={() => {}} />
      <main style={{ overflowX: "hidden" }}>
        {/* ─── HERO ──────────────────────────────────────── */}
        <section style={{
          position: "relative", overflow: "hidden",
          padding: "80px 0 40px", background: "#FFFFFF", textAlign: "center",
        }}>
          {/* Geometric background pattern */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.5,
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23f5b800' fill-opacity='0.25'%3E%3Crect x='12' y='8' width='3' height='3' rx='1'/%3E%3Crect x='28' y='4' width='2' height='2' rx='0.5'/%3E%3Crect x='42' y='12' width='3' height='3' rx='1'/%3E%3Crect x='8' y='24' width='2' height='2' rx='0.5'/%3E%3Crect x='48' y='28' width='3' height='3' rx='1'/%3E%3Crect x='16' y='40' width='2' height='2' rx='0.5'/%3E%3Crect x='38' y='44' width='3' height='3' rx='1'/%3E%3Crect x='52' y='6' width='2' height='2' rx='0.5'/%3E%3Crect x='4' y='48' width='3' height='3' rx='1'/%3E%3C/g%3E%3C/svg%3E")`,
          }} />

          <div className="container" style={{ position: "relative", zIndex: 1, maxWidth: 720 }}>
            <h1 style={{
              fontFamily: "'Outfit', sans-serif", fontSize: "clamp(32px, 4vw, 48px)",
              fontWeight: 800, color: "#111827", letterSpacing: "-1.2px",
              lineHeight: 1.1, margin: "0 0 18px",
            }}>
              Access a Universe of Services with{" "}
              <span style={{ fontFamily: "'DM Serif Display', 'Georgia', serif", fontStyle: "italic", color: "var(--gold)", fontWeight: 500 }}>
                OgaPay Ecosystem
              </span>
            </h1>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: "#6B7280", margin: "0 auto 32px", maxWidth: 560 }}>
              OgaPay connects you with real Nigerian talent across social media growth, content creation, design, research, testing, audio and video, and more.
            </p>
          </div>
        </section>

        {/* ─── FILTERS ────────────────────────────────────── */}
        <section style={{ background: "#FFFFFF", padding: "0 0 32px" }}>
          <div className="container">
            <div style={{
              display: "flex", flexWrap: "wrap", gap: 10,
              justifyContent: "center",
            }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding: "8px 18px", borderRadius: 999,
                    border: activeCategory === cat ? "none" : "1px solid #E8EDE6",
                    background: activeCategory === cat ? "#191C6B" : "transparent",
                    color: activeCategory === cat ? "#fff" : "#6B7280",
                    fontWeight: 600, fontSize: 14, cursor: "pointer",
                    transition: "all .2s",
                    fontFamily: "inherit",
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ─── GRID ───────────────────────────────────────── */}
        <section style={{ background: "#FFFFFF", padding: "0 0 80px" }}>
          <div className="container">
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 24,
            }}>
              {filtered.map((item, i) => (
                <EcosystemCard key={item.title} {...item} index={i} />
              ))}
            </div>
            {filtered.length === 0 && (
              <div style={{ textAlign: "center", padding: 60, color: "#6B7280", fontSize: 15 }}>
                No services found for this category.
              </div>
            )}
          </div>
        </section>

        <style>{`
          @media(max-width: 640px) {
            section > div > div { grid-template-columns: 1fr !important; }
          }
          @media(min-width: 641px) and (max-width: 1024px) {
            section > div > div { grid-template-columns: repeat(2, 1fr) !important; }
          }
          [data-theme="dark"] section { background: #000 !important; }
          [data-theme="dark"] h1 { color: #fff !important; }
          [data-theme="dark"] .container > div > h3 { color: #fff !important; }
          [data-theme="dark"] .container > div > p { color: rgba(255,255,255,.6) !important; }
          [data-theme="dark"] [style*="background: #fff"] { background: var(--card) !important; border-color: rgba(255,255,255,.08) !important; }
          [data-theme="dark"] [style*="background: #EEF0F5"] { background: rgba(0,0,0,.08) !important; color: #888 !important; }
          .eco-brand-icon-bg { background: #fff; }
          [data-theme="dark"] .eco-brand-icon-bg { background: #1a1a1a !important; border-color: rgba(255,255,255,.15) !important; }
        `}</style>
      </main>
      <Footer />
    </>
  )
}
