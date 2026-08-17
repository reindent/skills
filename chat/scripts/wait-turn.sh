#!/usr/bin/env bash
# agent-talk turn poller.
# usage: wait-turn.sh <sessionID> <my-agent-uuid> [poll_seconds]
# exit: 0 = your turn · 2 = consensus reached · 3 = timed out · 4 = no session
set -u
DIR="${AGENT_TALK_DIR:-$HOME/.agent-talk}"
SID="${1:?sessionID required}"
ME="${2:?agent uuid required}"
POLL="${3:-2}"
F="$DIR/$SID.md"
META="$DIR/$SID.meta.json"

[ -f "$F" ] || exit 4

created=$(python3 -c "import json;print(json.load(open('$META')).get('created',0))" 2>/dev/null || echo 0)
tmin=$(python3 -c "import json;print(json.load(open('$META')).get('timeout_minutes',5))" 2>/dev/null || echo 5)
deadline=$(( created + tmin * 60 ))

while :; do
  now=$(date +%s)
  if [ "$created" -gt 0 ] && [ "$now" -ge "$deadline" ]; then exit 3; fi
  [ -f "$F" ] || exit 4
  if grep -q "^## CONSENSUS REACHED" "$F"; then exit 2; fi
  last_end=$(grep -E "^END OF " "$F" | tail -1)
  if [ -n "$last_end" ] && ! printf '%s' "$last_end" | grep -qi "$ME"; then
    exit 0   # last completed turn is the other agent's -> your turn
  fi
  sleep "$POLL"
done
