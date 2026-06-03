import { create } from "zustand";

interface WalletState {
  connected: boolean;
  provider?: "Phantom" | "Solflare";
  address: string;
  solBalance: number;
  usdcBalance: number;
  ngnBalance: number;
  connect: (provider: "Phantom" | "Solflare") => void;
  disconnect: () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  connected: false,
  address: "",
  solBalance: 1.84,
  usdcBalance: 742.5,
  ngnBalance: 486250,
  connect: (provider) =>
    set({
      connected: true,
      provider,
      address: provider === "Phantom" ? "9nVDyEPMB3MZcvJg8qXwCW4yMz1ZQwL7Db1aQSspVbZ1" : "7bnk91J2Q6rFZziB4eiArWmfrMg7VLG9NdExSy4b6Bqi"
    }),
  disconnect: () => set({ connected: false, provider: undefined, address: "" })
}));
