import { createContext, useContext, type Dispatch } from "react";

import type { AppData } from "../types";
import type { AppAction } from "./reducer";

export interface AppDataContextValue {
  data: AppData;
  dispatch: Dispatch<AppAction>;
  /** True once storage has been read on the client (after mount). */
  hydrated: boolean;
  /** The most recent refusal message, e.g. a blocked category delete. */
  error: string | null;
}

export const AppDataContext = createContext<AppDataContextValue | null>(null);

export function useAppData(): AppDataContextValue {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used within an AppDataProvider");
  }
  return context;
}
