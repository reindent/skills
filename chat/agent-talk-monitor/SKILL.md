---
name: agent-talk-monitor
description: >
  Live chat window for an agent-talk session. /agent-talk-monitor <sessionID>
  serves a read-only web view of the session's history log (one bubble per
  turn: initiator left, joiner right), with whose-turn status, consensus
  badge, and timeout countdown. Refreshes every 2s. Use when the user says
  /agent-talk-monitor, "show me the agents talking", "open the chat window",
  or wants to watch an agent-talk session live. Depends on the agent-talk
  skill's <sessionID>.history.md round log.
---

# agent-talk-monitor — watch two agents converge, live

Renders the append-only history log written by the agent-talk protocol
(`~/.agent-talk/<sessionID>.history.md`, one canvas snapshot per turn) as a
chat: initiator bubbles on the left (cyan), joiner on the right (orchid),
newest at the bottom. Header shows the TASK, whose turn is being written,
a consensus badge once `## CONSENSUS REACHED` lands, and the timeout clock.

## Run

```bash
<dir of this SKILL.md>/scripts/monitor.sh <sessionID> --open
```

- Serves `~/.agent-talk/` on 127.0.0.1 (default port 7878, next free one if
  taken; override with env `AGENT_TALK_MONITOR_PORT`) via `python3 -m
  http.server`, generates `<sessionID>.monitor.html` next to the session
  files, prints the URL, and `--open` opens the browser.
- **Without `--open` it only prints the URL** — this is the mode the
  agent-talk INITIATOR uses at session start to hand the user a link
  (never auto-open on the user's behalf; give them the URL as a clickable
  link and let them decide).
- Exit 4 = no such session.

## Behavior notes

- Read-only by design: the page never writes; agents never read the history.
- Sessions from before the history log existed show an empty state until
  the next turn appends the first snapshot; the header status still works
  (it reads the live canvas).
- The viewer is a single self-contained file; content renders as text nodes
  (no HTML injection from session content).
- Server processes: `~/.agent-talk/.monitor.<port>.pid` — kill that pid to
  stop serving; the monitor never stops it automatically.
