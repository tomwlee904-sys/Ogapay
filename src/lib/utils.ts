import { formatDistanceToNow } from "date-fns";
import type { PaymentCurrency } from "./types";

export const cn = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ");

export function formatNGN(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatUSDC(amount: number) {
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatSOL(amount: number) {
  return `${amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL`;
}

export function formatCurrency(amount: number, currency: PaymentCurrency) {
  if (currency === "NGN") return formatNGN(amount);
  if (currency === "SOL") return formatSOL(amount);
  return `${formatUSDC(amount)} USDC`;
}

export function convertToNGN(usdc: number, rate: number) {
  return usdc * rate;
}

export function truncateAddress(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function timeAgo(date: string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function getStatusColor(status: string) {
  const map: Record<string, string> = {
    open: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    completed: "border-violet-400/30 bg-violet-400/10 text-violet-200",
    submitted: "border-blue-400/30 bg-blue-400/10 text-blue-200",
    approved: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    pending: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    paid: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    rejected: "border-rose-400/30 bg-rose-400/10 text-rose-200"
  };
  return map[status] ?? "border-white/10 bg-white/5 text-white/80";
}

export function dualPrice(price: number, currency: PaymentCurrency, rate: number) {
  if (currency === "NGN") return `${formatNGN(price)} / ${formatUSDC(price / rate)}`;
  if (currency === "SOL") return `${formatSOL(price)} / ${formatNGN(price * 150 * rate)}`;
  return `${formatUSDC(price)} / ${formatNGN(convertToNGN(price, rate))}`;
}
