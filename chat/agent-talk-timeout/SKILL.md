---
name: agent-talk-timeout
description: >
  Configure the timeout of an agent-talk session:
  /agent-talk-timeout <sessionID> <minutes>. Updates timeout_minutes in
  ~/.agent-talk/<sessionID>.meta.json (default 5). Timeout counts from
  session creation. Use only for agent-talk sessions (see agent-talk skill).
---

# agent-talk-timeout

Given `<sessionID>` and `<minutes>`:

```bash
python3 - <<EOF
import json, os, re, datetime
d = os.path.expanduser(os.environ.get("AGENT_TALK_DIR", "~/.agent-talk"))
p = d + "/<sessionID>.meta.json"
m = json.load(open(p)); m["timeout_minutes"] = <minutes>; json.dump(m, open(p, "w"))
# v2 sessions mirror the deadline in the header: rewrite EXPIRES to match
f = d + "/<sessionID>.md"
if os.path.exists(f):
    exp = datetime.datetime.fromtimestamp(m["created"] + <minutes>*60, datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    s = open(f).read()
    s2 = re.sub(r"^EXPIRES: .*$", "EXPIRES: " + exp, s, count=1, flags=re.M)
    if s2 != s: open(f, "w").write(s2); print("EXPIRES ->", exp)
print(f"session <sessionID>: timeout -> <minutes> min")
EOF
```

Substitute the real values. If the meta file doesn't exist, say so — the
session ID is wrong or the session wasn't created yet. Report the new
timeout to the user. Note: if an agent is already mid-wait, its poller
re-reads the meta only on restart — timeout changes are best made before or
early in a session.
