import { LogOut, Wallet } from "lucide-react";
import { useState } from "react";
import { useWallet } from "../../hooks/useWallet";
import { WalletModal } from "./WalletModal";

export function WalletButton() {
  const wallet = useWallet();
  const [open, setOpen] = useState(false);
  if (wallet.connected) {
    return (
      <button className="button-secondary py-2" onClick={wallet.disconnect}>
        <LogOut size={16} /> {wallet.shortAddress}
      </button>
    );
  }
  return (
    <>
      <button className="button-primary py-2" onClick={() => setOpen(true)}>
        <Wallet size={16} /> Connect
      </button>
      <WalletModal open={open} onClose={() => setOpen(false)} onConnect={(provider) => { wallet.connect(provider); setOpen(false); }} />
    </>
  );
}
