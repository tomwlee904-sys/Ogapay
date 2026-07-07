import { Link } from "react-router-dom"
import Navbar from "../components/Navbar"
import Footer from "../components/Footer"
import FeatureGridSplit from "../components/FeatureGridSplit"

export default function FeatureGridPage() {
  return (
    <>
      <Navbar onMenuToggle={() => {}} />
      <main style={{ paddingTop: "var(--nav-h)" }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 16px 0' }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--text2)', textDecoration: 'none' }}>
            <i className="ti ti-arrow-left" style={{ fontSize: 16 }} /> Back to OgaPay
          </Link>
        </div>
        <FeatureGridSplit />
      </main>
      <Footer />
    </>
  )
}
