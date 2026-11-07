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

type PickedTask = DeliveryTask & { status?: string; cooldownStartedAt?: string | null }
type PickedWork = { status?: string; submittedAt?: string | null; startedAt?: string | null; createdAt?: string | null; sentBackAt?: string | null }

/**
 * When the picked person's place is released if they send nothing (null once work
 * is in). The same rule as the server (socialQuick holdEndsAt): the time to deliver
 * from the pick while the job cools down, or from the last send-back.
 */
export function pickedDueAt(task: PickedTask, work?: PickedWork | null): Date | null {
  if (!work || work.status !== 'PENDING' || work.submittedAt) return null
  const h = (deliveryDaysOf(task) || 1) * 24 * 3600000
  const taken = new Date(work.startedAt || work.createdAt || '').getTime()
  if (task.status === 'COOLING_DOWN' && task.cooldownStartedAt) {
    const ends = new Date(task.cooldownStartedAt).getTime() + h
    return new Date(work.sentBackAt && taken ? Math.max(ends, taken + h) : ends)
  }
  return taken ? new Date(taken + h) : null
}
