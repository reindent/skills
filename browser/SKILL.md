---
name: browser
description: "Control a real, headed Chromium or Chrome via the DevTools Protocol (CDP), Chromium-first cross-platform (macOS + Linux; Windows not supported): launch with a persistent profile, connect, read pages, click safely, type into React apps, screenshot, and wait for SPAs, without Playwright or Puppeteer. Use when a task needs a logged-in real browser session driven programmatically."
---

# browser: drive a real Chromium/Chrome over the DevTools Protocol

Some work has no API. Dashboards, logged-in tools, forms, the whole human
web. This skill gives an agent a real, headed browser it can drive with
nothing but the DevTools Protocol on a local port: read, click, type,
verify. A ready-made driver lives in `scripts/cdp.js` (subcommand CLI).
First use: `npm install` in this folder.

## The session law (sessions are personal)

This law exists because of a real incident: an agent used a browser session
belonging to another agent and posted from the wrong account. It was caught
minutes before real damage. In a multi-agent fleet this is the failure mode
that turns automation into liability.

1. **One agent = one browser session = one profile = one port.** A profile
   dir and debug port belong to one agent for the lifetime of its role.
   Profiles are persistent: platform logins live in them and survive
   relaunches. Treat another agent's session like another person's
   logged-in phone: never touch it.
2. **Never reuse or attach to another agent's session**: not its port, not
   its profile dir, not its running browser, not "just to read something".
   The only exception is explicit, written, per-task human authorization.
3. **Verify before you act, both layers.** Session: is this MY port and MY
   profile? (`lsof` the port; know your own profile path; check what the
   profile is logged into on first connect.) Account: before EVERY write on
   any platform (post, reply, like, comment, repost, follow, DM), read the
   logged-in handle from the DOM in the same page context and assert it is
   the account the action is intended for. Mismatch = stop and report.

One session, one agent, always yours, always verified.

## 1. Launch

Chromium-first, cross-platform (macOS + Linux first-class; Windows not
supported). Resolve the binary before launching; never hardcode one:

```bash
resolve_browser() {
  # 1) explicit override wins
  if [ -n "$CDP_BROWSER" ]; then echo "$CDP_BROWSER"; return; fi
  # 2) Chromium if present (package-manager installable, no auto-updater, OSS)
  # 3) Chrome fallback (already on most desktops; proprietary codecs
  #    H.264/Widevine some sites need; Google sign-in is friendlier to
  #    branded Chrome: vanilla Chromium can hit "browser may not be secure"
  #    on Google logins, which matters for a skill about logged-in sessions)
  local c
  for c in \
    "/Applications/Chromium.app/Contents/MacOS/Chromium" \
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"; do
    [ -x "$c" ] && { echo "$c"; return; }
  done
  for c in chromium chromium-browser google-chrome-stable google-chrome; do
    command -v "$c" >/dev/null 2>&1 && { echo "$c"; return; }
  done
  echo "no Chromium/Chrome found; set CDP_BROWSER" >&2; return 1
}

BROWSER_BIN="$(resolve_browser)" || exit 1
"$BROWSER_BIN" \
  --remote-debugging-port=9222 \
  --user-data-dir=$HOME/.cache/cdp-profile-example \
  --no-first-run \
  --no-default-browser-check \
  "https://example.com" > /tmp/chrome-debug.log 2>&1 &
echo "BROWSER_PID=$!"
```

- Always a dedicated `--user-data-dir`, never the user's main profile. The
  dedicated profile persists cookies and logins across relaunches.
- `--no-first-run --no-default-browser-check` suppress onboarding prompts:
  the window opens straight on the target URL.
- Headed (no `--headless`) so a human can watch and intervene (solve a
  login or 2FA once; it persists afterwards).
- Capture the PID. To stop later: verify with `ps -p <PID>`, then kill that
  exact PID, never by name. The authoritative liveness check is
  `lsof -ti :<port>`.
- Readiness: poll `http://127.0.0.1:9222/json/version` until it answers,
  from a process with real sleeps, not a busy shell loop.

## 2. Connect & discover tabs

`GET http://127.0.0.1:9222/json` lists targets; pick `type === "page"` and
the URL you want (`scripts/cdp.js tabs` prints them). Programmatic:
`chrome-remote-interface`, then `Runtime.enable()` + `Page.enable()`; pass
a target id to attach to a specific tab.

## 3. Read the page

Evaluate one IIFE that returns a single `JSON.stringify`'d payload
(`returnByValue: true`), never several round-trips when one composed read
will do:

```js
const r = await Runtime.evaluate({expression: `(()=>{
  return JSON.stringify({
    url: location.href, ready: document.readyState,
    text: document.body.innerText.slice(0, 3000),
    alerts: [...document.querySelectorAll('[role=alert]')]
             .map(e => e.innerText.trim()).filter(Boolean),
  });
})()`, returnByValue: true});
const data = JSON.parse(r.result.value);
```

- **Always sweep for warnings**: `[role=alert]`, `aria-invalid`, and text
  near "error", "failed", "restricted". Red text is critical information:
  surface it, never skip it.
- An empty table is not proof of absence: check active view filters and
  date ranges before concluding data doesn't exist.

## 4. Wait correctly (SPAs)

`document.readyState === "complete"` does NOT mean a SPA has rendered.
Poll your own condition (selector present, row count > 0, text visible)
every 1.5-2.5s up to a 30-60s budget, from inside one process. Never sleep
blindly between separate calls when a poll can decide.

## 5. Click safely

1. Find the element in-DOM by its accessible text or role.
2. `el.scrollIntoView({block:"center"})`, then compute the center from
   `getBoundingClientRect()`.
3. **Probe before clicking**: `document.elementFromPoint(x, y)` and verify
   the probed element carries the EXACT expected text. Mismatch: abort and
   re-locate.
4. Dispatch `Input.dispatchMouseEvent` pressed + released.
5. **Verify the effect** with a read; never assume a click landed.

Never act on a table row by index: filters and virtualization re-map rows;
verify the row's entity name in-DOM first. Deep-link URLs that preselect an
entity can resolve to a DIFFERENT entity; confirm the loaded entity's name
before touching anything.

## 6. Type into modern web apps

Plain `el.value = "x"` does not register in React/Vue apps. Call the native
value setter, then fire events; for `contenteditable`, focus the node and
send real keystrokes via `Input.insertText`.

```js
const set = Object.getOwnPropertyDescriptor(
  window.HTMLInputElement.prototype, 'value').set;
set.call(el, text);
el.dispatchEvent(new Event('input',  {bubbles: true}));
el.dispatchEvent(new Event('change', {bubbles: true}));
```

**Editors lie.** A dialog can render your text and still silently drop it
on save. After any important entry: save, reopen (or re-read via an
independent channel), and verify it persisted.

## 7. Screenshot

`Page.captureScreenshot`, write the base64 to a file, then LOOK at it.
Layout, colors (red banners!), and truncation are invisible in innerText.
On HiDPI screens the PNG is larger than CSS pixels: scale coordinates by
(image width / `window.innerWidth`) before mapping a screenshot position
to a click.

## 8. Discipline

- Separate READ operations from MUTATING ones; when the task says "don't
  change anything", clicks that alter only your own view are still worth
  disclosing.
- If automation is restricted to specific domains, navigate ONLY those.
- After any UI mutation, verify through an independent channel (API/CLI)
  when one exists; the UI's own confirmation is not proof.
- One connection per process; exit when done (dangling connections keep
  the port busy).

## Driver quick reference (`scripts/cdp.js`)

```bash
node scripts/cdp.js tabs                        # list page targets
node scripts/cdp.js goto  <url>                 # navigate active tab
node scripts/cdp.js eval  '<js-expression>'     # IIFE recommended; prints result
node scripts/cdp.js shot  <file.png>            # screenshot to file
node scripts/cdp.js click <x> <y>               # raw coordinate click (probe first!)
node scripts/cdp.js type  '<text>'              # Input.insertText into focused element
node scripts/cdp.js key   <Enter|Tab|Escape...> # single key press
node scripts/cdp.js waitfor '<js-predicate>' [timeoutMs]  # poll until truthy
```
