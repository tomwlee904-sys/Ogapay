import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { EarningsPoint, PaymentCurrency } from "../../lib/types";

export function EarningsChart({ data, currency }: { data: EarningsPoint[]; currency: PaymentCurrency }) {
  const key = currency.toLowerCase() as "usdc" | "sol" | "ngn";
  return (
    <div className="glass h-80 rounded-lg p-5">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="date" stroke="rgba(255,255,255,.45)" />
          <YAxis stroke="rgba(255,255,255,.45)" />
          <Tooltip contentStyle={{ background: "#121212", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8 }} />
          <Line type="monotone" dataKey={key} stroke="#10B981" strokeWidth={3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
