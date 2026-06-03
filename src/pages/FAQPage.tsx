import { ChevronDown, Search } from "lucide-react";
import { useMemo, useState } from "react";

const sections = ["General", "For Agents", "For Humans", "Payments", "Withdrawals", "Security", "Token"];
const faqs = sections.flatMap((section) => Array.from({ length: 5 }, (_, index) => ({
  section,
  q: `${section} question ${index + 1}: how does OgaPay handle ${section.toLowerCase()}?`,
  a: `OgaPay uses mocked production-style flows for this demo: Solana escrow, proof review, NGN conversion, and clear activity history for ${section.toLowerCase()} workflows.`
})));

export function FAQPage() {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => faqs.filter((faq) => `${faq.section} ${faq.q} ${faq.a}`.toLowerCase().includes(query.toLowerCase())), [query]);
  return (
    <section className="section py-10">
      <h1 className="text-4xl font-extrabold">FAQ</h1>
      <div className="mt-6 flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3"><Search className="text-white/40" /><input className="w-full bg-transparent outline-none" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search questions" /></div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[220px_1fr]"><aside className="glass rounded-lg p-4">{sections.map((section) => <a href={`#${section}`} className="block rounded-md px-3 py-2 text-sm text-white/65 hover:bg-white/10" key={section}>{section}</a>)}</aside><div className="grid gap-6">{sections.map((section) => <div id={section} key={section}><h2 className="text-2xl font-bold">{section}</h2><div className="mt-3 grid gap-3">{filtered.filter((faq) => faq.section === section).map((faq) => <details className="glass rounded-lg p-4" key={faq.q}><summary className="flex cursor-pointer list-none items-center justify-between font-bold">{faq.q}<ChevronDown size={18} /></summary><p className="mt-3 text-white/60">{faq.a}</p></details>)}</div></div>)}</div></div>
    </section>
  );
}
