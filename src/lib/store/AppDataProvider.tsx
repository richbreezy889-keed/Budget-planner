import { useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";

import type { AppData } from "../types";
import { AppDataContext, type AppDataContextValue, type StorageStatus } from "./context";
import { appReducer, type AppAction } from "./reducer";
import { createSeedData } from "./seed";
import { localStorageAdapter, type StorageAdapter } from "./storage";

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
  const lastPersistedRef = useRef<AppData | null>(null);

  // Read storage only after mount so the server and first client render match the seed.
  useEffect(() => {
    const result = storage.load();
    lastPersistedRef.current = result.data;
    dispatch({ type: "replaceAll", data: result.data });
    setStorageStatus({ load: result.status, save: "idle", message: null });
    setHydrated(true);
  }, [storage]);

  // Persist changes, debounced, and never before hydration. Unchanged data is skipped.
  useEffect(() => {
    if (!hydrated) return;
    if (state.data === lastPersistedRef.current) return;
    const handle = setTimeout(() => {
      const result = storage.save(state.data);
      if (result.ok) {
        lastPersistedRef.current = state.data;
        setStorageStatus((prev) => ({ ...prev, save: "ok", message: null }));
      } else {
        setStorageStatus((prev) => ({ ...prev, save: "error", message: result.reason }));
      }
    }, debounceMs);
    return () => clearTimeout(handle);
  }, [state.data, hydrated, storage, debounceMs]);

  const value = useMemo<AppDataContextValue>(
    () => ({ data: state.data, dispatch, hydrated, error: state.error, storageStatus }),
    [state.data, state.error, hydrated, storageStatus],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
