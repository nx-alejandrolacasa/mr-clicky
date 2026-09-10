// In-page element picker: highlight what is under the pointer, take the click
// for ourselves, and hand back a selector for the element. The site sees none
// of the pointer events while picking; Esc cancels.

import { selectorFor } from "./selector";

// A click on the text inside a button should pick the button: that is what
// the click is going to be sent to, and its selector is the stabler one.
const CLICKABLE =
  "button, a[href], [role='button'], input[type='button'], input[type='submit'], summary, label";

const Z_INDEX = "2147483647";

let active: (() => void) | null = null;

export function isPicking(): boolean {
  return active !== null;
}

export function startPicker(onDone: (selector: string | null) => void): void {
  if (active) return;

  const box = document.createElement("div");
  box.style.cssText =
    "position:fixed;pointer-events:none;box-sizing:border-box;" +
    "border:2px solid #4a5ac8;background:rgba(74,90,200,.16);border-radius:3px;" +
    `z-index:${Z_INDEX};left:0;top:0;width:0;height:0;display:none`;

  const label = document.createElement("div");
  label.style.cssText =
    "position:fixed;pointer-events:none;max-width:60vw;padding:5px 8px;" +
    "font:12px/1.4 ui-monospace,Menlo,monospace;color:#fff;background:#1c1c1e;" +
    "border-radius:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" +
    `z-index:${Z_INDEX};left:0;top:0;display:none`;

  const cursor = document.createElement("style");
  cursor.textContent = "*{cursor:crosshair!important}";

  document.documentElement.append(box, label, cursor);

  let current: Element | null = null;
  let currentSelector = "";

  const update = (event: Event) => {
    const target = pickTarget(event.target);
    if (!target || target === current) return;
    current = target;
    currentSelector = selectorFor(target);
    const rect = target.getBoundingClientRect();
    box.style.display = "block";
    box.style.left = `${rect.left}px`;
    box.style.top = `${rect.top}px`;
    box.style.width = `${rect.width}px`;
    box.style.height = `${rect.height}px`;
    label.textContent = currentSelector;
    label.style.display = "block";
    const below = rect.bottom + 6;
    label.style.top = `${below + 30 > innerHeight ? Math.max(0, rect.top - 30) : below}px`;
    label.style.left = `${Math.max(0, Math.min(rect.left, innerWidth - label.offsetWidth - 4))}px`;
  };

  const swallow = (event: Event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  const finish = (selector: string | null) => {
    if (!active) return;
    active = null;
    for (const type of SWALLOWED) window.removeEventListener(type, swallow, true);
    window.removeEventListener("click", click, true);
    window.removeEventListener("pointermove", update, true);
    window.removeEventListener("mousemove", update, true);
    window.removeEventListener("keydown", keydown, true);
    window.removeEventListener("scroll", reposition, true);
    box.remove();
    label.remove();
    cursor.remove();
    onDone(selector);
  };

  const click = (event: MouseEvent) => {
    swallow(event);
    const target = pickTarget(event.target);
    finish(target ? (target === current ? currentSelector : selectorFor(target)) : null);
  };

  const keydown = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    swallow(event);
    finish(null);
  };

  const reposition = () => {
    if (current) {
      const target = current;
      current = null;
      update({ target } as unknown as Event);
    }
  };

  active = () => finish(null);
  for (const type of SWALLOWED) window.addEventListener(type, swallow, true);
  window.addEventListener("click", click, true);
  window.addEventListener("pointermove", update, true);
  window.addEventListener("mousemove", update, true);
  window.addEventListener("keydown", keydown, true);
  window.addEventListener("scroll", reposition, true);
}

export function cancelPicker(): void {
  active?.();
}

const SWALLOWED = [
  "pointerdown",
  "pointerup",
  "mousedown",
  "mouseup",
  "auxclick",
  "contextmenu",
  "dblclick",
] as const;

function pickTarget(target: EventTarget | null): Element | null {
  if (!(target instanceof Element)) return null;
  if (target === document.documentElement || target === document.body) return null;
  return target.closest(CLICKABLE) ?? target;
}
