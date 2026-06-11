# OgaPay Vault — Design Specification

## Overview

Rebuild OgaPay's vault from a document storage system into a **platform revenue distribution engine**, matching WURK.fun's token holder dividend model but adapted for OgaPay's ecosystem.

---

## 1. Core Concept

Platform revenue (task fees, store commissions, service cuts) is pooled and distributed to **OgaPay rank holders** on a recurring schedule. Higher rank = larger share.

| Aspect | WURK Vault | OgaPay Vault (proposed) |
|--------|------------|------------------------|
| Distribution trigger | $WURK token holding | OgaPay rank + activity score |
| Schedule | Every 12 hours | Every 24 hours |
| Payout asset | $WURK (Solana) | NGN / USDC (in-app wallet) |
| Eligibility | Hold $WURK tokens | Rank ≥ 1 + active in last 7 days |
| Distribution logic | Proportional to holdings | Proportional to rank weight |

---

## 2. Database Schema

```sql
-- Revenue pool: tracks platform earnings waiting to be distributed
create table vault_pool (
  id uuid primary key default gen_random_uuid(),
  total_ngn numeric default 0,      -- Total NGN in pool
  total_usdc numeric default 0,     -- Total USDC in pool
  last_distribution_at timestamptz,
  next_distribution_at timestamptz,
  created_at timestamptz default now()
);

-- Distribution events: each time revenue is paid out
create table vault_distributions (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid references vault_pool(id),
  total_ngn numeric not null,
  total_usdc numeric not null,
  eligible_count integer not null,   -- How many users qualified
  distributed_at timestamptz default now()
);

-- Individual payout records
create table vault_payouts (
  id uuid primary key default gen_random_uuid(),
  distribution_id uuid references vault_distributions(id),
  user_id uuid references auth.users(id),
  rank integer not null,
  rank_weight numeric not null,      -- Weight for this user's rank
  share_ngn numeric not null,        -- NGN amount received
  share_usdc numeric not null,       -- USDC amount received
  status text default 'pending' check (status in ('pending', 'paid', 'failed')),
  paid_at timestamptz,
  created_at timestamptz default now()
);

-- User's vault stats (materialized/cached)
create table vault_user_stats (
  user_id uuid primary key references auth.users(id),
  total_earned_ngn numeric default 0,
  total_earned_usdc numeric default 0,
  distributions_received integer default 0,
  current_rank integer default 0,
  is_eligible boolean default false,
  last_active_at timestamptz,
  updated_at timestamptz default now()
);

-- Platform revenue log: where money comes from
create table vault_revenue_log (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('task_fee', 'store_commission', 'service_cut', 'other')),
  source_id text,                    -- Reference to the originating record
  amount_ngn numeric default 0,
  amount_usdc numeric default 0,
  recorded_at timestamptz default now()
);
```

---

## 3. Rank Weight System

Distribution is proportional to rank. Higher ranks earn a larger slice.

| Rank | Weight | Example: 100 users at this rank | Share of pool |
|------|--------|--------------------------------|---------------|
| 1    | 1      | 50 users → 50 total           | 12.5%         |
| 2    | 2      | 25 users → 50 total           | 12.5%         |
| 3    | 4      | 15 users → 60 total           | 15%           |
| 4    | 8      | 7 users  → 56 total           | 14%           |
| 5    | 16     | 3 users  → 48 total           | 12%           |

**Formula:**
```
user_share = (user_rank_weight / sum_of_all_eligible_weights) × pool_total
```

---

## 4. Eligibility Criteria

A user qualifies for a distribution when ALL of:
- OgaPay rank ≥ 1
- Completed at least 1 task in the last 7 days
- Account not flagged/suspended
- KYC verified (after grace period)

---

## 5. API Endpoints

### Public

| Method | Path | Description |
|--------|------|-------------|
| GET | `/vault` | Vault page data: pool stats, next distribution, user stats |
| GET | `/vault/stats` | Platform-wide vault stats |
| GET | `/vault/history?range=7d|30d|1y` | Distribution history with chart data |
| GET | `/vault/lookup?username=X` | Check any user's eligibility and earnings |

### Protected (auth required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/vault/my-stats` | Current user's vault earnings, rank, eligibility |
| GET | `/vault/my-payouts` | User's payout history |
| POST | `/vault/claim` | Claim pending payouts to wallet |

### Admin

| Method | Path | Description |
|--------|------|-------------|
| POST | `/vault/distribute` | Trigger manual distribution (or auto on cron) |
| GET | `/vault/revenue-log` | View revenue sources |
| POST | `/vault/revenue-log` | Manually add revenue (admin) |

---

## 6. Frontend Pages

### `/vault` — Main Vault Page

```
┌─────────────────────────────────────────┐
│  VAULT                                   │
│  Platform Revenue Distribution           │
├─────────────────────────────────────────┤
│  ┌───────────┬───────────┬───────────┐  │
│  │ Pool NGN  │ Pool USDC │ Holders   │  │
│  │ ₦245,000  │ $1,250    │ 1,847     │  │
│  └───────────┴───────────┴───────────┘  │
├─────────────────────────────────────────┤
│  Next Distribution                       │
│  ⏰ 12:34:56                             │
│  (every 24h from last distribution)      │
├─────────────────────────────────────────┤
│  ┌─ Your Stats ───────────────────────┐  │
│  │ Rank: 3   Weight: 4x               │  │
│  │ Est. Next: ₦850 + $4.20           │  │
│  │ Total Earned: ₦12,400 + $62.00    │  │
│  │ Distributions Received: 14         │  │
│  │ Status: ✅ Eligible               │  │
│  └────────────────────────────────────┘  │
├─────────────────────────────────────────┤
│  Distribution History                    │
│  [7 days] [30 days] [Last year]         │
│  ┌─────────────────────────────────┐    │
│  │  ██  ████  ██  █████  ██  ██   │    │
│  │  ██  ████  ██  █████  ██  ██   │    │
│  │  ─────────────────────────────  │    │
│  │  Mon Tue  Wed Thu  Fri  Sat Sun │    │
│  └─────────────────────────────────┘    │
│  Received: 142 $WURK ≈ $8.50 USD        │
├─────────────────────────────────────────┤
│  How It Works                            │
│  Platform fees from tasks, store sales   │
│  and services are pooled and shared      │
│  daily with active OgaPay members.      │
│  Higher rank = bigger share.            │
└─────────────────────────────────────────┘
```

### `/vault/history` — Full Distribution History
- Same chart component with longer timeframe
- Paginated list of past distributions
- Each row: date, pool amount, your share, your rank at time

---

## 7. Chart Component (reusable)

Based on WURK's vault-history chart:

```tsx
interface VaultChartBar {
  periodStart: string
  periodEnd: string
  amount: number
  payoutCount: number
}

interface VaultChartData {
  bars: VaultChartBar[]
  totals: {
    totalReceived: number
    totalReceivedUsd: number
    currentPriceUsd: number
  }
}

// Props
interface VaultChartProps {
  data: VaultChartData
  range: '7d' | '30d' | '1y'
  loading: boolean
  error?: string
  onRangeChange: (range: string) => void
  timeframePosition?: 'top' | 'belowStats'
}
```

Features:
- Recharts-based bar chart
- Dark/light mode aware colors
- Tooltip on hover: date range + amount + distribution count
- Timeframe toggle pills
- USD estimate using current price

---

## 8. Distribution Engine (Backend Logic)

```
Cron job runs every 24 hours:

1. Calculate pool total (sum of vault_pool since last distribution)
2. Find eligible users (rank >= 1, active in 7 days, KYC verified)
3. Calculate weights per user based on rank
4. Calculate total weight pool
5. For each user:
   share = (user_weight / total_weight) * pool_total
6. Create vault_distribution record
7. Create vault_payout record per user (status: pending)
8. Reset vault_pool to 0
9. Update vault_user_stats for all recipients
10. Trigger push notifications: "New vault distribution available!"
```

---

## 9. Edge Cases & Safeguards

| Issue | Solution |
|-------|----------|
| No eligible users | Pool carries over to next cycle |
| Distribution fails mid-way | Transactional — all or nothing |
| User ranks up between distributions | Weight based on rank at time of distribution |
| New user joins | First eligible after completing 1 task + 7 days |
| Price volatility | USD estimates are snapshot at distribution time |
| Fraud / Sybil | KYC requirement + activity recency check |

---

## 10. Implementation Phases

### Phase 1 — Backend (Week 1)
- Database tables & migrations
- Distribution engine cron job
- Pool tracking & revenue logging
- All API endpoints

### Phase 2 — Frontend (Week 2)
- Vault page with stats + countdown
- Vault history chart
- User stats card (rank, eligibility, earnings)
- Lookup tool

### Phase 3 — Integration (Week 3)
- Connect revenue sources (task fee, store commission)
- Push notifications for distributions
- Claim-to-wallet flow
- Admin dashboard for vault management

---

## 11. Questions to Resolve

1. **Payout currency**: NGN in-app balance, USDC, or both?
2. **Minimum distribution threshold**: Only pay out if user's share > X to avoid dust?
3. **Claim window**: Do unclaimed payouts expire after N days?
4. **Rank floor**: Is rank 1 the minimum, or should it be higher?
5. **Activity window**: 7 days of activity, or a rolling 30-day window?
6. **Revenue sources**: Which platform fees feed the pool? (task fee %, store commission %, etc.)
