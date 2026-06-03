import { Clock } from "lucide-react";
import { useEffect, useState } from "react";

export function CountdownTimer({ hours = 12 }: { hours?: number }) {
  const [seconds, setSeconds] = useState(hours * 3600);
  useEffect(() => {
    const id = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(id);
  }, []);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 font-mono text-sm text-emerald-100">
      <Clock size={16} /> {h.toString().padStart(2, "0")}:{m.toString().padStart(2, "0")}:{s.toString().padStart(2, "0")}
    </div>
  );
}
