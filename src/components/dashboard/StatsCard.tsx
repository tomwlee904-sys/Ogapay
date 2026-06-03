import type { LucideIcon } from "lucide-react";

export function StatsCard({ icon: Icon, title, value, trend }: { icon: LucideIcon; title: string; value: string; trend: string }) {
  return (
    <div className="glass rounded-lg p-5">
      <div className="flex items-center justify-between">
        <span className="rounded-lg bg-white/10 p-2 text-emerald-300"><Icon size={20} /></span>
        <span className="text-sm font-bold text-emerald-300">{trend}</span>
      </div>
      <p className="mt-5 text-sm text-white/55">{title}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
    </div>
  );
}
