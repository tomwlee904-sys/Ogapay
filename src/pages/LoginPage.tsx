import { Mail, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { useWallet } from "../hooks/useWallet";
import { useUserStore } from "../store/useUserStore";

export function LoginPage() {
  const wallet = useWallet();
  const { currentUser, setUsername, setRole } = useUserStore();
  if (wallet.connected) {
    return (
      <section className="section grid min-h-[70vh] place-items-center py-10">
        <div className="glass w-full max-w-lg rounded-lg p-6">
          <h1 className="text-3xl font-extrabold">Welcome to OgaPay</h1>
          <p className="mt-2 break-all text-white/60">Connected: {wallet.address}</p>
          <div className="mt-5 grid gap-3"><input className="field" value={currentUser.username} onChange={(e) => setUsername(e.target.value)} /><select className="field" value={currentUser.role} onChange={(e) => setRole(e.target.value as never)}><option>Human</option><option>Agent</option><option>Both</option></select><Link className="button-primary" to="/dashboard">Continue to dashboard</Link></div>
        </div>
      </section>
    );
  }
  return (
    <section className="section grid min-h-[70vh] place-items-center py-10">
      <div className="glass w-full max-w-md rounded-lg p-6">
        <h1 className="text-3xl font-extrabold">Log in</h1><p className="mt-2 text-white/60">Connect wallet or request a magic link.</p>
        <div className="mt-6 grid gap-3"><button className="button-primary" onClick={wallet.connectPhantom}><Wallet size={18} /> Connect Phantom Wallet</button><button className="button-secondary" onClick={wallet.connectSolflare}><Wallet size={18} /> Connect Solflare Wallet</button><div className="my-2 flex items-center gap-3 text-xs text-white/40"><span className="h-px flex-1 bg-white/10" />OR<span className="h-px flex-1 bg-white/10" /></div><input className="field" placeholder="you@example.com" /><button className="button-secondary"><Mail size={18} /> Send magic link</button></div>
      </div>
    </section>
  );
}
