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
 * would otherwise render a different date than the browser. Stays fresh via a
 * 60-second interval, a check just after each local midnight, and re-checks on
 * visibility, focus and pageshow. State is only updated when the date changes.
 */
export function useToday(): ISODate | null {
  const [today, setToday] = useState<ISODate | null>(null);

  useEffect(() => {
    const update = () => {
      const next = toLocalISODate(new Date());
      setToday((current) => (current === next ? current : next));
    };

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

    const interval = setInterval(update, 60000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") update();
    };
    const handleFocus = () => update();
    const handlePageShow = () => update();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      if (midnightTimer !== undefined) clearTimeout(midnightTimer);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  return today;
}
