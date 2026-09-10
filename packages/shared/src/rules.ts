// Rule model, persistence (storage.sync), and URL matching.
//
// A rule pairs a URL pattern with a CSS selector. The pattern is a JavaScript
// regular expression tested against the page's full URL, case-insensitively.
// Every rule that matches is applied, so two rules can click two things on
// one page; each clicks at most once per page URL (see content.ts).

export interface Rule {
  id: string;
  pattern: string;
  selector: string;
}

const STORAGE_KEY = "rules";

// Firefox supports the promise-based `chrome.*` namespace too, so `chrome`
// works as the single entry point on both browsers.
function storage(): chrome.storage.SyncStorageArea {
  return chrome.storage.sync;
}

export async function loadRules(): Promise<Rule[]> {
  const data = await storage().get(STORAGE_KEY);
  const raw = data[STORAGE_KEY];
  if (!Array.isArray(raw)) return [];
  return raw.filter(isRule);
}

export async function saveRules(rules: Rule[]): Promise<void> {
  await storage().set({ [STORAGE_KEY]: rules });
}

export function onRulesChanged(listener: (rules: Rule[]) => void): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync" || !(STORAGE_KEY in changes)) return;
    const raw = changes[STORAGE_KEY]?.newValue;
    listener(Array.isArray(raw) ? raw.filter(isRule) : []);
  });
}

export function newRuleId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function isRule(value: unknown): value is Rule {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.pattern === "string" &&
    typeof v.selector === "string" &&
    v.pattern.length > 0 &&
    v.selector.length > 0
  );
}

const compiled = new Map<string, RegExp | null>();

// null for a pattern that isn't a valid regular expression. Memoised because
// the content script tests every rule on every DOM mutation batch.
export function compilePattern(pattern: string): RegExp | null {
  const cached = compiled.get(pattern);
  if (cached !== undefined) return cached;
  let regExp: RegExp | null;
  try {
    regExp = new RegExp(pattern, "i");
  } catch {
    regExp = null;
  }
  compiled.set(pattern, regExp);
  return regExp;
}

export function isValidPattern(pattern: string): boolean {
  return pattern.trim().length > 0 && compilePattern(pattern) !== null;
}

export function matchesUrl(rule: Rule, url: string): boolean {
  return compilePattern(rule.pattern)?.test(url) ?? false;
}

export function matchingRules(rules: readonly Rule[], url: string): Rule[] {
  if (!/^https?:/i.test(url)) return [];
  return rules.filter((rule) => matchesUrl(rule, url));
}

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// A pattern for "this page": host and path, escaped, so the query string and
// hash — which usually carry per-visit tokens — don't pin the rule to one visit.
export function patternForUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  const path = parsed.pathname.replace(/\/+$/, "");
  return escapeRegExp(parsed.hostname + path);
}
