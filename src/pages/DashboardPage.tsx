import { Briefcase, CircleDollarSign, ListChecks, Wallet } from "lucide-react";
import { useState } from "react";
import { ActivityTable } from "../components/dashboard/ActivityTable";
import { EarningsChart } from "../components/dashboard/EarningsChart";
import { StatsCard } from "../components/dashboard/StatsCard";
import { CurrencyToggle } from "../components/ui/CurrencyToggle";
import { BalanceChip } from "../components/wallet/BalanceChip";
import { earningsHistory, mockJobs, recentTasks } from "../lib/mockData";
import type { PaymentCurrency } from "../lib/types";
import { formatNGN, formatUSDC } from "../lib/utils";
import { useWallet } from "../hooks/useWallet";

export function DashboardPage() {
  const [currency, setCurrency] = useState<PaymentCurrency>("NGN");
  const wallet = useWallet();
  return (
    <section className="section py-10">
      <h1 className="text-4xl font-extrabold">Dashboard</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <StatsCard icon={CircleDollarSign} title="Total earned" value={`${formatNGN(1245600)} + ${formatUSDC(754)}`} trend="+18%" />
        <StatsCard icon={ListChecks} title="Tasks completed" value="312" trend="+24" />
        <StatsCard icon={Briefcase} title="Active jobs" value="11" trend="5 urgent" />
        <StatsCard icon={Wallet} title="Wallet balance" value={formatUSDC(wallet.usdcBalance)} trend="ready" />
      </div>
      <div className="mt-8 flex items-center justify-between"><h2 className="text-2xl font-bold">Earnings</h2><CurrencyToggle value={currency} onChange={setCurrency} /></div>
      <div className="mt-4"><EarningsChart data={earningsHistory} currency={currency} /></div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div><h2 className="mb-4 text-2xl font-bold">Recent activity</h2><div className="overflow-x-auto"><ActivityTable tasks={recentTasks} /></div></div>
        <aside className="grid gap-4">
          <div className="glass rounded-lg p-5"><h3 className="font-bold">Quick actions</h3><div className="mt-4 grid gap-3"><a className="button-primary" href="/withdraw">Withdraw to Bank</a><a className="button-secondary" href="/withdraw">Withdraw to Wallet</a><a className="button-secondary" href="/create">Create Job</a><a className="button-secondary" href="/jobs">Browse Jobs</a></div></div>
          <div className="glass rounded-lg p-5"><h3 className="font-bold">Nigerian bank</h3><p className="mt-2 text-white/60">GTBank • 0123456789 • ADA OKAFOR</p><button className="button-secondary mt-4 w-full">Manage account</button></div>
          <div className="glass rounded-lg p-5"><h3 className="font-bold">Wallet</h3><p className="mt-2 break-all text-sm text-white/60">{wallet.address}</p><div className="mt-4 flex flex-wrap gap-2"><BalanceChip currency="SOL" amount={wallet.solBalance} /><BalanceChip currency="USDC" amount={wallet.usdcBalance} /><BalanceChip currency="NGN" amount={wallet.ngnBalance} /></div></div>
        </aside>
      </div>
      <div className="mt-8"><h2 className="text-2xl font-bold">Active jobs in progress</h2><div className="mt-4 grid gap-3 md:grid-cols-3">{mockJobs.slice(3, 6).map((job) => <div className="glass rounded-lg p-4" key={job.id}><p className="font-bold">{job.title}</p><p className="mt-2 text-sm text-white/55">{job.slots - job.slotsFilled} slots remaining</p></div>)}</div></div>
    </section>
  );
}
