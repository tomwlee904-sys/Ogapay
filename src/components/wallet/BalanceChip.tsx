import type { PaymentCurrency } from "../../lib/types";
import { formatCurrency } from "../../lib/utils";

export function BalanceChip({ currency, amount }: { currency: PaymentCurrency; amount: number }) {
  return <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/80">{formatCurrency(amount, currency)}</span>;
}
