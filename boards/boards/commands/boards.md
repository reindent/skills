---
description: Show the project board — render the markdown board and open it however fits the current context.
---

Show me the current board.

1. Read the board file(s) at the repo root — `PROJECT.md` (and `MARKETING.md`
   or any other `*.md` boards, if present).
2. **Pick the way that already exists, else render on demand:**
   - If the project renders boards in an admin (a route like `/admin/boards`) or
     a standalone page, just point me there / open it.
   - Otherwise render on demand: take a copy of the boards skill's
     `reference/standalone.html`, replace the `#board-src` block with the **live**
     board markdown, write it to `boards/view.html`, and open it the best way for
     where we are:
     - in an IDE (e.g. VS Code) → open a new editor tab or a browser preview;
     - in a terminal → `open` (macOS) / `xdg-open` (Linux) / `start` (Windows)
       the file in the default browser;
     - if there's no browser at all → print a compact text summary inline.
3. Always regenerate from the live markdown so the view is never stale.
   `boards/view.html` is a derived artifact — add it to `.gitignore`; the `.md`
   files are the only source of truth.

If I ask for a specific board (e.g. "show the marketing board"), render that file
instead. If no board exists yet, offer to set one up (see the boards skill).
