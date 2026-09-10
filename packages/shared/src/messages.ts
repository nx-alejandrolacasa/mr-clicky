// Runtime messages between the popup, the content script and the background.
//
//   popup → content     "start-pick"   enter element-picking mode on the page
//   content → background "picked"      a selector was picked and stored; try
//                                      to bring the popup back up

export type Message = { type: "start-pick" } | { type: "picked" };

export function isMessage(value: unknown): value is Message {
  if (typeof value !== "object" || value === null) return false;
  const type = (value as Record<string, unknown>).type;
  return type === "start-pick" || type === "picked";
}

// The picked selector travels through storage.local rather than a message,
// because the popup that asked for it closes the moment the page is clicked.
export interface PendingPick {
  selector: string;
  url: string;
  at: number;
}

const PICK_KEY = "pendingPick";
const PICK_TTL_MS = 10 * 60_000;

export async function storePendingPick(pick: PendingPick): Promise<void> {
  await chrome.storage.local.set({ [PICK_KEY]: pick });
}

export async function takePendingPick(): Promise<PendingPick | null> {
  const data = await chrome.storage.local.get(PICK_KEY);
  const raw = data[PICK_KEY];
  if (!isPendingPick(raw)) return null;
  await chrome.storage.local.remove(PICK_KEY);
  return Date.now() - raw.at <= PICK_TTL_MS ? raw : null;
}

function isPendingPick(value: unknown): value is PendingPick {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.selector === "string" &&
    typeof v.url === "string" &&
    typeof v.at === "number"
  );
}
