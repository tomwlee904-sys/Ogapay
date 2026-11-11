// Stand-ins for welcome-flow.test.cjs: the signed-in person and this device's
// push alerts. WelcomeHost, WelcomeFlow, the Sheet, Toast and lib/api are real.
const w = window as any

export const useAuth = () => ({ user: w.__user, isAuthed: !!w.__user })

export type PushState = 'unsupported' | 'install-first' | 'unavailable' | 'blocked' | 'off' | 'on'
export const pushState = async (): Promise<PushState> => w.__push
export const turnOnPush = async (): Promise<PushState> => { w.__turnOn = (w.__turnOn || 0) + 1; w.__push = 'on'; return 'on' }
// Display currency for the first job bonus line (lib/useMoney): naira
export const useCurrency = () => ({ preferredCurrency: 'NGN', convert: (a: number) => a, rates: {}, loading: false, lastUpdated: null })
