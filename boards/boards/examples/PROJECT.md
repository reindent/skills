# Project board

Single source of truth for planned and shipped work, rendered read-only at
`/admin/boards` (local dev only). Status: `[ ]` to-do, `[~]` doing, `[x]` done.

## P0 — now

- [ ] **T-08 · Rate-limit the public API** — 100 req/min per IP on `/api/*`;
      return 429 with a `Retry-After`. Protects the free tier from scrapers.
- [~] **T-09 · Fix checkout 500 on empty cart** — a Stripe session is created
      with zero line items; guard before the call and show the empty state.

## P1 — next

- [ ] **T-10 · Email verification on signup** — double opt-in; block login
      until verified. Stops the spam signups from last week.
- [ ] **T-11 · Sentry on the worker** — the queue fails silently; wire error
      reporting before we add more jobs.

## P2 — later (backlog)

- [ ] **T-12 · Dark mode** — nice-to-have, only after launch.

## Done

- [x] **T-07 · Password reset flow** — email token, 30-min expiry — shipped
      2026-06-28 (a1b2c3d)
- [x] **T-06 · HTTPS redirect + HSTS** — shipped 2026-06-25 (9f8e7d6)
