import { JOB_CATEGORIES, PLATFORMS } from "../../lib/constants";
import { useJobStore } from "../../store/useJobStore";

export function JobFilters() {
  const { filters, setFilter, resetFilters } = useJobStore();
  return (
    <aside className="glass rounded-lg p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">Filters</h2>
        <button onClick={resetFilters} className="text-sm text-emerald-300">Reset</button>
      </div>
      <label className="mt-5 block text-sm text-white/60">Category</label>
      <select className="field mt-2" value={filters.category} onChange={(e) => setFilter("category", e.target.value as never)}>
        <option>All</option>
        {JOB_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
      </select>
      <label className="mt-4 block text-sm text-white/60">Platform</label>
      <select className="field mt-2" value={filters.platform} onChange={(e) => setFilter("platform", e.target.value)}>
        <option>All</option>
        {PLATFORMS.map((platform) => <option key={platform}>{platform}</option>)}
      </select>
      <label className="mt-4 block text-sm text-white/60">Payment</label>
      <select className="field mt-2" value={filters.payment} onChange={(e) => setFilter("payment", e.target.value as never)}>
        <option>All</option>
        <option>USDC</option>
        <option>SOL</option>
        <option>NGN</option>
      </select>
      <label className="mt-4 block text-sm text-white/60">Max price</label>
      <input className="mt-2 w-full accent-ogaviolet" type="range" min={1} max={20000} value={filters.maxPrice} onChange={(e) => setFilter("maxPrice", Number(e.target.value))} />
      <p className="mt-1 text-sm text-white/50">Up to {filters.maxPrice.toLocaleString()}</p>
    </aside>
  );
}
