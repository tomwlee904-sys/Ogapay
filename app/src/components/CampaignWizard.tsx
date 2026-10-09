import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useWalletBalance } from "../context/WalletBalanceContext";
import { useCurrency } from "../context/CurrencyContext";

// The path through the builder (step numbers used below): type, format, details,
// budget, summary, publish options. 9 is the success screen. There used to be an
// eligibility gate first (step 0) that nobody could pass, and the summary was
// shown three times (steps 5-7).
const FLOW = [1, 2, 3, 4, 5, 8];

const CAMPAIGN_TYPES = [
  { id: "social", label: "Social Media", icon: "ti-share", desc: "Followers, likes, shares, comments" },
  { id: "community", label: "Community Growth", icon: "ti-users-group", desc: "Telegram, Discord, group members" },
  { id: "content", label: "Content Creation", icon: "ti-pencil", desc: "Articles, videos, reviews" },
  { id: "website", label: "Website Traffic", icon: "ti-world", desc: "Visits, clicks, engagement" },
  { id: "app", label: "App Testing", icon: "ti-device-mobile", desc: "Downloads, installs, reviews" },
  { id: "survey", label: "Surveys & Research", icon: "ti-clipboard-list", desc: "Responses, feedback, polls" },
  { id: "crypto", label: "Crypto & Web3", icon: "ti-coin", desc: "Airdrops, token tasks, raids" },
  { id: "custom", label: "Custom Task", icon: "ti-bolt", desc: "Anything else you need done" },
];

const FORMATS = [
  { id: "single", label: "Single Campaign", icon: "ti-target", desc: "Create one campaign now" },
  { id: "bulk", label: "Bulk Campaigns", icon: "ti-stack-2", desc: "Create 2-10 similar campaigns" },
  { id: "template", label: "Use Template", icon: "ti-template", desc: "Start from a pre-built template" },
];

// Starting points, all editable in the next step. They had no instructions, so
// a template could never be published, and 500-2000 workers each.
const TEMPLATES = [
  { title: "Instagram Followers", platform: "Instagram", workers: 100, reward: 60, category: "Social Media", proof: "SCREENSHOT",
    instructions: "Follow our Instagram account (link below), then send a screenshot that shows you follow it." },
  { title: "TikTok Engagement", platform: "TikTok", workers: 100, reward: 80, category: "Social Media", proof: "SCREENSHOT",
    instructions: "Like and comment on our TikTok video (link below), then send a screenshot of your comment." },
  { title: "Repost on X", platform: "Twitter/X", workers: 200, reward: 50, category: "Social Media", proof: "SCREENSHOT",
    instructions: "Repost and like our post on X (link below), then send a screenshot that shows your repost." },
  { title: "Telegram Members", platform: "Telegram", workers: 100, reward: 60, category: "Community", proof: "USERNAME",
    instructions: "Join our Telegram group (link below) and stay for at least 7 days. Send your Telegram username as proof." },
  { title: "YouTube Subscribers", platform: "YouTube", workers: 50, reward: 200, category: "Social Media", proof: "SCREENSHOT",
    instructions: "Subscribe to our YouTube channel (link below) and send a screenshot that shows you're subscribed." },
  { title: "Website Testing", platform: "Web", workers: 20, reward: 500, category: "App Testing", proof: "SCREENSHOT",
    instructions: "Visit our website (link below), try the main features and report anything that doesn't work, with screenshots." },
];

const MIN_REWARD = 50; // the job API refuses less than ₦50 per worker

// The AI and the templates name categories in words ("Social Media"); the job API
// takes codes, so a campaign published with the AI's category was refused
const CATEGORY_CODES = ["SOCIAL_MEDIA", "DATA_ENTRY", "CONTENT_WRITING", "APP_TESTING", "SURVEY", "DESIGN", "TRANSLATION", "WEB_RESEARCH", "VIDEO_REVIEW", "OTHER"];
const TYPE_CATEGORY: Record<string, string> = { social: "SOCIAL_MEDIA", community: "SOCIAL_MEDIA", content: "CONTENT_WRITING", website: "WEB_RESEARCH", app: "APP_TESTING", survey: "SURVEY", crypto: "OTHER", custom: "OTHER" };
const toCategory = (v?: string, type?: string | null) => {
  const s = String(v || "").trim();
  if (CATEGORY_CODES.includes(s)) return s;
  const w = s.toLowerCase();
  if (!w) return TYPE_CATEGORY[type || ""] || "OTHER";
  if (/social|marketing|community|music|influenc|twitter|instagram|tiktok|telegram|discord|youtube|facebook/.test(w)) return "SOCIAL_MEDIA";
  if (/content|article|blog|writ/.test(w)) return "CONTENT_WRITING";
  if (/test|app|review|develop/.test(w)) return "APP_TESTING";
  if (/survey|lead|poll/.test(w)) return "SURVEY";
  if (/design|image/.test(w)) return "DESIGN";
  if (/data|entry/.test(w)) return "DATA_ENTRY";
  if (/video/.test(w)) return "VIDEO_REVIEW";
  if (/translat/.test(w)) return "TRANSLATION";
  if (/web|research|traffic/.test(w)) return "WEB_RESEARCH";
  return TYPE_CATEGORY[type || ""] || "OTHER";
};


export default function CampaignWizard() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [campaignType, setCampaignType] = useState<string | null>(null);
  const [format, setFormat] = useState<string>("single");
  const [bulkCount, setBulkCount] = useState(2);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [intentText, setIntentText] = useState("");
  const [aiResponse, setAiResponse] = useState<any>(null);
  const [details, setDetails] = useState<any>({});
  const [budget, setBudget] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [streamPhase, setStreamPhase] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { isAuthed, user } = useAuth();
  const { balances: walletBalances, refresh: refreshWallet } = useWalletBalance();
  const { preferredCurrency } = useCurrency();
  const walletBalance = Number(walletBalances?.NGN?.available ?? walletBalances?.NGN?.balance ?? 0) || 0;
  const streamPhrases = ["Thinking...", "Analyzing your request...", "Detecting campaign type...", "Preparing options..."];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, step]);

  const publishCampaign = async (mode: 'publish' | 'draft' | 'schedule', scheduledDate: string | null) => {
    if (!isAuthed) { navigate("/login"); return; }
    const missing =
      (details.title || "").trim().length < 5 ? "Give the campaign a title (at least 5 characters)." :
      (details.instructions || "").trim().length < 20 ? "Add instructions for workers (at least 20 characters)." :
      (details.reward || 0) < MIN_REWARD ? `The reward must be at least ₦${MIN_REWARD} per worker.` :
      (details.workerCount || 0) < 1 ? "Set how many workers you need." : "";
    if (missing) { alert(missing); return; }
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
        description: details.instructions,
        category: toCategory(details.category, campaignType),
        reward: Math.round(reward),
        maxWorkers: Math.round(maxWorkers),
        currency: "NGN",
        instructions: details.instructions || "",
        proofRequired: details.proofRequired || undefined,
        estimatedTime: Number.isInteger(details.estimatedTime) ? details.estimatedTime : undefined,
        minRank: details.minRank || undefined,
        workerRequirement: details.workerRequirement || undefined,
        trackingCode: details.trackingCode || undefined,
        ...(mode === "draft" ? { status: "DRAFT" } : {}),
        ...(mode === "schedule" && scheduledDate ? { scheduledAt: scheduledDate } : {}),
      };

      const result = await apiRequest<any>("/tasks", {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (!result || result.success === false) {
        throw new Error(result?.message || result?.error || "Failed to create campaign");
      }
      setLoading(false);
      setStep(9);
    } catch (e: any) {
      setLoading(false);
      alert(e?.message || "Failed to create campaign. Please try again.");
    }
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
      const res = await apiRequest<any>("/campaigns/generate", {
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
          category: toCategory(data.campaign.category),
          workerCount: data.campaign.workerCount || 50,
          reward: Math.max(MIN_REWARD, Math.round(Number(data.campaign.reward) || MIN_REWARD)),
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
  useEffect(() => { calculateBudget(); }, [details.reward, details.workerCount]);

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
                      text: `Great choice: ${t.label} (${t.desc.toLowerCase()}).\n\nTell me more details about what you need and I'll build your campaign.`,
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
                <div style={{ fontSize: 22, marginBottom: 4, color: "var(--text)" }}><i className={`ti ${t.icon}`} aria-hidden="true" /></div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{t.label}</div>
                <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>{t.desc}</div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Picking a type is enough to go on; describing it to the AI is optional */}
      {(campaignType || messages.length > 1) && (
        <button
          onClick={() => setStep(2)}
          style={{
            width: "100%",
            marginTop: 12,
            padding: "12px",
            borderRadius: 10,
            border: "none",
            background: "var(--accent)",
            color: "var(--on-accent)",
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
            <span style={{ fontSize: 22, color: "var(--text)", display: "inline-flex" }}><i className={`ti ${f.icon}`} aria-hidden="true" /></span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{f.label}</div>
              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{f.desc}</div>
            </div>
            {format === f.id && (
              <i className="ti ti-check" aria-hidden="true" style={{ color: "var(--accent)", fontSize: 16 }} />
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
                    category: toCategory(t.category),
                    workerCount: t.workers,
                    reward: t.reward,
                    instructions: t.instructions,
                    proofRequired: t.proof,
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
        onClick={() => { if (format === "template" && !selectedTemplate) { alert("Pick a template first."); return; } setStep(3); }}
        style={{
          width: "100%",
          marginTop: 16,
          padding: "12px",
          borderRadius: 10,
          border: "none",
          background: "var(--accent)",
          color: "var(--on-accent)",
          fontWeight: 600,
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        {format === "template" ? "Use This Template →" : "Continue →"}
      </button>
    </div>
  );

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
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}><i className="ti ti-calculator" aria-hidden="true" /> Budget preview</div>
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
        onClick={() => setStep(4)}
        style={{
          width: "100%",
          marginTop: 16,
          padding: "12px",
          borderRadius: 10,
          border: "none",
          background: "var(--accent)",
          color: "var(--on-accent)",
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

      {walletBalance < (budget?.grandTotal || 0) ? (
      <div
        style={{
          padding: "14px",
          borderRadius: 10,
          background: "rgba(245,158,11,0.06)",
          border: "1px solid rgba(245,158,11,0.15)",
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}><i className="ti ti-alert-triangle" aria-hidden="true" style={{ color: "#d97706" }} /> Not enough in your wallet</div>
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
            color: "var(--on-accent)",
            fontWeight: 600,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          <i className="ti ti-credit-card" aria-hidden="true" /> Top up wallet
        </button>
      </div>
      ) : (
        <div style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid var(--border)", marginBottom: 16, fontSize: 12, color: "var(--text2)" }}>
          Your wallet balance (₦{walletBalance.toLocaleString()}) covers this campaign.
        </div>
      )}

      <button
        onClick={() => setStep(5)}
        style={{
          width: "100%",
          padding: "12px",
          borderRadius: 10,
          border: "none",
          background: "var(--accent)",
          color: "var(--on-accent)",
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
    // What the job API needs, and the money to fund it
    const checks = [
      { label: "A title (5+ characters)", passed: (details.title || "").trim().length >= 5 },
      { label: "Instructions for workers (20+ characters)", passed: (details.instructions || "").trim().length >= 20 },
      { label: `Reward of at least ₦${MIN_REWARD} per worker`, passed: (details.reward || 0) >= MIN_REWARD },
      { label: "Enough money in your wallet", passed: walletBalance >= (budget?.grandTotal || 0) },
    ];
    const allGood = checks.every((c) => c.passed);
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
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Before you publish</div>
        {checks.map((c, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, marginBottom: 4 }}>
            <span style={{ color: c.passed ? "var(--green)" : "#d97706" }}><i className={`ti ${c.passed ? "ti-check" : "ti-x"}`} aria-hidden="true" /></span>
            <span style={{ color: c.passed ? "var(--text2)" : "#d97706" }}>{c.label}</span>
          </div>
        ))}
        <div style={{ marginTop: 6, fontSize: 12, fontWeight: 600, color: allGood ? "var(--green)" : "#d97706" }}>
          {allGood ? "Ready to publish" : "Fix the items marked above to publish"}
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
          {loading ? "Publishing…" : <><i className="ti ti-send" aria-hidden="true" /> Publish now</>}
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
          <i className="ti ti-device-floppy" aria-hidden="true" /> Save draft
        </button>
      </div>
      <button
        onClick={() => setStep(8)}
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
        <i className="ti ti-clock" aria-hidden="true" /> Schedule for later
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
        <div style={{ fontSize: 16, marginBottom: 4 }}><i className="ti ti-send" aria-hidden="true" /> Publish now</div>
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
        <div style={{ fontSize: 16, marginBottom: 4 }}><i className="ti ti-device-floppy" aria-hidden="true" /> Save as draft</div>
        <div style={{ fontSize: 12, color: "var(--text3)" }}>
          Save to drafts — publish later from "My Campaigns"
        </div>
      </button>

      <div style={{
        padding: "16px", borderRadius: 12,
        border: "1.5px solid var(--border)", background: "var(--bg)",
      }}>
        <div style={{ fontSize: 16, marginBottom: 4 }}><i className="ti ti-clock" aria-hidden="true" /> Schedule for later</div>
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

      <button onClick={() => setStep(5)}
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
        <i className="ti ti-circle-check" aria-hidden="true" style={{ fontSize: 30, color: "var(--green)" }} />
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
          <span style={{ color: "var(--green)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}><span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)" }} /> Live</span>
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
            <i className="ti ti-copy" aria-hidden="true" /> Copy link
          </span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          onClick={() => {
            setOpen(false);
            setTimeout(() => {
              setStep(1);
              setMessages([]);
              setIntentText("");
              setDetails({});
              setBudget(null);
              setCampaignType(null);
            }, 300);
          }}
          style={{
            padding: "12px",
            borderRadius: 10,
            border: "1px solid var(--accent)",
            background: "var(--accent)",
            color: "var(--on-accent)",
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
      case 8:
        return renderConfirm();
      case 9:
        return renderSuccess();
      default:
        return null;
    }
  };

  return (
    <div className="cw-ai" style={{ position: "fixed", zIndex: 999 }}>
      {/* Phones: above the bottom bar (64px) and its raised Create button, not on top of Profile */}
      <style>{`.cw-ai{bottom:24px;right:24px}@media(max-width:768px){.cw-ai{bottom:calc(88px + env(safe-area-inset-bottom,0px));right:16px}}`}</style>
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
            {FLOW.includes(step) && (
              <div style={{ marginTop: 10 }}>
                <div
                  style={{
                    display: "flex",
                    gap: 4,
                    alignItems: "center",
                  }}
                >
                  {FLOW.map((s, i) => (
                    <div
                      key={s}
                      style={{
                        flex: 1,
                        height: 3,
                        borderRadius: 2,
                        background: i <= FLOW.indexOf(step) ? "var(--accent)" : "var(--border)",
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
          aria-label="Open the AI campaign builder"
          title="AI campaign builder"
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
