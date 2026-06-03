import { Search } from "lucide-react";
import { JobFilters } from "../components/jobs/JobFilters";
import { JobGrid } from "../components/jobs/JobGrid";
import { useJobs } from "../hooks/useJobs";
import { useJobStore } from "../store/useJobStore";

export function JobsPage() {
  const { jobs, filters } = useJobs();
  const setFilter = useJobStore((state) => state.setFilter);
  return (
    <section className="section py-10">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div><h1 className="text-4xl font-extrabold">Open jobs</h1><p className="mt-2 text-white/60">Search tasks paying in USDC, SOL, and NGN.</p></div>
        <select className="field md:w-52" value={filters.sort} onChange={(e) => setFilter("sort", e.target.value as never)}>
          <option>newest</option><option>highest pay</option><option>ending soon</option><option>most popular</option>
        </select>
      </div>
      <div className="mt-6 flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
        <Search className="text-white/40" /><input className="w-full bg-transparent outline-none" placeholder="Search jobs, categories, or platforms" value={filters.search} onChange={(e) => setFilter("search", e.target.value)} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
        <JobFilters />
        <div><p className="mb-4 text-sm text-white/50">{jobs.length} jobs found</p><JobGrid jobs={jobs} /><div className="mt-8 flex justify-center gap-2"><button className="button-secondary">1</button><button className="button-secondary">2</button><button className="button-secondary">3</button></div></div>
      </div>
    </section>
  );
}
