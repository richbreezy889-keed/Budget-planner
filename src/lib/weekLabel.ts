import { format, parseISO } from "date-fns";

import { weekStart } from "./calc";
import type { ISODate, WeekStartDay } from "./types";

/** Human label for the week a date lands in, e.g. "Mon 5 Oct". */
export function weekLabel(date: ISODate, weekStartDay: WeekStartDay): string {
  return format(parseISO(weekStart(date, weekStartDay)), "EEE d MMM");
}
