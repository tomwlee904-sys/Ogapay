import type { Task } from "../../lib/types";
import { formatCurrency, timeAgo } from "../../lib/utils";
import { Badge } from "../ui/Badge";

export function ActivityTable({ tasks }: { tasks: Task[] }) {
  return (
    <div className="glass overflow-hidden rounded-lg">
      <table className="w-full min-w-[680px] text-left text-sm">
        <thead className="bg-white/5 text-white/50">
          <tr><th className="p-4">Task</th><th>Platform</th><th>Amount</th><th>Status</th><th>Date</th></tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id} className="border-t border-white/10">
              <td className="p-4 font-semibold">{task.title}</td>
              <td>{task.platform}</td>
              <td className="text-emerald-300">{formatCurrency(task.amount, task.currency)}</td>
              <td><Badge>{task.status}</Badge></td>
              <td className="text-white/55">{timeAgo(task.date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
