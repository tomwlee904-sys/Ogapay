import { RefreshCw } from "lucide-react";
import { useExchangeRate } from "../../hooks/useExchangeRate";
import { formatNGN } from "../../lib/utils";

export function ExchangeRate() {
  const { rate, refresh, updatedAt } = useExchangeRate();
  return (
    <button onClick={refresh} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75">
      <RefreshCw size={15} /> 1 USDC = {formatNGN(rate)} <span className="hidden text-white/40 sm:inline">updated {updatedAt.toLocaleTimeString()}</span>
    </button>
  );
}
