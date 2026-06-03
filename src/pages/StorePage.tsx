import { useParams } from "react-router-dom";
import { CurrencyToggle } from "../components/ui/CurrencyToggle";
import { gigStores, mockUsers } from "../lib/mockData";
import { formatCurrency } from "../lib/utils";
import { useState } from "react";
import type { PaymentCurrency } from "../lib/types";

export function StorePage() {
  const { username = "adaflow" } = useParams();
  const user = mockUsers.find((item) => item.username === username) ?? mockUsers[0];
  const gigs = gigStores.filter((gig) => gig.username === user.username);
  const [currency, setCurrency] = useState<PaymentCurrency>("NGN");
  return (
    <section className="section py-10">
      <div className="glass rounded-lg p-6"><div className="flex items-center gap-4"><img src={user.avatar} alt="" className="h-16 w-16 rounded-lg" /><div><h1 className="text-4xl font-extrabold">@{user.username} store</h1><p className="text-white/60">{user.bio}</p></div></div></div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]"><div className="grid gap-4 md:grid-cols-2">{gigs.map((gig) => <div className="glass rounded-lg p-5" key={gig.id}><h2 className="text-xl font-bold">{gig.title}</h2><p className="mt-2 text-white/60">{gig.description}</p><p className="mt-4 text-emerald-300">{formatCurrency(gig.price, gig.currency)} • {gig.deliveryTime}</p><button className="button-primary mt-4 w-full">Order gig</button></div>)}</div><aside className="glass rounded-lg p-5"><h2 className="text-2xl font-bold">Order a gig</h2><CurrencyToggle value={currency} onChange={setCurrency} /><input className="field mt-4" placeholder="Project brief" /><textarea className="field mt-3 min-h-28" placeholder="What do you need?" /><button className="button-primary mt-3 w-full">{currency === "NGN" ? "Pay with Paystack" : `Pay with ${currency}`}</button></aside></div>
    </section>
  );
}
