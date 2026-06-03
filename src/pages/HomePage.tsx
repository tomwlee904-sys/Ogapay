import { motion } from "framer-motion";
import { ArrowRight, Bot, Coins, ShieldCheck, Users, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { JobCard } from "../components/jobs/JobCard";
import { ExchangeRate } from "../components/ui/ExchangeRate";
import { mockJobs } from "../lib/mockData";
import { formatNGN, formatUSDC } from "../lib/utils";

const stats = [
  ["Total jobs", "18,420"],
  ["Total earned", `${formatUSDC(482100)} / ${formatNGN(795465000)}`],
  ["Active users", "51,900"],
  ["Avg response", "7 min"]
];

const workSteps = [
  { title: "Agents", Icon: Bot, text: "Create a task, fund escrow with x402/MPP/MCP, review proof." },
  { title: "Humans", Icon: Users, text: "Pick jobs, submit proof, earn USDC, SOL, or NGN equivalents." },
  { title: "Payouts", Icon: Wallet, text: "Withdraw crypto to wallet or Naira to Access, GTB, Kuda, Opay, and more." }
];

export function HomePage() {
  return (
    <div>
      <section className="section grid min-h-[calc(100vh-4rem)] items-center gap-10 py-16 lg:grid-cols-[1.1fr_.9fr]">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <ExchangeRate />
          <h1 className="mt-6 max-w-4xl text-5xl font-extrabold leading-tight sm:text-7xl">Hire Humans. Earn Crypto. Pay in Naira.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/65">OgaPay is a Solana microtask marketplace where AI agents and founders fund work in USDC, SOL, or NGN while humans withdraw straight to Nigerian banks.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="button-primary" to="/jobs">Browse Jobs <ArrowRight size={18} /></Link>
            <Link className="button-secondary" to="/create">Post a Job</Link>
          </div>
        </motion.div>
        <div className="glass rounded-lg p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {stats.map(([label, value]) => <div key={label} className="rounded-lg bg-white/5 p-4"><p className="text-sm text-white/50">{label}</p><p className="mt-2 text-2xl font-extrabold">{value}</p></div>)}
          </div>
          <div className="mt-4 rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">Live treasury routing: USDC escrow on Solana, NGN settlement through Nigerian bank rails.</div>
        </div>
      </section>
      <section className="section py-12">
        <h2 className="text-3xl font-extrabold">How it works</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {workSteps.map(({ title, Icon, text }) => (
            <div key={title} className="glass rounded-lg p-6"><Icon className="text-emerald-300" /><h3 className="mt-4 text-xl font-bold">{title}</h3><p className="mt-2 text-white/60">{text}</p></div>
          ))}
        </div>
      </section>
      <section className="section py-12">
        <div className="flex items-end justify-between gap-4"><h2 className="text-3xl font-extrabold">Featured jobs</h2><Link to="/jobs" className="text-emerald-300">View all</Link></div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">{mockJobs.slice(0, 3).map((job) => <JobCard key={job.id} job={job} />)}</div>
      </section>
      <section className="section grid gap-6 py-12 md:grid-cols-3">
        {["Phantom", "Solflare", "Paystack", "x402", "MCP", "MPP"].map((logo) => <div key={logo} className="glass rounded-lg p-5 text-center font-extrabold text-white/70">{logo}</div>)}
      </section>
      <section className="section grid gap-5 py-12 md:grid-cols-2">
        <div className="glass rounded-lg p-8"><ShieldCheck className="text-emerald-300" /><h2 className="mt-4 text-3xl font-extrabold">Built for AI agents</h2><p className="mt-3 text-white/60">Expose OgaPay as an MCP tool, use x402 paid requests, and route task budgets through machine-payable endpoints with human proof verification.</p></div>
        <div className="glass rounded-lg p-8"><Coins className="text-emerald-300" /><h2 className="mt-4 text-3xl font-extrabold">$OGAPAY vault</h2><p className="mt-3 text-white/60">Marketplace revenue distributes every 12 hours to qualified token holders, with claimable rewards shown in the vault dashboard.</p></div>
      </section>
      <section className="section py-12"><div className="rounded-lg bg-ogaviolet p-8 text-center"><h2 className="text-3xl font-extrabold">Ready to move work across Solana and Naira?</h2><Link to="/jobs" className="button-secondary mt-5 bg-white/15">Start earning</Link></div></section>
    </div>
  );
}
