// Popup UI: list rules, add a rule (pattern prefilled from the active tab,
// selector prefilled from an element picked on the page), delete rules, and
// set the click delay. All persistence goes through storage.sync so the
// content scripts pick changes up live via storage.onChanged.

import {
  isValidPattern,
  loadRules,
  newRuleId,
  patternForUrl,
  saveRules,
  type Rule,
} from "./rules";
import {
  clampDelay,
  DELAY_MAX_MS,
  DELAY_MIN_MS,
  loadSettings,
  saveSettings,
  type Settings,
} from "./settings";
import { isValidSelector } from "./selector";
import { takePendingPick, type Message } from "./messages";

const DRAFT_KEY = "patternDraft";

let rules: Rule[] = [];
let settings: Settings;

export async function runPopup(): Promise<void> {
  localize();
  [rules, settings] = await Promise.all([loadRules(), loadSettings()]);
  renderList();

  const delayInput = byId<HTMLInputElement>("delay-input");
  delayInput.min = String(DELAY_MIN_MS);
  delayInput.max = String(DELAY_MAX_MS);
  delayInput.value = String(settings.delayMs);
  delayInput.addEventListener("change", () => void updateDelay(delayInput));

  byId<HTMLFormElement>("add-form").addEventListener("submit", (event) => {
    event.preventDefault();
    void addRule();
  });
  byId<HTMLButtonElement>("pick-button").addEventListener("click", () => void startPick());
  for (const id of ["pattern-input", "selector-input"]) {
    byId<HTMLInputElement>(id).addEventListener("input", clearError);
  }

  await prefill();
}

async function addRule(): Promise<void> {
  const patternInput = byId<HTMLInputElement>("pattern-input");
  const selectorInput = byId<HTMLInputElement>("selector-input");
  const pattern = patternInput.value.trim();
  const selector = selectorInput.value.trim();

  if (!isValidPattern(pattern)) {
    showError("invalidPattern");
    patternInput.focus();
    return;
  }
  if (!isValidSelector(selector)) {
    showError("invalidSelector");
    selectorInput.focus();
    return;
  }

  const duplicate = rules.some(
    (rule) => rule.pattern === pattern && rule.selector === selector
  );
  if (!duplicate) {
    rules.push({ id: newRuleId(), pattern, selector });
    await saveRules(rules);
  }

  selectorInput.value = "";
  clearError();
  renderList();
}

async function deleteRule(id: string): Promise<void> {
  rules = rules.filter((rule) => rule.id !== id);
  await saveRules(rules);
  renderList();
}

async function updateDelay(input: HTMLInputElement): Promise<void> {
  settings = { delayMs: clampDelay(input.value) };
  input.value = String(settings.delayMs);
  await saveSettings(settings);
}

// The popup closes as soon as the page is clicked, so the pattern typed so
// far is parked in storage.local and the pick comes back the same way.
async function startPick(): Promise<void> {
  const tab = await activeTab();
  if (tab?.id === undefined) {
    showError("pickUnavailable");
    return;
  }
  const message: Message = { type: "start-pick" };
  try {
    await chrome.tabs.sendMessage(tab.id, message);
  } catch {
    showError("pickUnavailable");
    return;
  }
  const draft = byId<HTMLInputElement>("pattern-input").value;
  if (draft) await chrome.storage.local.set({ [DRAFT_KEY]: draft });
  window.close();
}

async function prefill(): Promise<void> {
  const patternInput = byId<HTMLInputElement>("pattern-input");
  const selectorInput = byId<HTMLInputElement>("selector-input");

  const pick = await takePendingPick();
  if (pick) {
    selectorInput.value = pick.selector;
    patternInput.value = (await takeDraft()) ?? patternForUrl(pick.url) ?? "";
    selectorInput.focus();
    return;
  }

  if (patternInput.value) return;
  const tab = await activeTab();
  if (tab?.url) patternInput.value = patternForUrl(tab.url) ?? "";
}

async function takeDraft(): Promise<string | null> {
  const data = await chrome.storage.local.get(DRAFT_KEY);
  const draft = data[DRAFT_KEY];
  if (typeof draft !== "string") return null;
  await chrome.storage.local.remove(DRAFT_KEY);
  return draft;
}

// activeTab is granted when the popup opens, so tab.url and tab.id are
// readable without the broader "tabs" permission.
async function activeTab(): Promise<chrome.tabs.Tab | undefined> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  } catch {
    return undefined;
  }
}

function renderList(): void {
  const list = byId<HTMLUListElement>("rule-list");
  const empty = byId<HTMLParagraphElement>("empty-state");
  list.replaceChildren();
  empty.hidden = rules.length > 0;

  for (const rule of rules) {
    const item = document.createElement("li");
    item.className = "rule";

    const text = document.createElement("div");
    text.className = "rule-text";

    const pattern = document.createElement("span");
    pattern.className = "rule-pattern";
    pattern.textContent = rule.pattern;
    pattern.title = rule.pattern;

    const selector = document.createElement("span");
    selector.className = "rule-selector";
    selector.textContent = rule.selector;
    selector.title = rule.selector;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "rule-delete";
    remove.textContent = "×";
    remove.setAttribute("aria-label", msg("deleteRule"));
    remove.title = msg("deleteRule");
    remove.addEventListener("click", () => void deleteRule(rule.id));

    text.append(pattern, selector);
    item.append(text, remove);
    list.append(item);
  }
}

function showError(key: string): void {
  const error = byId<HTMLParagraphElement>("form-error");
  error.textContent = msg(key);
  error.hidden = false;
}

function clearError(): void {
  byId<HTMLParagraphElement>("form-error").hidden = true;
}

function localize(): void {
  for (const el of document.querySelectorAll<HTMLElement>("[data-i18n]")) {
    const key = el.dataset.i18n;
    if (key) el.textContent = msg(key);
  }
  for (const el of document.querySelectorAll<HTMLInputElement>("[data-i18n-placeholder]")) {
    const key = el.dataset.i18nPlaceholder;
    if (key) el.placeholder = msg(key);
  }
  for (const el of document.querySelectorAll<HTMLElement>("[data-i18n-title]")) {
    const key = el.dataset.i18nTitle;
    if (key) el.title = msg(key);
  }
}

function msg(key: string): string {
  return chrome.i18n.getMessage(key) || key;
}

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
}
