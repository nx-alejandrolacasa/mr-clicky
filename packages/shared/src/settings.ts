// General settings (storage.sync). One value so far: how long to wait after
// the target is found before clicking it.

export interface Settings {
  delayMs: number;
}

export const DELAY_MIN_MS = 0;
export const DELAY_MAX_MS = 60_000;
export const DEFAULT_SETTINGS: Settings = { delayMs: 500 };

const STORAGE_KEY = "settings";

export function clampDelay(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_SETTINGS.delayMs;
  return Math.min(DELAY_MAX_MS, Math.max(DELAY_MIN_MS, Math.round(n)));
}

export function normalizeSettings(value: unknown): Settings {
  if (typeof value !== "object" || value === null) return { ...DEFAULT_SETTINGS };
  const v = value as Record<string, unknown>;
  return { delayMs: clampDelay(v.delayMs ?? DEFAULT_SETTINGS.delayMs) };
}

export async function loadSettings(): Promise<Settings> {
  const data = await chrome.storage.sync.get(STORAGE_KEY);
  return normalizeSettings(data[STORAGE_KEY]);
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.sync.set({ [STORAGE_KEY]: normalizeSettings(settings) });
}

export function onSettingsChanged(listener: (settings: Settings) => void): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync" || !(STORAGE_KEY in changes)) return;
    listener(normalizeSettings(changes[STORAGE_KEY]?.newValue));
  });
}
