// Stand-in for verification-text.test.cjs: the signed-in person. Verification,
// TransferModal, Toast, lib/api, lib/levels and lib/wallet are real.
const w = window as any

export const useAuth = () => ({ user: w.__user, isAuthed: !!w.__user, refreshUser: async () => { w.__refreshed = (w.__refreshed || 0) + 1 } })
