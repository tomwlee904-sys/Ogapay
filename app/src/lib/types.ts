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
  requiresX?: boolean;
  requiresXBlue?: boolean;
  audiencePlatform?: string | null;
  minFollowers?: number;
  requiresWallet?: boolean;
  escrowed?: boolean;
  platformFee?: number;
  expiresAt?: string | null;
  featured?: boolean;
  // Apps and AI agents (API keys) may take and send work for this job
  agentsAllowed?: boolean;
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

// Possible duplicates across accounts, found when the work was sent (server
// dupFlags.service). Only posters and admins get these; null when clean.
export type ReviewFlagType = 'SAME_FILE' | 'SAME_FILENAME' | 'SAME_DEVICE' | 'SAME_TEXT';
export interface ReviewFlag {
  type: ReviewFlagType;
  usernames: string[];
  submissionIds: string[];
  detail?: string;
  // A match was work sent for another job (file checks look across all jobs)
  otherJob?: boolean;
  // SAME_DEVICE: the same paired device (not just the same network and browser)
  pairedDevice?: boolean;
}
