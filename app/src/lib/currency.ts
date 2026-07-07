// ─── Types ────────────────────────────────────────────────────────────────
export type Currency = 'SOL' | 'USDC' | 'USDT' | 'NGN';
export type DisplayMode = Currency | 'BOTH';
export type CurrencyRates = Record<Currency, number>; // all values in USD

export const CURRENCIES: Currency[] = ['SOL', 'USDC', 'USDT', 'NGN'];
export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  SOL: 'SOL',
  USDC: '$',
  USDT: '$',
  NGN: '₦',
};
export const CURRENCY_LABELS: Record<Currency, string> = {
  SOL: 'SOL',
  USDC: 'USDC',
  USDT: 'USDT',
  NGN: 'NGN',
};
export const CURRENCY_NAMES: Record<Currency, string> = {
  SOL: 'Solana',
  USDC: 'USD Coin',
  USDT: 'Tether',
  NGN: 'Nigerian Naira',
};

// ─── Withdrawal constants ─────────────────────────────────────────────────
export const MIN_NGN_WITHDRAWAL = 5000;
export const NGN_WITHDRAW_LIMITS = {
  TIER_0: 5000,
  TIER_1: 10000,
  TIER_2: 20000,
  TIER_3: 200000,
};

// ─── Default fallback rates ───────────────────────────────────────────────
export const DEFAULT_RATES: CurrencyRates = {
  SOL: 145,    // 1 SOL = $145 USD
  USDC: 1,     // 1 USDC = $1 USD
  USDT: 1,     // 1 USDT = $1 USD
  NGN: 0.00066, // 1 NGN = $0.00066 USD (approx 1 USD = 1515 NGN)
};

// ─── Format helpers ───────────────────────────────────────────────────────
export function formatCurrency(amount: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  switch (currency) {
    case 'SOL':
      return `${symbol} ${amount.toFixed(amount < 1 ? 4 : 2)}`;
    case 'USDC':
    case 'USDT':
      return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'NGN':
      return `${symbol}${Math.round(amount).toLocaleString('en-US')}`;
  }
}

export function formatShort(amount: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  switch (currency) {
    case 'SOL':
      return `${symbol} ${amount.toFixed(amount < 1 ? 4 : 2)}`;
    case 'USDC':
    case 'USDT':
      return `${symbol}${amount.toFixed(2)}`;
    case 'NGN':
      return `${symbol}${Math.round(amount).toLocaleString('en-US')}`;
  }
}

// ─── Conversion ───────────────────────────────────────────────────────────
export function convertAmount(
  amount: number,
  from: Currency,
  to: Currency,
  rates: CurrencyRates
): number {
  if (from === to) return amount;
  // Convert from -> USD -> to
  const usdValue = amount * rates[from];
  const result = usdValue / rates[to];
  return result;
}

// ─── Compact number formatter (1K, 1M) ──────────────────────────────────
export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

// ─── Format task reward: USD primary, NGN secondary ─────────────────────
export function formatTaskReward(amount: number, currency?: string, rates?: CurrencyRates): string {
  if (currency && currency !== 'NGN') {
    const sym = currency === 'USDC' || currency === 'USD' ? '$' : currency === 'SOL' ? 'SOL ' : '';
    return `${sym}${amount.toLocaleString('en-US')}`;
  }
  const ngnRate = rates?.NGN || DEFAULT_RATES.NGN;
  const usd = amount * ngnRate;
  return `$${Math.round(usd).toLocaleString('en-US')} (₦${Math.round(amount).toLocaleString('en-US')})`;
}

// ─── Format both NGN and USDC ─────────────────────────────────────────────
export function formatBoth(amount: number, currency: Currency, rates: CurrencyRates): string {
  const ngn = currency === 'NGN' ? amount : convertAmount(amount, currency, 'NGN', rates);
  const usdc = currency === 'USDC' ? amount : convertAmount(amount, currency, 'USDC', rates);
  return `₦${Math.round(ngn).toLocaleString('en-US')} / $${usdc.toFixed(2)} USDC`;
}

// ─── Format with equivalents ──────────────────────────────────────────────
export function formatWithEquivalents(
  amount: number,
  primaryCurrency: Currency,
  rates: CurrencyRates
): { primary: string; secondary: string } {
  const primary = formatCurrency(amount, primaryCurrency);

  const equivalents = CURRENCIES
    .filter(c => c !== primaryCurrency)
    .map(c => {
      const converted = convertAmount(amount, primaryCurrency, c, rates);
      return formatShort(converted, c) + ' ' + c;
    });

  return {
    primary,
    secondary: equivalents.length > 0 ? `≈ ${equivalents.join(' · ')}` : '',
  };
}

// ─── Format balance from API (handles different formats) ──────────────────
export function parseBalance(bal: any, currency: Currency): number {
  if (bal === null || bal === undefined) return 0;
  if (typeof bal === 'number') return bal;
  if (typeof bal === 'string') return parseFloat(bal) || 0;
  if (bal.balance !== undefined) return parseFloat(bal.balance) || 0;
  if (bal.amount !== undefined) return parseFloat(bal.amount) || 0;
  return 0;
}

// ─── Fetch live rates from public APIs ────────────────────────────────────
export async function fetchLiveRates(): Promise<{ rates: CurrencyRates; lastUpdated: Date }> {
  let sol = DEFAULT_RATES.SOL;
  let usdc = DEFAULT_RATES.USDC;
  let usdt = DEFAULT_RATES.USDT;
  let ngn = DEFAULT_RATES.NGN;

  try {
    const cgRes = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana,usd-coin,tether&vs_currencies=usd',
      { signal: AbortSignal.timeout(8000) }
    );
    if (cgRes.ok) {
      const cg = await cgRes.json();
      if (cg?.solana?.usd) sol = cg.solana.usd;
      if (cg?.['usd-coin']?.usd) usdc = cg['usd-coin'].usd;
      if (cg?.tether?.usd) usdt = cg.tether.usd;
    }
  } catch { /* use defaults */ }

  try {
    const fxRes = await fetch(
      'https://open.er-api.com/v6/latest/USD',
      { signal: AbortSignal.timeout(8000) }
    );
    if (fxRes.ok) {
      const fx = await fxRes.json();
      if (fx?.rates?.NGN) ngn = 1 / Number(fx.rates.NGN);
    }
  } catch { /* use defaults */ }

  return {
    rates: { SOL: sol, USDC: usdc, USDT: usdt, NGN: ngn },
    lastUpdated: new Date(),
  };
}

// ─── Fetch rates from backend (legacy, with live fallback) ───────────────
export async function fetchRates(
  apiBase: string
): Promise<{ rates: CurrencyRates; lastUpdated: Date }> {
  try {
    const res = await fetch(`${apiBase}/rates`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error('Failed to fetch rates');
    const json = await res.json();
    const data = json.data || json;
    const rawNgn = Number(data.NGN || data.ngn || DEFAULT_RATES.NGN);
    return {
      rates: {
        SOL: Number(data.SOL || data.sol || DEFAULT_RATES.SOL),
        USDC: Number(data.USDC || data.usdc || DEFAULT_RATES.USDC),
        USDT: Number(data.USDT || data.usdt || DEFAULT_RATES.USDT),
        NGN: rawNgn > 1 ? 1 / rawNgn : rawNgn,
      },
      lastUpdated: new Date(),
    };
  } catch {
    // Fallback to live public API
    return fetchLiveRates();
  }
}

// ─── Get stored preference ───────────────────────────────────────────────
export function getStoredCurrency(): DisplayMode {
  try {
    const stored = localStorage.getItem('ogapay_currency');
    if (stored && (stored === 'BOTH' || CURRENCIES.includes(stored as Currency))) return stored as DisplayMode;
  } catch {}
  return 'NGN';
}

export function storeCurrency(currency: DisplayMode): void {
  try { localStorage.setItem('ogapay_currency', currency); } catch {}
}
