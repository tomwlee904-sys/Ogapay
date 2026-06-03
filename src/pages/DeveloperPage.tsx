import { useState } from "react";
import { API_ENDPOINTS } from "../lib/constants";
import { CopyButton } from "../components/ui/CopyButton";

const code = `npm install @ogapay/sdk

import { OgaPay } from "@ogapay/sdk";

const ogapay = new OgaPay({ apiKey: process.env.OGAPAY_API_KEY });

await ogapay.jobs.create({
  title: "Review onboarding flow",
  payout: { currency: "NGN", amount: 4500 },
  proof: "screenshot_url",
  slots: 50
});`;

export function DeveloperPage() {
  const [result, setResult] = useState("Awaiting request");
  return (
    <section className="section py-10">
      <h1 className="text-4xl font-extrabold">Developer API</h1>
      <p className="mt-2 max-w-2xl text-white/60">Use x402, MPP, and MCP endpoints to programmatically fund human work and request NGN payouts.</p>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="glass rounded-lg p-6"><div className="flex items-center justify-between"><h2 className="text-2xl font-bold">Quick start</h2><CopyButton value={code} /></div><pre className="mt-4 overflow-x-auto rounded-lg bg-black/40 p-4 text-sm text-emerald-100"><code>{code}</code></pre></div>
        <aside className="glass rounded-lg p-6"><h2 className="text-2xl font-bold">Try it</h2><input className="field mt-4" defaultValue="Review OgaPay landing copy" /><select className="field mt-3"><option>NGN payout</option><option>USDC payout</option><option>SOL payout</option></select><button className="button-primary mt-3 w-full" onClick={() => setResult("201 Created: job_oga_8D29 funded with NGN escrow preview")}>Mock API call</button><p className="mt-4 rounded-lg bg-white/5 p-3 text-sm text-white/70">{result}</p></aside>
      </div>
      <div className="mt-8 glass rounded-lg p-6"><h2 className="text-2xl font-bold">Endpoint reference</h2><div className="mt-4 grid gap-3">{API_ENDPOINTS.map((endpoint) => <div key={endpoint.path} className="grid gap-2 rounded-lg bg-white/5 p-4 md:grid-cols-[90px_220px_1fr]"><strong className="text-emerald-300">{endpoint.method}</strong><code>{endpoint.path}</code><span className="text-white/60">{endpoint.description}</span></div>)}</div></div>
      <div className="mt-8 grid gap-4 md:grid-cols-2"><div className="glass rounded-lg p-6"><h2 className="text-xl font-bold">Authentication</h2><p className="mt-2 text-white/60">Send `Authorization: Bearer` API keys for server requests or sign one-time Solana wallet messages for browser clients.</p></div><div className="glass rounded-lg p-6"><h2 className="text-xl font-bold">NGN payouts</h2><p className="mt-2 text-white/60">Use `/v1/payouts/ngn` with bank code, 10-digit NUBAN, account name, and USDC source balance. Fees are capped at ₦1,500.</p></div></div>
    </section>
  );
}
