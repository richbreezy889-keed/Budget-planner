import { createContext, useContext, type Dispatch } from "react";

import type { AppData } from "../types";
import type { AppAction } from "./reducer";
import type { LoadStatus } from "./storage";

export interface StorageStatus {
  /** How the initial data was obtained. */
  load: LoadStatus;
  /** The outcome of the most recent persist attempt. */
  save: "idle" | "ok" | "error";
  /** Why the most recent persist failed, if it did. */
  message: string | null;
}

export interface AppDataContextValue {
  data: AppData;
  dispatch: Dispatch<AppAction>;
  /** True once storage has been read on the client (after mount). */
  hydrated: boolean;
  /** The most recent refusal message, e.g. a blocked category delete. */
  error: string | null;
  /** Load/save health of the backing storage. */
  storageStatus: StorageStatus;
}

export const AppDataContext = createContext<AppDataContextValue | null>(null);

export function useAppData(): AppDataContextValue {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used within an AppDataProvider");
  }
  return context;
}
