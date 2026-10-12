import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { AppData } from "../types";
import {
  AppDataContext,
  type AppDataContextValue,
  type ResetResult,
  type RestoreResult,
  type StorageStatus,
} from "./context";
import { appReducer, type AppAction } from "./reducer";
import { createSeedData, startFresh } from "./seed";
import { STORAGE_KEY, localStorageAdapter, type BackupMeta, type StorageAdapter } from "./storage";
import { importData } from "./validate";

interface ProviderState {
  data: AppData;
  error: string | null;
}

function rootReducer(state: ProviderState, action: AppAction): ProviderState {
  const result = appReducer(state.data, action);
  if (result.ok) return { data: result.data, error: null };
  return { ...state, error: result.error };
}

const createInitialState = (): ProviderState => ({ data: createSeedData(), error: null });

const initialStorageStatus: StorageStatus = { load: "seeded", save: "idle", message: null };

export interface AppDataProviderProps {
  children: ReactNode;
  storage?: StorageAdapter;
  debounceMs?: number;
}

export function AppDataProvider({
  children,
  storage = localStorageAdapter,
  debounceMs = 400,
}: AppDataProviderProps) {
  const [state, dispatch] = useReducer(rootReducer, undefined, createInitialState);
  const [hydrated, setHydrated] = useState(false);
  const [storageStatus, setStorageStatus] = useState<StorageStatus>(initialStorageStatus);
  const [backups, setBackups] = useState<BackupMeta[]>([]);
  const [corruptBackups, setCorruptBackups] = useState<BackupMeta[]>([]);
  const lastPersistedRef = useRef<AppData | null>(null);
  const hydratedRef = useRef(false);
  const latestDataRef = useRef(state.data);

  useEffect(() => {
    latestDataRef.current = state.data;
  }, [state.data]);

  const refreshRecovery = useCallback(() => {
    setBackups(storage.listBackups ? storage.listBackups() : []);
    setCorruptBackups(storage.listCorruptBackups ? storage.listCorruptBackups() : []);
  }, [storage]);

  const persist = useCallback(
    (data: AppData) => {
      const result = storage.save(data);
      if (result.ok) {
        lastPersistedRef.current = data;
        setStorageStatus((prev) => ({ ...prev, save: "ok", message: null }));
      } else {
        setStorageStatus((prev) => ({ ...prev, save: "error", message: result.reason }));
      }
    },
    [storage],
  );

  // Write any pending change immediately, ignoring the debounce delay.
  const flush = useCallback(() => {
    if (!hydratedRef.current) return;
    const data = latestDataRef.current;
    if (data === lastPersistedRef.current) return;
    persist(data);
  }, [persist]);

  // Read storage only after mount so the server and first client render match the seed.
  useEffect(() => {
    const result = storage.load();
    lastPersistedRef.current = result.data;
    latestDataRef.current = result.data;
    hydratedRef.current = true;
    dispatch({ type: "replaceAll", data: result.data });
    setStorageStatus({ load: result.status, save: "idle", message: null });
    refreshRecovery();
    setHydrated(true);
  }, [refreshRecovery, storage]);

  // Persist changes, debounced, and never before hydration. Unchanged data is skipped.
  useEffect(() => {
    if (!hydrated) return;
    if (state.data === lastPersistedRef.current) return;
    const handle = setTimeout(() => persist(state.data), debounceMs);
    return () => clearTimeout(handle);
  }, [state.data, hydrated, persist, debounceMs]);

  // Clear every record, snapshotting the current data first so it can be recovered.
  // Refuses, changing nothing, when that snapshot cannot be written.
  const resetData = useCallback((): ResetResult => {
    const current = latestDataRef.current;
    if (storage.backup?.(current) !== true) {
      return { ok: false, reason: "not-saved" };
    }
    const fresh = startFresh(current.settings);
    latestDataRef.current = fresh;
    dispatch({ type: "replaceAll", data: fresh });
    persist(fresh);
    refreshRecovery();
    return { ok: true };
  }, [persist, refreshRecovery, storage]);

  // Replace the current data with a stored backup, snapshotting the current data
  // first so the restore can itself be undone. Refuses if that snapshot fails.
  const restoreBackup = useCallback(
    (id: string): RestoreResult => {
      const restored = storage.readBackup?.(id) ?? null;
      if (!restored) return { ok: false, reason: "unreadable" };
      if (storage.backup?.(latestDataRef.current) !== true) {
        return { ok: false, reason: "not-saved" };
      }
      latestDataRef.current = restored;
      dispatch({ type: "replaceAll", data: restored });
      persist(restored);
      refreshRecovery();
      return { ok: true };
    },
    [persist, refreshRecovery, storage],
  );

  const deleteBackup = useCallback(
    (id: string) => {
      storage.deleteBackup?.(id);
      refreshRecovery();
    },
    [refreshRecovery, storage],
  );

  const readCorruptRaw = useCallback(
    (id: string): string | null => storage.readCorruptRaw?.(id) ?? null,
    [storage],
  );

  const deleteCorrupt = useCallback(
    (id: string) => {
      storage.deleteCorrupt?.(id);
      refreshRecovery();
    },
    [refreshRecovery, storage],
  );

  // Flush before the page is hidden or unloaded so nothing is lost.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") flush();
    };
    const handlePageHide = () => flush();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [flush]);

  // Adopt changes made by another tab without echoing them back (no ping-pong).
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || event.newValue === null) return;
      const result = importData(event.newValue);
      if (!result.ok) return;
      lastPersistedRef.current = result.data;
      latestDataRef.current = result.data;
      dispatch({ type: "replaceAll", data: result.data });
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const value = useMemo<AppDataContextValue>(
    () => ({
      data: state.data,
      dispatch,
      hydrated,
      error: state.error,
      storageStatus,
      resetData,
      backups,
      corruptBackups,
      restoreBackup,
      deleteBackup,
      readCorruptRaw,
      deleteCorrupt,
    }),
    [
      state.data,
      state.error,
      hydrated,
      storageStatus,
      resetData,
      backups,
      corruptBackups,
      restoreBackup,
      deleteBackup,
      readCorruptRaw,
      deleteCorrupt,
    ],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
