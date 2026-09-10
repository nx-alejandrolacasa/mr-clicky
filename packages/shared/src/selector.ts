// Build a CSS selector that identifies one element on the page, preferring
// what an author wrote (ids, test hooks, names) over structure, and checking
// every candidate against the live document so the result really is unique.

const AUTHORED_ATTRIBUTES = [
  "data-testid",
  "data-test-id",
  "data-test",
  "data-qa",
  "data-cy",
  "name",
  "aria-label",
] as const;

export function selectorFor(element: Element): string {
  for (const candidate of authoredCandidates(element)) {
    if (selects(candidate, element)) return candidate;
  }
  return structuralPath(element);
}

function authoredCandidates(element: Element): string[] {
  const out: string[] = [];
  const tag = element.localName;

  if (element.id && isStableToken(element.id)) out.push(`#${CSS.escape(element.id)}`);

  for (const attr of AUTHORED_ATTRIBUTES) {
    const value = element.getAttribute(attr);
    if (value && isStableToken(value)) out.push(`${tag}[${attr}="${escapeAttributeValue(value)}"]`);
  }

  const type = element.getAttribute("type");
  if ((tag === "button" || tag === "input") && type) out.push(`${tag}[type="${type}"]`);

  return out;
}

// Generated identifiers look like "radix-:r1:", "ember123", "yui_3_17_2_1_…"
// or a hash; a hand-written one has no runs of digits and no colons. A
// selector built on one would stop matching on the next deploy or reload.
function isStableToken(value: string): boolean {
  return !/[:\s]|\d{3,}/.test(value);
}

function escapeAttributeValue(value: string): string {
  return value.replace(/["\\]/g, "\\$&");
}

// Walk up from the element, one child combinator per level, and stop at the
// first prefix that is unique on its own — so a button inside a form with a
// stable class rarely needs more than two segments.
function structuralPath(element: Element): string {
  const segments: string[] = [];
  let node: Element | null = element;
  while (node && node !== document.documentElement) {
    segments.unshift(segment(node));
    const candidate = segments.join(" > ");
    if (selects(candidate, element)) return candidate;
    node = node.parentElement;
  }
  return segments.join(" > ");
}

function segment(node: Element): string {
  let out = node.localName;
  for (const cls of [...node.classList].filter(isStableToken).slice(0, 2)) {
    out += `.${CSS.escape(cls)}`;
  }
  const parent = node.parentElement;
  if (parent) {
    const sameTag = [...parent.children].filter((sibling) => sibling.localName === node.localName);
    if (sameTag.length > 1) out += `:nth-of-type(${sameTag.indexOf(node) + 1})`;
  }
  return out;
}

function selects(selector: string, element: Element): boolean {
  try {
    const found = document.querySelectorAll(selector);
    return found.length === 1 && found[0] === element;
  } catch {
    return false;
  }
}

export function isValidSelector(selector: string): boolean {
  if (!selector.trim()) return false;
  try {
    document.createDocumentFragment().querySelector(selector);
    return true;
  } catch {
    return false;
  }
}

// The first match that is actually rendered; a page often keeps a hidden
// twin of a control around (responsive layouts, closed menus), and clicking
// that one does nothing.
export function findVisible(selector: string, root: ParentNode = document): Element | null {
  let matches: NodeListOf<Element>;
  try {
    matches = root.querySelectorAll(selector);
  } catch {
    return null;
  }
  for (const el of matches) {
    if (el.getClientRects().length > 0) return el;
  }
  return matches[0] ?? null;
}
