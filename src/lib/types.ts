export type PaymentCurrency = "USDC" | "SOL" | "NGN";
export type JobCategory = "Social Growth" | "Feedback" | "Polls" | "Content" | "Data Labeling" | "Custom";
export type JobStatus = "open" | "in_progress" | "completed" | "paused";
export type TaskStatus = "accepted" | "submitted" | "approved" | "rejected" | "paid";
export type UserRole = "Human" | "Agent" | "Both";

export interface Job {
  id: string;
  title: string;
  description: string;
  platform: string;
  category: JobCategory;
  price: number;
  currency: PaymentCurrency;
  slots: number;
  slotsFilled: number;
  status: JobStatus;
  creatorUsername: string;
  proofType: string;
  requirements: string[];
  createdAt: string;
  endsAt: string;
  popularity: number;
}

export interface User {
  username: string;
  avatar: string;
  joinDate: string;
  rating: number;
  completionRate: number;
  tasksCompleted: number;
  totalEarnedUsdc: number;
  jobsPosted: number;
  role: UserRole;
  walletAddress: string;
  bio: string;
}

export interface Task {
  id: string;
  jobId: string;
  title: string;
  platform: string;
  amount: number;
  currency: PaymentCurrency;
  status: TaskStatus;
  date: string;
}

export interface Submission {
  id: string;
  taskId: string;
  proofUrl?: string;
  proofText: string;
  status: TaskStatus;
}

export interface Transaction {
  id: string;
  type: "deposit" | "withdrawal" | "earning" | "funding" | "vault_claim";
  amount: number;
  currency: PaymentCurrency;
  status: "pending" | "complete" | "failed";
  date: string;
}

export interface GigStore {
  id: string;
  username: string;
  title: string;
  price: number;
  currency: PaymentCurrency;
  deliveryTime: string;
  orders: number;
  description: string;
}

export interface VaultDistribution {
  id: string;
  date: string;
  revenueUsdc: number;
  tokenHolders: number;
  userRewardUsdc: number;
  status: "claimed" | "available" | "scheduled";
}

export interface NairaWithdrawal {
  amountUsdc: number;
  amountNgn: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  feeNgn: number;
  status: "pending" | "processing" | "paid";
}

export interface NigerianBank {
  code: string;
  name: string;
}

export interface EarningsPoint {
  date: string;
  usdc: number;
  sol: number;
  ngn: number;
}
