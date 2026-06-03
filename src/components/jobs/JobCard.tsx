import { ArrowRight, Timer } from "lucide-react";
import { Link } from "react-router-dom";
import type { Job } from "../../lib/types";
import { NGN_RATE } from "../../lib/constants";
import { dualPrice, timeAgo } from "../../lib/utils";
import { Badge } from "../ui/Badge";
import { PlatformIcon } from "../ui/PlatformIcon";

export function JobCard({ job }: { job: Job }) {
  const remaining = job.slots - job.slotsFilled;
  return (
    <article className="glass flex h-full flex-col rounded-lg p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-white/70">
          <PlatformIcon platform={job.platform} />
          <span className="text-sm font-semibold">{job.platform}</span>
        </div>
        <Badge>{job.category}</Badge>
      </div>
      <h3 className="mt-4 text-lg font-bold leading-snug">{job.title}</h3>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/60">{job.description}</p>
      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-white/45">Pay</p>
          <p className="font-bold text-emerald-300">{dualPrice(job.price, job.currency, NGN_RATE)}</p>
        </div>
        <div>
          <p className="text-white/45">Slots</p>
          <p className="font-bold">{remaining} remaining</p>
        </div>
      </div>
      <div className="mt-4 h-2 rounded-full bg-white/10">
        <div className="h-2 rounded-full bg-ogaviolet" style={{ width: `${Math.min(100, (job.slotsFilled / job.slots) * 100)}%` }} />
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-white/50">
        <span className="inline-flex items-center gap-1"><Timer size={14} /> ends {timeAgo(job.endsAt)}</span>
        <span>{job.proofType}</span>
      </div>
      <Link to={`/jobs/${job.id}`} className="button-primary mt-5 w-full">
        Complete Task <ArrowRight size={16} />
      </Link>
    </article>
  );
}
