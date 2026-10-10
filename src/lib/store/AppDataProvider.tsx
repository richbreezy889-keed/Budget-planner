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
import { AppDataContext, type AppDataContextValue, type StorageStatus } from "./context";
import { appReducer, type AppAction } from "./reducer";
import { createSeedData } from "./seed";
import { STORAGE_KEY, localStorageAdapter, type StorageAdapter } from "./storage";
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
  const lastPersistedRef = useRef<AppData | null>(null);
  const hydratedRef = useRef(false);
  const latestDataRef = useRef(state.data);

  useEffect(() => {
    latestDataRef.current = state.data;
  }, [state.data]);

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
    setHydrated(true);
  }, [storage]);

  // Persist changes, debounced, and never before hydration. Unchanged data is skipped.
  useEffect(() => {
    if (!hydrated) return;
    if (state.data === lastPersistedRef.current) return;
    const handle = setTimeout(() => persist(state.data), debounceMs);
    return () => clearTimeout(handle);
  }, [state.data, hydrated, persist, debounceMs]);

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
    () => ({ data: state.data, dispatch, hydrated, error: state.error, storageStatus }),
    [state.data, state.error, hydrated, storageStatus],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
