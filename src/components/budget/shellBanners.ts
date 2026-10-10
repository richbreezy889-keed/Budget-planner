import type { StorageStatus } from "@/lib/store/context";
import type { AppView } from "@/lib/store/useAppView";

export interface ShellBanner {
  tone: "info" | "warn" | "danger";
  message: string;
}

const saveErrorMessages: Record<string, string> = {
  unavailable: "Your browser is blocking storage, changes are not being saved.",
  quota: "Storage is full, changes are not being saved.",
  invalid: "Some data is invalid, changes are not being saved.",
};

/** The slim status banners shown beneath the shell header, hidden before the app is mounted. */
export function buildShellBanners(view: AppView | null, status: StorageStatus): ShellBanner[] {
  if (view === null) return [];
  const banners: ShellBanner[] = [];
  if (view.isDemo) {
    banners.push({ tone: "info", message: "You are viewing demo data (read-only)." });
  }
  if (status.load === "recovered") {
    banners.push({
      tone: "warn",
      message: "Your saved data could not be read. A backup was kept.",
    });
  }
  if (status.save === "error" && status.message !== null) {
    const message = saveErrorMessages[status.message];
    if (message !== undefined) banners.push({ tone: "danger", message });
  }
  return banners;
}
