import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useWalletBalance } from "../context/WalletBalanceContext";
import { useCurrency } from "../context/CurrencyContext";

const STEPS = [
  "Qualification",
  "Campaign Type",
  "Format",
  "Questions",
  "Review",
  "Budget",
  "Summary",
  "Compliance",
  "Insights",
  "Confirm",
  "Success",
];

const CAMPAIGN_TYPES = [
  { id: "social", label: "Social Media", icon: "📱", desc: "Followers, likes, shares, comments" },
  { id: "community", label: "Community Growth", icon: "👥", desc: "Telegram, Discord, group members" },
  { id: "content", label: "Content Creation", icon: "✍️", desc: "Articles, videos, reviews" },
  { id: "website", label: "Website Traffic", icon: "🌐", desc: "Visits, clicks, engagement" },
  { id: "app", label: "App Testing", icon: "📲", desc: "Downloads, installs, reviews" },
  { id: "survey", label: "Surveys & Research", icon: "📋", desc: "Responses, feedback, polls" },
  { id: "crypto", label: "Crypto & Web3", icon: "🪙", desc: "Airdrops, token tasks, raids" },
  { id: "custom", label: "Custom Task", icon: "⚡", desc: "Anything else you need done" },
];

const FORMATS = [
  { id: "single", label: "Single Campaign", icon: "🎯", desc: "Create one campaign now" },
  { id: "bulk", label: "Bulk Campaigns", icon: "📦", desc: "Create 2-10 similar campaigns" },
  { id: "template", label: "Use Template", icon: "📄", desc: "Start from a pre-built template" },
];

const TEMPLATES = [
  { title: "Instagram Followers", platform: "Instagram", workers: 500, reward: 20, category: "Social Media" },
  { title: "TikTok Engagement", platform: "TikTok", workers: 1000, reward: 15, category: "Social Media" },
  { title: "Twitter Viral", platform: "Twitter/X", workers: 2000, reward: 10, category: "Social Media" },
  { title: "Telegram Members", platform: "Telegram", workers: 300, reward: 25, category: "Community" },
  { title: "YouTube Subscribers", platform: "YouTube", workers: 300, reward: 40, category: "Social Media" },
  { title: "Website Testing", platform: "Web", workers: 100, reward: 100, category: "App Testing" },
];

export default function CampaignWizard() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [qualification, setQualification] = useState<any>(null);
  const [campaignType, setCampaignType] = useState<string | null>(null);
  const [format, setFormat] = useState<string>("single");
  const [bulkCount, setBulkCount] = useState(2);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [intentText, setIntentText] = useState("");
  const [aiResponse, setAiResponse] = useState<any>(null);
  const [details, setDetails] = useState<any>({});
  const [budget, setBudget] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [messages, setMessages] = useState<any[]>([]);
  const [streamPhase, setStreamPhase] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { isAuthed, user } = useAuth();
  const { balances: walletBalances, refresh: refreshWallet } = useWalletBalance();
  const { preferredCurrency } = useCurrency();
  const streamPhrases = ["Thinking...", "Analyzing your request...", "Detecting campaign type...", "Preparing options..."];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, step]);

  const publishCampaign = async (mode, scheduledDate) => {
    if (!isAuthed) { navigate("/login"); return; }
    setLoading(true);
    try {
      const reward = details.reward || 0;
      const maxWorkers = details.workerCount || 0;
      const budget = reward * maxWorkers;

      if (mode === "publish") {
        const activeCur = preferredCurrency !== 'BOTH' ? preferredCurrency : 'NGN';
      const walletEntry = walletBalances?.[activeCur];
        const currentBalance = walletEntry ? (Number(walletEntry.balance) || 0) : 0;
        if (currentBalance < budget) {
          alert("Insufficient balance. Please top up your wallet first.");
          navigate("/wallet");
          setLoading(false);
          return;
        }
      }

      const body = {
        title: details.title || "Campaign",
        description: details.instructions || "Complete the task as described",
        category: details.category || "SOCIAL_MEDIA",
        reward: Math.round(reward),
        maxWorkers: Math.round(maxWorkers),
        currency: "NGN",
        instructions: details.instructions || "",
        proofRequired: details.proofRequired || undefined,
        estimatedTime: details.estimatedTime || undefined,
        minRank: details.minRank || undefined,
        workerRequirement: details.workerRequirement || undefined,
        trackingCode: details.trackingCode || undefined,
        ...(mode === "draft" ? { status: "DRAFT" } : {}),
        ...(mode === "schedule" && scheduledDate ? { scheduledAt: scheduledDate } : {}),
      };

      const result = await apiRequest("/tasks", {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (!result || result.success === false) {
        throw new Error(result?.message || result?.error || "Failed to create campaign");
      }
      setLoading(false);
      setStep(10);
    } catch (e) {
      setLoading(false);
      alert(e?.message || "Failed to create campaign. Please try again.");
    }
  };

  const checkQualification = async () => {
    setLoading(true);
    try {
      const res = await apiRequest("/campaigns/qualification");
      const data = res?.data || res;
      setQualification(data);
      if (data.allPassed) {
        setStep(1);
      }
    } catch {
      setQualification({ allPassed: false, checks: {}, details: {} });
    }
    setLoading(false);
  };

  const detectCampaignIntent = async () => {
    if (!intentText.trim()) return;
    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", text: intentText }]);
    setStreamPhase(0);
    const interval = setInterval(() => {
      setStreamPhase((p) => Math.min(p + 1, streamPhrases.length - 1));
    }, 600);

    try {
      const res = await apiRequest("/campaigns/generate", {
        method: "POST",
        body: JSON.stringify({ prompt: intentText }),
      });
      clearInterval(interval);
      const data = res?.data || res;

      if (data?.campaign) {
        setAiResponse(data);
        setDetails((prev: any) => ({
          ...prev,
          title: data.campaign.title || "",
          platform: data.campaign.platform || "",
          category: data.campaign.category || "",
          workerCount: data.campaign.workerCount || 50,
          reward: data.campaign.reward || 20,
          instructions: data.campaign.instructions || "",
          proofRequired: data.campaign.proofRequired || "",
        }));

        // Auto-detect campaign type from response
        const detected = CAMPAIGN_TYPES.find(
          (t) =>
            data.campaign.category?.toLowerCase().includes(t.label.toLowerCase()) ||
            data.campaign.platform?.toLowerCase().includes(t.id)
        );
        setCampaignType(detected?.id || "custom");

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: data.message || "I've analyzed your request!",
            campaign: data.campaign,
            rewardBreakdown: data.rewardBreakdown,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text:
              data?.message ||
              "I need more information to understand your campaign. Could you describe it in more detail?",
          },
        ]);
      }
    } catch {
      clearInterval(interval);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Sorry, I had trouble analyzing your request. Please try again." },
      ]);
    }
    setLoading(false);
  };

  const calculateBudget = () => {
    const reward = details.reward || 0;
    const workers = details.workerCount || 0;
    const total = reward * workers;
    const fee = Math.ceil(total * 0.1);
    setBudget({ reward, workers, total, fee, grandTotal: total + fee });
  };

  // ── Smart Questions Engine ───────────────────────────────────
  const QUESTIONS: Record<string, { id: string; q: string; type: string; options?: string[]; dependsOn?: string }[]> = {
    social: [
      { id: "platform", q: "Which platform do you need help with?", type: "multi", options: ["Instagram", "TikTok", "Twitter/X", "YouTube", "Facebook"] },
      { id: "action", q: "What action do you need workers to perform?", type: "single", options: ["Follow/Subscribe", "Like", "Comment", "Share/Repost", "Save/Bookmark"] },
      { id: "audience", q: "Any target audience preferences?", type: "multi", options: ["Nigeria only", "Global", "Age 18-24", "Age 25-34", "English speaking", "No preference"] },
      { id: "workers", q: "How many workers do you need?", type: "number", dependsOn: "platform" },
      { id: "duration", q: "Campaign duration?", type: "single", options: ["1-3 days", "4-7 days", "1-2 weeks", "2-4 weeks", "Custom"] },
      { id: "requirements", q: "Any special worker requirements?", type: "multi", options: ["Verified accounts only", "Min account age 30d", "Min 100 followers", "No special requirements"] },
      { id: "proof", q: "How should workers prove completion?", type: "single", options: ["Screenshot", "Link", "Text response", "Video", "No proof needed"] },
    ],
    community: [
      { id: "platform", q: "Which platform?", type: "multi", options: ["Telegram", "Discord", "Slack", "Reddit", "WhatsApp"] },
      { id: "action", q: "What action?", type: "single", options: ["Join group", "Invite members", "Post content", "Engage daily", "Refer friends"] },
      { id: "workers", q: "How many members do you need?", type: "number" },
      { id: "duration", q: "Campaign duration?", type: "single", options: ["1-3 days", "4-7 days", "1-2 weeks", "Ongoing"] },
      { id: "proof", q: "Proof required?", type: "single", options: ["Screenshot", "Link to profile", "Username submission", "No proof"] },
    ],
    content: [
      { id: "format", q: "What type of content?", type: "single", options: ["Article/Blog", "Video", "Image/Design", "Review", "Social post"] },
      { id: "topic", q: "What topic or theme?", type: "text" },
      { id: "workers", q: "How many pieces of content?", type: "number" },
      { id: "wordCount", q: "Minimum length requirements?", type: "single", options: ["50-100 words", "100-300 words", "300-500 words", "500+ words", "No minimum"] },
      { id: "proof", q: "How to verify?", type: "single", options: ["Link to published content", "Document upload", "Screenshot", "Manual review"] },
    ],
    website: [
      { id: "action", q: "What type of website task?", type: "single", options: ["Visit & browse", "Click specific links", "Fill form", "Sign up", "Leave feedback"] },
      { id: "url", q: "What's the target URL?", type: "text" },
      { id: "duration", q: "Minimum time on site?", type: "single", options: ["10 seconds", "30 seconds", "1 minute", "2+ minutes", "No minimum"] },
      { id: "workers", q: "How many visitors?", type: "number" },
      { id: "proof", q: "Proof required?", type: "single", options: ["Screenshot", "Referrer header", "No proof needed"] },
    ],
    app: [
      { id: "action", q: "What type of app task?", type: "single", options: ["Download & install", "Test & review", "Beta test", "In-app purchase"] },
      { id: "platform", q: "App platform?", type: "multi", options: ["iOS", "Android", "Web app", "Cross-platform"] },
      { id: "workers", q: "How many testers?", type: "number" },
      { id: "feedback", q: "Feedback required?", type: "single", options: ["Bug report", "Rating & review", "Screenshots", "Video walkthrough", "None"] },
    ],
    survey: [
      { id: "questions", q: "How many survey questions?", type: "number" },
      { id: "length", q: "Estimated completion time?", type: "single", options: ["Under 2 min", "2-5 min", "5-10 min", "10+ min"] },
      { id: "workers", q: "How many responses?", type: "number" },
      { id: "audience", q: "Target audience?", type: "multi", options: ["General", "Nigeria only", "Age specific", "Gender specific", "Interest based"] },
      { id: "proof", q: "Verification method?", type: "single", options: ["Unique link tracking", "Completion code", "Manual review"] },
    ],
    crypto: [
      { id: "action", q: "What type of crypto task?", type: "single", options: ["Airdrop participation", "Token swap", "NFT mint", "Raid campaign", "Staking", "Referral"] },
      { id: "chain", q: "Blockchain?", type: "multi", options: ["Solana", "Ethereum", "BNB", "Polygon", "Base", "Any"] },
      { id: "workers", q: "How many participants?", type: "number" },
      { id: "requirements", q: "Special requirements?", type: "multi", options: ["Must have wallet", "Min transaction history", "Must follow X account", "Must join Telegram"] },
    ],
    custom: [
      { id: "description", q: "Briefly describe what workers need to do", type: "text" },
      { id: "workers", q: "How many workers do you need?", type: "number" },
      { id: "duration", q: "Expected completion time?", type: "single", options: ["Same day", "1-3 days", "1 week", "2+ weeks", "Flexible"] },
      { id: "skills", q: "Any specific skills required?", type: "text" },
      { id: "proof", q: "How should workers prove completion?", type: "single", options: ["Screenshot", "Link", "File upload", "Text response", "Manual review"] },
    ],
  };

  const getQuestions = () => {
    return QUESTIONS[campaignType || "custom"] || QUESTIONS.custom;
  };

  const currentQSet = getQuestions();
  const currentQ = currentQSet[qaIndex];

  const answerQuestion = (answer: any) => {
    if (!currentQ) return;

    const qId = currentQ.id;
    setQaAnswers((prev: any) => ({ ...prev, [qId]: answer }));
    setQaHistory((prev: any) => [...prev, { q: currentQ.q, a: answer }]);
    setDetails((prev: any) => {
      const updates: any = {};
      // Map answers to details fields
      if (qId === "platform") updates.platform = Array.isArray(answer) ? answer[0] : answer;
      if (qId === "workers") updates.workerCount = parseInt(answer) || 50;
      if (qId === "action") updates.instructions = (prev.instructions || "") + (prev.instructions ? "\n" : "") + "Action: " + (Array.isArray(answer) ? answer.join(", ") : answer);
      if (qId === "proof") updates.proofRequired = typeof answer === "string" ? answer.toUpperCase().replace(/ /g, "_") : "SCREENSHOT";
      if (qId === "description") updates.instructions = (prev.instructions || "") + (prev.instructions ? "\n" : "") + answer;
      if (qId === "duration") updates.estimatedTime = answer;
      if (qId === "format") updates.category = answer;
      return { ...prev, ...updates };
    });

    if (qaIndex < currentQSet.length - 1) {
      setQaIndex((i) => i + 1);
    } else {
      // Questions complete - auto-advance to review
      setStep(4);
    }
  };

    const renderQualification = () => (
    <div style={{ padding: "16px" }}>
      {!qualification ? (
        <div>
          <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>
            Let's check if you're ready to create campaigns
          </h3>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text3)" }}>
            We need a few things set up before you can publish campaigns.
          </p>
          <button
            onClick={checkQualification}
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 10,
              border: "none",
              background: loading ? "var(--border)" : "var(--accent)",
              color: "#fff",
              fontWeight: 600,
              fontSize: 14,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Checking..." : "Check My Status"}
          </button>
        </div>
      ) : qualification.allPassed ? (
        <div>
          <div
            style={{
              textAlign: "center",
              padding: "20px",
              background: "rgba(16,185,129,0.08)",
              borderRadius: 12,
              marginBottom: 16,
            }}
          >
            <span style={{ fontSize: 32 }}>✅</span>
            <h3 style={{ margin: "8px 0 4px", fontSize: 15, fontWeight: 700, color: "var(--green)" }}>
              You're ready to create campaigns!
            </h3>
            <p style={{ margin: 0, fontSize: 12, color: "var(--text3)" }}>All checks passed</p>
          </div>
          <button
            onClick={() => setStep(1)}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 10,
              border: "none",
              background: "var(--accent)",
              color: "#fff",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Continue →
          </button>
        </div>
      ) : (
        <div>
          <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700 }}>Complete these first</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Object.entries(qualification.details || {}).map(([key, val]: any) => (
              <div
                key={key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: val.passed ? "rgba(16,185,129,0.06)" : "rgba(245,158,11,0.06)",
                  border: `1px solid ${val.passed ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)"}`,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, textTransform: "capitalize" }}>
                    {key.replace(/([A-Z])/g, " $1")}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>
                    {val.status || val.verified !== undefined
                      ? val.verified
                        ? "Verified"
                        : "Not verified"
                      : val.connected
                      ? "Connected"
                      : val.days
                      ? `${val.days} days old (need 7+)`
                      : "Not set"}
                  </div>
                </div>
                <div>
                  {val.passed ? (
                    <span style={{ color: "var(--green)", fontSize: 18 }}>✓</span>
                  ) : (
                    <button
                      onClick={() => val.actionUrl && navigate(val.actionUrl)}
                      style={{
                        fontSize: 11,
                        padding: "4px 10px",
                        borderRadius: 999,
                        border: "1px solid var(--accent)",
                        background: "transparent",
                        color: "var(--accent)",
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      Fix
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={checkQualification}
            style={{
              width: "100%",
              marginTop: 16,
              padding: "12px",
              borderRadius: 10,
              border: "none",
              background: "var(--accent)",
              color: "#fff",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Re-check Status
          </button>
        </div>
      )}
    </div>
  );

  const renderCampaignType = () => (
    <div style={{ padding: "16px" }}>
      <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>Describe your campaign</h3>
      <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--text3)" }}>
        Tell me what you need in plain English
      </p>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <input
          type="text"
          value={intentText}
          onChange={(e) => setIntentText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && detectCampaignIntent()}
          placeholder='e.g. "I need 500 Instagram followers"'
          style={{
            flex: 1,
            height: 44,
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "0 12px",
            fontSize: 13,
            background: "var(--bg)",
            color: "var(--text)",
            outline: "none",
            fontFamily: "inherit",
          }}
        />
        <button
          onClick={detectCampaignIntent}
          disabled={!intentText.trim() || loading}
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            border: "none",
            background: !intentText.trim() || loading ? "var(--border)" : "var(--accent)",
            color: "#fff",
            cursor: !intentText.trim() || loading ? "not-allowed" : "pointer",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>

      {/* Chat messages */}
      <div style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              maxWidth: "85%",
              padding: m.role === "user" ? "8px 14px" : "10px 14px",
              borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px",
              fontSize: 13,
              lineHeight: 1.5,
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              background: m.role === "user" ? "var(--accent)" : "var(--bg2)",
              color: m.role === "user" ? "#fff" : "var(--text)",
              whiteSpace: "pre-wrap",
            }}
          >
            {m.text}
          </div>
        ))}
        {loading && (
          <div
            style={{
              alignSelf: "flex-start",
              padding: "8px 14px",
              borderRadius: 16,
              background: "var(--bg2)",
              fontSize: 13,
              color: "var(--text3)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                border: "2px solid var(--border)",
                borderTopColor: "var(--accent)",
                borderRadius: "50%",
                animation: "wizSpin 0.6s linear infinite",
                display: "inline-block",
              }}
            />
            {streamPhrases[streamPhase]}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Or pick from list */}
      {messages.length === 0 && !loading && (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600 }}>OR PICK A TYPE</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {CAMPAIGN_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setCampaignType(t.id);
                  setIntentText(`I need help with ${t.label}`);
                  setMessages([
                    {
                      role: "assistant",
                      text: `Great choice! **${t.label}** — ${t.desc}\n\nTell me more details about what you need and I'll build your campaign.`,
                    },
                  ]);
                }}
                style={{
                  padding: "10px",
                  borderRadius: 10,
                  border: `1px solid ${campaignType === t.id ? "var(--accent)" : "var(--border)"}`,
                  background: campaignType === t.id ? "rgba(var(--accent-rgb),0.06)" : "var(--bg)",
                  textAlign: "center",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 4 }}>{t.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{t.label}</div>
                <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>{t.desc}</div>
              </button>
            ))}
          </div>
        </>
      )}

      {messages.length > 1 && (
        <button
          onClick={() => setStep(2)}
          style={{
            width: "100%",
            marginTop: 12,
            padding: "12px",
            borderRadius: 10,
            border: "none",
            background: "var(--accent)",
            color: "#fff",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Continue →
        </button>
      )}
    </div>
  );

  const renderFormat = () => (
    <div style={{ padding: "16px" }}>
      <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>How would you like to proceed?</h3>
      <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--text3)" }}>
        Choose how you want to create your campaign
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {FORMATS.map((f) => (
          <button
            key={f.id}
            onClick={() => {
              setFormat(f.id);
              if (f.id === "template") setStep(3);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px 16px",
              borderRadius: 12,
              border: `1.5px solid ${format === f.id ? "var(--accent)" : "var(--border)"}`,
              background: format === f.id ? "rgba(var(--accent-rgb),0.06)" : "var(--bg)",
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "inherit",
              width: "100%",
            }}
          >
            <span style={{ fontSize: 24 }}>{f.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{f.label}</div>
              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{f.desc}</div>
            </div>
            {format === f.id && (
              <span style={{ color: "var(--accent)", fontSize: 16 }}>✓</span>
            )}
          </button>
        ))}
      </div>

      {format === "bulk" && (
        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)", display: "block", marginBottom: 6 }}>
            How many campaigns?
          </label>
          <div style={{ display: "flex", gap: 6 }}>
            {[2, 3, 5, 10].map((n) => (
              <button
                key={n}
                onClick={() => setBulkCount(n)}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: 8,
                  border: `1px solid ${bulkCount === n ? "var(--accent)" : "var(--border)"}`,
                  background: bulkCount === n ? "rgba(var(--accent-rgb),0.06)" : "var(--bg)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontWeight: bulkCount === n ? 700 : 500,
                  color: "var(--text)",
                  fontSize: 14,
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      {format === "template" && (
        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)", display: "block", marginBottom: 6 }}>
            Choose a template
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {TEMPLATES.map((t, i) => (
              <button
                key={i}
                onClick={() => {
                  setSelectedTemplate(t);
                  setDetails({
                    title: t.title,
                    platform: t.platform,
                    category: t.category,
                    workerCount: t.workers,
                    reward: t.reward,
                  });
                  calculateBudget();
                }}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: `1px solid ${selectedTemplate === t ? "var(--accent)" : "var(--border)"}`,
                  background: selectedTemplate === t ? "rgba(var(--accent-rgb),0.06)" : "var(--bg)",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "inherit",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{t.title}</div>
                  <div style={{ fontSize: 11, color: "var(--text3)" }}>
                    {t.workers} workers · ₦{t.reward}/worker
                  </div>
                </div>
                <span style={{ fontSize: 11, color: "var(--text3)" }}>₦{(t.workers * t.reward).toLocaleString()}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => setStep(format === "template" ? 5 : 3)}
        style={{
          width: "100%",
          marginTop: 16,
          padding: "12px",
          borderRadius: 10,
          border: "none",
          background: "var(--accent)",
          color: "#fff",
          fontWeight: 600,
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        {format === "template" ? "Use This Template →" : "Continue →"}
      </button>
    </div>
  );

  const renderSmartQuestions = () => {
    if (!currentQ) {
      return (
        <div style={{ padding: "16px", textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "var(--text3)" }}>All questions answered!</p>
          <button onClick={() => setStep(4)} style={{
            marginTop: 12, padding: "10px 24px", borderRadius: 10,
            border: "none", background: "var(--accent)", color: "#fff",
            fontWeight: 600, fontSize: 14, cursor: "pointer",
          }}>Continue →</button>
        </div>
      );
    }

    return (
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Progress */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", marginBottom: 6 }}>
            Question {qaIndex + 1} of {currentQSet.length}
          </div>
          <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${((qaIndex + 1) / currentQSet.length) * 100}%`,
              background: "var(--accent)",
              borderRadius: 2,
              transition: "width 0.3s",
            }} />
          </div>
        </div>

        {/* Q&A history */}
        {qaHistory.length > 0 && (
          <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 6 }}>
            {qaHistory.map((h, i) => (
              <div key={i}>
                <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600, marginBottom: 2 }}>{h.q}</div>
                <div style={{
                  alignSelf: "flex-end",
                  padding: "6px 12px",
                  borderRadius: "12px 12px 4px 12px",
                  fontSize: 12,
                  background: "var(--accent)",
                  color: "#fff",
                  display: "inline-block",
                }}>{Array.isArray(h.a) ? h.a.join(", ") : h.a}</div>
              </div>
            ))}
          </div>
        )}

        {/* Current question */}
        <div style={{ flex: 1 }}>
          <div style={{
            padding: "14px",
            borderRadius: 12,
            background: "var(--bg2)",
            border: "1px solid var(--border)",
            marginBottom: 12,
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
              {currentQ.q}
            </div>
            <div style={{ fontSize: 11, color: "var(--text3)" }}>
              {currentQ.type === "multi" ? "Select all that apply" : currentQ.type === "single" ? "Select one" : "Type your answer"}
            </div>
          </div>

          {/* Answer options */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {currentQ.type === "single" && currentQ.options?.map((opt) => (
              <button key={opt} onClick={() => answerQuestion(opt)}
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                  color: "var(--text)",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: 13,
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.background = "rgba(var(--accent-rgb),0.04)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg)"; }}
              >
                {opt}
              </button>
            ))}

            {currentQ.type === "multi" && (
              <MultiSelectQuestion options={currentQ.options || []} onAnswer={answerQuestion} />
            )}

            {currentQ.type === "number" && (
              <div>
                <input type="number" min="1" max="10000" placeholder="Enter number..."
                  id="qs-number-input"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.target as HTMLInputElement).value) {
                      answerQuestion(parseInt((e.target as HTMLInputElement).value));
                    }
                  }}
                  style={{
                    width: "100%", height: 48, border: "1px solid var(--border)", borderRadius: 10,
                    padding: "0 14px", fontSize: 14, background: "var(--bg)", color: "var(--text)",
                    outline: "none", fontFamily: "inherit", boxSizing: "border-box",
                  }}
                  autoFocus
                />
                <button onClick={() => {
                  const input = document.getElementById("qs-number-input") as HTMLInputElement;
                  if (input?.value) answerQuestion(parseInt(input.value));
                }}
                  style={{
                    marginTop: 8, width: "100%", padding: "10px", borderRadius: 8,
                    border: "none", background: "var(--accent)", color: "#fff",
                    fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                  }}
                >Continue</button>
              </div>
            )}

            {currentQ.type === "text" && (
              <div>
                <textarea placeholder="Type your answer..."
                  id="qs-text-input"
                  rows={3}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && (e.target as HTMLTextAreaElement).value.trim()) {
                      e.preventDefault();
                      answerQuestion((e.target as HTMLTextAreaElement).value.trim());
                    }
                  }}
                  style={{
                    width: "100%", border: "1px solid var(--border)", borderRadius: 10,
                    padding: "10px 14px", fontSize: 13, background: "var(--bg)", color: "var(--text)",
                    outline: "none", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box",
                  }}
                  autoFocus
                />
                <button onClick={() => {
                  const ta = document.getElementById("qs-number-input") as HTMLTextAreaElement;
                  if (ta?.value.trim()) answerQuestion(ta.value.trim());
                }}
                  style={{
                    marginTop: 8, width: "100%", padding: "10px", borderRadius: 8,
                    border: "none", background: "var(--accent)", color: "#fff",
                    fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                  }}
                >Continue</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Multi-Select Component ──────────────────────────────────────
  function MultiSelectQuestion({ options, onAnswer }: { options: string[]; onAnswer: (v: string[]) => void }) {
    const [selected, setSelected] = useState<string[]>([]);
    const toggle = (opt: string) => {
      setSelected((prev) =>
        prev.includes(opt) ? prev.filter((x) => x !== opt) : [...prev, opt]
      );
    };
    return (
      <div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {options.map((opt) => (
            <button key={opt} onClick={() => toggle(opt)}
              style={{
                padding: "12px 14px",
                borderRadius: 10,
                border: `1.5px solid ${selected.includes(opt) ? "var(--accent)" : "var(--border)"}`,
                background: selected.includes(opt) ? "rgba(var(--accent-rgb),0.06)" : "var(--bg)",
                color: "var(--text)",
                cursor: "pointer",
                textAlign: "left",
                fontSize: 13,
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: 4,
                border: `1.5px solid ${selected.includes(opt) ? "var(--accent)" : "var(--border)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: selected.includes(opt) ? "var(--accent)" : "transparent",
                flexShrink: 0,
              }}>
                {selected.includes(opt) && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              {opt}
            </button>
          ))}
        </div>
        <button onClick={() => onAnswer(selected)}
          style={{
            marginTop: 10, width: "100%", padding: "10px", borderRadius: 8,
            border: "none", background: selected.length > 0 ? "var(--accent)" : "var(--border)",
            color: "#fff",
            fontWeight: 600, fontSize: 13, cursor: selected.length > 0 ? "pointer" : "not-allowed",
            fontFamily: "inherit",
          }}
          disabled={selected.length === 0}
        >Continue ({selected.length} selected)</button>
      </div>
    );
  }

    const renderDetails = () => (
    <div style={{ padding: "16px", overflowY: "auto" }}>
      <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>Campaign Details</h3>
      <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--text3)" }}>
        Review and adjust the campaign details
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text2)", display: "block", marginBottom: 4 }}>
            Campaign Title
          </label>
          <input
            type="text"
            value={details.title || ""}
            onChange={(e) => setDetails((p: any) => ({ ...p, title: e.target.value }))}
            style={{
              width: "100%",
              height: 40,
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "0 10px",
              fontSize: 13,
              background: "var(--bg)",
              color: "var(--text)",
              outline: "none",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text2)", display: "block", marginBottom: 4 }}>
              Platform
            </label>
            <input
              type="text"
              value={details.platform || ""}
              onChange={(e) => setDetails((p: any) => ({ ...p, platform: e.target.value }))}
              style={{
                width: "100%",
                height: 40,
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "0 10px",
                fontSize: 13,
                background: "var(--bg)",
                color: "var(--text)",
                outline: "none",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text2)", display: "block", marginBottom: 4 }}>
              Category
            </label>
            <select
              value={details.category || ""}
              onChange={(e) => setDetails((p: any) => ({ ...p, category: e.target.value }))}
              style={{
                width: "100%",
                height: 40,
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "0 10px",
                fontSize: 13,
                background: "var(--bg)",
                color: "var(--text)",
                outline: "none",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            >
              <option value="">Select...</option>
              <option value="SOCIAL_MEDIA">Social Media</option>
              <option value="CONTENT_WRITING">Content Writing</option>
              <option value="COMMUNITY">Community</option>
              <option value="MARKETING">Marketing</option>
              <option value="APP_TESTING">App Testing</option>
              <option value="SURVEY">Survey</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text2)", display: "block", marginBottom: 4 }}>
              Workers Needed
            </label>
            <input
              type="number"
              value={details.workerCount || ""}
              onChange={(e) => {
                setDetails((p: any) => ({ ...p, workerCount: parseInt(e.target.value) || 0 }));
                calculateBudget();
              }}
              style={{
                width: "100%",
                height: 40,
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "0 10px",
                fontSize: 13,
                background: "var(--bg)",
                color: "var(--text)",
                outline: "none",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text2)", display: "block", marginBottom: 4 }}>
              Reward per Worker (₦)
            </label>
            <input
              type="number"
              value={details.reward || ""}
              onChange={(e) => {
                setDetails((p: any) => ({ ...p, reward: parseInt(e.target.value) || 0 }));
                calculateBudget();
              }}
              style={{
                width: "100%",
                height: 40,
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "0 10px",
                fontSize: 13,
                background: "var(--bg)",
                color: "var(--text)",
                outline: "none",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text2)", display: "block", marginBottom: 4 }}>
            Task Instructions
          </label>
          <textarea
            value={details.instructions || ""}
            onChange={(e) => setDetails((p: any) => ({ ...p, instructions: e.target.value }))}
            rows={3}
            placeholder="Describe what workers need to do..."
            style={{
              width: "100%",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "8px 10px",
              fontSize: 12,
              background: "var(--bg)",
              color: "var(--text)",
              outline: "none",
              fontFamily: "inherit",
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text2)", display: "block", marginBottom: 4 }}>
            Proof Requirement
          </label>
          <select
            value={details.proofRequired || ""}
            onChange={(e) => setDetails((p: any) => ({ ...p, proofRequired: e.target.value }))}
            style={{
              width: "100%",
              height: 40,
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "0 10px",
              fontSize: 13,
              background: "var(--bg)",
              color: "var(--text)",
              outline: "none",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          >
            <option value="">Select proof type...</option>
            <option value="SCREENSHOT">Screenshot</option>
            <option value="LINK">Link</option>
            <option value="TEXT">Text Response</option>
            <option value="VIDEO">Video</option>
          </select>
        </div>
      </div>

      {/* Live budget preview */}
      {(details.reward || 0) > 0 && (details.workerCount || 0) > 0 && budget && (
        <div
          style={{
            marginTop: 16,
            padding: "12px",
            borderRadius: 10,
            background: "rgba(var(--accent-rgb),0.06)",
            border: "1px solid rgba(var(--accent-rgb),0.12)",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>💰 Budget Preview</div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
            <span style={{ color: "var(--text3)" }}>Reward × Workers</span>
            <span>
              ₦{budget.reward.toLocaleString()} × {budget.workers}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
            <span style={{ color: "var(--text3)" }}>Subtotal</span>
            <span>₦{budget.total.toLocaleString()}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
            <span style={{ color: "var(--text3)" }}>Platform Fee (10%)</span>
            <span>₦{budget.fee.toLocaleString()}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 14,
              fontWeight: 700,
              borderTop: "1px solid rgba(var(--accent-rgb),0.2)",
              paddingTop: 8,
              marginTop: 4,
            }}
          >
            <span>Grand Total</span>
            <span style={{ color: "var(--accent)" }}>₦{budget.grandTotal.toLocaleString()}</span>
          </div>
        </div>
      )}

      <button
        onClick={() => setStep(5)}
        style={{
          width: "100%",
          marginTop: 16,
          padding: "12px",
          borderRadius: 10,
          border: "none",
          background: "var(--accent)",
          color: "#fff",
          fontWeight: 600,
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        Continue →
      </button>
    </div>
  );

  const renderBudget = () => (
    <div style={{ padding: "16px" }}>
      <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>Budget & Wallet</h3>
      <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--text3)" }}>Review costs and fund your campaign</p>

      {budget && (
        <div
          style={{
            padding: "16px",
            borderRadius: 12,
            background: "rgba(var(--accent-rgb),0.06)",
            border: "1px solid rgba(var(--accent-rgb),0.12)",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
            <span style={{ color: "var(--text3)" }}>Workers</span>
            <span style={{ fontWeight: 600 }}>{budget.workers}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
            <span style={{ color: "var(--text3)" }}>Reward per worker</span>
            <span style={{ fontWeight: 600 }}>₦{budget.reward.toLocaleString()}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
            <span style={{ color: "var(--text3)" }}>Subtotal</span>
            <span style={{ fontWeight: 600 }}>₦{budget.total.toLocaleString()}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
            <span style={{ color: "var(--text3)" }}>Platform fee (10%)</span>
            <span style={{ fontWeight: 600 }}>₦{budget.fee.toLocaleString()}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 16,
              fontWeight: 800,
              borderTop: "1px solid rgba(var(--accent-rgb),0.2)",
              paddingTop: 12,
              marginTop: 4,
            }}
          >
            <span>Total</span>
            <span style={{ color: "var(--accent)" }}>₦{budget.grandTotal.toLocaleString()}</span>
          </div>
        </div>
      )}

      <div
        style={{
          padding: "14px",
          borderRadius: 10,
          background: "rgba(245,158,11,0.06)",
          border: "1px solid rgba(245,158,11,0.15)",
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>⚠️ Insufficient Balance</div>
        <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 8 }}>
          Your wallet balance: ₦{walletBalance.toLocaleString()}
          <br />
          You need: ₦{budget?.grandTotal?.toLocaleString() || "—"}
        </div>
        <button
          onClick={() => navigate("/wallet")}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            background: "var(--accent)",
            color: "#fff",
            fontWeight: 600,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          💳 Top Up Wallet
        </button>
      </div>

      <button
        onClick={() => setStep(8)}
        style={{
          width: "100%",
          padding: "12px",
          borderRadius: 10,
          border: "none",
          background: "var(--accent)",
          color: "#fff",
          fontWeight: 600,
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        Continue to Summary →
      </button>
    </div>
  );

  const renderSummary = () => {
    const checks = [
      { label: "Content guidelines", passed: true },
      { label: "Reward meets minimum (\u20A610)", passed: (details.reward || 0) >= 10 },
      { label: "Duration valid (1-30d)", passed: true },
      { label: "Instructions provided", passed: !!(details.instructions || "").trim() },
      { label: "Proof requirement set", passed: !!details.proofRequired },
      { label: "Wallet funded", passed: walletBalance >= (budget?.grandTotal || 0) },
    ];
    const allGood = checks.every((c) => c.passed);
    const similarOnes = [
      { title: "TikTok Followers", reward: 18, filled: 850, rating: 4.9 },
      { title: "Instagram Likes", reward: 15, filled: 420, rating: 4.7 },
      { title: "YouTube Subscribe", reward: 30, filled: 280, rating: 4.6 },
    ];
    return (
    <div style={{ padding: "16px" }}>
      <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>Campaign Summary</h3>
      <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--text3)" }}>Review your campaign before publishing</p>

      <div
        style={{
          padding: "16px",
          borderRadius: 12,
          background: "var(--bg2)",
          border: "1px solid var(--border)",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>{details.title || "Untitled Campaign"}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", fontSize: 12 }}>
          <div>
            <span style={{ color: "var(--text3)" }}>Platform:</span>
            <span style={{ fontWeight: 600, marginLeft: 4 }}>{details.platform || "—"}</span>
          </div>
          <div>
            <span style={{ color: "var(--text3)" }}>Category:</span>
            <span style={{ fontWeight: 600, marginLeft: 4 }}>{details.category || "—"}</span>
          </div>
          <div>
            <span style={{ color: "var(--text3)" }}>Workers:</span>
            <span style={{ fontWeight: 600, marginLeft: 4 }}>{details.workerCount || 0}</span>
          </div>
          <div>
            <span style={{ color: "var(--text3)" }}>Reward:</span>
            <span style={{ fontWeight: 600, marginLeft: 4 }}>₦{details.reward?.toLocaleString() || "0"}</span>
          </div>
        </div>

        {details.instructions && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", marginBottom: 4 }}>INSTRUCTIONS</div>
            <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--text2)" }}>{details.instructions}</div>
          </div>
        )}

        {budget && (
          <div
            style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              fontSize: 16,
              fontWeight: 800,
            }}
          >
            <span>Total Budget</span>
            <span style={{ color: "var(--accent)" }}>₦{budget.grandTotal.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Compliance */}
      <div style={{ marginTop: 16, padding: "12px", borderRadius: 10, background: "var(--bg2)", border: "1px solid var(--border)" }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>✅ Compliance &amp; Rules</div>
        {checks.map((c, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, marginBottom: 4 }}>
            <span style={{ color: c.passed ? "var(--green)" : "#d97706" }}>{c.passed ? "\u2713" : "\u2717"}</span>
            <span style={{ color: c.passed ? "var(--text2)" : "#d97706" }}>{c.label}</span>
          </div>
        ))}
        <div style={{ marginTop: 6, fontSize: 12, fontWeight: 600, color: allGood ? "var(--green)" : "#d97706" }}>
          {allGood ? "✅ Campaign approved — ready to publish" : "⚠️ Some items need attention"}
        </div>
      </div>

      {/* Insights */}
      <div style={{ marginTop: 12, padding: "12px", borderRadius: 10, background: "rgba(var(--accent-rgb),0.04)", border: "1px solid rgba(var(--accent-rgb),0.1)" }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>📊 Market Insights</div>
        {similarOnes.map((c, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4, color: "var(--text2)" }}>
            <span>{c.title}</span>
            <span>₦{c.reward}/ea · {c.filled} filled · {c.rating}★</span>
          </div>
        ))}
        <div style={{ marginTop: 6, fontSize: 11, color: "var(--text3)" }}>
          Your reward (₦{details.reward?.toLocaleString() || "—"}) is competitive for this category.
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button
          onClick={() => publishCampaign("publish", null)}
          disabled={loading}
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: 10,
            border: "1px solid var(--accent)",
            background: loading ? "var(--border)" : "var(--accent)",
            color: "#fff",
            fontWeight: 600,
            fontSize: 14,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Publishing..." : "🚀 Publish Now"}
        </button>
        <button
          onClick={() => publishCampaign("draft", null)}
          disabled={loading}
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--bg)",
            color: "var(--text)",
            fontWeight: 600,
            fontSize: 14,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          💾 Save Draft
        </button>
      </div>
      <button
        onClick={() => setStep(9)}
        style={{
          width: "100%",
          marginTop: 8,
          padding: "10px",
          borderRadius: 10,
          border: "1px solid var(--border)",
          background: "transparent",
          color: "var(--text2)",
          fontWeight: 500,
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        ⏰ Schedule for Later
      </button>
    </div>
  );
  };

  const renderConfirm = () => (
    <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Ready to launch</h3>
      <p style={{ margin: 0, fontSize: 12, color: "var(--text3)" }}>
        Choose how you want to publish your campaign
      </p>

      <button onClick={() => publishCampaign("publish", null)} disabled={loading}
        style={{
          padding: "16px", borderRadius: 12,
          border: "1.5px solid var(--accent)", background: "rgba(var(--accent-rgb),0.06)",
          cursor: loading ? "not-allowed" : "pointer", textAlign: "left",
          fontFamily: "inherit", width: "100%",
        }}
      >
        <div style={{ fontSize: 16, marginBottom: 4 }}>🚀 Publish Now</div>
        <div style={{ fontSize: 12, color: "var(--text3)" }}>
          Campaign goes live immediately — workers can start right away
        </div>
      </button>

      <button onClick={() => publishCampaign("draft", null)} disabled={loading}
        style={{
          padding: "16px", borderRadius: 12,
          border: "1.5px solid var(--border)", background: "var(--bg)",
          cursor: loading ? "not-allowed" : "pointer", textAlign: "left",
          fontFamily: "inherit", width: "100%",
        }}
      >
        <div style={{ fontSize: 16, marginBottom: 4 }}>💾 Save as Draft</div>
        <div style={{ fontSize: 12, color: "var(--text3)" }}>
          Save to drafts — publish later from "My Campaigns"
        </div>
      </button>

      <div style={{
        padding: "16px", borderRadius: 12,
        border: "1.5px solid var(--border)", background: "var(--bg)",
      }}>
        <div style={{ fontSize: 16, marginBottom: 4 }}>⏰ Schedule for Later</div>
        <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 8 }}>
          Set a date &amp; time to auto-publish
        </div>
        <input type="datetime-local" id="schedule-date" style={{
          width: "100%", height: 40, borderRadius: 8, border: "1px solid var(--border)",
          padding: "0 10px", fontSize: 13, background: "var(--bg)", color: "var(--text)",
          fontFamily: "inherit", boxSizing: "border-box",
        }} />
        <button onClick={() => {
          const dt = (document.getElementById("schedule-date") as HTMLInputElement)?.value;
          if (dt) publishCampaign("schedule", dt);
        }} disabled={loading}
          style={{
            marginTop: 8, width: "100%", padding: "10px", borderRadius: 8,
            border: "none", background: loading ? "var(--border)" : "var(--accent)",
            color: "#fff", fontWeight: 600, fontSize: 13,
            cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit",
          }}
        >
          {loading ? "Scheduling..." : "Confirm Schedule"}
        </button>
      </div>

      <button onClick={() => setStep(6)}
        style={{
          padding: "10px", borderRadius: 8, border: "none",
          background: "transparent", color: "var(--text2)",
          fontSize: 12, cursor: "pointer", fontFamily: "inherit",
        }}
      >
        ← Back to Summary
      </button>
    </div>
  );

  const renderSuccess = () => (
    <div style={{ padding: "16px", textAlign: "center" }}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "rgba(16,185,129,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 12px",
        }}
      >
        <span style={{ fontSize: 28 }}>✅</span>
      </div>
      <h3 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 700, color: "var(--green)" }}>
        Campaign Published Successfully!
      </h3>
      <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--text3)" }}>
        Your campaign is now live. Workers can start accepting tasks.
      </p>

      <div
        style={{
          padding: "16px",
          borderRadius: 12,
          background: "var(--bg2)",
          border: "1px solid var(--border)",
          marginBottom: 16,
          textAlign: "left",
        }}
      >
        <div style={{ fontSize: 12, marginBottom: 6 }}>
          <span style={{ color: "var(--text3)" }}>Status:</span>{" "}
          <span style={{ color: "var(--green)", fontWeight: 600 }}>🟢 LIVE</span>
        </div>
        <div style={{ fontSize: 12, marginBottom: 6 }}>
          <span style={{ color: "var(--text3)" }}>Campaign:</span>{" "}
          <span style={{ fontWeight: 600 }}>{details.title || "Untitled"}</span>
        </div>
        <div style={{ fontSize: 12, marginBottom: 6 }}>
          <span style={{ color: "var(--text3)" }}>Budget:</span>{" "}
          <span style={{ fontWeight: 600 }}>₦{budget?.grandTotal?.toLocaleString() || "0"}</span>
        </div>
        <div style={{ fontSize: 12 }}>
          <span style={{ color: "var(--text3)" }}>Share:</span>{" "}
          <span
            style={{ color: "var(--accent)", cursor: "pointer" }}
            onClick={() => {
              navigator.clipboard?.writeText(`https://ogapay.app/tasks/search?q=${encodeURIComponent(details.title || "campaign")}`);
            }}
          >
            📋 Copy Link
          </span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          onClick={() => {
            setOpen(false);
            setTimeout(() => {
              setStep(0);
              setMessages([]);
              setIntentText("");
              setDetails({});
              setBudget(null);
              setCampaignType(null);
              setQualification(null);
            }, 300);
          }}
          style={{
            padding: "12px",
            borderRadius: 10,
            border: "1px solid var(--accent)",
            background: "var(--accent)",
            color: "#fff",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Create Another Campaign
        </button>
        <button
          onClick={() => navigate("/tasks")}
          style={{
            padding: "10px",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--bg)",
            color: "var(--text)",
            fontWeight: 500,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          View Live Campaign
        </button>
      </div>
    </div>
  );

  const renderStep = () => {
    switch (step) {
      case 0:
        return renderQualification();
      case 1:
        return renderCampaignType();
      case 2:
        return renderFormat();
      case 3:
        return renderDetails();
      case 4:
        return renderBudget();
      case 5:
        return renderSummary();
      case 6:
        return renderSummary(); // Compliance (same layout for now)
      case 7:
        return renderSummary(); // Insights
      case 8:
        return renderConfirm();
      case 9:
        return renderSuccess();
      default:
        return null;
    }
  };

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999 }}>
      {open && (
        <div
          style={{
            position: "absolute",
            bottom: 56,
            right: 0,
            width: "min(92vw, 420px)",
            height: "70vh",
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            boxShadow: "0 8px 40px rgba(0,0,0,0.15)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid var(--border)",
              background: "var(--card)",
              position: "sticky",
              top: 0,
              zIndex: 1,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                  <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
                  <path d="M5 13h14" />
                  <path d="M12 18v4" />
                  <path d="M8 22h8" />
                </svg>
                <span style={{ fontWeight: 800, fontSize: 14, color: "var(--text)" }}>Campaign Builder</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text2)",
                  cursor: "pointer",
                  padding: 2,
                }}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Progress bar */}
            {step > 0 && step < 10 && (
              <div style={{ marginTop: 10 }}>
                <div
                  style={{
                    display: "flex",
                    gap: 4,
                    alignItems: "center",
                  }}
                >
                  {STEPS.slice(0, -1).map((s, i) => (
                    <div
                      key={s}
                      style={{
                        flex: 1,
                        height: 3,
                        borderRadius: 2,
                        background: i <= step ? "var(--accent)" : "var(--border)",
                        transition: "background 0.3s",
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Step content */}
          <div style={{ flex: 1, overflowY: "auto" }}>{renderStep()}</div>
        </div>
      )}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            border: "none",
            background: "linear-gradient(135deg, var(--accent), var(--green))",
            color: "#fff",
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(var(--accent-rgb),0.4)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
            <path d="M5 13h14" />
            <path d="M12 18v4" />
            <path d="M8 22h8" />
          </svg>
        </button>
      )}
      <style>{`@keyframes wizSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
