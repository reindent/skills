#!/usr/bin/env bash
# agent-talk-monitor — serve the live chat view for a session.
# usage: monitor.sh <sessionID> [--open]
#   default: ensure server is running + print the URL (NO browser open)
#   --open : additionally open the URL in the default browser
# exit: 0 ok · 4 = session not found
set -u
DIR="${AGENT_TALK_DIR:-$HOME/.agent-talk}"
SID="${1:?sessionID required}"
OPEN="${2:-}"
PORT_BASE="${AGENT_TALK_MONITOR_PORT:-7878}"

[ -f "$DIR/$SID.md" ] || { echo "no session $SID in $DIR" >&2; exit 4; }

# 1. Materialize the viewer for this session (idempotent).
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
sed "s/__SID__/$SID/g" "$SKILL_DIR/assets/monitor.html" > "$DIR/$SID.monitor.html"

# 2. Ensure a static server on the sessions dir (reuse if already ours).
PORT=""
for try in $(seq 0 20); do
  p=$(( PORT_BASE + try ))
  if curl -sf --max-time 1 "http://127.0.0.1:$p/$SID.monitor.html" >/dev/null 2>&1; then
    PORT="$p"; break                       # already serving this dir
  fi
  if ! lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then
    # detach with setsid (start_new_session) so no caller ever waits on it
    python3 - "$p" "$DIR" <<'PYEOF'
import subprocess, sys
p = subprocess.Popen(
    [sys.executable, "-m", "http.server", sys.argv[1], "--bind", "127.0.0.1"],
    cwd=sys.argv[2], stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL, start_new_session=True)
open(f"{sys.argv[2]}/.monitor.{sys.argv[1]}.pid", "w").write(str(p.pid))
PYEOF
    sleep 0.6
    PORT="$p"; break
  fi
done
[ -n "$PORT" ] || { echo "no free port near $PORT_BASE" >&2; exit 1; }

URL="http://127.0.0.1:$PORT/$SID.monitor.html"
echo "$URL"
[ "$OPEN" = "--open" ] && { command -v open >/dev/null && open "$URL" || xdg-open "$URL"; }
exit 0
