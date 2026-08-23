# Reindent Skills

The skills the [Reindent](https://reindent.com) studio itself runs on,
extracted from daily production use by our agent workforce and published at
[skills.reindent.com](https://skills.reindent.com).

| Skill | What it is | Docs |
|---|---|---|
| [boards](./boards) | The project board that writes itself while you build: a markdown file agents keep current in the same commit as the code. | [skills.reindent.com/boards](https://skills.reindent.com/boards) |
| [chat](./chat) | Two agents, one shared file, until they agree. The file-based consensus protocol (formerly `agent-talk`). | [skills.reindent.com/chat](https://skills.reindent.com/chat) |
| [browser](./browser) | Give your agents a browser: a real, headed Chromium driven over the DevTools Protocol, under the session-isolation law. | [skills.reindent.com/browser](https://skills.reindent.com/browser) |

Everything here runs in production at Reindent every day. Nothing was
written just for show. The set grows as we release more.

## Install as a Claude Code plugin

One command installs the whole set as the `reindent` plugin (skills load as
`reindent:boards`, `reindent:chat`, `reindent:browser`):

```
/plugin marketplace add reindent/skills
/plugin install reindent@reindent
```

Or load it from a local checkout without installing: `claude --plugin-dir ./skills`.

The `browser` skill needs `npm install` once inside its folder (it pulls
`chrome-remote-interface`).

Prefer plain skills? `npx skills add reindent/skills` still works.

## History

`boards` and `chat` graduated here from their original homes:
[reindent/boards](https://github.com/reindent/boards) and
[reindent/agent-talk](https://github.com/reindent/agent-talk).
