// Selection jobs: how long the person the poster picks has to send the work.
// The poster can choose 1, 3, 7 or 14 days when posting (server: task.service
// DELIVERY_DAYS / deliveryText); no choice (null) is the usual 24 hours.

export type DeliveryTask = { isSelection?: boolean; deliveryDays?: number | null }

/** Days the picked person has, or 0 for the usual 24 hours (and every non-Selection job). */
export function deliveryDaysOf(task?: DeliveryTask | null): number {
  const d = task?.isSelection ? Number(task.deliveryDays) || 0 : 0
  return d > 1 ? d : 0
}

/** The time in words, as the server writes it: "24 hours" for a 1-day or unset time, else "3 days", "7 days"... */
export function deliveryText(task?: DeliveryTask | null): string {
  const d = deliveryDaysOf(task)
  return d ? `${d} days` : '24 hours'
}
