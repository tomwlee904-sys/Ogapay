import { Upload } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { JobCard } from "../components/jobs/JobCard";
import { Badge } from "../components/ui/Badge";
import { NGN_RATE } from "../lib/constants";
import { mockJobs, mockUsers } from "../lib/mockData";
import { dualPrice } from "../lib/utils";

export function TaskDetailPage() {
  const { jobId } = useParams();
  const job = mockJobs.find((item) => item.id === jobId) ?? mockJobs[0];
  const creator = mockUsers.find((user) => user.username === job.creatorUsername) ?? mockUsers[0];
  const remaining = job.slots - job.slotsFilled;
  return (
    <section className="section py-10">
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="glass rounded-lg p-6"><Badge>{job.category}</Badge><h1 className="mt-4 text-4xl font-extrabold">{job.title}</h1><p className="mt-4 text-lg leading-8 text-white/65">{job.description}</p><h2 className="mt-8 text-2xl font-bold">Requirements</h2><ul className="mt-3 grid gap-2 text-white/65">{job.requirements.map((req) => <li key={req}>• {req}</li>)}</ul><h2 className="mt-8 text-2xl font-bold">Submission</h2><div className="mt-3 grid gap-3"><textarea className="field min-h-28" placeholder="Paste proof text or notes" /><input className="field" placeholder="Proof URL" /><button className="button-secondary justify-start"><Upload size={18} /> Upload screenshot</button><button className="button-primary">Accept & Complete</button></div></div>
        <aside className="grid gap-4"><div className="glass rounded-lg p-5"><p className="text-white/50">Reward</p><p className="mt-2 text-2xl font-extrabold text-emerald-300">{dualPrice(job.price, job.currency, NGN_RATE)}</p><p className="mt-4 text-white/55">{remaining} of {job.slots} slots remaining</p><div className="mt-2 h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-ogaviolet" style={{ width: `${(job.slotsFilled / job.slots) * 100}%` }} /></div></div><div className="glass rounded-lg p-5"><h3 className="font-bold">Creator</h3><Link to={`/profile/${creator.username}`} className="mt-3 flex items-center gap-3"><img src={creator.avatar} className="h-12 w-12 rounded-full" alt="" /><span>@{creator.username}</span></Link></div></aside>
      </div>
      <h2 className="mt-10 text-2xl font-bold">Similar jobs</h2><div className="mt-4 grid gap-4 md:grid-cols-3">{mockJobs.filter((item) => item.category === job.category && item.id !== job.id).slice(0, 3).map((item) => <JobCard job={item} key={item.id} />)}</div>
    </section>
  );
}
