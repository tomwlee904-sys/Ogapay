import { motion } from "framer-motion"

function Icon({ n, s = 18, c }: { n: string; s?: number; c?: string }) {
  return <i className={`ti ti-${n}`} style={{ fontSize: s, color: c }} />
}

/* ─── TERMINAL WINDOW MOCKUP ─────────────────────────────── */
function TerminalMockup({ cmd, output }: { cmd: string; output: string[] }) {
  return (
    <div style={{
      background: "#121611", borderRadius: 16, overflow: "hidden",
      boxShadow: "0 20px 60px rgba(0,0,0,.18)",
      fontFamily: "'JetBrains Mono', 'DM Mono', monospace", fontSize: 13,
    }}>
      <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
        <div style={{ display: "flex", gap: 7 }}>
          {["#FF5F56","#FFBD2E","#27C93F"].map(c => <span key={c} style={{ width: 11, height: 11, borderRadius: "50%", background: c }} />)}
        </div>
        <span style={{ margin: "0 auto", fontSize: 11, color: "rgba(255,255,255,.35)", fontWeight: 500 }}>OgaPay Terminal</span>
      </div>
      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#fff" }}>
          <span style={{ color: "#27C93F" }}>$</span>
          <span>{cmd}</span>
          <span style={{ width: 7, height: 15, background: "rgba(255,255,255,.5)", animation: "blink 1s step-end infinite" }} />
        </div>
        {output.map((line, i) => (
          <div key={i} style={{ color: "rgba(255,255,255,.55)" }}>{line}</div>
        ))}
      </div>
    </div>
  )
}

/* ─── CONFIG CARD MOCKUP ─────────────────────────────────── */
function ConfigCardMockup() {
  return (
    <div style={{
      background: "#F8F8FA", borderRadius: 16, padding: 20,
      border: "1px solid #D0E2CC", fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#556351", marginBottom: 6 }}>
            <span>Daily withdrawal limit</span>
            <span style={{ fontWeight: 700, color: "#191C6B" }}>Up to ₦20,000</span>
          </div>
          <div style={{ height: 6, background: "#D0E2CC", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ width: "100%", height: "100%", background: "#191C6B", borderRadius: 99 }} />
          </div>
        </div>
        <div style={{ paddingTop: 10, borderTop: "1px solid #D0E2CC", display: "flex", justifyContent: "space-between", fontSize: 12 }}>
          <span style={{ color: "#556351" }}>Minimum withdrawal</span>
          <span style={{ fontWeight: 600, color: "#1C3316" }}>₦5,000</span>
        </div>
        <div style={{ paddingTop: 10, borderTop: "1px solid #D0E2CC", display: "flex", justifyContent: "space-between", fontSize: 12 }}>
          <span style={{ color: "#556351" }}>Auto-convert USDC → NGN</span>
          <span style={{ fontWeight: 600, color: "#191C6B", display: "flex", alignItems: "center", gap: 4 }}>
            <Icon n="circle-check-filled" s={14} c="#27C93F" /> Active
          </span>
        </div>
      </div>
    </div>
  )
}

/* ─── VERIFICATION MOCKUP ────────────────────────────────── */
function VerifyMockup() {
  return (
    <div style={{
      background: "#F8F8FA", borderRadius: 16, padding: 28,
      border: "1px solid #E4E0D5",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      textAlign: "center", minHeight: 140, gap: 12,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: "50%", background: "#fff",
        border: "1px solid #E4E0D5",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#16A34A",
      }}>
        <Icon n="shield-check" s={24} />
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#1C3316" }}>Verified via VeryAI biometrics</div>
    </div>
  )
}

/* ─── PAYMENT RAILS MOCKUP ───────────────────────────────── */
function PaymentMockup() {
  return (
    <div style={{
      background: "linear-gradient(135deg, #F3F3F5, #EBEBEE)", borderRadius: 16, height: 200,
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden",
      border: "1px solid rgba(25,28,107,.08)",
    }}>
      {/* Three rail tracks */}
      <div style={{ position: "absolute", inset: "0 0", display: "flex", flexDirection: "column", justifyContent: "center", gap: 24, pointerEvents: "none", opacity: 0.25 }}>
        {[0,1,2].map(i => <div key={i} style={{ width: "100%", height: 2.5, background: "#191C6B", borderRadius: 2 }} />)}
      </div>

      {/* Animated coins */}
      {[0, 1.6, 3.2].map(delay => (
        <div key={delay} style={{
          position: "absolute", left: 0,
          animation: `coinSlide 6s ${delay}s infinite linear`,
          pointerEvents: "none", zIndex: 10,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "linear-gradient(135deg, #F5B800, #D49A00)",
            border: "2px solid #fff",
            boxShadow: "0 2px 8px rgba(0,0,0,.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, color: "#fff", fontSize: 11,
          }}>
            ₦
          </div>
        </div>
      ))}

      {/* Central card */}
      <div style={{
        width: 140, height: 140, background: "#fff",
        border: "1px solid rgba(25,28,107,.06)", borderRadius: 16,
        boxShadow: "0 8px 30px rgba(0,0,0,.06)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        position: "relative", zIndex: 20, gap: 4,
      }}>
        <div style={{ position: "absolute", top: 8, display: "flex", gap: 5 }}>
          {[0,1,2].map(i => <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(25,28,107,.12)" }} />)}
        </div>
        <div style={{
          width: 48, height: 48, borderRadius: 10, background: "#191C6B",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 12px rgba(25,28,107,.2)",
        }}>
          <Icon n="wallet" s={20} c="#fff" />
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#1C3316" }}>Instant Payout</div>
        <div style={{ display: "flex", gap: 4 }}>
          {["NGN", "USDC", "SOL"].map(c => (
            <span key={c} style={{ padding: "1px 7px", border: "1px solid rgba(25,28,107,.1)", borderRadius: 99, fontSize: 9, fontWeight: 600, color: "#191C6B" }}>{c}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── FEATURE BLOCK ──────────────────────────────────────── */
interface FeatureBlockProps {
  title: string
  description: string
  mockup: React.ReactNode
  reverse?: boolean
  accent?: string
}

function FeatureBlock({ title, description, mockup, reverse, accent }: FeatureBlockProps) {
  return (
    <section style={{ padding: "0 0 24px", background: "transparent" }}>
      <div className="container">
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 0,
          alignItems: "center",
          background: "#fff",
          border: "1px solid #E4E0D5",
          borderRadius: 24,
          overflow: "hidden",
          boxShadow: "0 2px 12px rgba(0,0,0,.03)",
        }}>
          {/* Mockup side */}
          <motion.div
            style={{
              order: reverse ? 2 : 1,
              padding: 28,
            }}
            initial={{ opacity: 0, x: reverse ? 20 : -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          >
            {mockup}
          </motion.div>
          {/* Text side */}
          <motion.div
            style={{
              order: reverse ? 1 : 2,
              padding: "28px 36px 28px 28px",
            }}
            initial={{ opacity: 0, x: reverse ? -20 : 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <h3 style={{
              display: "flex", alignItems: "center", gap: 10,
              fontFamily: "'Outfit', sans-serif",
              fontSize: "clamp(18px, 1.6vw, 22px)",
              fontWeight: 800,
              color: "#191C6B",
              letterSpacing: "-.4px",
              lineHeight: 1.2,
              margin: "0 0 10px",
            }}>
              <span style={{
                width: 36, height: 36, borderRadius: 10,
                background: "rgba(25,28,107,.08)",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <Icon n={accent || "box"} s={16} c="#191C6B" />
              </span>
              {title}
            </h3>
            <p style={{
              fontSize: 14, lineHeight: 1.65, color: "#556351",
              margin: 0, maxWidth: 420,
            }}>
              {description}
            </p>
          </motion.div>
        </div>
      </div>
      <style>{`
        @media(max-width:768px){
          section > div > div > div { grid-template-columns: 1fr !important }
          [style*="order"] { order: unset !important }
          [style*="padding"] { padding: 20px !important }
        }
        [data-theme="dark"] section > div > div { background: #111 !important; border-color: rgba(255,255,255,.08) !important }
        [data-theme="dark"] h3 { color: var(--accent) !important }
        [data-theme="dark"] p { color: rgba(255,255,255,.6) !important }
        @keyframes blink { 0%,100% { opacity: 1 } 50% { opacity: 0 } }
        @keyframes coinSlide {
          0% { transform: translateX(-50px); opacity: 0; }
          8% { opacity: 1; }
          92% { opacity: 1; }
          100% { transform: translateX(700px); opacity: 0; }
        }
      `}</style>
    </section>
  )
}

/* ─── MAIN EXPORT ─────────────────────────────────────────── */
export default function FeatureGridSplit() {
  return (
    <>
      <FeatureBlock
        title="Complete Tasks, Get Paid Instantly"
        description="Browse real tasks posted by Nigerian employers — social media engagement, content writing, design, research, testing, and more. Complete a task, get approved, and watch the money hit your wallet immediately."
        accent="currency-naira"
        mockup={
          <TerminalMockup
            cmd="ogapay task complete --id 42"
            output={[
              "✓ Task 'Design social media banner' approved",
              "💰 ₦2,500 deposited to wallet",
              "📊 New balance: ₦18,750",
            ]}
          />
        }
      />
      <FeatureBlock
        title="Verified Identity for Every Worker"
        description="Complete KYC with your NIN or BVN to unlock withdrawals and premium tasks. Pass a quick VeryAI biometric scan to earn the Human Verified badge — trust that you're a real person, not a bot."
        accent="fingerprint"
        mockup={<VerifyMockup />}
        reverse
      />
      <FeatureBlock
        title="Payment Rails Designed for Earnings"
        description="Get paid in NGN, USDC, or SOL — your choice. Withdraw to any Nigerian bank account, or keep your earnings in crypto. Multi-currency support with real-time exchange rates and instant settlement."
        accent="wallet"
        mockup={<PaymentMockup />}
      />
      <FeatureBlock
        title="Control How You Manage Your Money"
        description="Set withdrawal limits based on your KYC tier. Track your balance, auto-convert USDC to NGN, and withdraw as little as ₦5,000. Full visibility into your earnings, every step of the way."
        accent="sliders"
        mockup={<ConfigCardMockup />}
        reverse
      />
    </>
  )
}
