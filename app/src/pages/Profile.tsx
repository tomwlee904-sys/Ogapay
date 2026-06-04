// @ts-nocheck
import { useState } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";

const I = ({ n, s = 16, c = "currentColor" }) => (
  <i className={`ti ti-${n}`} style={{ fontSize: s, color: c, lineHeight: 1, flexShrink: 0 }} />
);

const XIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.739l7.727-8.833L1.255 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const DONUT_CATS = [
  { name: "Jobs", color: "#22c55e" },
  { name: "Referrals", color: "#1F8CFF" },
  { name: "Tips", color: "#3b82f6" },
  { name: "Vault", color: "#f59e0b" },
];

const QUICK_LINKS = [
  { icon: "activity", label: "Job Monitor", href: "/tasks" },
  { icon: "safe", label: "Vault", href: "/vault" },
  { icon: "file-text", label: "Blogs", href: "/blog" },
  { icon: "briefcase", label: "Available Jobs", href: "/tasks" },
  { icon: "bookmark", label: "Bookmarks", href: "/bookmarks" },
  { icon: "circle-plus", label: "Create Job", href: "/create" },
];

const REFERRAL_DATA = [
  { name: "Alex T.", joined: "2 days ago", earned: "₦350", status: "Active" },
  { name: "Chioma O.", joined: "1 week ago", earned: "₦1,200", status: "Active" },
  { name: "Emeka S.", joined: "2 weeks ago", earned: "₦0", status: "Pending" },
];

const CHART_DATA = [35, 55, 42, 70, 48, 62, 85];

function Toggle({ on, set }) {
  return (
    <button onClick={() => set(v => !v)} style={{
      width: 44, height: 24, borderRadius: 99, border: "none", cursor: "pointer",
      background: on ? "var(--text)" : "var(--border)", position: "relative", flexShrink: 0, transition: "background .2s"
    }}>
      <span style={{
        position: "absolute", top: 3, left: on ? 23 : 3, width: 18, height: 18,
        borderRadius: "50%", background: "#fff", transition: "left .2s",
        boxShadow: "0 1px 3px rgba(0,0,0,.25)"
      }} />
    </button>
  );
}

function CopyBtn({ text }) {
  const [ok, setOk] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(text); setOk(true); setTimeout(() => setOk(false), 1800); };
  return (
    <button onClick={copy} style={{
      height: 34, padding: "0 14px", borderRadius: 99, border: "1.5px solid var(--border)",
      background: "var(--card)", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
      color: ok ? "var(--green)" : "var(--text)"
    }}>
      <I n={ok ? "check" : "copy"} s={13} c={ok ? "var(--green)" : "var(--text3)"} /> {ok ? "Copied!" : "Copy"}
    </button>
  );
}

function Card({ children, style = {} }) {
  return <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", ...style }}>{children}</div>;
}

function CardHead({ left, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderBottom: "1px solid var(--border)" }}>
      <span style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "Outfit,sans-serif", fontSize: 15, fontWeight: 800, color: "var(--text)" }}>{left}</span>
      {right}
    </div>
  );
}

function CardBody({ children, style = {} }) {
  return <div style={{ padding: "16px 18px", ...style }}>{children}</div>;
}

export default function Profile() {
  const { isAuthed } = useAuth();
  const [tab, setTab] = useState("profile");
  const [earnTab, setEarnTab] = useState("7d");
  const [refHidden, setRefHidden] = useState(false);

  if (!isAuthed) {
    return (
      <Layout sidebar={false}>
        <div className="loading"><div className="spinner" /> Sign in to view your profile</div>
      </Layout>
    );
  }

  const refLink = "https://ogapay.ng/ref/johndoe";

  return (
    <Layout sidebar={false}>
      <style>{`
        .prf-tabs { display: flex; gap: 6px; margin-bottom: 24px; padding-bottom: 4px; border-bottom: 1px solid var(--border); overflow-x: auto; }
        .prf-tab { display: inline-flex; align-items: center; gap: 7px; padding: 8px 14px; border: 1px solid transparent; border-radius: 8px; background: transparent; color: var(--text3); font-family: "DM Sans",sans-serif; font-size: 12.5px; font-weight: 700; cursor: pointer; white-space: nowrap; transition: all .15s; }
        .prf-tab:hover { color: var(--text); background: var(--bg2); }
        .prf-tab.active { border-color: var(--accent); color: var(--accent); background: rgba(31,140,255,.06); }

        .prf-grid { display: grid; grid-template-columns: 1fr 340px; gap: 22px; align-items: start; }
        .prf-main { min-width: 0; }

        .prf-hero { display: flex; align-items: center; gap: 18px; margin-bottom: 24px; }
        .prf-avatar { width: 64px; height: 64px; border-radius: 50%; background: var(--bg2); border: 2px solid var(--border); display: grid; place-items: center; font-size: 24px; font-weight: 900; color: var(--text); flex-shrink: 0; overflow: hidden; }
        .prf-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .prf-info h1 { font-family: "Outfit",sans-serif; font-size: 22px; font-weight: 900; margin: 0; color: var(--text); }
        .prf-info .prf-uname { font-size: 13px; color: var(--text3); margin: 2px 0 6px; }
        .prf-info .prf-bio { font-size: 13px; color: var(--text2); line-height: 1.5; max-width: 400px; }
        .prf-badges { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
        .prf-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; background: rgba(31,140,255,.08); color: var(--accent); }
        .prf-badge.green { background: rgba(34,197,94,.08); color: var(--green); }
        .prf-badge.gold { background: rgba(245,179,1,.1); color: #d97706; }

        .prf-side-cards { display: grid; gap: 14px; }

        .ql-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; }
        .ql-item { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 14px 8px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg); cursor: pointer; transition: all .15s; text-decoration: none; color: inherit; }
        .ql-item:hover { border-color: var(--accent); transform: translateY(-1px); }
        .ql-item i { font-size: 20px; color: var(--accent); }
        .ql-item span { font-size: 11px; font-weight: 700; color: var(--text2); text-align: center; }

        .etabs { display: flex; gap: 4px; background: var(--bg2); border-radius: 8px; padding: 2px; }
        .etab { padding: 4px 12px; border-radius: 6px; border: none; background: transparent; color: var(--text3); font-size: 11px; font-weight: 700; cursor: pointer; transition: all .15s; font-family: "DM Sans",sans-serif; }
        .etab.active { background: var(--card); color: var(--text); box-shadow: 0 1px 3px rgba(0,0,0,.08); }

        .earn-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border); }
        .earn-row:last-child { border-bottom: none; }
        .earn-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .earn-val { font-family: "Outfit",sans-serif; font-size: 18px; font-weight: 900; color: var(--text); margin-left: auto; }

        .chart-simple { display: flex; align-items: flex-end; gap: 5px; height: 80px; padding: 10px 0; }
        .chart-bar { flex: 1; border-radius: 3px 3px 0 0; background: var(--accent); opacity: .5; min-height: 4px; transition: height .4s; }
        .chart-bar:hover { opacity: 1; }

        .ref-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
        .ref-table th { text-align: left; padding: 8px 6px; font-weight: 700; color: var(--text3); border-bottom: 1px solid var(--border); font-size: 11px; }
        .ref-table td { padding: 8px 6px; border-bottom: 1px solid var(--border); color: var(--text2); }
        .ref-table .empty-td { text-align: center; padding: 32px 6px; color: var(--text3); font-size: 12px; }

        .portal-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; }

        @media (max-width: 768px) {
          .prf-grid { grid-template-columns: 1fr; }
          .ql-grid { grid-template-columns: repeat(3,1fr); }
          .portal-grid { grid-template-columns: repeat(2,1fr); }
          .prf-hero { flex-direction: column; text-align: center; }
          .prf-tabs { gap: 4px; }
          .prf-tab { padding: 6px 10px; font-size: 11px; }
        }
        .fade { animation: fadeUp .28s ease both; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
      `}</style>

      {/* ─── TABS ─── */}
      <div className="prf-tabs">
        {[
          { key: "profile", icon: "user", label: "Profile" },
          { key: "earnings", icon: "currency-naira", label: "Earnings" },
          { key: "referrals", icon: "affiliate", label: "Referrals" },
          { key: "alerts", icon: "bell", label: "Alerts" },
          { key: "portal", icon: "briefcase", label: "Worker Portal" },
        ].map(t => (
          <button key={t.key} className={`prf-tab ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}>
            <I n={t.icon} s={15} /> {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════ PROFILE TAB ══════════════ */}
      {tab === "profile" && (
        <div className="fade prf-grid">
          {/* Main */}
          <div className="prf-main">
            <div className="prf-hero">
              <div className="prf-avatar">
                <span>👤</span>
              </div>
              <div className="prf-info">
                <h1>John Doe</h1>
                <div className="prf-uname">@johndoe</div>
                <div className="prf-bio">Task worker and creator. Building skills on OgaPay.</div>
                <div className="prf-badges">
                  <span className="prf-badge"><I n="badge-verified" s={12} /> Verified</span>
                  <span className="prf-badge green"><I n="star" s={12} /> 4.8 Rating</span>
                  <span className="prf-badge gold"><I n="crown" s={12} /> Gold Tier</span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontFamily: "Outfit,sans-serif", fontSize: 14, fontWeight: 800, color: "var(--text)", marginBottom: 10 }}>Quick Links</div>
              <div className="ql-grid">
                {QUICK_LINKS.map(q => (
                  <a key={q.label} href={q.href} className="ql-item">
                    <I n={q.icon} s={20} />
                    <span>{q.label}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Side */}
          <div className="prf-side-cards">
            <Card>
              <CardHead left={<><I n="wallet" s={17} /> Wallet</>} right={<a href="/wallet" style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>Manage</a>} />
              <CardBody>
                <div style={{ fontFamily: "Outfit,sans-serif", fontSize: 28, fontWeight: 900, color: "var(--text)", marginBottom: 4 }}>₦12,450</div>
                <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 14 }}>Available Balance</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <a href="/wallet" style={{ flex: 1, height: 38, borderRadius: 99, background: "var(--accent)", color: "#fff", border: "none", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", textDecoration: "none" }}>
                    <I n="plus" s={13} c="#fff" /> Deposit
                  </a>
                  <a href="/wallet" style={{ flex: 1, height: 38, borderRadius: 99, border: "1.5px solid var(--border)", background: "transparent", color: "var(--text)", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", textDecoration: "none" }}>
                    <I n="logout" s={13} /> Withdraw
                  </a>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHead left={<><I n="settings" s={17} /> Quick Settings</>} />
              <CardBody>
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>Public Profile</span>
                    <Toggle on={true} set={() => {}} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>Show Earnings</span>
                    <Toggle on={true} set={() => {}} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>Open for Work</span>
                    <Toggle on={false} set={() => {}} />
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* ══════════════ EARNINGS TAB ══════════════ */}
      {tab === "earnings" && (
        <div className="fade" style={{ maxWidth: 1060, margin: "0 auto" }}>
          <div style={{ display: "grid", gap: 18 }}>
            {/* Summary */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
              {[
                { label: "Total Earned", val: "₦45,200" },
                { label: "Available", val: "₦12,450" },
                { label: "Pending", val: "₦3,200" },
                { label: "This Month", val: "₦8,900" },
              ].map(s => (
                <Card key={s.label} style={{ padding: "18px", textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 700, marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontFamily: "Outfit,sans-serif", fontSize: 22, fontWeight: 900, color: "var(--text)" }}>{s.val}</div>
                </Card>
              ))}
            </div>

            {/* Chart */}
            <Card>
              <CardHead left={<><I n="chart-area" s={17} /> Earnings Chart</>} right={
                <div className="etabs">
                  {["7d", "30d", "all"].map(p => (
                    <button key={p} className={`etab ${earnTab === p ? "active" : ""}`} onClick={() => setEarnTab(p)}>
                      {p === "7d" ? "7 Days" : p === "30d" ? "30 Days" : "All Time"}
                    </button>
                  ))}
                </div>
              } />
              <CardBody>
                <div className="chart-simple">
                  {CHART_DATA.map((v, i) => (
                    <div key={i} className="chart-bar" style={{ height: `${v}%` }} />
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text3)", fontWeight: 600 }}>
                  <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                </div>
              </CardBody>
            </Card>

            {/* Category Breakdown */}
            <Card>
              <CardHead left={<><I n="pie-chart" s={17} /> Breakdown</>} />
              <CardBody>
                {DONUT_CATS.map(c => (
                  <div key={c.name} className="earn-row">
                    <div className="earn-dot" style={{ background: c.color }} />
                    <span style={{ fontSize: 13, color: "var(--text2)", fontWeight: 600 }}>{c.name}</span>
                    <span className="earn-val">₦0</span>
                  </div>
                ))}
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* ══════════════ REFERRALS TAB ══════════════ */}
      {tab === "referrals" && (
        <div className="fade" style={{ maxWidth: 1060, margin: "0 auto" }}>
          <Card>
            <CardHead left={<><I n="affiliate" s={17} /> Referral Program</>} right={<span style={{ fontSize: 12, color: "var(--text3)", fontWeight: 700 }}>Earn 10% forever</span>} />
            <CardBody>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, padding: "12px 16px", background: "var(--bg2)", borderRadius: 10, border: "1px solid var(--border)", flexWrap: "wrap" }}>
                <span style={{ fontFamily: "monospace", fontSize: 13, color: "var(--text)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{refLink}</span>
                <CopyBtn text={refLink} />
                <button style={{ height: 34, padding: "0 14px", borderRadius: 99, background: "var(--text)", color: "var(--bg)", border: "none", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
                  <XIcon size={12} /> Post on X
                </button>
              </div>
              <table className="ref-table">
                <thead><tr><th>USER</th><th>JOINED</th><th>EARNINGS</th><th>STATUS</th></tr></thead>
                <tbody>
                  {REFERRAL_DATA.map(r => (
                    <tr key={r.name}>
                      <td style={{ fontWeight: 700, color: "var(--text)" }}>{r.name}</td>
                      <td>{r.joined}</td>
                      <td style={{ fontWeight: 700, color: "var(--green)" }}>{r.earned}</td>
                      <td><span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: r.status === "Active" ? "rgba(34,197,94,.1)" : "rgba(245,179,1,.1)", color: r.status === "Active" ? "var(--green)" : "#d97706" }}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ══════════════ ALERTS TAB ══════════════ */}
      {tab === "alerts" && (
        <div className="fade" style={{ maxWidth: 1060, margin: "0 auto" }}>
          <Card>
            <CardHead left={<><I n="bell" s={17} /> Alerts</>} right={<button style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", border: "none", background: "none", cursor: "pointer" }}>Mark all read</button>} />
            <CardBody style={{ textAlign: "center", padding: "48px 20px" }}>
              <I n="bell-off" s={40} c="var(--border2)" />
              <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 12 }}>No alerts yet. We'll notify you about new jobs, earnings, and updates.</div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ══════════════ WORKER PORTAL TAB ══════════════ */}
      {tab === "portal" && (
        <div className="fade" style={{ maxWidth: 1060, margin: "0 auto", display: "grid", gap: 18 }}>
          <div className="portal-grid">
            {[
              { icon: "briefcase", label: "Tasks Done", val: "0" },
              { icon: "trophy", label: "Won", val: "0" },
              { icon: "heart", label: "Compliments", val: "0" },
              { icon: "currency-naira", label: "Total Earned", val: "₦0" },
            ].map(s => (
              <Card key={s.label} style={{ padding: 20, textAlign: "center" }}>
                <I n={s.icon} s={24} c="var(--text3)" />
                <div style={{ fontFamily: "Outfit,sans-serif", fontSize: 26, fontWeight: 900, margin: "8px 0 4px", color: "var(--text)" }}>{s.val}</div>
                <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 700 }}>{s.label}</div>
              </Card>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <Card>
              <CardHead left={<><I n="layout-dashboard" s={17} /> Worker Portal</>} />
              <CardBody>
                <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6, marginBottom: 16 }}>Build your reputation as a worker on OgaPay. Complete tasks, earn compliments, and rise through the ranks.</p>
                <div style={{ display: "grid", gap: 10 }}>
                  {[
                    { icon: "star", label: "My Reviews", val: "0 reviews", sub: "0.0 rating" },
                    { icon: "zap", label: "Challenges Participated", val: "0" },
                    { icon: "gift", label: "Tips Received", val: "0" },
                    { icon: "users", label: "Communities", val: "0 joined" },
                  ].map(r => (
                    <div key={r.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px dashed var(--border)", fontSize: 13 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text2)", fontWeight: 600 }}>
                        <I n={r.icon} s={16} c="var(--text3)" />{r.label}
                      </span>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 800, color: "var(--text)" }}>{r.val}</div>
                        {r.sub && <div style={{ fontSize: 11, color: "var(--text3)" }}>{r.sub}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardHead left={<><I n="user" s={17} /> My Store</>} right={<a href="/my-store" style={{ height: 32, padding: "0 14px", borderRadius: 99, background: "var(--text)", color: "var(--bg)", border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}><I n="external-link" s={12} /> Open Store</a>} />
              <CardBody style={{ textAlign: "center", padding: "32px 20px" }}>
                <I n="building-store" s={40} c="var(--border2)" />
                <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 12 }}>No products listed yet.</div>
                <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>Open your store to sell services and products.</div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </Layout>
  );
}
