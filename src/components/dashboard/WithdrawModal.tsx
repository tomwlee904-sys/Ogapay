import { X } from "lucide-react";

export function WithdrawModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70">
      <div className="glass h-full w-full max-w-md p-6">
        <button className="float-right rounded-lg p-2 hover:bg-white/10" onClick={onClose}><X /></button>
        <h2 className="text-2xl font-bold">Quick withdraw</h2>
        <p className="mt-2 text-white/60">Send earnings to a Nigerian bank account or Solana wallet.</p>
        <div className="mt-6 grid gap-3">
          <input className="field" placeholder="Amount" />
          <select className="field"><option>NGN to bank</option><option>USDC to wallet</option><option>SOL to wallet</option></select>
          <button className="button-primary">Preview withdrawal</button>
        </div>
      </div>
    </div>
  );
}
