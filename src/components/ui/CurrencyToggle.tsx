import type { PaymentCurrency } from "../../lib/types";

interface Props {
  value: PaymentCurrency;
  onChange: (value: PaymentCurrency) => void;
}

export function CurrencyToggle({ value, onChange }: Props) {
  return (
    <div className="inline-grid grid-cols-3 rounded-lg border border-white/10 bg-white/5 p-1">
      {(["USDC", "SOL", "NGN"] as PaymentCurrency[]).map((currency) => (
        <button key={currency} onClick={() => onChange(currency)} className={`rounded-md px-3 py-2 text-sm font-bold transition ${value === currency ? "bg-ogaviolet text-white" : "text-white/60 hover:text-white"}`}>
          {currency}
        </button>
      ))}
    </div>
  );
}
