import Navbar from "../components/Navbar"
import Footer from "../components/Footer"
import FeatureGridSplit from "../components/FeatureGridSplit"

export default function UseCasePage() {
  return (
    <>
      <Navbar onMenuToggle={() => {}} />
      <main style={{ paddingTop: "var(--nav-h)" }}>
        <FeatureGridSplit />
      </main>
      <Footer />
    </>
  )
}
