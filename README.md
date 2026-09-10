# Mr. Clicky

Browser extension (Chrome + Firefox, Manifest V3) that clicks a button for
you on pages you choose — the "Choose an account to continue" screens,
"Accept" walls and "Continue" interstitials that always want the same click.

Open the popup, add a rule, and every page whose URL matches gets the
element clicked once, after a short delay.

## Rules

A rule is two things:

| Field           | What it is                                                                 |
| --------------- | -------------------------------------------------------------------------- |
| URL pattern     | A JavaScript regular expression, tested against the full URL (case-insensitive). |
| Button selector | A CSS selector for the element to click.                                   |

The pattern field is prefilled with the current page's host and path,
escaped — `id\.atlassian\.com/login/select-account` — so on most pages the
only thing to fill in is the selector. For that, **Pick** puts the page into
picking mode: hover highlights elements and shows the selector that would be
saved, a click takes it (and reopens the popup where the browser allows),
Esc cancels. The picker prefers ids, `data-testid`-style hooks and names
over structural paths, and clicking the text inside a button picks the
button.

Every rule that matches a URL is applied, and each one clicks **once per
page URL** — a button that survives its own click is not clicked again, and
a page that moves on to a new URL is evaluated afresh. Elements rendered
late (React and friends, SPA navigations) are caught by a mutation observer.

**Click delay** (Settings row in the popup, default 500 ms) is how long to
wait after the element is found before clicking it; the selector is
resolved again at click time.

Rules and the delay sync via `storage.sync`, so they follow your browser
profile.

## Repo layout

npm-workspaces monorepo, same shape as
[favimoji](https://github.com/nx-alejandrolacasa/favimoji):

- `packages/shared` — browser-agnostic logic (rules + matching, settings,
  selector builder, element picker, content script, background, popup UI),
  assets, and locales.
- `packages/chrome` — Chrome manifest + esbuild script → `dist/`.
- `packages/firefox` — Firefox manifest + esbuild script → `dist/`.

The two manifests differ in one line beyond the icons: Chrome's background
is a `service_worker`, Firefox's is an event page (`scripts`). Both run the
same `background.ts`.

## Development

```sh
npm install
npm run build            # both browsers → packages/*/dist/
npm run dev:chrome       # watch + web-ext run (Chromium)
npm run dev:firefox      # watch + web-ext run (Firefox)
npm run typecheck
npm test                 # matching + settings smoke tests
npm run lint             # web-ext lint (firefox dist)
```

Load `packages/chrome/dist` via `chrome://extensions` → "Load unpacked", or
`packages/firefox/dist` via `about:debugging` → "Load Temporary Add-on".

The Chrome icon PNG is rendered from the SVG design at build time
(`packages/shared/src/build-helpers/icon-png.ts`), so no binary lives in the
repo; `node scripts/generate-icon.mjs` writes the same PNG to
`packages/shared/assets/icons/icon.png` for a store listing.

## Privacy

No network requests, no analytics, no remote code. See [PRIVACY.md](./PRIVACY.md).
