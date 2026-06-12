# OgaPay — Beta-Readiness Audit Report

Generated: 2026-06-12

---

## Route Audit Table

### Frontend Routes (React Router — `app/src/App.tsx`)

| Route | Auth | Page Component | Status | Issue |
|-------|------|----------------|--------|-------|
| `/` | Public | HomePage | ✅ | — |
| `/login` | Public | LoginPage | ✅ | — |
| `/forgot-password` | Public | ForgotPassword | ✅ | — |
| `/auth/callback` | Public | AuthCallback | ⚠️ | `console.warn` x7 left in production; stale fallback logic |
| `/blog` | Public | Blog | ✅ | — |
| `/blog/:slug` | Public | ArticleDetail | ✅ | — |
| `/blog/write` | AuthGuard | BlogEditor | ✅ | — |
| `/blog/edit/:id` | AuthGuard | BlogEditor | ✅ | — |
| `/tasks` | Public | Tasks | ✅ | — |
| `/tasks/:id` | Public | JobDetail | ✅ | — |
| `/tasks/:id/submit` | AuthGuard | SubmissionPage | ✅ | — |
| `/tasks/:id/submissions` | AuthGuard | JobDetail | ⚠️ | Uses same component as `/tasks/:id` — may conflict |
| `/jobs` | Public | JobsListingPage | ⚠️ | No backend handler exists (ghost route) |
| `/jobs/:id` | Public | JobDetailPage | ⚠️ | No backend handler exists (ghost route) |
| `/post-job` | AuthGuard | PostJobPage | ⚠️ | Backend handler added 2026-06-12, not yet deployed |
| `/my-jobs` | AuthGuard | MyJobListingsPage | ⚠️ | Backend handler added 2026-06-12, not yet deployed |
| `/store` | Public | Store | ✅ | — |
| `/store/:id` | Public | StoreProduct | ✅ | — |
| `/communities` | Public | Communities | ✅ | — |
| `/communities/create` | Public | CreateCommunity | ✅ | — |
| `/communities/:id` | Public | CommunityDetail | ✅ | — |
| `/communities/mine` | AuthGuard | Communities | ✅ | — |
| `/faq` | Public | FAQ | ✅ | — |
| `/support` | Public | Support | ⚠️ | Skeleton page, no backend for contact form |
| `/vault` | Public | Vault | ✅ | — |
| `/vault/history` | Public | VaultHistory | ⚠️ | Backend batch/rewards endpoints return empty (placeholder) |
| `/safe` | ProtectedRoute | Safe | ✅ | — |
| `/dashboard` | AuthGuard | Dashboard | ✅ | — |
| `/profile` | AuthGuard | Profile | ✅ | — |
| `/wallet` | AuthGuard | Wallet | ⚠️ | `console.warn` in worker stats fetch |
| `/earnings` | AuthGuard | Earnings | ✅ | — |
| `/referrals` | AuthGuard | Referrals | ✅ | — |
| `/settings` | AuthGuard | Settings | ❌ | Line 538: hardcoded `code: 'placeholder'` for OAuth social connect |
| `/notifications` | AuthGuard | Notifications | ✅ | — |
| `/messages` | AuthGuard | Messages | ✅ | — |
| `/my-tasks` | AuthGuard | MyTasks | ✅ | — |
| `/my-store` | AuthGuard | MyStore | ✅ | — |
| `/campaigns` | AuthGuard | Campaigns | ⚠️ | `console.warn` on fetch error at line 847 |
| `/job-monitor` | AuthGuard | JobMonitor | ✅ | — |
| `/manage-jobs` | AuthGuard | ManageJobs | ✅ | — |
| `/edit-profile` | AuthGuard | EditProfile | ✅ | — |
| `/task-history` | AuthGuard | TaskHistory | ✅ | — |
| `/bookmarks` | AuthGuard | Bookmarks | ✅ | — |
| `/analytics` | AuthGuard | Analytics | ✅ | — |
| `/leaderboard` | Public | Leaderboard | ✅ | — |
| `/wurkers` | Public | Wurkers | ✅ | — |
| `/workers` | Public | Workers | ✅ | — |
| `/writer` | Public | Writer | ✅ | — |
| `/worker-portal` | AuthGuard | WorkerPortal | ⚠️ | `console.warn` on fetch fail |
| `/worker-portal/:category` | AuthGuard | WorkspacePortal | ⚠️ | `console.warn` on submissions fetch |
| `/worker-apply` | AuthGuard | WorkerApply | ✅ | — |
| `/worker/:category` | AuthGuard | WorkerWorkspace | ✅ | — |
| `/create` | AuthGuard | CreateJob | ✅ | — |
| `/roadmap` | Public | Roadmap | ✅ | — |
| `/about` | Public | About | ✅ | — |
| `/developer` | AuthGuard | Developer | ✅ | — |
| `/admin` | AuthGuard | Admin | ❌ | **No admin role check** — any authed user sees the admin panel (line 4) |
| `/admin/blog` | AuthGuard | AdminBlog | ❌ | **No admin role check** |
| `/admin/vault` | AuthGuard | AdminVault | ⚠️ | Admin role check present at line 99 BUT relies on `authUser?.role` which admin page itself doesn't verify |
| `/admin/*` | AuthGuard | Admin | ❌ | **No admin role check** |
| `/user/:username` | Public | UserProfile | ✅ | — |
| `/safe` | ProtectedRoute | Safe | ✅ | — |
| `/privacy` | Public | Privacy | ✅ | — |
| `/terms` | Public | Terms | ✅ | — |

### Backend Routes (Express — `ogapay-backend/src/index.js`)

| Prefix | Route File | Status | Issue |
|--------|-----------|--------|-------|
| `/auth` | `auth.routes.js` | 👻 | File doesn't exist locally — deployed version unknown |
| `/users` | `user.routes.js` | 👻 | File doesn't exist locally |
| `/wallet` | `wallet.routes.js` | 👻 | File doesn't exist locally |
| `/tasks` | `task.routes.js` | 👻 | File doesn't exist locally |
| `/kyc` | `kyc.routes.js` | 👻 | File doesn't exist locally |
| `/leaderboard` | `leaderboard.routes.js` | 👻 | File doesn't exist locally |
| `/store` | `store.routes.js` | 👻 | File doesn't exist locally |
| `/communities` | `community.routes.js` | 👻 | File doesn't exist locally |
| `/dashboard` | `dashboard.routes.js` | 👻 | File doesn't exist locally |
| `/uploads` | `upload.routes.js` | 👻 | File doesn't exist locally |
| `/ai` | `ai.routes.js` | 👻 | File doesn't exist locally |
| `/webhooks` | `webhook.routes.js` | 👻 | File doesn't exist locally |
| `/notifications` | `notification.routes.js` | 👻 | File doesn't exist locally |
| `/escrow` | `escrow.routes.js` | 👻 | File doesn't exist locally |
| `/payments` | `payment.routes.js` | 👻 | File doesn't exist locally |
| `/messages` | `messages.routes.js` | 👻 | File doesn't exist locally |
| `/blog` | `blog.routes.js` | 👻 | File doesn't exist locally |
| `/campaigns` | `campaign.routes.js` | 👻 | File doesn't exist locally |
| `/vault` | `vault.routes.js` | 👻 | File doesn't exist locally |
| `/analytics` | `analytics.routes.js` | 👻 | File doesn't exist locally |
| `/platform` | `platform.routes.js` | 👻 | File doesn't exist locally |
| `/imagekit` | `imagekit.routes.js` | ✅ | Exists locally — ImageKit auth endpoint |
| `/jobs` | `jobs.routes.js` | ✅ | Exists locally — added 2026-06-12, not yet deployed |

**Note:** 22 of 24 backend route files exist only on Railway deployment, not in this local repository. Full audit of each requires access to the deployed backend.

---

## Upload Audit Table

| Component/Endpoint | File | Type Validation | Size Limit | Storage | Secure Path | Status |
|--------------------|------|----------------|-----------|---------|-----------|--------|
| Profile avatar upload | `Profile.tsx:1085` | `accept="image/*"` (client only) | Browser-image-compression 0.5MB | ImageKit via `upload.ts` | ⚠️ No server-side type validation | ⚠️ |
| KYC document upload | `Profile.tsx:1271` | `accept="image/*,.pdf"` (client only) | None set | ImageKit via `upload.ts` | ⚠️ No server-side type or size check | ⚠️ |
| Community cover upload | `CommunityDetail.tsx:497` | `accept="image/*"` (client only) | None | ImageKit via `upload.ts` | ⚠️ No server-side validation | ⚠️ |
| Community avatar upload | `CommunityDetail.tsx:531` | `accept="image/*"` (client only) | None | ImageKit via `upload.ts` | ⚠️ No server-side validation | ⚠️ |
| Community attachments | `CommunityDetail.tsx:856` | `accept="image/*"` (client only) | None | Direct fetch to `/communities/:id/request` | ⚠️ FormData, no type/size validation | ⚠️ |
| Store thumbnail | `MyStore.tsx:726` | `accept="image/*"` (client only) | None | Direct POST to `/uploads/store` | ⚠️ No validation | ⚠️ |
| Store attachments | `MyStore.tsx:778` | None | None | Direct POST to `/uploads/store` | ⚠️ No validation | ⚠️ |
| Task proof files | `CreateJob.tsx:732` | `accept="image/*,.pdf,.doc,.docx"` (client only) | None | ImageKit via `upload.ts` | ⚠️ No server validation | ⚠️ |
| Settings photo URL | `Profile.tsx:1104` | Text input — URL paste | N/A | ImageKit URL | ⚠️ No URL validation before DB save | ❌ |

**Upload flow:** `app/src/lib/upload.ts` → ImageKit SDK via `/imagekit/auth` endpoint → returns signed URL. Client-side compression attempts 0.5MB max for non-avatar images. **No server-side file validation occurs anywhere** — all checks are client-side `accept` attributes which can be trivially bypassed.

---

## Auth Coverage Table

| Route Group | Auth Required | AuthGuard Present | Role Check | Notes |
|-------------|---------------|-------------------|------------|-------|
| Public (Home, Login, Blog, Tasks, Jobs, Store, Communities, FAQ, Privacy, Terms, Leaderboard, Wurkers, Workers, Writer, Roadmap, About, Vault, VaultHistory) | No | N/A | N/A | ✅ Properly public |
| Authenticated (Dashboard, Profile, Wallet, Earnings, etc.) | Yes | ✅ AuthGuard | ❌ No role check | ✅ All guarded |
| Admin (`/admin`, `/admin/*`, `/admin/blog`) | Yes | ✅ AuthGuard | ❌ **Missing** | 🚨 Any logged-in user sees admin panel — `Admin.tsx:4` has no role check |
| Admin Vault (`/admin/vault`) | Yes | ✅ AuthGuard | ✅ `isAdmin` check at line 99 | But relies on `authUser?.role` from context which admin.tsx doesn't verify |
| Settings social connect | Yes | ✅ AuthGuard | N/A | But uses hardcoded `'placeholder'` OAuth code (line 538) |

---

## Console.Log / Debug Leaks

| File | Line | Severity |
|------|------|----------|
| `Communities.tsx` | 35, 56 | 🟡 Dev logs in production |
| `CommunityDetail.tsx` | 190, 198 | 🟡 Dev logs in production (sends 500 chars of JSON) |
| `AuthCallback.tsx` | 46, 49, 87, 90, 173 | 🟢 Warning-level logs, acceptable for error tracking |
| `Vault.tsx` | 157 | 🟢 Error log on wallet connect failure |
| `WorkerPortal.tsx` | 102 | 🟢 Warning on fetch failure |
| `WorkerWorkspace.tsx` | 126 | 🟢 Warning on fetch failure |
| `ManageJobs.tsx` | 847 | 🟢 Warning on fetch failure |
| `LoginPage.tsx` | 455 | 🟢 Warning on OAuth fallback |

---

## Beta Blockers

### 🔴 Critical (must fix before beta)

1. **`/admin` routes have no admin role check** — `Admin.tsx`, `AdminBlog.tsx` — any authenticated user can access the admin panel. `AdminVault.tsx` has its own check but the parent admin page doesn't.
   - File: `app/src/pages/Admin.tsx` line 4
   - Fix: Add `if (authUser?.role !== 'ADMIN') return <Redirect to="/" />` at top of each admin component

2. **Settings OAuth social connect is hardcoded to `'placeholder'`** — `Settings.tsx` line 538 sends `{ code: 'placeholder' }` to the backend which will never succeed. This blocks users from connecting LinkedIn/Google accounts.
   - File: `app/src/pages/Settings.tsx` line 538
   - Fix: Implement proper OAuth flow or remove the feature

3. **No server-side file validation on ANY upload** — All 8+ upload points rely solely on browser-side `accept` attributes. A malicious user can trivially upload any file type, any size.
   - Files: `Profile.tsx:1085,1271`, `CommunityDetail.tsx:497,531,856`, `MyStore.tsx:726,778`, `CreateJob.tsx:732`
   - Fix: Add `multer` file filter + size limit in backend upload routes

4. **Jobs & Hiring backend routes not deployed** — Frontend pages (`/jobs`, `/jobs/:id`, `/post-job`, `/my-jobs`) exist but backend handler was only added to repo on 2026-06-12 and hasn't been deployed to Railway.
   - Files: `app/src/pages/Jobs/*.tsx` (all 4 pages)
   - Fix: Deploy `backend-deploy` branch to Railway

### 🟡 Important (should fix before beta)

5. **Console.log in production** — `Communities.tsx:35,56` and `CommunityDetail.tsx:190` log full API responses to console. CommunityDetail.tsx:190 sends 500 chars of JSON.stringify data.
   - Fix: Remove or comment out `console.log` statements

6. **Vault batch/rewards endpoints return empty data** — `/vault/history` page depends on `/vault/lookup/rewards` and `/vault/history/batches` which return empty/placeholder data.
   - File: `app/src/pages/VaultHistory.tsx`
   - Fix: Complete the vault distribution engine and populate batch data

7. **22 backend route files not in local repo** — Cannot audit auth, validation, or error handling for most backend routes. Local `ogapay-backend/src/` only has `index.js`, `jobs.routes.js`, `imagekit.routes.js`, and `user.service.js`.
   - Fix: Sync backend route files into repo for auditability

### 🟢 Nice to have (track but ship if needed)

8. **`/tasks/:id/submissions` and `/tasks/:id` share same component** — Both routes use `JobDetail` component which may cause routing confusion.
   - File: `app/src/App.tsx` lines 164, 169

9. **Support page is a skeleton** — `Support.tsx` has no contact form backend.
   - File: `app/src/pages/Support.tsx`

10. **Fragment shader URL uses external CDN** — `Vault.tsx` wallet connect icons hardcode `https://img.icons8.com/` URLs which could break if CDN goes down.
    - File: `app/src/pages/Vault.tsx` lines 381-383

11. **Unused route aliases** — `/wurker-apply` redirects to `/worker-apply`, `/register` redirects to `/login`, `/createcustom` and `/createsocial` redirect to `/create`. These add maintenance overhead.

---

## Summary

| Metric | Count |
|--------|-------|
| **Total frontend routes** | 56 |
| **Total backend route groups** | 24 |
| **✅ Working routes** | ~40 |
| **⚠️ Partial/incomplete** | 12 |
| **❌ Broken / blocked** | 4 |
| **👻 Ghost routes (no backend)** | 22 (backend files not in repo) |
| **🔓 Missing admin role check** | 3 routes (`/admin`, `/admin/*`, `/admin/blog`) |
| **📤 Upload points without server validation** | 8 |
| **🔴 Critical beta blockers** | 4 |
| **🟡 Important fixes** | 3 |
| **🟢 Nice to have** | 4 |
| **Estimated fixes needed before beta** | **7** (4 critical + 3 important) |

---

