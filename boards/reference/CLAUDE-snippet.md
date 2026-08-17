<!--
  boards — paste this block into your project's CLAUDE.md (or AGENTS.md).
  It IS the mechanism: the board self-updates because the agent follows this
  convention while it codes. No tool, no CLI, no MCP, no database.
-->

## Project boards live in markdown (single source of truth)

- The board files are the single source of truth for planned and shipped work:
  - `PROJECT.md` — the roadmap / issue tracker (ids `T-xx`)
  - `MARKETING.md` — the marketing playbook (ids `M-xx`)  <!-- optional; add boards as needed -->

  They render in the admin at `/admin/boards` (or as a standalone page) —
  wherever you want them. Keep them dev-only if the roadmap is internal (the
  route 404s in production, files not deployed), or render them anywhere; your
  call.

- **The update rule (load-bearing):** any commit that completes or meaningfully
  advances a board item MUST update the board file in the **same commit** — move
  finished items to `## Done` with the date, e.g.
  `- [x] **T-07 · Title** — shipped 2026-06-10`. The board can therefore never
  drift from the code.

- **Status is the checkbox glyph:** `[ ]` to-do, `[~]` doing, `[x]` done.

- **Stable ids:** every item carries `T-xx` / `M-xx`. Never renumber; new items
  take the next unused number; reference items by id in commits ("ships T-04").
  Before adding an item, **search the board first** (grep the active file and its
  `*-DONE.md` archive) to avoid duplicates — extend an existing item rather than
  minting a parallel one.

- **Format contract (keep it parser-stable):** `## <Section>` headings; items as
  `- [ ] **T-01 · Title** — body`. Prose between a heading and its first item is
  the section's note. File-level intro prose (before the first `##`) is ignored.

When I say things like "add a bug for X", "what's left before launch?", or "move
T-12 to done", operate on these files directly — reading and editing them is how
the board stays live.
