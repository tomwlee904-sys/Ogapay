// ─── API Response ───
export interface ApiResponse<T> {
  success?: boolean
  data?: T
  message?: string
  error?: string
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// ─── Task / Job ───
export interface Task {
  id: string
  title: string
  description: string
  reward: number
  currency?: string
  maxWorkers?: number
  currentWorkers?: number
  estimatedTime?: number
  proofRequired?: boolean
  status?: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  category?: string
  tags?: string[]
  platform?: string
  difficulty?: string
  poster?: {
    id: string
    username?: string
    avatarUrl?: string | null
    posterProfile?: {
      isVerified?: boolean
      rating?: number
    }
  }
  featured?: boolean
  createdAt?: string
  updatedAt?: string
  submissionCount?: number
  completionTime?: string
  rankRequired?: string
  usdValue?: number
  slots?: number
  filled?: number
  timeEstimate?: string
  verificationRequired?: boolean
  color?: string
}

// ─── Auth ───
export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthUser {
  id: string
  email: string
  firstName?: string
  lastName?: string
  username?: string
  avatarUrl?: string | null
  role?: 'WORKER' | 'POSTER' | 'ADMIN'
  referralCode?: string
  isEmailVerified?: boolean
  createdAt?: string
  phone?: string
  isPhoneVerified?: boolean
  posterProfile?: {
    isVerified?: boolean
    rating?: number
    completedJobs?: number
  }
}

// ─── Wallet ───
export interface WalletBalance {
  balance: number
  currency: string
  locked: number
  pending: number
  available: number
  preferredCurrency?: 'NGN' | 'USD' | 'BOTH'
}

// ─── Campaign ───
export interface CampaignDraft {
  title: string
  description: string
  instructions: string
  platform?: string
  category: string
  reward: number
  maxWorkers: number
  estimatedTime: number
  proofRequired: boolean
  verificationRequired?: boolean
  tags?: string[]
  budget?: number
  difficulty?: string
  completionTime?: string
}

// ─── Qualification ───
export interface QualificationCheck {
  kycVerified: boolean
  emailVerified: boolean
  walletConnected: boolean
  accountAgeDays: number
  phoneVerified: boolean
  passed: boolean
}

// ─── Community ───
export interface Community {
  id: string
  name: string
  description?: string
  imageUrl?: string
  memberCount?: number
  category?: string
  createdAt?: string
}

// ─── Store Product ───
export interface StoreProduct {
  id: string
  title: string
  description?: string
  price: number
  currency?: string
  imageUrl?: string
  category?: string
  seller?: {
    id: string
    username?: string
  }
  createdAt?: string
}

// ─── Notification ───
export interface AppNotification {
  id: string
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'
  title: string
  message?: string
  read: boolean
  createdAt: string
  link?: string
}
