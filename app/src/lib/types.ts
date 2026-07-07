export interface Poster {
  id?: string;
  username: string;
  avatarUrl: string | null;
  displayName?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  reward: number;
  currency?: string;
  category: string;
  status: string;
  posterId: string;
  poster?: Poster;
  maxWorkers: number;
  workerCount: number;
  createdAt: string;
  updatedAt?: string;
  instructions?: string;
  proofRequired?: string;
  estimatedTime?: string;
  tags?: string[];
  minRank?: number;
  minSorsaScore?: number;
  workerRequirement?: string;
  requiresLinkedin?: boolean;
  requiresWallet?: boolean;
  escrowed?: boolean;
  platformFee?: number;
  expiresAt?: string | null;
  featured?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface WalletBalance {
  balance: number;
  pendingWithdrawals: number;
  lockedBalance?: number;
}

export interface QualificationCheck {
  checks: {
    kycVerified: boolean;
    emailConfirmed: boolean;
    walletConnected: boolean;
    accountAgeMet: boolean;
    phoneVerified: boolean;
  };
  allPassed: boolean;
  details: Record<string, {
    passed: boolean;
    status?: string;
    verified?: boolean;
    connected?: boolean;
    days?: number;
    actionUrl: string | null;
  }>;
}

export interface CampaignDraft {
  title?: string;
  platform?: string;
  category?: string;
  workerCount?: number;
  reward?: number;
  instructions?: string;
  proofRequired?: string;
  estimatedTime?: string;
  budget?: number;
  qualityScore?: number;
  difficulty?: string;
}
