// Content script: for every rule whose pattern matches this page's URL, wait
// for the selector to appear, then click it once — after the configured
// delay — and never again for the same rule on the same URL, so a button
// that survives its own click doesn't get clicked in a loop.

import { loadRules, matchingRules, matchesUrl, onRulesChanged, type Rule } from "./rules";
import { DEFAULT_SETTINGS, loadSettings, onSettingsChanged, type Settings } from "./settings";
import { isMessage, storePendingPick } from "./messages";
import { findVisible } from "./selector";
import { startPicker } from "./picker";

let rules: Rule[] = [];
let settings: Settings = DEFAULT_SETTINGS;
const clicked = new Set<string>();
const pending = new Map<string, ReturnType<typeof setTimeout>>();
let evaluateScheduled = false;

export async function runContent(): Promise<void> {
  [rules, settings] = await Promise.all([loadRules(), loadSettings()]);
  onRulesChanged((next) => {
    rules = next;
    evaluate();
  });
  onSettingsChanged((next) => {
    settings = next;
  });
  listenForPickRequests();
  observeDocument();
  evaluate();
}

function evaluate(): void {
  const href = location.href;
  for (const rule of matchingRules(rules, href)) {
    const key = clickKey(rule, href);
    if (clicked.has(key) || pending.has(rule.id)) continue;
    if (!findVisible(rule.selector)) continue;
    pending.set(
      rule.id,
      setTimeout(() => {
        pending.delete(rule.id);
        fire(rule);
      }, settings.delayMs)
    );
  }
}

// Re-resolve everything at fire time: the delay is exactly the window in which
// a page re-renders the control or moves on to another URL.
function fire(rule: Rule): void {
  const href = location.href;
  const key = clickKey(rule, href);
  if (clicked.has(key) || !matchesUrl(rule, href)) return;
  const target = findVisible(rule.selector);
  if (!target) return;
  clicked.add(key);
  click(target);
  console.info(`[Mr. Clicky] clicked ${rule.selector}`);
}

function click(target: Element): void {
  if (target instanceof HTMLElement) {
    target.focus({ preventScroll: true });
    target.click();
    return;
  }
  target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
}

function clickKey(rule: Rule, href: string): string {
  return `${rule.id}\n${href}`;
}

// Rendering frameworks paint the control some time after document_idle, and
// SPA navigations change the URL without a load — both arrive as mutations.
function observeDocument(): void {
  const observer = new MutationObserver(() => scheduleEvaluate());
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

function scheduleEvaluate(): void {
  if (evaluateScheduled) return;
  evaluateScheduled = true;
  requestAnimationFrame(() => {
    evaluateScheduled = false;
    evaluate();
  });
}

function listenForPickRequests(): void {
  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if (!isMessage(message) || message.type !== "start-pick") return;
    startPicker((selector) => {
      if (selector) void reportPick(selector);
    });
    sendResponse({ ok: true });
  });
}

async function reportPick(selector: string): Promise<void> {
  await storePendingPick({ selector, url: location.href, at: Date.now() });
  try {
    await chrome.runtime.sendMessage({ type: "picked" });
  } catch {
    // No background awake to reopen the popup; the pick is in storage either way.
  }
}
