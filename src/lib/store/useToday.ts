import { useEffect, useState } from "react";

import type { ISODate } from "../types";

function toLocalISODate(date: Date): ISODate {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * The local calendar date as `YYYY-MM-DD`, or null before mount.
 * It is null during SSR and the first render because the server runs in UTC and
 * would otherwise render a different date than the browser. Re-checks when the
 * tab becomes visible again, and schedules a check just after each local midnight,
 * so the date rolls over even if the tab stays open across midnight.
 */
export function useToday(): ISODate | null {
  const [today, setToday] = useState<ISODate | null>(null);

  useEffect(() => {
    const update = () => setToday(toLocalISODate(new Date()));

    update();

    let midnightTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleMidnightCheck = () => {
      const now = new Date();
      const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0,
        0,
        1,
        0,
      );
      midnightTimer = setTimeout(() => {
        update();
        scheduleMidnightCheck();
      }, nextMidnight.getTime() - now.getTime());
    };
    scheduleMidnightCheck();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") update();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      if (midnightTimer !== undefined) clearTimeout(midnightTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return today;
}
