import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import { apiRequest } from "../lib/api";
import "../styles/follower-analytics.css";

/* Follower analytics for an X follow job (Manage jobs > a follow job >
   Follower analytics). The account's public follower count is read when the
   job is posted and every 6 hours after. Server:
   GET /poster/jobs/:id/followers (services/followerAnalytics.service.js) */

type Snap = { followers: number; takenAt: string };
type Data = {
  job: { id: string; title: string; status: string; createdAt: string; endsAt: string | null };
  handle: string; snapshots: Snap[];
  startFollowers: number | null; latestFollowers: number | null; gained: number | null;
  paidFor: number; delivered: number; waitingReview: number; everyHours: number;
  stillFollowingCheckable: boolean; stillFollowingNote: string;
};

const num = (n: number | null | undefined) => (typeof n === "number" ? n.toLocaleString("en-US") : "—");
const when = (d: string) => new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// Followers over time: a simple line, oldest on the left
function Chart({ snaps }: { snaps: Snap[] }) {
  if (snaps.length < 2) return <p className="fa-empty">The chart shows once there are two readings (one every 6 hours).</p>;
  const W = 640, H = 200, P = { l: 8, r: 8, t: 14, b: 22 };
  const xs = snaps.map((s) => new Date(s.takenAt).getTime());
  const ys = snaps.map((s) => s.followers);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  if (y0 === y1) { y0 -= 1; y1 += 1; }
  const px = (t: number) => P.l + ((t - x0) / Math.max(1, x1 - x0)) * (W - P.l - P.r);
  const py = (v: number) => P.t + (1 - (v - y0) / (y1 - y0)) * (H - P.t - P.b);
  const pts = snaps.map((s, i) => `${px(xs[i]).toFixed(1)},${py(s.followers).toFixed(1)}`);
  const area = `M${pts[0]} L${pts.join(" L")} L${px(x1).toFixed(1)},${H - P.b} L${px(x0).toFixed(1)},${H - P.b} Z`;
  return (
    <figure className="fa-chart">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`Followers went from ${num(ys[0])} to ${num(ys[ys.length - 1])}`}>
        <path d={area} className="fa-area" />
        <polyline points={pts.join(" ")} className="fa-line" fill="none" vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption>
        <span>{when(snaps[0].takenAt)}</span>
        <span>{num(Math.min(...ys))} – {num(Math.max(...ys))} followers</span>
        <span>{when(snaps[snaps.length - 1].takenAt)}</span>
      </figcaption>
    </figure>
  );
}

export default function FollowerAnalytics() {
  const { id } = useParams();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<Data>(`/poster/jobs/${id}/followers`).then(setData).catch((e: any) => setError(e?.message || "Couldn't load the analytics"));
  }, [id]);

  return (
    <Layout>
      <div className="ui-page fa-page">
        <Link className="fa-back" to={`/manage-jobs?job=${id}`}><i className="ti ti-arrow-left" aria-hidden="true" /> Manage jobs</Link>
        <span className="ui-eyebrow">Follower analytics</span>
        <h1 className="ui-title">{data ? `@${data.handle}` : "Followers"}</h1>
        {data && <p className="ui-sub">{data.job.title}</p>}

        {error && <p className="fa-error" role="alert">{error}</p>}
        {!data && !error && <div className="ui-sk" style={{ height: 260, marginTop: 20 }} />}

        {data && (
          <>
            <div className="fa-stats">
              <div className="fa-stat"><span>Followers gained</span><b>{data.gained === null ? "—" : `${data.gained >= 0 ? "+" : ""}${num(data.gained)}`}</b><small>{num(data.startFollowers)} → {num(data.latestFollowers)}</small></div>
              <div className="fa-stat"><span>Follows paid for</span><b>{num(data.paidFor)}</b><small>places on the job</small></div>
              <div className="fa-stat"><span>Delivered</span><b>{num(data.delivered)}</b><small>{data.waitingReview > 0 ? `${num(data.waitingReview)} waiting for your review` : "work you approved"}</small></div>
            </div>

            <section className="ui-card ui-card-pad fa-card">
              <h2 className="ui-h2">Followers over time</h2>
              <p className="ui-hint">Read from X's public profile when the job was posted and every {data.everyHours} hours while it runs (and for a week after).</p>
              {data.snapshots.length === 0
                ? <p className="fa-empty">No reading yet. X couldn't be read when the job was posted; we try again every {data.everyHours} hours.</p>
                : <Chart snaps={data.snapshots} />}
              {data.snapshots.length > 0 && (
                <div className="fa-table" role="table" aria-label="Follower readings">
                  {[...data.snapshots].reverse().slice(0, 12).map((s, i, arr) => {
                    const prev = arr[i + 1];
                    const diff = prev ? s.followers - prev.followers : null;
                    return (
                      <div key={s.takenAt} className="fa-tr" role="row">
                        <span role="cell">{when(s.takenAt)}</span>
                        <b role="cell">{num(s.followers)}</b>
                        <em role="cell" className={diff !== null && diff < 0 ? "down" : ""}>{diff === null ? "start" : `${diff >= 0 ? "+" : ""}${num(diff)}`}</em>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="ui-card ui-card-pad fa-card fa-note">
              <h2 className="ui-h2"><i className="ti ti-info-circle" aria-hidden="true" /> Do the paid followers still follow?</h2>
              <p>{data.stillFollowingNote}</p>
              <p>Followers gained can also include people who found you on their own, and people who unfollowed.</p>
            </section>
          </>
        )}
      </div>
    </Layout>
  );
}
