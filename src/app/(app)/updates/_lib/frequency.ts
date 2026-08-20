import { addDays, addWeeks, addMonths } from "date-fns";

export type UpdateFrequency = "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY";

/** Advances a due date by one cadence interval, starting from `from` (typically "today"). */
export function advanceDueDate(frequency: UpdateFrequency, from: Date = new Date()): Date {
  switch (frequency) {
    case "DAILY":
      return addDays(from, 1);
    case "WEEKLY":
      return addWeeks(from, 1);
    case "BIWEEKLY":
      return addWeeks(from, 2);
    case "MONTHLY":
      return addMonths(from, 1);
  }
}
