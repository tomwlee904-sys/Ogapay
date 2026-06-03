import { useState } from "react";
import { NIGERIAN_BANKS, NGN_RATE } from "../lib/constants";
import { withdrawalHistory } from "../lib/mockData";
import { formatNGN, formatUSDC } from "../lib/utils";
import { useWithdraw } from "../hooks/useWithdraw";
import { useWallet } from "../hooks/useWallet";

export function WithdrawPage() {
  const [tab, setTab] = useState<"crypto" | "naira">("naira");
  const flow = useWithdraw(NGN_RATE);
  const wallet = useWallet();
  return (
    <section className="section py-10">
      <h1 className="text-4xl font-extrabold">Withdraw</h1><p className="mt-2 text-white/60">1 USDC = {formatNGN(NGN_RATE)}. Naira fee is 1% capped at ₦1,500.</p>
      <div className="mt-6 inline-grid grid-cols-2 rounded-lg border border-white/10 bg-white/5 p-1"><button className={`rounded-md px-4 py-2 font-bold ${tab === "crypto" ? "bg-ogaviolet" : "text-white/60"}`} onClick={() => setTab("crypto")}>Crypto Withdrawal</button><button className={`rounded-md px-4 py-2 font-bold ${tab === "naira" ? "bg-ogaviolet" : "text-white/60"}`} onClick={() => setTab("naira")}>Naira Withdrawal</button></div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="glass rounded-lg p-6">
          {tab === "crypto" ? <div className="grid gap-4"><h2 className="text-2xl font-bold">Send to wallet</h2><input className="field" placeholder="Amount" /><select className="field"><option>USDC</option><option>SOL</option></select><input className="field" value={wallet.address} readOnly /><button className="button-primary">Submit crypto withdrawal</button></div> : <div className="grid gap-4"><h2 className="text-2xl font-bold">Send to Nigerian bank</h2><input className="field" type="number" value={flow.amountUsdc} onChange={(e) => flow.setAmountUsdc(Number(e.target.value))} /><select className="field">{NIGERIAN_BANKS.map((bank) => <option key={bank.code}>{bank.name}</option>)}</select><input className="field" maxLength={10} value={flow.accountNumber} onChange={(e) => flow.setAccountNumber(e.target.value)} placeholder="10-digit NUBAN account number" /><button className="button-secondary" onClick={flow.verify} disabled={!flow.canVerify}>Verify Account</button>{flow.accountName && <p className="rounded-lg bg-emerald-400/10 p-3 text-emerald-200">{flow.accountName}</p>}<button className="button-primary">Submit Naira withdrawal</button></div>}
        </div>
        <aside className="glass rounded-lg p-5"><h2 className="font-bold">Preview</h2><p className="mt-4 text-white/55">Source</p><p className="text-xl font-bold">{formatUSDC(flow.amountUsdc)} USDC</p><p className="mt-4 text-white/55">Fee</p><p>{formatNGN(flow.feeNgn)}</p><p className="mt-4 text-white/55">You receive</p><p className="text-3xl font-extrabold text-emerald-300">{formatNGN(flow.receivableNgn)}</p><p className="mt-4 text-sm text-white/50">Processing time: 1-2 business days.</p></aside>
      </div>
      <div className="mt-8 glass overflow-hidden rounded-lg"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-white/5 text-white/50"><tr><th className="p-4">Type</th><th>Destination</th><th>Amount</th><th>Fee</th><th>Status</th><th>Date</th></tr></thead><tbody>{withdrawalHistory.map((row) => <tr key={row.id} className="border-t border-white/10"><td className="p-4">{row.type}</td><td>{row.destination}</td><td>{row.amount}</td><td>{row.fee}</td><td>{row.status}</td><td>{new Date(row.date).toLocaleDateString()}</td></tr>)}</tbody></table></div>
    </section>
  );
}
