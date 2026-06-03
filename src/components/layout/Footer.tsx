import { Bolt, Github, Twitter } from "lucide-react";
import { Link } from "react-router-dom";
import { CopyButton } from "../ui/CopyButton";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-white/10 py-10">
      <div className="section grid gap-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2 text-xl font-extrabold"><span className="rounded-lg bg-ogaviolet p-2"><Bolt size={18} /></span>OgaPay</div>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/55">Hire Humans. Earn Crypto. Pay in Naira. OgaPay combines Solana rails with Nigerian bank payouts for microtask work.</p>
          <div className="mt-4 flex items-center gap-2 text-white/60"><Twitter size={18} /><Github size={18} /></div>
        </div>
        <div className="grid gap-2 text-sm text-white/60">
          <Link to="/jobs">Browse jobs</Link><Link to="/developer">Developer API</Link><Link to="/vault">$OGAPAY vault</Link><Link to="/withdraw">Withdraw</Link>
        </div>
        <div>
          <p className="text-sm font-bold">Token CA</p>
          <div className="mt-2 flex gap-2"><code className="min-w-0 flex-1 truncate rounded-lg bg-white/5 p-3 text-xs">OGAPay1111111111111111111111111111111111</code><CopyButton value="OGAPay1111111111111111111111111111111111" /></div>
          <p className="mt-3 text-xs text-white/45">Mock application. Payments, token stats, and bank verification are demo flows.</p>
        </div>
      </div>
    </footer>
  );
}
