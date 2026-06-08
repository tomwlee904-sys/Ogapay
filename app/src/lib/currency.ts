// ─── Types ────────────────────────────────────────────────────────────────
export type Currency = 'SOL' | 'USDC' | 'NGN';
export type CurrencyRates = Record<Currency, number>; // all values in USD

export const CURRENCIES: Currency[] = ['SOL', 'USDC', 'NGN'];
export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  SOL: '◎',
  USDC: '$',
  NGN: '₦',
};
export const CURRENCY_LABELS: Record<Currency, string> = {
  SOL: 'SOL',
  USDC: 'USDC',
  NGN: 'NGN',
};
export const CURRENCY_NAMES: Record<Currency, string> = {
  SOL: 'Solana',
  USDC: 'USD Coin',
  NGN: 'Nigerian Naira',
};

// ─── Default fallback rates ───────────────────────────────────────────────
export const DEFAULT_RATES: CurrencyRates = {
  SOL: 145,    // 1 SOL = $145 USD
  USDC: 1,     // 1 USDC = $1 USD
  NGN: 0.00066, // 1 NGN = $0.00066 USD (approx 1 USD = 1515 NGN)
};

// ─── Format helpers ───────────────────────────────────────────────────────
export function formatCurrency(amount: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  switch (currency) {
    case 'SOL':
      return `${symbol}${amount.toFixed(amount < 1 ? 4 : 2)} SOL`;
    case 'USDC':
      return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'NGN':
      return `${symbol}${Math.round(amount).toLocaleString('en-US')}`;
  }
}

export function formatShort(amount: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  switch (currency) {
    case 'SOL':
      return `${symbol}${amount.toFixed(amount < 1 ? 4 : 2)}`;
    case 'USDC':
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

// ─── Fetch rates from backend ─────────────────────────────────────────────
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
    return {
      rates: {
        SOL: Number(data.SOL || data.sol || DEFAULT_RATES.SOL),
        USDC: Number(data.USDC || data.usdc || DEFAULT_RATES.USDC),
        NGN: Number(data.NGN || data.ngn || DEFAULT_RATES.NGN),
      },
      lastUpdated: new Date(),
    };
  } catch {
    // Fallback to defaults
    return { rates: { ...DEFAULT_RATES }, lastUpdated: new Date() };
  }
}

// ─── Get stored preference ───────────────────────────────────────────────
export function getStoredCurrency(): Currency {
  try {
    const stored = localStorage.getItem('ogapay_currency');
    if (stored && CURRENCIES.includes(stored as Currency)) return stored as Currency;
  } catch {}
  return 'NGN';
}

export function storeCurrency(currency: Currency): void {
  try { localStorage.setItem('ogapay_currency', currency); } catch {}
}
