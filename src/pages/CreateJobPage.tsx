import { useMemo, useState } from "react";
import { CurrencyToggle } from "../components/ui/CurrencyToggle";
import { StepIndicator } from "../components/ui/StepIndicator";
import { NGN_RATE, PLATFORMS } from "../lib/constants";
import type { PaymentCurrency } from "../lib/types";
import { formatCurrency, formatNGN } from "../lib/utils";

const steps = ["Job Type", "Details", "Pricing", "Review"];

export function CreateJobPage() {
  const [step, setStep] = useState(0);
  const [currency, setCurrency] = useState<PaymentCurrency>("USDC");
  const [price, setPrice] = useState(2.5);
  const [slots, setSlots] = useState(100);
  const total = useMemo(() => price * slots, [price, slots]);
  return (
    <section className="section py-10">
      <h1 className="text-4xl font-extrabold">Create job</h1>
      <div className="mt-6"><StepIndicator steps={steps} current={step} /></div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="glass rounded-lg p-6">
          {step === 0 && <div><h2 className="text-2xl font-bold">Choose job type</h2><div className="mt-5 grid gap-3 md:grid-cols-2">{["Social Growth", "Custom Task", "Poll", "Feedback"].map((type) => <button className="button-secondary justify-start" key={type}>{type}</button>)}</div></div>}
          {step === 1 && <div className="grid gap-4"><h2 className="text-2xl font-bold">Task details</h2><input className="field" placeholder="Job title" /><textarea className="field min-h-32" placeholder="Description and requirements" /><select className="field">{PLATFORMS.map((p) => <option key={p}>{p}</option>)}</select><select className="field"><option>Screenshot + URL</option><option>Text response</option><option>Public post URL</option></select></div>}
          {step === 2 && <div className="grid gap-4"><h2 className="text-2xl font-bold">Pricing and slots</h2><CurrencyToggle value={currency} onChange={setCurrency} /><input className="field" type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} /><input className="field" type="number" value={slots} onChange={(e) => setSlots(Number(e.target.value))} /><p className="text-emerald-300">Total budget: {formatCurrency(total, currency)}</p></div>}
          {step === 3 && <div><h2 className="text-2xl font-bold">Review and fund</h2><div className="mt-5 rounded-lg bg-white/5 p-5 text-white/70"><p>Budget: {formatCurrency(total, currency)}</p><p>On-chain USDC equivalent: ${currency === "NGN" ? (total / NGN_RATE).toFixed(2) : currency === "SOL" ? (total * 150).toFixed(2) : total.toFixed(2)}</p><p>NGN preview: {formatNGN(currency === "NGN" ? total : currency === "SOL" ? total * 150 * NGN_RATE : total * NGN_RATE)}</p></div><div className="mt-5 flex gap-3"><button className="button-primary">Fund with wallet</button><button className="button-secondary">Fund with Paystack</button></div></div>}
          <div className="mt-8 flex justify-between"><button className="button-secondary" disabled={step === 0} onClick={() => setStep(Math.max(0, step - 1))}>Back</button><button className="button-primary" onClick={() => setStep(Math.min(3, step + 1))}>{step === 3 ? "Confirm" : "Next"}</button></div>
        </div>
        <aside className="glass rounded-lg p-5"><h3 className="font-bold">Budget calculator</h3><p className="mt-3 text-3xl font-extrabold text-emerald-300">{formatCurrency(total, currency)}</p><p className="mt-2 text-white/55">{slots} slots at {formatCurrency(price, currency)} per verified task. NGN jobs are auto-converted to USDC for escrow.</p></aside>
      </div>
    </section>
  );
}
