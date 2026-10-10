import { useMemo } from "react";

import { demoView } from "../selectors";
import type { AppData, ISODate } from "../types";
import { useAppData } from "./context";
import { useToday } from "./useToday";

export interface AppView {
  /** The demo-shifted data for the current week. */
  data: AppData;
  /** The client's local calendar date. */
  today: ISODate;
  /** True when the underlying dataset is read-only demo data. */
  isDemo: boolean;
}

/**
 * The view of the app: demo data shifted onto the client's current week once
 * the provider has hydrated on the client and the local date is known, or null
 * while the server and first client render match the seed exactly.
 */
export function useAppView(): AppView | null {
  const { data, hydrated } = useAppData();
  const today = useToday();
  return useMemo<AppView | null>(
    () =>
      hydrated && today !== null
        ? { data: demoView(data, today), today, isDemo: data.isDemo }
        : null,
    [data, hydrated, today],
  );
}
