import type { Job } from "../../lib/types";
import { JobCard } from "./JobCard";

export function JobGrid({ jobs }: { jobs: Job[] }) {
  if (!jobs.length) {
    return <div className="glass rounded-lg p-10 text-center text-white/70">No jobs match these filters. Try broadening the search or payment type.</div>;
  }
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{jobs.map((job) => <JobCard key={job.id} job={job} />)}</div>;
}
