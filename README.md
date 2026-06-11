# just-enough-claude-code

**English** | [日本語](README.ja.md)

[![CI](https://github.com/imag-fff/just-enough-claude-code/actions/workflows/ci.yml/badge.svg)](https://github.com/imag-fff/just-enough-claude-code/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Node >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)

A minimal, testable [Claude Code](https://claude.com/claude-code) harness for small projects:
**4 hooks, 3 agents, 3 commands, 1 skill — one install path, zero runtime dependencies, every hook unit-tested.**

Inspired by [everything-claude-code (ECC)](https://github.com/affaan-m/ECC), which proves how far an agent harness can go.
This project takes the opposite bet: for a small project, the first 5% of a harness delivers most of the value —
**if** it is small enough to read, test, and trust. See [docs/design.md](docs/design.md) for the full design rationale.

## Why "just enough"?

- **One install path.** A single `install.sh` copies the harness into your project. No plugin marketplace, no profiles, no install-method matrix to untangle.
- **Small enough to read in 30 minutes.** ~15 files. You should know exactly what runs on every tool call before you let it run.
- **Every hook is a pure function with tests.** Hooks export `run(input) → {exitCode, stderr}`; process I/O lives in one shared module. 22 tests, CI on every push.
- **Project-local by default.** Everything lands in your project's `.claude/`, versioned with your code. Nothing touches `~/.claude/` or other projects.
- **Fails open, blocks loud.** A crashing hook allows the action (a broken seatbelt must not stop the car); a blocking hook tells the model exactly why, so it can change course.

## What's inside

```
.claude/
├── settings.json          # hook registration + Read-deny rules for secrets
├── hooks/
│   ├── lib.js             # shared I/O layer — hooks themselves stay pure
│   ├── guard-bash.js      # PreToolUse: blocks catastrophic shell commands
│   ├── guard-files.js     # PreToolUse: blocks writes to .env / keys / secrets
│   ├── track-edits.js     # PostToolUse: records every edited file
│   └── session-summary.js # Stop: folds edits into .claude/logs/sessions.log
├── agents/
│   ├── code-reviewer.md   # confident-findings-only diff review
│   ├── test-writer.md     # extends tests following project conventions
│   └── explorer.md        # read-only codebase Q&A, returns findings not dumps
├── commands/
│   ├── commit.md          # /commit — grouped, conventional commits; never pushes
│   ├── review.md          # /review — diff review via the code-reviewer agent
│   └── fix-tests.md       # /fix-tests — drive the suite back to green
└── skills/tdd/SKILL.md    # red-green-refactor loop with hard rules
```

Plus: `install.sh` (the installer), `scripts/merge-settings.js` (non-destructive settings merge),
`templates/CLAUDE.md.template` (project-memory starter), `tests/` (unit + manifest-consistency tests).

| Hook | Event | What it does |
|---|---|---|
| `guard-bash` | PreToolUse (Bash) | Blocks `rm -rf /`, force-push to main, `curl \| sh`, `chmod 777`, `git checkout .` — with a reason fed back to the model |
| `guard-files` | PreToolUse (Edit/Write) | Blocks writes to `.env*`, private keys, `secrets/`, `.ssh/` (`.env.example` stays editable) |
| `track-edits` | PostToolUse (Edit/Write) | Appends each edited path to per-session state |
| `session-summary` | Stop | Writes "what did the agent touch" entries to `.claude/logs/sessions.log` |

## Quick start

Requirements: Claude Code CLI, Node.js ≥ 18 (hooks runtime), bash.

```bash
git clone https://github.com/imag-fff/just-enough-claude-code.git
cd just-enough-claude-code
./install.sh /path/to/your/project        # add --dry-run to preview
```

The installer:

1. copies `agents/`, `commands/`, `skills/`, `hooks/` into your project's `.claude/`,
2. copies `settings.json` — or, if you already have one, **merges** hooks and deny-rules into it without touching your existing entries,
3. drops a `CLAUDE.md` starter if your project has none.

It never overwrites an existing file (use `--force` to override) and is idempotent — re-running it is always safe.

Then verify:

```bash
cd /path/to/your/project && claude   # restart Claude Code if it was running
```

Inside Claude Code, run `/hooks` — you should see the four hooks registered. Try it: ask Claude to run `git checkout .` and watch the guard explain the refusal.

## Customizing

The harness is meant to be edited in place — it's your project's code now.

**Add a guard rule** (30 seconds): append to `RULES` in `.claude/hooks/guard-bash.js`:

```js
{ pattern: /\bdocker\s+system\s+prune\b/, reason: 'Prunes shared local Docker state.' },
```

**Add a new hook** (3 steps):

1. Create `.claude/hooks/my-hook.js` exporting `run(input)` and calling `main(run)` — copy any existing hook as a skeleton.
2. Register it under the right event in `.claude/settings.json`.
3. Add a test in `tests/`. The manifest test will fail until registration and file agree — that's by design.

**Remove what you don't need**: delete the file and its registration; the manifest test confirms consistency.

## Running tests

```bash
npm test            # 22 tests via node --test, no dependencies to install
```

The suite covers each guard's allow/block matrix, the edit-tracking pipeline (against a temp dir), the settings merge (idempotency, user-data preservation), and a manifest check that every registered hook exists and every shipped hook is registered.

## Design

The full rationale — what was deliberately left out and why, the hook anatomy, the security model — lives in [docs/design.md](docs/design.md) ([日本語版](docs/design.ja.md)).

## Acknowledgements

- [everything-claude-code](https://github.com/affaan-m/ECC) by Affaan Mustafa — the testable-hook pattern (`run()` export + thin process wrapper) is borrowed from ECC's hook architecture.

## License

[MIT](LICENSE)
