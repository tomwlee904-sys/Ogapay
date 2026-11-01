// Stand-in for contest-raise.test.cjs: the display currency (naira unless the
// test page sets window.__pref, e.g. "BOTH"), with a fixed ₦1,500 to the dollar,
// so the page asks for no rates. ContestPanel, Money, Toast, lib/api and
// lib/contestPrizes are the real ones.
const rate = (a: number, from: string, to: string) => (from === to ? a : from === 'NGN' ? a / 1500 : to === 'NGN' ? a * 1500 : a)
export const useCurrency = () => ({ preferredCurrency: (window as any).__pref || 'NGN', convert: rate })
