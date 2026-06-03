import { getStatusColor } from "../../lib/utils";

import type { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  tone?: string;
}

export function Badge({ children, tone = "" }: BadgeProps) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${tone || getStatusColor(String(children).toLowerCase())}`}>{children}</span>;
}
