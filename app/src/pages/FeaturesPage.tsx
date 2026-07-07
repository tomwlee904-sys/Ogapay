import { motion } from "framer-motion"
import { Link } from "react-router-dom"
import FeatureGridSplit from "../components/FeatureGridSplit"

export default function FeaturesPage() {
  return (
    <main style={{ overflowX: "hidden", position: 'relative' }}>
      <Link to="/" style={{ position: 'fixed', top: 16, left: 16, zIndex: 50, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 700, color: 'var(--text)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}><i className="ti ti-arrow-left" /> Back to OgaPay</Link>
      <div style={{ padding: "120px 0 40px", textAlign: "center", background: "#FFFFFF" }}>
        <div className="container">
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: "clamp(36px, 4vw, 52px)",
              fontWeight: 900,
              color: "#1C3316",
              letterSpacing: "-1.5px",
              lineHeight: 1.1,
              margin: "0 0 16px",
            }}
          >
            Everything OgaPay Offers
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
            style={{
              fontSize: 17,
              color: "#556351",
              maxWidth: 560,
              margin: "0 auto",
              lineHeight: 1.6,
            }}
          >
            Earn, control, verify, and receive payments — all from one platform.
          </motion.p>
        </div>
      </div>
      <FeatureGridSplit />
      <style>{`
        [data-theme="dark"] h1 { color: #fff !important }
        [data-theme="dark"] p { color: rgba(255,255,255,.6) !important }
      `}</style>
    </main>
  )
}
