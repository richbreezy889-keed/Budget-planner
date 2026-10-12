import { createContext, useContext, type Dispatch } from "react";

import type { AppData } from "../types";
import type { AppAction } from "./reducer";
import type { BackupMeta, LoadStatus } from "./storage";

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
  /** Wipes all data back to an empty, non-demo state (keeps current settings). */
  resetData: () => void;
  /** Snapshots available for recovery, newest first. */
  backups: BackupMeta[];
  /** Unreadable data preserved for recovery, newest first. */
  corruptBackups: BackupMeta[];
  /**
   * Snapshots the current data, then replaces it with a stored backup. Refused
   * when the snapshot is unreadable or the safety snapshot cannot be written.
   */
  restoreBackup: (id: string) => RestoreResult;
  /** Removes a stored backup. */
  deleteBackup: (id: string) => void;
  /** Reads the raw text of an unreadable backup, or null when missing. */
  readCorruptRaw: (id: string) => string | null;
  /** Removes a stored unreadable backup. */
  deleteCorrupt: (id: string) => void;
}

/** Why a restore was refused: the snapshot is unreadable, or safety could not be saved. */
export type RestoreFailure = "unreadable" | "not-saved";
export type RestoreResult = { ok: true } | { ok: false; reason: RestoreFailure };

export const AppDataContext = createContext<AppDataContextValue | null>(null);

export function useAppData(): AppDataContextValue {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used within an AppDataProvider");
  }
  return context;
}
