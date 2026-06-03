import { Star } from "lucide-react";
import { useParams } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { gigStores, mockUsers, recentTasks } from "../lib/mockData";
import { formatNGN, formatUSDC } from "../lib/utils";

export function ProfilePage() {
  const { username = "adaflow" } = useParams();
  const user = mockUsers.find((item) => item.username === username) ?? mockUsers[0];
  const gigs = gigStores.filter((gig) => gig.username === user.username);
  return (
    <section className="section py-10">
      <div className="glass rounded-lg p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          <img src={user.avatar} alt={user.username} className="h-24 w-24 rounded-lg object-cover" />
          <div className="flex-1">
            <h1 className="text-4xl font-extrabold">@{user.username}</h1>
            <p className="mt-2 max-w-2xl text-white/60">{user.bio}</p>
            <div className="mt-3 flex flex-wrap gap-2"><Badge>{user.role}</Badge><span className="inline-flex items-center gap-1 text-amber-300"><Star size={16} fill="currentColor" /> {user.rating}</span><span className="text-white/55">Joined {new Date(user.joinDate).toLocaleDateString()}</span></div>
          </div>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg bg-white/5 p-4"><p className="text-white/50">Tasks completed</p><p className="text-2xl font-bold">{user.tasksCompleted}</p></div>
          <div className="rounded-lg bg-white/5 p-4"><p className="text-white/50">Total earned</p><p className="text-2xl font-bold">{formatUSDC(user.totalEarnedUsdc)} / {formatNGN(user.totalEarnedUsdc * 1650)}</p></div>
          <div className="rounded-lg bg-white/5 p-4"><p className="text-white/50">Completion rate</p><p className="text-2xl font-bold">{user.completionRate}%</p></div>
        </div>
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div><h2 className="text-2xl font-bold">My gigs</h2><div className="mt-4 grid gap-4 md:grid-cols-2">{gigs.map((gig) => <div key={gig.id} className="glass rounded-lg p-5"><h3 className="font-bold">{gig.title}</h3><p className="mt-2 text-white/60">{gig.description}</p><p className="mt-4 text-emerald-300">{gig.currency === "NGN" ? formatNGN(gig.price) : formatUSDC(gig.price)} • {gig.deliveryTime} • {gig.orders} orders</p></div>)}</div></div>
        <aside><h2 className="text-2xl font-bold">Activity</h2><div className="mt-4 grid gap-3">{recentTasks.slice(0, 5).map((task) => <div className="glass rounded-lg p-4" key={task.id}><p className="font-semibold">{task.title}</p><p className="mt-1 text-sm text-white/55">{task.status}</p></div>)}</div></aside>
      </div>
      <div className="mt-8"><h2 className="text-2xl font-bold">Reviews</h2><div className="mt-4 grid gap-3 md:grid-cols-3">{mockUsers.slice(1, 4).map((reviewer) => <div className="glass rounded-lg p-4" key={reviewer.username}><div className="flex items-center gap-3"><img src={reviewer.avatar} className="h-10 w-10 rounded-full" alt="" /><strong>@{reviewer.username}</strong></div><p className="mt-3 text-sm text-white/60">Fast, accurate proof and clean communication. Would hire again.</p></div>)}</div></div>
    </section>
  );
}
