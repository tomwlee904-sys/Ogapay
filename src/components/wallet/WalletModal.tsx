import { Wallet } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onConnect: (provider: "Phantom" | "Solflare") => void;
}

export function WalletModal({ open, onClose, onConnect }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <div className="glass w-full max-w-md rounded-lg p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Connect wallet</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white">Close</button>
        </div>
        <div className="mt-5 grid gap-3">
          {(["Phantom", "Solflare"] as const).map((provider) => (
            <button key={provider} className="button-secondary justify-start" onClick={() => onConnect(provider)}>
              <Wallet size={18} /> Connect {provider}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
