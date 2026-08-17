---
name: chat
description: >
  File-based agent-to-agent conversation protocol. /chat <task> starts
  a session (you are the INITIATOR and talk first); /chat <sessionID>
  joins one (you are the JOINER). Two agents converse by taking turns
  MODIFYING one shared markdown file (never appending a chat log), signaling
  turn completion with END OF <agent-id> markers, until consensus or the
  session timeout. Works across different agent CLIs — sessions live in
  ~/.agent-talk/. Every turn is also appended to a per-session history log
  that the agent-talk-monitor skill renders as a live chat window for the
  user. Use when the user says /chat, "talk to the other agent", or
  gives a session ID to join. Timeout config: see agent-talk-timeout skill.
---

# chat (formerly agent-talk) — shared-file conversation between two agents

**THIS DOCUMENT IMPLEMENTS PROTOCOL VERSION 2.**

Sessions directory: `~/.agent-talk/` (override with env `AGENT_TALK_DIR`).
A session = `<sessionID>.md` (the shared canvas) + `<sessionID>.meta.json`
(created epoch, timeout_minutes, protocol, registered agents) +
`<sessionID>.history.md` (append-only round log: one canvas snapshot per
turn, so a human can replay the whole conversation — rendered live by the
agent-talk-monitor skill).

## Versioning (read this before joining)

- The session file header carries a `PROTOCOL: <n>` line; the initiator
  writes it and it pins the rules for BOTH agents for the whole session.
  A header with no PROTOCOL line is a v1 session (legacy: no history log).
- **On joining, compare the session's PROTOCOL to the version this document
  implements (2):**
  - Equal → proceed.
  - Session OLDER than you → speak the session's version (never impose newer
    mechanics on the other agent), but you may still write v2 *derived*
    outputs like history snapshots — they are invisible to the canvas.
    Tell your user about the mismatch.
  - Session NEWER than you → you cannot know its rules from this document.
    Do NOT take a turn. Tell your user the session needs a newer agent-talk
    skill.
- Version changes so far: **v1** canvas + turns + consensus + timeout.
  **v2** adds the PROTOCOL and EXPIRES header lines, the history log, the
  monitor invite link, and the backfill rule (below).

## Mode detection

- Argument looks like an existing session ID (a file `~/.agent-talk/<arg>.md`
  exists) → **JOINER**.
- Otherwise the argument is a task description → **INITIATOR**.

## Session file format (keep parser-stable)

```markdown
# agent-talk <sessionID>
PROTOCOL: 2
TASK: <one-line task>
EXPIRES: <UTC ISO instant, e.g. 2026-08-05T05:30:00Z>
AGENTS: <uuid1>=initiator [, <uuid2>=joiner once joined]
---
<the shared working document — restructure freely each turn>

END OF <uuid-of-agent-who-just-finished>
```

`EXPIRES` = created + timeout_minutes, written by the initiator: both agents
see the consensus deadline without reading meta. Pace yourself against it —
if it is near, stop broadening and start converging. (meta.json stays the
machine-authoritative timeout; the agent-talk-timeout skill updates BOTH.)

Rules of the format: everything above `---` is the header — ALWAYS preserved
(only the AGENTS line may be extended, once, by the joiner registering, and
the EXPIRES line rewritten only when the user changes the timeout).
Everything below `---` is the canvas. The LAST line of the file is always
exactly `END OF <your-uuid>` when you finish a turn.

## INITIATOR flow (`/chat <task>`)

1. Mint IDs: `SESSION=$(uuidgen | cut -c1-8 | tr A-Z a-z)`,
   `ME=$(uuidgen | tr A-Z a-z)`. `mkdir -p ~/.agent-talk`.
2. Create `~/.agent-talk/$SESSION.meta.json`:
   `{"created": <epoch now>, "timeout_minutes": 5, "protocol": 2, "initiator": "<ME>"}`
3. Create the session file with the format above: header (PROTOCOL: 2 +
   TASK + EXPIRES + AGENTS with your uuid), then YOUR OPENING MESSAGE on
   the canvas — you talk first.
   State the task, your position/proposal, and what you want from the other
   agent. End the file with `END OF <ME>`. Write it in ONE atomic Write.
   Then append your snapshot to the history log (see **History log** below).
4. **Tell the user the session ID immediately** (they must give it to the
   other agent) and your agent ID. **Invite the user to watch the chat**:
   if the agent-talk-monitor skill is installed (a sibling of this skill,
   e.g. `~/.claude/skills/agent-talk-monitor/` or
   `.claude/skills/agent-talk-monitor/`), run its `scripts/monitor.sh
   $SESSION` (starts the local viewer server WITHOUT opening a browser) and
   give the user the URL it prints as a clickable link. Never auto-open the
   browser — the user decides whether to watch.
5. Enter the wait loop (below). When it's your turn again: read the file,
   think, MODIFY the canvas (restructure/refine — do NOT append a chat log;
   the canvas should converge toward the final answer), end with
   `END OF <ME>`, one atomic Write, then append your snapshot to the
   history log. Repeat.

## JOINER flow (`/chat <sessionID>`)

1. **Re-read THIS document top to bottom even if you have joined sessions
   before — the protocol changes and your cached knowledge may be stale.**
   Then read `~/.agent-talk/<sessionID>.md` and apply the **Versioning**
   check against its `PROTOCOL:` line. Mint your own `ME=$(uuidgen)`.
2. Your first turn is only valid if the file currently ends with the
   initiator's END marker (it will, right after creation). Register: extend
   the AGENTS header line with `, <ME>=joiner`, write your reply into the
   canvas, end with `END OF <ME>`. One atomic Write, then append your
   snapshot to the history log.
3. Enter the wait loop. Same turn rules (snapshot after every turn).

## History log (append-only — powers the human chat view)

The canvas is replaced each turn, so the thought process would be lost.
It isn't: immediately AFTER every atomic canvas write, the agent who just
finished its turn appends a full snapshot of the canvas file to
`<sessionID>.history.md` with this exact command (F = canvas path,
H = history path, ME = your uuid):

```bash
{ printf '\n===== TURN %s | %s | %s =====\n\n' \
    "$(( $(awk '/^===== TURN/{c++} END{print c+0}' "$H" 2>/dev/null || echo 0) + 1 ))" \
    "$ME" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"; cat "$F"; } >> "$H"
```

Rules: the history is derived output — NEVER read it for turn logic (the
canvas is the only source of truth), never edit past entries, appends only.
The agent-talk-monitor skill renders it live as a chat window for the user.

**Backfill rule (v2, resilience against non-compliant peers):** before
writing YOUR turn, if the history has fewer snapshots than turns actually
taken (e.g. the other agent runs an older skill and never appends), first
append a snapshot of the canvas AS THE OTHER AGENT LEFT IT, attributed to
the uuid in its last `END OF` line, with ` | backfill` added to the marker:

```
===== TURN <n> | <their-uuid> | <utc-iso> | backfill =====
```

Then write your own turn and append your own (normal) snapshot. This keeps
the human's chat view complete even in mixed-version sessions.

## Turn discipline (the core rules)

- You may edit the file ONLY when its last `END OF` line names the OTHER
  agent. If it names you, it is not your turn — wait.
- One atomic Write per turn (compose fully first, then write once — the
  other side polls for changes; partial writes cause races).
- After every canvas write, append your snapshot to the history log
  (command above). Canvas first, history second — never the reverse.
- MODIFY, never append: the canvas is a living document, not a transcript.
  Merge the other agent's points, refine, restructure. If you need to
  address them directly, use a short `> note to <their-id-prefix>:` line.
- NEVER remove or reword the header, and never impersonate the other
  agent's END marker.

## Ending

- **Consensus:** when you believe agreement is reached, add a final section
  `## PROPOSED CONSENSUS` with the agreed result. If the file you receive
  already has one, and you agree, replace the heading with
  `## CONSENSUS REACHED`, end your turn normally — the session is over;
  report the consensus to your user. If you disagree, edit the proposal and
  continue.
- **Timeout:** total session lifetime = `timeout_minutes` in meta (default
  5; changeable via the agent-talk-timeout skill). When the wait script
  exits with timeout, stop, and report to your user the canvas's current
  state and where the disagreement stands.

## The wait loop

Run `scripts/wait-turn.sh <sessionID> <your-uuid>`; it blocks, polling
every 2s. Exit codes: **0** = your turn · **2** = consensus reached ·
**3** = session timed out · **4** = session file missing.

**Claude Code harness note:** run it via Bash with a `timeout` of
min(remaining session time, 600000) ms. If the Bash call itself times out
(no exit code), just re-run it — that's normal for sessions longer than 10
minutes. Never busy-wait yourself; the script does the polling.

## Interop & handing off a session

The protocol is CLI-agnostic: any agent that can read this SKILL.md (Claude
Code, grok CLI, Codex…) and do file I/O can participate. The session's
`PROTOCOL:` line is the contract; this document is its spec.

When you (or your user) hand a session to another agent, ALWAYS include the
install/update step so it speaks the current protocol. Standard handoff text:

> Before joining, read the agent-talk SKILL.md in full — it implements
> agent-talk PROTOCOL 2. Re-read it even if you know agent-talk; the
> protocol changes and stale knowledge causes missed history snapshots.
> Find it at your local install (`~/.claude/skills/agent-talk/SKILL.md` or
> `.claude/skills/agent-talk/SKILL.md`), or install it:
> `npx skills add reindent/skills`, or read it straight from
> https://github.com/reindent/agent-talk. Then join session `<sessionID>`
> via the JOINER flow (or `/chat <sessionID>` if you have the skill).
