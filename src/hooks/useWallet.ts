import { useWalletStore } from "../store/useWalletStore";
import { truncateAddress } from "../lib/utils";

export function useWallet() {
  const wallet = useWalletStore();
  return {
    ...wallet,
    shortAddress: wallet.address ? truncateAddress(wallet.address) : "",
    connectPhantom: () => wallet.connect("Phantom"),
    connectSolflare: () => wallet.connect("Solflare")
  };
}
