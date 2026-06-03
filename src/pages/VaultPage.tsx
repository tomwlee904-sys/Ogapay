import { CountdownTimer } from "../components/ui/CountdownTimer";
import { vaultDistributions } from "../lib/mockData";
import { formatUSDC } from "../lib/utils";

export function VaultPage() {
  return (
    <section className="section py-10">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><h1 className="text-4xl font-extrabold">$OGAPAY Vault</h1><p className="mt-2 text-white/60">Marketplace revenue distribution every 12 hours.</p></div><CountdownTimer /></div>
      <div className="mt-6 grid gap-4 md:grid-cols-4">{[["Price", "$0.048"], ["Market cap", "$18.2M"], ["Holders", "8,510"], ["24h volume", "$642K"]].map(([label, value]) => <div className="glass rounded-lg p-5" key={label}><p className="text-white/50">{label}</p><p className="mt-2 text-2xl font-extrabold">{value}</p></div>)}</div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="glass rounded-lg p-6"><h2 className="text-2xl font-bold">Distribution history</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="text-white/50"><tr><th className="py-3">Date</th><th>Revenue</th><th>Holders</th><th>My reward</th><th>Status</th></tr></thead><tbody>{vaultDistributions.map((row) => <tr className="border-t border-white/10" key={row.id}><td className="py-4">{new Date(row.date).toLocaleString()}</td><td>{formatUSDC(row.revenueUsdc)}</td><td>{row.tokenHolders.toLocaleString()}</td><td className="text-emerald-300">{formatUSDC(row.userRewardUsdc)}</td><td>{row.status}</td></tr>)}</tbody></table></div></div>
        <aside className="grid gap-4"><div className="glass rounded-lg p-5"><h3 className="font-bold">My vault balance</h3><p className="mt-3 text-3xl font-extrabold">128,400 OGAPAY</p><p className="mt-2 text-emerald-300">Claimable: {formatUSDC(42.8)}</p><button className="button-primary mt-4 w-full">Claim rewards</button></div><div className="glass rounded-lg p-5"><h3 className="font-bold">How to qualify</h3><p className="mt-2 text-white/60">Hold OGAPAY, complete wallet verification, and keep at least one task or job transaction active in the last 30 days.</p></div></aside>
      </div>
    </section>
  );
}
