import type { EarningsPoint, GigStore, Job, Task, User, VaultDistribution } from "./types";
import { NIGERIAN_BANKS, NGN_RATE } from "./constants";

const now = new Date();
const isoDaysAgo = (days: number) => new Date(now.getTime() - days * 86400000).toISOString();
const isoDaysAhead = (days: number) => new Date(now.getTime() + days * 86400000).toISOString();

export const mockUsers: User[] = [
  { username: "adaflow", avatar: "https://i.pravatar.cc/120?img=47", joinDate: "2025-03-08", rating: 4.9, completionRate: 98, tasksCompleted: 312, totalEarnedUsdc: 1840, jobsPosted: 18, role: "Both", walletAddress: "9nVDyEPMB3MZcvJg8qXwCW4yMz1ZQwL7Db1aQSspVbZ1", bio: "Growth operator helping agents finish social proof loops fast." },
  { username: "lagoslabeler", avatar: "https://i.pravatar.cc/120?img=12", joinDate: "2025-06-18", rating: 4.8, completionRate: 96, tasksCompleted: 521, totalEarnedUsdc: 2665, jobsPosted: 7, role: "Human", walletAddress: "7bnk91J2Q6rFZziB4eiArWmfrMg7VLG9NdExSy4b6Bqi", bio: "Data labeling, feedback, polls, and content testing." },
  { username: "mcpagent", avatar: "https://i.pravatar.cc/120?img=32", joinDate: "2024-12-01", rating: 4.7, completionRate: 94, tasksCompleted: 204, totalEarnedUsdc: 4210, jobsPosted: 42, role: "Agent", walletAddress: "4Kp9Rnyqj6W92KSwpErdLMvjY8DRoXxA9H2PRqhoNqZM", bio: "Automated task sponsor using x402 and MCP rails." },
  { username: "zainabcreates", avatar: "https://i.pravatar.cc/120?img=49", joinDate: "2025-01-22", rating: 5, completionRate: 99, tasksCompleted: 437, totalEarnedUsdc: 3188, jobsPosted: 12, role: "Both", walletAddress: "EwuN39hPQf2jUpRM9KejgkL8brphxCDQ32JswHYKahE5", bio: "Creator feedback, short-form content, and community activation." },
  { username: "solnaira", avatar: "https://i.pravatar.cc/120?img=68", joinDate: "2025-08-03", rating: 4.6, completionRate: 91, tasksCompleted: 143, totalEarnedUsdc: 1120, jobsPosted: 25, role: "Agent", walletAddress: "F13psk1DjfiNqGH8W7iYsT3JnpQrb7vF2oYMbL4xQpW", bio: "Naira-first campaigns for Solana apps." }
];

const titles = [
  ["Follow and comment on launch thread", "X/Twitter", "Social Growth", 2.5, "USDC"],
  ["Test checkout flow and submit feedback", "Zora", "Feedback", 6200, "NGN"],
  ["Vote in product naming poll", "Telegram", "Polls", 0.012, "SOL"],
  ["Create TikTok reaction clip", "TikTok", "Content", 8, "USDC"],
  ["Label wallet transaction screenshots", "Discord", "Data Labeling", 1850, "NGN"],
  ["Join creator Discord and verify role", "Discord", "Social Growth", 1.4, "USDC"],
  ["Review agent API docs", "YouTube", "Feedback", 4100, "NGN"],
  ["Answer market survey", "Instagram", "Polls", 2.2, "USDC"],
  ["Write one paragraph testimonial", "X/Twitter", "Content", 0.025, "SOL"],
  ["Classify 20 short comments", "Telegram", "Data Labeling", 4, "USDC"],
  ["Custom audit: Paystack copy review", "Zora", "Custom", 15000, "NGN"],
  ["Retweet verified campaign", "X/Twitter", "Social Growth", 1.1, "USDC"],
  ["Watch and rate onboarding video", "YouTube", "Feedback", 0.01, "SOL"],
  ["Pick best reward mechanic", "Discord", "Polls", 1250, "NGN"],
  ["Make an Instagram story mention", "Instagram", "Content", 5.5, "USDC"],
  ["Tag product screenshots by intent", "TikTok", "Data Labeling", 3200, "NGN"],
  ["Custom local bank list check", "Telegram", "Custom", 6, "USDC"],
  ["Follow founder account", "X/Twitter", "Social Growth", 900, "NGN"],
  ["Score three landing page variants", "Zora", "Feedback", 3.2, "USDC"],
  ["Share launch post in Lagos community", "Telegram", "Content", 0.035, "SOL"],
  ["Rank five API response examples", "Discord", "Data Labeling", 2800, "NGN"],
  ["Custom Solana wallet QA", "Zora", "Custom", 12, "USDC"]
] as const;

export const mockJobs: Job[] = titles.map((item, index) => ({
  id: `job-${index + 1}`,
  title: item[0],
  platform: item[1],
  category: item[2],
  price: item[3],
  currency: item[4],
  slots: 40 + (index % 6) * 15,
  slotsFilled: 8 + (index % 9) * 4,
  status: "open",
  creatorUsername: mockUsers[index % mockUsers.length].username,
  proofType: index % 3 === 0 ? "Screenshot + URL" : index % 3 === 1 ? "Text response" : "Public post URL",
  requirements: ["Complete the task exactly once", "Keep proof public for 48 hours", "No bots, duplicate accounts, or recycled screenshots"],
  description: `Complete this ${item[2].toLowerCase()} task for ${item[1]} and submit clean proof for same-day approval.`,
  createdAt: isoDaysAgo(index % 10),
  endsAt: isoDaysAhead(1 + (index % 8)),
  popularity: 100 - index * 3
}));

export const earningsHistory: EarningsPoint[] = Array.from({ length: 30 }, (_, index) => {
  const usdc = 18 + Math.round(Math.sin(index / 3) * 8 + index * 1.8);
  return { date: isoDaysAgo(29 - index).slice(5, 10), usdc, sol: Number((usdc / 150).toFixed(3)), ngn: usdc * NGN_RATE };
});

export const recentTasks: Task[] = mockJobs.slice(0, 8).map((job, index) => ({
  id: `task-${index + 1}`,
  jobId: job.id,
  title: job.title,
  platform: job.platform,
  amount: job.price,
  currency: job.currency,
  status: index % 4 === 0 ? "submitted" : index % 3 === 0 ? "paid" : "approved",
  date: isoDaysAgo(index + 1)
}));

export const gigStores: GigStore[] = [
  { id: "gig-1", username: "adaflow", title: "Run a 20-person Solana feedback sprint", price: 90, currency: "USDC", deliveryTime: "3 days", orders: 44, description: "Recruit, brief, verify, and summarize Nigerian user feedback." },
  { id: "gig-2", username: "adaflow", title: "Twitter launch activation", price: 72000, currency: "NGN", deliveryTime: "48 hours", orders: 71, description: "Human comments, follows, and quote posts with proof." },
  { id: "gig-3", username: "zainabcreates", title: "Short-form product demo", price: 0.35, currency: "SOL", deliveryTime: "4 days", orders: 28, description: "TikTok or Reels demo with creator voiceover." },
  { id: "gig-4", username: "lagoslabeler", title: "Data tagging batch of 500 items", price: 140, currency: "USDC", deliveryTime: "5 days", orders: 19, description: "Clean labels and CSV delivery for agent training loops." }
];

export const vaultDistributions: VaultDistribution[] = [
  { id: "dist-1", date: isoDaysAgo(1), revenueUsdc: 12420, tokenHolders: 8431, userRewardUsdc: 42.8, status: "available" },
  { id: "dist-2", date: isoDaysAgo(2), revenueUsdc: 11388, tokenHolders: 8290, userRewardUsdc: 39.1, status: "claimed" },
  { id: "dist-3", date: isoDaysAgo(3), revenueUsdc: 14105, tokenHolders: 8177, userRewardUsdc: 46.4, status: "claimed" },
  { id: "dist-4", date: isoDaysAhead(0), revenueUsdc: 0, tokenHolders: 8510, userRewardUsdc: 0, status: "scheduled" }
];

export const withdrawalHistory = [
  { id: "wd-1", type: "Naira", destination: "GTBank 0123456789", amount: "₦118,800", fee: "₦1,188", status: "paid", date: isoDaysAgo(3) },
  { id: "wd-2", type: "Crypto", destination: "9nVD...VbZ1", amount: "64.00 USDC", fee: "0.20 USDC", status: "complete", date: isoDaysAgo(6) },
  { id: "wd-3", type: "Naira", destination: "Kuda 2039485761", amount: "₦46,200", fee: "₦462", status: "processing", date: isoDaysAgo(1) }
];

export { NIGERIAN_BANKS };
