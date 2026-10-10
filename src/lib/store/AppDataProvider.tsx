import { useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";

import type { AppData } from "../types";
import { AppDataContext, type AppDataContextValue } from "./context";
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
  const lastPersistedRef = useRef<AppData | null>(null);

  // Read storage only after mount so the server and first client render match the seed.
  useEffect(() => {
    const loaded = storage.load();
    lastPersistedRef.current = loaded;
    dispatch({ type: "replaceAll", data: loaded });
    setHydrated(true);
  }, [storage]);

  // Persist changes, debounced, and never before hydration. Unchanged data is skipped.
  useEffect(() => {
    if (!hydrated) return;
    if (state.data === lastPersistedRef.current) return;
    const handle = setTimeout(() => {
      storage.save(state.data);
      lastPersistedRef.current = state.data;
    }, debounceMs);
    return () => clearTimeout(handle);
  }, [state.data, hydrated, storage, debounceMs]);

  const value = useMemo<AppDataContextValue>(
    () => ({ data: state.data, dispatch, hydrated, error: state.error }),
    [state.data, state.error, hydrated],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
