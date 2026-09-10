// Background: once an element has been picked on the page, bring the popup
// back up so the selector lands in the form without a second trip to the
// toolbar. Best effort — action.openPopup() needs Chrome 127+ and a focused
// window, and the pick is already in storage.local if this doesn't work.

import { isMessage } from "./messages";

export function runBackground(): void {
  chrome.runtime.onMessage.addListener((message: unknown, sender) => {
    if (!isMessage(message) || message.type !== "picked") return;
    void reopenPopup(sender.tab?.windowId);
  });
}

async function reopenPopup(windowId: number | undefined): Promise<void> {
  if (typeof chrome.action?.openPopup !== "function") return;
  try {
    await chrome.action.openPopup(windowId === undefined ? undefined : { windowId });
  } catch {
    // Not available or not allowed right now; the user clicks the icon instead.
  }
}
