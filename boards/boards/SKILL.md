---
name: boards
description: >-
  Repo-native project boards that self-update as you prompt to code. Plain
  markdown files (PROJECT.md, MARKETING.md) are the single source of truth; a
  ~70-line dependency-free parser renders them inside your own app's admin, as
  a standalone page, or on demand — any stack, any framework, any environment.
  Use this when someone wants issue / task / roadmap /
  marketing tracking that lives in git and updates in the SAME commit as the
  code — with no external tool, CLI, MCP, SaaS, or database. Also use it to
  scaffold the boards system into a project, or whenever the user references a
  board item by id (T-xx / M-xx), says "add a bug/task", "what's left before
  launch?", or "move X to done".
---

# Boards

**The project board that writes itself while you build.**

A *board* is a plain markdown file that is the single source of truth for a
stream of work. You (the agent) already read and edit files while you build — so
you keep the board current as a byproduct of that, in the **same commit** as the
code. There is no tool to call: no CLI, no MCP server, no database, no SaaS. The
file is the database, git is the history, and the renderer is just a viewer —
in the project's admin, on a standalone page, or rendered on demand.

This is a *convention*, not a dependency. What this skill installs is knowledge
plus a few small reference files the project owns outright (a ~70-line parser,
an API route, a view). **The convention is stack-agnostic**: the reference code
happens to be TypeScript / React / Express / Next because that's where it was
extracted from — treat it as worked examples, not requirements. Each piece is
small enough to port in minutes to whatever the project actually uses — Vue,
Svelte, Angular, plain HTML, Rails, Django, Laravel, Go, a desktop app, a CLI.
Adapt to the project; don't bend the project to the examples. Nothing runs in
the background.

## When to use this skill

- The user wants lightweight issue / task / roadmap / marketing tracking that
  lives in the repo — not in Jira / Linear / Notion / Trello.
- The user says things like "add a bug for X", "add a task to…", "what are the
  priorities before launch?", "move T-12 to done", "is this already tracked?".
- You're setting up a project and want a board that stays in lockstep with the
  code, because it's updated in the same commits.

If the project already has `PROJECT.md` / `MARKETING.md` (or any file with a
`## Done` section and `T-xx` ids), the board already exists — skip setup and go
straight to **The daily loop**.

## What's in this skill

Everything under `reference/` is a **worked example**, not a dependency — port
any of it to the project's own stack and language.

- `reference/parse.ts` — the parser. ~70 lines, **zero dependencies**, no
  markdown library. Turns a board file into sections + items. Everything renders
  as text (never raw HTML) → no XSS surface, no supply chain. It's line-by-line
  regex — trivially portable to Python, Ruby, Go, PHP, or anything else.
- `reference/parse.test.ts` — the parser's tests (Vitest). It's real code.
- `reference/Board.tsx` — a read-only view (cards, progress bars, id chips),
  written in React as the example — recreate it in Vue, Svelte, a template
  engine, or plain HTML just as easily; it's one component.
- `reference/route.express.ts` / `reference/route.next.ts` — the API endpoint
  that serves a board's raw markdown — auth-gated (optionally dev-only). Pick your stack.
- `reference/CLAUDE-snippet.md` — the convention block to paste into the
  project's `CLAUDE.md` / `AGENTS.md`. **This is the actual mechanism** — the
  board self-updates because you follow this.
- `reference/board.template.md` — a starter board file.
- `reference/standalone.html` — a self-contained renderer (List / Kanban /
  Markdown) with **zero dependencies**; works from `file://`. The agent injects
  the live board markdown and opens it. Powers the *standalone* and *on demand*
  modes.
- `commands/boards.md` — an optional `/boards` slash command (copy into
  `.claude/commands/`) that shows the board on demand.
- `examples/PROJECT.md` — a filled-in example.

## Setup (scaffold the board into a project) — one time

**On first install, act immediately — don't wait to be asked.** Offer to set the
board up right away, and ask the user how they want to *see* it — three modes:

- **Embedded** — mounted in the project's existing admin (a route like
  `/admin/boards`).
- **Standalone** — its own page/app route, for projects with no admin.
- **On demand** *(zero wiring — a sensible default)* — no route at all: when
  asked to see the board, render `reference/standalone.html` with the live
  markdown into `boards/view.html` and open it in whatever fits the context (IDE
  tab, browser, or an inline text summary). See *Rendering modes* below.

Default sensibly — obvious admin → embedded; a shippable web app but no admin →
standalone; a library / CLI / anything without a UI → on demand. Then scaffold
and confirm what you created.

1. **Create the board file(s)** at the repo root from
   `reference/board.template.md`: `PROJECT.md` (ids `T-xx`); add `MARKETING.md`
   (`M-xx`) or others as the project needs.
2. **Add the parser** (`reference/parse.ts`) to the app (e.g. `src/lib/boards/`).
   Copy it in if the project is TypeScript, or port it — it's ~70 lines of
   line-by-line regex that work the same in any language. Do **not** add a
   dependency.
3. **Add the API route** — `route.express.ts` / `route.next.ts` are the worked
   examples; for any other framework (Rails, Django, Laravel, Go, Fastify, …)
   write the same ~30 lines: read the file, return
   `{ ok, markdown, updatedAt }`. The one **required** gate is **auth** — reuse
   the app's existing admin / session gate. If the roadmap must stay out of
   production, *also* add the **dev-only** 404 (optional — see *Where it
   renders*).
4. **Add the view** — `reference/Board.tsx` (React example) or its equivalent in
   the project's framework — and render it where the board is useful: an admin
   route (e.g. `/admin/boards`), or a **standalone page** if there's no admin
   (for non-web projects, the *on demand* mode needs no view code at all). If
   you'd rather the board never appear in production, put it behind a
   compile-time dev flag (see *Where it renders*).
5. **Paste `reference/CLAUDE-snippet.md`** into the project's `CLAUDE.md` (or
   `AGENTS.md`). This is what makes the board self-update.
6. **Decide where it lives (optional hardening).** The board is just part of
   your repo, so render it in any environment you like. If the roadmap shouldn't
   be visible in production, keep it dev-only: gate the route + view on the
   environment and exclude the `*.md` boards from the production bundle (Lambda
   zip / Docker copy / Next output tracing) — see *Where it renders*.

Whatever the stack or language, the *contract* is all that matters — the format
in the board file, the response envelope `{ ok, markdown, updatedAt }`, and your
auth gate; everything else is ~100 lines of glue in the project's native idiom.
(Add the optional dev-only 404 + compile-time client flag if you're keeping the
board out of production.)

## Rendering modes

Pick per project — the board file is the same either way; only *how you view it*
changes.

- **Embedded** — add the API route + `Board.tsx` to the app's admin (setup steps
  3–4). Best when there's already an authenticated admin.
- **Standalone** — serve `reference/standalone.html` (a self-contained
  List/Kanban/Markdown renderer) as its own page, or host it anywhere; it also
  works straight from `file://`. No admin needed.
- **On demand** — the zero-wiring default. Nothing is routed or deployed. When
  the user asks to see the board (or runs `/boards`): take `standalone.html`,
  replace its `#board-src` block with the **current** board markdown, write it to
  `boards/view.html`, and open it the best way for the context — a new tab /
  browser preview in an IDE, `open` / `xdg-open` / `start` from a terminal, or a
  compact text summary if there's no browser. **Regenerate every time** so it's
  never stale, and add `boards/view.html` to `.gitignore` — it's derived; the
  `.md` files are the only source of truth.

Optional shortcut: install `commands/boards.md` into `.claude/commands/` so the
user can type **`/boards`** to show it. (Nice, not needed — plain language like
"show me the board" works just as well.)

## The daily loop (maintain the board while you code)

This is the whole point — do it as a byproduct of normal work:

- **"add a bug/task for X"** → append an item to the right section with the next
  unused id. **Search the board first** (grep the active file AND its Done
  archive) so you don't mint a duplicate; extend an existing item if one matches.
- **finishing work** → in the **same commit** that ships the change, flip the
  item to `[x]` and move it to `## Done` with the date (add a commit ref after
  the fact).
- **starting work** → mark it `[~]` (doing).
- **"what's left before launch?" / "top priorities?"** → read the board and
  answer from it (P0 first). Don't invent a plan the board doesn't reflect.
- **"is X already tracked?"** → grep both the active board and the Done archive
  before answering or adding.

The rule that keeps it honest: **the board file changes in the same commit as
the code it describes.** Follow that and `git log -- PROJECT.md` is a true audit
trail — the board stays in sync instead of rotting the way a separate tracker
does. (It's a discipline, not an enforced invariant: nothing stops a commit that
skips the board. The convention is what keeps it true.)

## Format contract (keep it parser-stable)

```markdown
## P0 — now                         ← one card per section; P0/P1/P2 get accents

Prose right after a heading becomes the section's note.

- [ ] **T-03 · Item title** — body text, wrapped onto
      indented continuation lines (joined with spaces)
- [~] **T-04 · In progress** — the [~] glyph means "doing"
- [x] **T-01 · Done item** — what shipped 2026-06-10 (abc1234)

## Done                             ← completed items (or a separate *-DONE.md archive)
```

- **Checkbox glyph = status:** `[ ]` to-do, `[~]` doing, `[x]` done.
- **Ids are stable:** `T-xx` / `M-xx`, never renumbered; new items take the next
  unused number; reference items by id in commits ("ships T-04").
- File-level intro prose (before the first `##`) is ignored — document the
  board's purpose there.

## Where it renders (dev-only is optional)

Render the board wherever it's useful — inside your admin, or as a standalone
page, in dev, staging, or production. That's your call, not a requirement.

If you *do* want to keep the roadmap out of production, lock it to local dev with
three layers (any one alone fails open, so use all three):

1. **Server** — the route 404s in production *before* the auth check and never
   serves board data. (To make it indistinguishable from a route that doesn't
   exist, return your framework's *own* 404 rather than a custom body — e.g.
   `return next('route')` in Express to fall through to your catch-all 404, or
   `notFound()` in Next.js.)
2. **Client** — gate every board render site AND nav link on a **compile-time**
   flag (`import.meta.env.DEV`, or the literal
   `process.env.NODE_ENV === 'development'` inlined at each site so the minifier
   folds it). Gating only the nav is not enough — a render site like
   `route === 'project' && <Board/>` isn't statically dead. **Verify:**
   `grep -rl "api/boards" dist/` (or `.next/static/`) must match nothing.
3. **Deploy** — don't copy the board `*.md` files into the production bundle.

## Why a convention instead of a tool

Tools that track work for AI agents exist — Backlog.md is a git-native CLI;
claude-todos runs a self-managing todo backend beside your code; CodeAgentSwarm
exposes the board over MCP. They work, but each is a separate moving part to invoke or
operate — a CLI to run, a backend to keep up, an MCP server to connect.
(Backlog.md is git-native, so its board *is* committed markdown too; the
difference there is that you drive it through its CLI — its docs note "no
automatic synchronization" — rather than the agent updating the file in the same
commit as a byproduct.) Boards takes the opposite bet: the agent already edits
files, so the cheapest correct place for the board is a markdown file it edits in
the same commit. No new surface area, nothing to keep in sync, and it renders
wherever you already are — your admin, a standalone page, or on demand.

That trade-off — zero dependency, same-commit truth, rendered inside your own
app on your own terms — is the whole design. If you want a hosted product with a write-UI, use one of
the tools above. If you want the board to *be* your repo, use this.

## Views & scope

- The renderer offers three views of the one file: **List** (priority sections),
  **Kanban** (re-bucketed by status — the `[~]` glyph = "doing"), and **Markdown**
  (the raw source — proof there's no hidden datastore).
- **Known limitation:** no real-time multi-person collaboration. Perfect for a
  solo dev with an AI or a small async/PR-based team; a large team wanting a live
  shared board is better served by a hosted tool. Concurrent edits are git's job.

## License

MIT — a gift to the world. Copy the parser, steal the format, keep it.
