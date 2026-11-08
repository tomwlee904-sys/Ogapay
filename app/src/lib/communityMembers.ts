import { apiRequest } from './api'

// Leaders' member tools for a community (owner and admins): list members with
// roles, change a role, remove, remove and ban, and lift a ban. All the calls
// sit here so the paths match the backend in one place (2026-11-08).

export type CommunityRole = 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER'
export type CommunityMemberRow = {
  id: string; userId: string; username: string; firstName: string | null; lastName: string | null
  avatarUrl: string | null; role: CommunityRole; joinedAt: string
}
export type CommunityBan = {
  userId: string; username: string; firstName: string | null; lastName: string | null; avatarUrl: string | null
  bannedAt: string | null; bannedBy: { id: string; username: string | null } | null
}

const base = (communityId: string) => `/communities/${encodeURIComponent(communityId)}`

export const listMembers = (communityId: string) =>
  apiRequest<CommunityMemberRow[]>(`${base(communityId)}/members`, { fresh: true })

export const changeRole = (communityId: string, memberId: string, role: Exclude<CommunityRole, 'OWNER'>) =>
  apiRequest(`${base(communityId)}/members/${encodeURIComponent(memberId)}`, { method: 'PATCH', body: JSON.stringify({ role }) })

export const removeMember = (communityId: string, memberId: string) =>
  apiRequest(`${base(communityId)}/members/${encodeURIComponent(memberId)}`, { method: 'DELETE' })

// Removes them and stops them joining, asking or being invited again until a leader lifts the ban
export const banMember = (communityId: string, memberId: string) =>
  apiRequest(`${base(communityId)}/members/${encodeURIComponent(memberId)}/ban`, { method: 'POST' })

export const listBans = (communityId: string) =>
  apiRequest<CommunityBan[]>(`${base(communityId)}/members/banned`, { fresh: true })

export const unban = (communityId: string, userId: string) =>
  apiRequest(`${base(communityId)}/members/banned/${encodeURIComponent(userId)}`, { method: 'DELETE' })

// '(OgaPay)' only for OgaPay's own communities, not ones you help run as an
// admin or moderator. Uses the server's `platform` flag; an older reply only had
// `mine` (you own it), so that is the fallback (2026-11-08).
export const isOgaPayCommunity = (c: { mine?: boolean; platform?: boolean }) =>
  typeof c.platform === 'boolean' ? c.platform : !c.mine
