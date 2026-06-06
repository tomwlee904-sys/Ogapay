import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import Footer from "../components/Footer"
import Drawer from "../components/Drawer"

export default function Bookmarks() {
  const navigate = useNavigate()
  const { isAuthed } = useAuth()
  const { theme, toggle } = useTheme()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [bookmarks, setBookmarks] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("ogapay_bookmarks") || "[]")
    } catch { return [] }
  })

  const removeBookmark = (id: string) => {
    const updated = bookmarks.filter((b: any) => b.id !== id)
    setBookmarks(updated)
    localStorage.setItem("ogapay_bookmarks", JSON.stringify(updated))
  }

  return (
    <div data-theme={theme} style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <style>{`
        .page-container { max-width: 1100px; margin: 0 auto; padding: 28px 24px 60px; }
        @media (max-width: 768px) { .page-container { padding: 20px 16px 40px; } }
      `}</style>

      <header className="nav">
        <div className="nav-inner">
          <a className="brand" href="/" style={{ color: "var(--text)" }}>OgaPay</a>
          <div className="nav-actions" style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <button className="icon-btn" onClick={toggle}><i className={`ti ${theme === "dark" ? "ti-sun" : "ti-moon"}`} /></button>
            <button className="icon-btn" onClick={() => setDrawerOpen(true)}><i className="ti ti-menu-2" /></button>
          </div>
        </div>
      </header>

      <div className="page-container">
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Bookmarks</h1>
        <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 24 }}>Your saved tasks and jobs.</p>

        {bookmarks.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text3)" }}>
            <i className="ti ti-bookmark-off" style={{ fontSize: 40, marginBottom: 12, display: "block", opacity: 0.4 }} />
            <p style={{ fontSize: 14, fontWeight: 600 }}>No bookmarks yet</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>Save tasks you're interested in and they'll appear here.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {bookmarks.map((b: any) => (
              <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", cursor: "pointer" }} onClick={() => navigate(b.url || `/tasks/${b.id}`)}>{b.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 4 }}>{b.description || ""}</div>
                </div>
                <button onClick={() => removeBookmark(b.id)} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", fontSize: 12, color: "var(--text3)", cursor: "pointer" }}>
                  <i className="ti ti-trash" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <Footer />
    </div>
  )
}
