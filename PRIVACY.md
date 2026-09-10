# Privacy Policy

**Last updated:** 2026-09-10

This policy explains what data the **Mr. Clicky** browser extension (the "extension") handles, what is transmitted off your device, and how you can control it. It applies to any copy of the extension built from this repository or distributed through [addons.mozilla.org](https://addons.mozilla.org) (Firefox) or the [Chrome Web Store](https://chromewebstore.google.com) (Chrome and Chromium-based browsers).

## 1. Summary

- The extension clicks an element you chose, on pages whose URL matches a rule you defined.
- The extension makes **no network requests at all**.
- The extension does **not** collect, transmit, sell, or share your browsing history, page contents, or any personal identifier.
- Your rules (URL pattern + CSS selector pairs) and the click delay are stored in your browser's extension **sync storage**, which your browser may synchronize across your own devices when you are signed in to browser sync. That synchronization is performed entirely by your browser vendor (Mozilla or Google) under their privacy policies — the developer never receives or can access this data.

## 2. Data the extension does not collect or transmit

The extension does **not**:

- Make any outbound network request. There is no server component, no API, no CDN.
- Transmit your browsing history, visited URLs, page contents, or any personal identifier — to the developer or to anyone else.
- Use analytics, telemetry, crash reporting, or any user-identification mechanism.
- Use cookies or any tracking technology.
- Sell, rent, lease, share, or disclose data to advertisers, data brokers, or any third party.
- Read page content beyond locating the element your selector names, or modify a page beyond dispatching the click you configured (and, while you are picking an element, drawing a highlight over it).
- Modify your bookmarks, history, settings, or any other browser data.

## 3. Data stored by the extension

The extension stores:

- **Your rules** — the URL pattern + CSS selector pairs you create in the popup, each with a random internal ID.
- **The click delay** you set.
- **A pending pick**, briefly: when you pick an element on a page, the resulting selector and that page's URL are kept in local extension storage until the popup reads them (at most ten minutes), so the selector can be prefilled into the form.

Rules and the delay are stored in your browser's extension sync storage (`storage.sync`): on your device always, and across your devices only if you are signed in to your browser's sync feature. The pending pick is stored in local storage (`storage.local`) only, on your device.

Deleting a rule in the popup removes it immediately. Uninstalling the extension removes all of its stored data.

## 4. How the extension processes page URLs

To decide whether a page should get a click, the extension's content script compares the **current page's URL against your rules, locally, in the page itself**. The URL is used only for this comparison; it is never stored, logged, or transmitted. When a rule matches and its selector finds an element, the content script dispatches a click on that element after your configured delay — once per rule per page URL.

The popup also reads the **active tab's URL** (via the `activeTab` permission, granted when you open the popup) solely to prefill the pattern field with the site's host and path as a convenience. It is not stored or transmitted, except as part of a pending pick (section 3).

## 5. Permissions

| Permission | Why it is needed |
|---|---|
| `storage` | Persist your rules and the click delay in `storage.sync`, and a pending element pick in `storage.local`. |
| `activeTab` | Read the current tab's URL when you open the popup, to prefill the pattern field, and message the current tab to start picking an element. |
| Content script on `http://*/*` and `https://*/*` | The extension must be able to click on whichever sites *you* write rules for. Because patterns are defined by you at runtime, the match list cannot be narrowed in advance. On pages with no matching rule the script only compares the page URL against your rules and does nothing else. |

## 6. Legal basis for processing (EU/EEA users)

Where the General Data Protection Regulation (GDPR) applies: the extension processes no personal data on any server — all processing described above happens locally on your device at your direction. Synchronization of your rules across devices, if any, is performed by your browser vendor under their own legal basis and privacy policy.

## 7. Your rights and how to exercise them

- **Delete individual rules**: open the popup and remove them.
- **Delete all local data**: uninstall the extension; your browser removes its storage automatically.
- **Stop cross-device sync**: sign out of browser sync or disable extension-data sync in your browser's settings.
- **Right to access, rectification, erasure, restriction, portability, and objection** (GDPR), and **right to know, delete, and opt-out of "sale" or sharing** (CCPA / California): the developer stores no data about you anywhere. Everything the extension generates is on your device (and, via your browser's sync, your other devices) and fully under your control. The developer does not sell or share data, so there is nothing to opt out of.

## 8. Children's privacy

The extension is not directed at children under the age of 13 and does not knowingly collect personal information from anyone, including children.

## 9. Security

The extension contains no remotely loaded code, no eval'd code, and no third-party scripts. Locally stored data is protected by the same operating-system-level access controls that protect your browser profile.

## 10. Changes to this policy

If the extension's data practices change, this policy will be updated and the "Last updated" date at the top will reflect the change.
